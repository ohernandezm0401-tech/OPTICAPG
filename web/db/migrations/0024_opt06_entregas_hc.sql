-- OPT-06 (T25) — Copia electrónica gratuita de la HC al titular o representante.
-- RLS ENABLE + FORCE. La entrega a terceros no se modela: queda para SEG-14.
-- TODO(Q-07): expira_en nace nulo; no hay plazo por defecto.
-- TODO(Q-22): el PDF no es PDF/A.
-- BORRADOR – requiere revisión jurídica.
-- Rollback: DROP TABLE codigos_entrega_hc, entregas_hc CASCADE;
-- DROP FUNCTION entregas_hc_antes();
CREATE TABLE entregas_hc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  solicitante text NOT NULL,
  representante_id uuid REFERENCES representantes(id),
  medio text NOT NULL,
  estado text DEFAULT 'solicitada' NOT NULL,
  archivo_id uuid REFERENCES anexos(id),
  hash_pdf text,
  entregada_en timestamptz,
  entregada_por uuid REFERENCES usuarios(id),
  costo_cop integer DEFAULT 0 NOT NULL,
  expira_en timestamptz,
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT entregas_hc_solicitante_valido CHECK (solicitante in ('titular', 'representante')),
  CONSTRAINT entregas_hc_representante_coherente CHECK (
    (solicitante = 'titular' AND representante_id IS NULL)
    OR (solicitante = 'representante' AND representante_id IS NOT NULL)
  ),
  CONSTRAINT entregas_hc_medio_electronico CHECK (medio = 'electronico'),
  CONSTRAINT entregas_hc_estado_valido CHECK (estado in ('solicitada', 'generada', 'entregada')),
  CONSTRAINT entregas_hc_hash CHECK (hash_pdf IS NULL OR hash_pdf ~ '^[a-f0-9]{64}$'),
  CONSTRAINT entregas_hc_gratuita CHECK (costo_cop = 0),
  CONSTRAINT entregas_hc_entrega_completa CHECK (
    estado <> 'entregada'
    OR (archivo_id IS NOT NULL AND hash_pdf IS NOT NULL AND entregada_en IS NOT NULL AND entregada_por IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE INDEX entregas_hc_tenant_id_idx ON entregas_hc (tenant_id);
--> statement-breakpoint
CREATE INDEX entregas_hc_paciente_id_idx ON entregas_hc (paciente_id);
--> statement-breakpoint
CREATE TABLE codigos_entrega_hc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id),
  entrega_id uuid NOT NULL REFERENCES entregas_hc(id),
  codigo_hash text NOT NULL,
  canal text NOT NULL,
  expira_en timestamptz NOT NULL,
  usado_en timestamptz,
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT codigos_entrega_hc_hash CHECK (codigo_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT codigos_entrega_hc_canal CHECK (canal = 'correo')
);
--> statement-breakpoint
CREATE INDEX codigos_entrega_hc_tenant_id_idx ON codigos_entrega_hc (tenant_id);
--> statement-breakpoint
CREATE INDEX codigos_entrega_hc_entrega_id_idx ON codigos_entrega_hc (entrega_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION entregas_hc_antes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'la entrega de la hc no se borra'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.estado = 'entregada' THEN
    RAISE EXCEPTION 'entrega registrada inmutable'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.estado = 'solicitada' AND NEW.estado NOT IN ('solicitada', 'generada') THEN
    RAISE EXCEPTION 'transicion de estado no permitida'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.estado = 'generada' AND NEW.estado NOT IN ('generada', 'entregada') THEN
    RAISE EXCEPTION 'transicion de estado no permitida'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.paciente_id IS DISTINCT FROM OLD.paciente_id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.costo_cop IS DISTINCT FROM OLD.costo_cop
     OR NEW.solicitante IS DISTINCT FROM OLD.solicitante THEN
    RAISE EXCEPTION 'la entrega no cambia de paciente ni de costo'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS entregas_hc_antes ON entregas_hc;
--> statement-breakpoint
CREATE TRIGGER entregas_hc_antes
  BEFORE UPDATE OR DELETE ON entregas_hc
  FOR EACH ROW EXECUTE FUNCTION entregas_hc_antes();
--> statement-breakpoint
REVOKE ALL ON FUNCTION entregas_hc_antes() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION entregas_hc_antes() TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON entregas_hc, codigos_entrega_hc TO optisaas_app;
--> statement-breakpoint
REVOKE DELETE ON entregas_hc, codigos_entrega_hc FROM optisaas_app;
--> statement-breakpoint
ALTER TABLE entregas_hc ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE entregas_hc FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE codigos_entrega_hc ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE codigos_entrega_hc FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY entregas_hc_tenant_app ON entregas_hc FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
--> statement-breakpoint
CREATE POLICY codigos_entrega_hc_tenant_app ON codigos_entrega_hc FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
