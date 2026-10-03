-- OPT-04 (T22) — Consentimiento informado clínico.
-- RLS ENABLE + FORCE en cada tabla con tenant_id.
-- Plantilla versionada al estilo de T15. La fila firmada usa el marco de T12.
-- La revocatoria es otra fila: no borra ni edita el original.
-- TODO(Q-17): la negativa de datos no bloquea la atención; este procedimiento
-- sí exige el consentimiento vigente. BORRADOR – requiere revisión jurídica.
-- TODO(Q-22): el PDF no es PDF/A. El hash es SHA-256 del archivo.
-- Rollback: DROP TABLE consentimientos_revocatorias, consentimientos,
-- plantillas_consentimiento CASCADE; DROP FUNCTION
-- plantillas_consentimiento_proteger() y consentimientos_coherencia()
-- y consentimientos_revocatorias_proteger(); restaurar los CHECK de
-- documentos_firma y firmas sin consentimiento_clinico.
ALTER TABLE documentos_firma DROP CONSTRAINT documentos_firma_tipo_valido;
--> statement-breakpoint
ALTER TABLE documentos_firma ADD CONSTRAINT documentos_firma_tipo_valido
  CHECK (tipo in ('ejemplo_sintetico', 'autorizacion_datos', 'atencion_clinica', 'consentimiento_clinico'));
--> statement-breakpoint
ALTER TABLE firmas DROP CONSTRAINT firmas_documento_tipo_valido;
--> statement-breakpoint
ALTER TABLE firmas ADD CONSTRAINT firmas_documento_tipo_valido
  CHECK (documento_tipo in ('ejemplo_sintetico', 'autorizacion_datos', 'atencion_clinica', 'consentimiento_clinico'));
--> statement-breakpoint
CREATE TABLE plantillas_consentimiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  procedimiento text NOT NULL,
  version integer NOT NULL,
  texto text NOT NULL,
  hash text NOT NULL,
  vigente boolean DEFAULT true NOT NULL,
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT plantillas_consentimiento_procedimiento_valido CHECK (
    procedimiento in ('adaptacion_lc', 'dilatacion', 'tonometria', 'terapia_visual', 'protesis_ocular')
  ),
  CONSTRAINT plantillas_consentimiento_version_positiva CHECK (version >= 1),
  CONSTRAINT plantillas_consentimiento_hash CHECK (hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT plantillas_consentimiento_texto_no_vacio CHECK (length(btrim(texto)) > 0)
);
--> statement-breakpoint
CREATE INDEX plantillas_consentimiento_tenant_id_idx ON plantillas_consentimiento (tenant_id);
--> statement-breakpoint
CREATE UNIQUE INDEX plantillas_consentimiento_version_unica
  ON plantillas_consentimiento (tenant_id, procedimiento, version);
--> statement-breakpoint
CREATE UNIQUE INDEX plantillas_consentimiento_vigente_unica
  ON plantillas_consentimiento (tenant_id, procedimiento) WHERE vigente;
--> statement-breakpoint
CREATE TABLE consentimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  atencion_id uuid NOT NULL REFERENCES atenciones(id),
  plantilla_id uuid NOT NULL REFERENCES plantillas_consentimiento(id),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  procedimiento text NOT NULL,
  version_plantilla integer NOT NULL,
  hash_plantilla text NOT NULL,
  firmante text NOT NULL,
  representante_id uuid REFERENCES pacientes_representantes(id),
  firma_id uuid REFERENCES firmas(id),
  otorgado boolean NOT NULL,
  documento_firma_id uuid REFERENCES documentos_firma(id),
  anexo_id uuid REFERENCES anexos(id),
  hash_anexo text,
  estado text DEFAULT 'firmado' NOT NULL,
  contenido text NOT NULL,
  firmado_por uuid REFERENCES usuarios(id),
  firmado_en timestamptz,
  hash_contenido text,
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT consentimientos_procedimiento_valido CHECK (
    procedimiento in ('adaptacion_lc', 'dilatacion', 'tonometria', 'terapia_visual', 'protesis_ocular')
  ),
  CONSTRAINT consentimientos_version_positiva CHECK (version_plantilla >= 1),
  CONSTRAINT consentimientos_hash_plantilla CHECK (hash_plantilla ~ '^[a-f0-9]{64}$'),
  CONSTRAINT consentimientos_firmante_valido CHECK (firmante in ('paciente', 'representante')),
  CONSTRAINT consentimientos_estado_valido CHECK (estado in ('borrador', 'firmado')),
  CONSTRAINT consentimientos_hash_anexo CHECK (hash_anexo is null or hash_anexo ~ '^[a-f0-9]{64}$'),
  CONSTRAINT consentimientos_otorgado_coherente CHECK (
    (
      otorgado = true
      AND firma_id IS NOT NULL
      AND documento_firma_id IS NOT NULL
      AND anexo_id IS NOT NULL
      AND hash_anexo ~ '^[a-f0-9]{64}$'
    )
    OR (
      otorgado = false
      AND firma_id IS NULL
      AND documento_firma_id IS NULL
      AND anexo_id IS NULL
      AND hash_anexo IS NULL
    )
  ),
  CONSTRAINT consentimientos_firmante_coherente CHECK (
    (firmante = 'representante' AND representante_id IS NOT NULL)
    OR (firmante = 'paciente' AND representante_id IS NULL)
  )
);
--> statement-breakpoint
CREATE INDEX consentimientos_tenant_id_idx ON consentimientos (tenant_id);
--> statement-breakpoint
CREATE INDEX consentimientos_atencion_id_idx ON consentimientos (atencion_id);
--> statement-breakpoint
CREATE INDEX consentimientos_paciente_id_idx ON consentimientos (paciente_id);
--> statement-breakpoint
CREATE TABLE consentimientos_revocatorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  consentimiento_id uuid NOT NULL REFERENCES consentimientos(id),
  registrada_por uuid NOT NULL REFERENCES usuarios(id),
  registrada_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT consentimientos_revocatorias_unica UNIQUE (consentimiento_id)
);
--> statement-breakpoint
CREATE INDEX consentimientos_revocatorias_tenant_id_idx ON consentimientos_revocatorias (tenant_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION plantillas_consentimiento_proteger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'la plantilla versionada no se borra' USING ERRCODE = '55000';
  END IF;
  IF NEW.texto IS DISTINCT FROM OLD.texto
     OR NEW.hash IS DISTINCT FROM OLD.hash
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.procedimiento IS DISTINCT FROM OLD.procedimiento
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'la plantilla versionada no se altera; cree una version nueva' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER plantillas_consentimiento_proteger
  BEFORE UPDATE OR DELETE ON plantillas_consentimiento
  FOR EACH ROW
  EXECUTE FUNCTION plantillas_consentimiento_proteger();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION consentimientos_coherencia()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  paciente uuid;
  texto_plantilla text;
  version_plantilla integer;
  hash_plantilla text;
  procedimiento_plantilla text;
  paciente_vinculo uuid;
BEGIN
  SELECT a.paciente_id INTO paciente
    FROM atenciones a
   WHERE a.id = NEW.atencion_id
     AND a.tenant_id = NEW.tenant_id;
  IF paciente IS NULL OR paciente IS DISTINCT FROM NEW.paciente_id THEN
    RAISE EXCEPTION 'el consentimiento no corresponde a la atencion' USING ERRCODE = '55000';
  END IF;
  SELECT p.texto, p.version, p.hash, p.procedimiento
    INTO texto_plantilla, version_plantilla, hash_plantilla, procedimiento_plantilla
    FROM plantillas_consentimiento p
   WHERE p.id = NEW.plantilla_id
     AND p.tenant_id = NEW.tenant_id;
  IF texto_plantilla IS NULL
     OR texto_plantilla IS DISTINCT FROM NEW.contenido
     OR version_plantilla IS DISTINCT FROM NEW.version_plantilla
     OR hash_plantilla IS DISTINCT FROM NEW.hash_plantilla
     OR procedimiento_plantilla IS DISTINCT FROM NEW.procedimiento THEN
    RAISE EXCEPTION 'el consentimiento debe conservar la version firmada' USING ERRCODE = '55000';
  END IF;
  IF NEW.firmante = 'representante' THEN
    SELECT v.paciente_id INTO paciente_vinculo
      FROM pacientes_representantes v
     WHERE v.id = NEW.representante_id
       AND v.tenant_id = NEW.tenant_id
       AND v.vigente = true;
    IF paciente_vinculo IS DISTINCT FROM NEW.paciente_id THEN
      RAISE EXCEPTION 'el representante no esta vigente para el paciente' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER consentimientos_coherencia
  BEFORE INSERT OR UPDATE ON consentimientos
  FOR EACH ROW
  EXECUTE FUNCTION consentimientos_coherencia();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION consentimientos_revocatorias_proteger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  paciente uuid;
  otorgado boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'la revocatoria no se borra' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'la revocatoria no se altera' USING ERRCODE = '55000';
  END IF;
  SELECT c.paciente_id, c.otorgado
    INTO paciente, otorgado
    FROM consentimientos c
   WHERE c.id = NEW.consentimiento_id
     AND c.tenant_id = NEW.tenant_id;
  IF paciente IS NULL OR otorgado IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'solo se revoca un consentimiento otorgado' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER consentimientos_revocatorias_proteger
  BEFORE INSERT OR UPDATE OR DELETE ON consentimientos_revocatorias
  FOR EACH ROW
  EXECUTE FUNCTION consentimientos_revocatorias_proteger();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON plantillas_consentimiento, consentimientos, consentimientos_revocatorias TO optisaas_app;
--> statement-breakpoint
ALTER TABLE plantillas_consentimiento ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE plantillas_consentimiento FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE consentimientos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE consentimientos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE consentimientos_revocatorias ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE consentimientos_revocatorias FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY plantillas_consentimiento_lectura_app ON plantillas_consentimiento
  FOR SELECT TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY plantillas_consentimiento_alta_app ON plantillas_consentimiento
  FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('admin', 'optometra', 'oftalmologo', 'asesor', 'auxiliar_clinico')
  );
--> statement-breakpoint
CREATE POLICY plantillas_consentimiento_version_app ON plantillas_consentimiento
  FOR UPDATE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('admin', 'optometra', 'oftalmologo')
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('admin', 'optometra', 'oftalmologo')
  );
--> statement-breakpoint
CREATE POLICY consentimientos_tenant_app ON consentimientos
  FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY consentimientos_revocatorias_tenant_app ON consentimientos_revocatorias
  FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
REVOKE ALL ON FUNCTION plantillas_consentimiento_proteger() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION plantillas_consentimiento_proteger() TO optisaas_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION consentimientos_coherencia() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION consentimientos_coherencia() TO optisaas_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION consentimientos_revocatorias_proteger() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION consentimientos_revocatorias_proteger() TO optisaas_app;
--> statement-breakpoint
SELECT aplicar_marco_inmutabilidad('public.consentimientos'::regclass);
