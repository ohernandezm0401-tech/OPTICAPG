-- ADM-02 (T17) — Extiende `perfiles_profesionales` (T14) y agrega la
-- invitación de un solo uso. No se crea `usuarios_sedes`: el rol por sede
-- sigue en `membresias`. No se duplica `usuarios`.
-- La verificación del registro es manual. TODO(NV-23): no hay API oficial.
-- `vigente_hasta` y `entidad` no tienen valor por defecto.
-- Rollback: DROP TABLE invitaciones_usuario; ALTER TABLE perfiles_profesionales
-- DROP COLUMN tipo, DROP COLUMN documento, DROP COLUMN entidad,
-- DROP COLUMN firma_png_cifrada, DROP COLUMN estado;
ALTER TABLE perfiles_profesionales
  ADD COLUMN tipo text,
  ADD COLUMN documento text,
  ADD COLUMN entidad text,
  ADD COLUMN firma_png_cifrada text,
  ADD COLUMN estado text NOT NULL DEFAULT 'pendiente';
--> statement-breakpoint
ALTER TABLE perfiles_profesionales
  ADD CONSTRAINT perfiles_profesionales_tipo_valido
    CHECK (tipo is null or tipo in ('optometra', 'oftalmologo')),
  ADD CONSTRAINT perfiles_profesionales_estado_valido
    CHECK (estado in ('pendiente', 'verificado', 'no_vigente'));
--> statement-breakpoint
CREATE TABLE invitaciones_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  token_hash text NOT NULL,
  expira_en timestamptz NOT NULL,
  usada_en timestamptz,
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT invitaciones_usuario_hash CHECK (token_hash ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE INDEX invitaciones_usuario_tenant_id_idx ON invitaciones_usuario (tenant_id);
--> statement-breakpoint
CREATE INDEX invitaciones_usuario_usuario_id_idx ON invitaciones_usuario (usuario_id);
--> statement-breakpoint
CREATE UNIQUE INDEX invitaciones_usuario_token_hash_unico ON invitaciones_usuario (token_hash);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON invitaciones_usuario TO optisaas_app;
--> statement-breakpoint
ALTER TABLE invitaciones_usuario ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE invitaciones_usuario FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY invitaciones_usuario_tenant_app ON invitaciones_usuario FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION buscar_invitacion_por_hash(p_hash text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  usuario_id uuid,
  expira_en timestamptz,
  usada_en timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tenant_id, usuario_id, expira_en, usada_en
    FROM invitaciones_usuario
   WHERE token_hash = p_hash;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION buscar_invitacion_por_hash(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION buscar_invitacion_por_hash(text) TO optisaas_app;
