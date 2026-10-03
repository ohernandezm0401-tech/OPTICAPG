-- ADM-01 (T16) — Extiende `sedes` (T03). No se duplica la tabla.
-- `tipo` ya es el tipo de establecimiento (§10.3). El prompt de T16 dice
-- «laboratorio»; la spec y AC-ADM-01-4 usan `laboratorio_oftalmico`. Se
-- conserva el enum existente; no se agrega el valor `laboratorio`.
-- TODO(Q-01): el vencimiento no bloquea la atención clínica.
-- TODO(Q-19): director y responsable de tecnovigilancia sin valor por defecto.
-- TODO(Q-20): `reps_codigo` sigue libre, sin catálogo.
-- Rollback: DROP TABLE certificados_sede; DROP FUNCTION contar_sedes_de_director(uuid, uuid);
-- DROP FUNCTION sedes_autorizadas_usuario(); ALTER TABLE sedes DROP COLUMN
-- director_cientifico_id, DROP COLUMN responsable_tecnovigilancia_id,
-- DROP COLUMN certificado_numero, DROP COLUMN certificado_vence;
ALTER TABLE sedes
  ADD COLUMN director_cientifico_id uuid REFERENCES usuarios(id),
  ADD COLUMN responsable_tecnovigilancia_id uuid REFERENCES usuarios(id),
  ADD COLUMN certificado_numero text,
  ADD COLUMN certificado_vence date;
--> statement-breakpoint
CREATE INDEX sedes_director_cientifico_idx ON sedes (tenant_id, director_cientifico_id);
--> statement-breakpoint
CREATE TABLE certificados_sede (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  numero text NOT NULL,
  entidad text,
  expedido date,
  vence date NOT NULL,
  adjunto_id uuid,
  creado_en timestamptz DEFAULT now() NOT NULL,
  actualizado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT certificados_sede_tipo_valido CHECK (tipo in ('dispensacion', 'adecuacion', 'produccion'))
);
--> statement-breakpoint
CREATE INDEX certificados_sede_tenant_id_idx ON certificados_sede (tenant_id);
--> statement-breakpoint
CREATE INDEX certificados_sede_sede_id_idx ON certificados_sede (sede_id);
--> statement-breakpoint
CREATE UNIQUE INDEX certificados_sede_tipo_unico ON certificados_sede (sede_id, tipo);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON certificados_sede TO optisaas_app;
--> statement-breakpoint
ALTER TABLE certificados_sede ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE certificados_sede FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY certificados_sede_consulta_app ON certificados_sede FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  );
--> statement-breakpoint
CREATE POLICY certificados_sede_insercion_app ON certificados_sede FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  );
--> statement-breakpoint
CREATE POLICY certificados_sede_cambio_app ON certificados_sede FOR UPDATE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  );
--> statement-breakpoint
CREATE POLICY certificados_sede_borrado_app ON certificados_sede FOR DELETE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION contar_sedes_de_director(p_director uuid, p_excepto uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
    FROM sedes
   WHERE director_cientifico_id = p_director
     AND tenant_id::text = current_setting('app.tenant_id', true)
     AND (p_excepto IS NULL OR id <> p_excepto);
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION contar_sedes_de_director(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION contar_sedes_de_director(uuid, uuid) TO optisaas_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sedes_autorizadas_usuario()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(string_agg(sede_id::text, ','), '')
    FROM membresias
   WHERE tenant_id::text = current_setting('app.tenant_id', true)
     AND usuario_id::text = current_setting('app.usuario_id', true);
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sedes_autorizadas_usuario() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION sedes_autorizadas_usuario() TO optisaas_app;
