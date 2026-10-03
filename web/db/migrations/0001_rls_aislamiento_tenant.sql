-- PLT-01 (T04) — Aislamiento multi-tenant con RLS forzado.
-- Solo datos sintéticos; nunca datos reales de pacientes.
--
-- 1. Rol de aplicación `optisaas_app`: NOLOGIN, sin superusuario y sin
--    salto de RLS. La conexión de producción usa este rol; las migraciones
--    corren con el dueño (superusuario en desarrollo/CI), que queda sujeto
--    a las políticas por el FORCE de abajo.
-- 2. `ENABLE` + `FORCE ROW LEVEL SECURITY` en las 5 tablas del núcleo.
--    `tenants` no tiene `tenant_id` (es la raíz): su política deja ver solo
--    la fila propia (`id = app.tenant_id`); sin contexto devuelve 0 filas.
-- 3. Comparaciones en texto (`::text = current_setting(...)`) para no
--    filtrar existencia con errores de conversión: sin contexto o con otro
--    tenant el resultado es 0 filas, nunca un error de permisos.
-- 4. Tablas por sede (hoy solo `membresias`, que tiene `sede_id`): exigen
--    además `sede_id` dentro de la lista `app.sedes` (CSV de UUID). `sedes`
--    permite INSERT por tenant (alta de sedes) pero leer/modificar/borrar
--    solo filas de sedes autorizadas.
-- El contexto lo fija `withTenantTx` (`web/db/tenant.ts`) con SET LOCAL de
-- `app.tenant_id`, `app.usuario_id`, `app.sede_id`, `app.sedes`, `app.rol`
-- (más el alias `app.role` de la spec). TODO(Q-06): el usuario de conexión
-- de producción (residencia y secreto fuera del repo) llega con T05.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'optisaas_app') THEN
    CREATE ROLE optisaas_app NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, sedes, usuarios, membresias, sesiones TO optisaas_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO optisaas_app;
--> statement-breakpoint
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE sedes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE membresias ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE membresias FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE sesiones FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenants_propia_app ON tenants FOR ALL TO optisaas_app
  USING (id::text = current_setting('app.tenant_id', true))
  WITH CHECK (id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY sedes_consulta_app ON sedes FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  );
--> statement-breakpoint
CREATE POLICY sedes_insercion_app ON sedes FOR INSERT TO optisaas_app
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY sedes_cambio_app ON sedes FOR UPDATE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  );
--> statement-breakpoint
CREATE POLICY sedes_borrado_app ON sedes FOR DELETE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  );
--> statement-breakpoint
CREATE POLICY usuarios_tenant_app ON usuarios FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY membresias_sede_app ON membresias FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
  );
--> statement-breakpoint
CREATE POLICY sesiones_tenant_app ON sesiones FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
