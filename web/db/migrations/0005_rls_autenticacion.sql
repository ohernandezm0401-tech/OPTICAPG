-- SEG-01 (T07) — RLS ENABLE + FORCE en las tablas nuevas con tenant_id,
-- y funciones de inicio de sesión. El rol `optisaas_app` no es superusuario
-- ni tiene salto de RLS. Las funciones son SECURITY DEFINER (las crea el dueño
-- de la migración) para buscar por correo antes de conocer el tenant y para
-- registrar un evento sin cuenta, sin desactivar RLS.
CREATE INDEX "usuarios_email_lower_idx" ON "usuarios" (lower("email"));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON eventos_autenticacion, historial_contrasenas TO optisaas_app;
--> statement-breakpoint
ALTER TABLE eventos_autenticacion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE eventos_autenticacion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE historial_contrasenas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE historial_contrasenas FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY eventos_autenticacion_app ON eventos_autenticacion FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY historial_contrasenas_app ON historial_contrasenas FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION buscar_usuarios_por_correo(p_correo text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  email text,
  hash_password text,
  estado text,
  intentos_fallidos integer,
  nivel_bloqueo integer,
  bloqueado_hasta timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.tenant_id, u.email, u.hash_password, u.estado,
         u.intentos_fallidos, u.nivel_bloqueo, u.bloqueado_hasta
    FROM usuarios u
   WHERE lower(u.email) = lower(p_correo)
     AND u.estado <> 'desactivado';
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION membresias_para_inicio(p_usuario uuid)
RETURNS TABLE (sede_id uuid, rol text, tenant_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.sede_id, m.rol, m.tenant_id
    FROM membresias m
   WHERE m.usuario_id = p_usuario;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION parametro_vigente(p_tenant uuid, p_clave text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.valor
    FROM parametros_tenant p
   WHERE p.tenant_id = p_tenant
     AND p.clave = p_clave
     AND p.vigente_hasta IS NULL
   ORDER BY p.vigente_desde DESC
   LIMIT 1;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION registrar_evento_autenticacion(
  p_tenant uuid,
  p_usuario uuid,
  p_tipo text,
  p_correo text,
  p_ip text,
  p_cuando timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nuevo uuid;
BEGIN
  INSERT INTO eventos_autenticacion (tenant_id, usuario_id, tipo, correo, direccion_ip, creado_en)
  VALUES (p_tenant, p_usuario, p_tipo, p_correo, p_ip, COALESCE(p_cuando, now()))
  RETURNING id INTO nuevo;
  RETURN nuevo;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION buscar_usuarios_por_correo(text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION membresias_para_inicio(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION parametro_vigente(uuid, text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION registrar_evento_autenticacion(uuid, uuid, text, text, text, timestamptz) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION buscar_usuarios_por_correo(text) TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION membresias_para_inicio(uuid) TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION parametro_vigente(uuid, text) TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION registrar_evento_autenticacion(uuid, uuid, text, text, text, timestamptz) TO optisaas_app;
