-- OPT-02 (T21) — Adendas de la atención firmada.
-- RLS ENABLE + FORCE. El marco de T12 cubre el paso a `firmada`.
-- La atención original no se actualiza: el trigger solo la lee.
-- `motivo` y `nuevo_valor` llegan cifrados desde la aplicación (T11).
-- Rollback: DROP TABLE atencion_adendas; DROP FUNCTION atencion_adendas_referencia_firmada();
CREATE OR REPLACE FUNCTION atencion_adendas_referencia_firmada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  estado_atencion text;
  profesional uuid;
BEGIN
  SELECT estado, profesional_id
    INTO estado_atencion, profesional
    FROM atenciones
   WHERE id = NEW.atencion_id
     AND tenant_id = NEW.tenant_id;
  IF estado_atencion IS DISTINCT FROM 'firmado' THEN
    RAISE EXCEPTION 'solo se adenda una atencion firmada'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.autor_id IS DISTINCT FROM NEW.firmado_por THEN
    RAISE EXCEPTION 'el autor de la adenda es quien firma'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.tipo_nota = 'correccion' AND NEW.autor_id IS DISTINCT FROM profesional THEN
    RAISE EXCEPTION 'otro profesional deja nota complementaria'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.tipo_nota = 'complementaria' AND NEW.autor_id IS NOT DISTINCT FROM profesional THEN
    RAISE EXCEPTION 'el profesional de la atencion corrige con tipo correccion'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TABLE atencion_adendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  atencion_id uuid NOT NULL REFERENCES atenciones(id),
  numero integer NOT NULL,
  campo_ref text NOT NULL,
  valor_anterior_ref text NOT NULL,
  nuevo_valor text NOT NULL,
  motivo text NOT NULL,
  autor_id uuid NOT NULL REFERENCES usuarios(id),
  tipo_nota text NOT NULL,
  estado text DEFAULT 'borrador' NOT NULL,
  contenido text NOT NULL,
  firmado_por uuid REFERENCES usuarios(id),
  firmado_en timestamptz,
  hash_contenido text,
  firma_documento_id uuid NOT NULL REFERENCES documentos_firma(id),
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT atencion_adendas_numero_positivo CHECK (numero >= 1),
  CONSTRAINT atencion_adendas_campo_valido CHECK (campo_ref in (
    'esfera_od', 'cilindro_od', 'eje_od', 'adicion_od', 'agudeza_od',
    'esfera_oi', 'cilindro_oi', 'eje_oi', 'adicion_oi', 'agudeza_oi',
    'dip', 'dip_monocular_od', 'dip_monocular_oi'
  )),
  CONSTRAINT atencion_adendas_tipo_valido CHECK (tipo_nota in ('correccion', 'complementaria')),
  CONSTRAINT atencion_adendas_estado_valido CHECK (estado in ('borrador', 'firmada')),
  CONSTRAINT atencion_adendas_motivo_no_vacio CHECK (length(btrim(motivo)) > 0),
  CONSTRAINT atencion_adendas_valor_no_vacio CHECK (length(btrim(nuevo_valor)) > 0),
  CONSTRAINT atencion_adendas_ref_valida CHECK (
    valor_anterior_ref ~ '^(examenes_optometricos\.[a-z_]+|atencion_adendas:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
  )
);
--> statement-breakpoint
CREATE INDEX atencion_adendas_tenant_id_idx ON atencion_adendas (tenant_id);
--> statement-breakpoint
CREATE INDEX atencion_adendas_atencion_id_idx ON atencion_adendas (atencion_id);
--> statement-breakpoint
CREATE UNIQUE INDEX atencion_adendas_numero_unico ON atencion_adendas (atencion_id, numero);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON atencion_adendas TO optisaas_app;
--> statement-breakpoint
ALTER TABLE atencion_adendas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE atencion_adendas FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY atencion_adendas_tenant_app ON atencion_adendas FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
DROP TRIGGER IF EXISTS atencion_adendas_referencia ON atencion_adendas;
--> statement-breakpoint
CREATE TRIGGER atencion_adendas_referencia
  BEFORE INSERT OR UPDATE ON atencion_adendas
  FOR EACH ROW EXECUTE FUNCTION atencion_adendas_referencia_firmada();
--> statement-breakpoint
REVOKE ALL ON FUNCTION atencion_adendas_referencia_firmada() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION atencion_adendas_referencia_firmada() TO optisaas_app;
--> statement-breakpoint
SELECT aplicar_marco_inmutabilidad('public.atencion_adendas'::regclass);
