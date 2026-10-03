-- SEG-09 (T27) — Retención, estados de archivo y bloqueo de eliminación.
-- Extiende las funciones de T12 (`inmutabilidad_antes_fila` y
-- `inmutabilidad_rechazar_truncate`). No crea un segundo marco.
-- DELETE y TRUNCATE quedan prohibidos en las tablas clínicas, también
-- para un borrador. La purga (SEG-10) no se implementa.
-- TODO(Q-07): facturas y logs nacen sin cantidad y con verificado = false.
-- BORRADOR – requiere revisión jurídica en la declaración E-04.
-- Rollback: DROP TABLE marcas_retencion, politica_retencion;
-- y restaurar inmutabilidad_antes_fila desde 0011 (no automatizado).
CREATE OR REPLACE FUNCTION inmutabilidad_antes_fila()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  estado_origen text;
  doc jsonb;
BEGIN
  -- T27: ninguna fila clínica se borra, tenga o no firma.
  -- El texto conserva «DELETE prohibido» para las pruebas de T12.
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'registro firmado inmutable: DELETE prohibido'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.estado IN ('firmado', 'firmada', 'adendado') THEN
    RAISE EXCEPTION 'registro firmado inmutable: UPDATE prohibido'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM 'borrador' THEN
    RAISE EXCEPTION 'transicion de estado no permitida: % -> %', OLD.estado, NEW.estado
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id) THEN
    RAISE EXCEPTION 'id y tenant_id no se modifican'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.estado IS NULL OR NEW.estado NOT IN ('borrador', 'firmado', 'firmada') THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'transicion de estado no permitida: % -> %', OLD.estado, NEW.estado
        USING ERRCODE = '55000';
    END IF;
    RAISE EXCEPTION 'transicion de estado no permitida: %', NEW.estado
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'adendas' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.entidad !~ '^[a-z_][a-z0-9_]{0,62}$' THEN
      RAISE EXCEPTION 'entidad de adenda invalida'
        USING ERRCODE = '55000';
    END IF;
    IF NEW.adenda_de IS DISTINCT FROM NEW.entidad_id THEN
      RAISE EXCEPTION 'adenda_de debe apuntar al registro original'
        USING ERRCODE = '55000';
    END IF;
    EXECUTE format(
      'SELECT estado FROM public.%I WHERE id = $1 AND tenant_id = $2',
      NEW.entidad
    ) INTO estado_origen USING NEW.entidad_id, NEW.tenant_id;
    IF estado_origen IS DISTINCT FROM 'firmado' THEN
      RAISE EXCEPTION 'solo se adenda un registro firmado'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  IF NEW.estado = 'borrador' THEN
    NEW.firmado_por := NULL;
    NEW.firmado_en := NULL;
    NEW.hash_contenido := NULL;
    RETURN NEW;
  END IF;

  IF NEW.firmado_por IS NULL THEN
    RAISE EXCEPTION 'firmado_por obligatorio al firmar'
      USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u
     WHERE u.id = NEW.firmado_por AND u.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'firmado_por no pertenece al tenant'
      USING ERRCODE = '55000';
  END IF;

  NEW.firmado_en := now();
  NEW.hash_contenido := NULL;
  doc := to_jsonb(NEW) - 'hash_contenido';
  NEW.hash_contenido := encode(digest(convert_to(doc::text, 'UTF8'), 'sha256'), 'hex');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION aplicar_bloqueo_eliminacion_clinica(p_tabla regclass)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = p_tabla AND tgname = 'inmutabilidad_fila' AND NOT tgisinternal
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER inmutabilidad_fila
         BEFORE DELETE ON %s
         FOR EACH ROW EXECUTE FUNCTION inmutabilidad_antes_fila()',
      p_tabla
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = p_tabla AND tgname = 'inmutabilidad_truncate' AND NOT tgisinternal
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER inmutabilidad_truncate
         BEFORE TRUNCATE ON %s
         FOR EACH STATEMENT EXECUTE FUNCTION inmutabilidad_rechazar_truncate()',
      p_tabla
    );
  END IF;
  EXECUTE format('REVOKE DELETE, TRUNCATE ON %s FROM optisaas_app', p_tabla);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION aplicar_bloqueo_eliminacion_clinica(regclass) FROM PUBLIC;
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.pacientes'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.atenciones'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.examenes_optometricos'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.diagnosticos'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.planes_manejo'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.adendas'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.atencion_adendas'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.consentimientos'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.prescripciones'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.autorizaciones'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.firmas'::regclass);
--> statement-breakpoint
SELECT aplicar_bloqueo_eliminacion_clinica('public.entregas_hc'::regclass);
--> statement-breakpoint
CREATE TABLE politica_retencion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  tipo_documento text NOT NULL,
  anios integer,
  base_normativa text NOT NULL,
  verificado boolean NOT NULL,
  aplica_contratante_no_prestador boolean DEFAULT true NOT NULL,
  CONSTRAINT politica_retencion_tipo CHECK (
    tipo_documento in (
      'historia_clinica',
      'archivo_gestion',
      'archivo_central',
      'prescripcion',
      'consentimiento',
      'factura_electronica',
      'log_auditoria'
    )
  ),
  CONSTRAINT politica_retencion_anios CHECK (anios is null OR anios > 0),
  CONSTRAINT politica_retencion_aplica_contratante CHECK (aplica_contratante_no_prestador),
  CONSTRAINT politica_retencion_provisional CHECK (verificado OR base_normativa LIKE '%TODO(Q-07)%'),
  CONSTRAINT politica_retencion_tipo_unico UNIQUE (tenant_id, tipo_documento)
);
--> statement-breakpoint
CREATE INDEX politica_retencion_tenant_id_idx ON politica_retencion (tenant_id);
--> statement-breakpoint
CREATE TABLE marcas_retencion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  tipo text NOT NULL,
  motivo text NOT NULL,
  registrada_por uuid NOT NULL REFERENCES usuarios(id),
  registrada_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT marcas_retencion_tipo CHECK (tipo in ('duplicada', 'permanente')),
  CONSTRAINT marcas_retencion_motivo CHECK (char_length(motivo) BETWEEN 1 AND 500),
  CONSTRAINT marcas_retencion_paciente_tipo_unico UNIQUE (tenant_id, paciente_id, tipo)
);
--> statement-breakpoint
CREATE INDEX marcas_retencion_tenant_id_idx ON marcas_retencion (tenant_id);
--> statement-breakpoint
CREATE INDEX marcas_retencion_paciente_id_idx ON marcas_retencion (paciente_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION marcas_retencion_no_borrar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marca de retencion: DELETE prohibido'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER marcas_retencion_fila
  BEFORE DELETE ON marcas_retencion
  FOR EACH ROW EXECUTE FUNCTION marcas_retencion_no_borrar();
--> statement-breakpoint
CREATE TRIGGER marcas_retencion_truncate
  BEFORE TRUNCATE ON marcas_retencion
  FOR EACH STATEMENT EXECUTE FUNCTION inmutabilidad_rechazar_truncate();
--> statement-breakpoint
REVOKE ALL ON FUNCTION marcas_retencion_no_borrar() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION marcas_retencion_no_borrar() TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON politica_retencion TO optisaas_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON politica_retencion FROM optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON marcas_retencion TO optisaas_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON marcas_retencion FROM optisaas_app;
--> statement-breakpoint
ALTER TABLE politica_retencion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE politica_retencion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE marcas_retencion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE marcas_retencion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY politica_retencion_tenant_app ON politica_retencion FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY marcas_retencion_tenant_app ON marcas_retencion FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
INSERT INTO parametros_tenant (tenant_id, clave, valor, rotulo)
SELECT t.id,
       'plazo_archivo_gestion_anios',
       to_jsonb(5),
       'spec SEG-09: retención mínima 15 años (5 gestión + 10 central) ✅; Res. 839/2017 art. 3'
  FROM tenants t
 WHERE NOT EXISTS (
   SELECT 1 FROM parametros_tenant p
    WHERE p.tenant_id = t.id
      AND p.clave = 'plazo_archivo_gestion_anios'
      AND p.vigente_hasta IS NULL
 );
--> statement-breakpoint
INSERT INTO politica_retencion (tenant_id, tipo_documento, anios, base_normativa, verificado)
SELECT t.id, v.tipo_documento, v.anios, v.base_normativa, v.verificado
  FROM tenants t
 CROSS JOIN (VALUES
   ('historia_clinica', 15, 'Res. 839/2017 art. 3 (modifica Res. 1995 art. 15); spec SEG-09 ✅', true),
   ('archivo_gestion', 5, 'spec SEG-09: retención mínima 15 años (5 gestión + 10 central) ✅; Res. 839/2017 art. 3', true),
   ('archivo_central', 10, 'spec SEG-09: 10 años de archivo central (15 - 5) ✅; Res. 839/2017 art. 3', true),
   ('prescripcion', 15, 'anexo de la historia clínica; misma retención mínima de la spec SEG-09 ✅', true),
   ('consentimiento', 15, 'anexo de la historia clínica; misma retención mínima de la spec SEG-09 ✅', true),
   ('factura_electronica', NULL::integer, 'art. 632 ET ⚠️ NO VERIFICADO. TODO(Q-07). Sin valor por defecto; no es una obligación legal.', false),
   ('log_auditoria', NULL::integer, 'plazo de logs ⚠️ NO VERIFICADO. TODO(Q-07). Sin valor por defecto; no es una obligación legal.', false)
 ) AS v(tipo_documento, anios, base_normativa, verificado)
ON CONFLICT (tenant_id, tipo_documento) DO NOTHING;
