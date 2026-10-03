-- SEG-11 (T29) — Registro de incidentes de plataforma y aviso a cada óptica.
-- `incidentes`, `alertas_incidente`, `parametros_incidente` y
-- `operadores_plataforma` no llevan tenant_id: los opera el rol
-- `optisaas_incidente`. `optisaas_app` lo recibe con INHERIT FALSE y hace
-- SET ROLE. Ningún rol de esta migración tiene salto de RLS.
-- `incidentes_tenants` y `notificaciones_internas` sí llevan tenant_id,
-- con RLS ENABLE + FORCE, para que el admin vea solo su óptica.
-- Los textos no guardan datos personales de pacientes.
-- TODO(Q-07): el aviso a la óptica sigue en plazo_aviso_incidente, sin valor.
-- TODO(Q-32): si no hay festivos, el plazo excluye solo sábado y domingo.
-- BORRADOR – requiere revisión jurídica. El sistema no envía nada a la SIC.
-- Rollback: DROP TABLE notificaciones_internas, incidentes_tenants,
-- alertas_incidente, incidentes, operadores_plataforma, parametros_incidente;
CREATE TABLE parametros_incidente (
  clave text PRIMARY KEY,
  valor text,
  fuente text,
  rotulo text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parametros_incidente_clave CHECK (clave = 'plazo_sic_dias_habiles'),
  CONSTRAINT parametros_incidente_forma CHECK (
    valor ~ '^[1-9][0-9]{0,2}$' AND rotulo = 'verificado' AND fuente IS NOT NULL
  )
);
--> statement-breakpoint
INSERT INTO parametros_incidente (clave, valor, fuente, rotulo) VALUES
  (
    'plazo_sic_dias_habiles',
    '15',
    'Circular Única SIC Título V 2.1.f(ii), versión Res. SIC 56579/2025 (spec SEG-11)',
    'verificado'
  );
  -- TODO(Q-07): el aviso a la óptica no se siembra aquí. Sigue en
  -- parametros_tenant.plazo_aviso_incidente, sin valor (T06).
--> statement-breakpoint
CREATE TABLE operadores_plataforma (
  usuario_id uuid PRIMARY KEY REFERENCES usuarios (id),
  rol text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operadores_plataforma_rol CHECK (rol IN ('owner_plataforma', 'soporte_plataforma'))
);
--> statement-breakpoint
CREATE TABLE incidentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detectado_en timestamptz NOT NULL,
  dia_deteccion date NOT NULL,
  descripcion text NOT NULL,
  alcance text NOT NULL,
  datos_afectados text NOT NULL,
  severidad text NOT NULL,
  causa text,
  contencion text,
  cierre_nota text,
  estado text NOT NULL DEFAULT 'detectado',
  notif_responsable_en timestamptz,
  reporte_sic_en timestamptz,
  cerrado_en timestamptz,
  plazo_sic date NOT NULL,
  plazo_sic_dias integer NOT NULL,
  fuente_plazo text NOT NULL,
  festivos_cargados boolean NOT NULL,
  aviso_festivos text,
  festivos_aplicados jsonb NOT NULL,
  creado_por uuid,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incidentes_estado CHECK (
    estado IN ('detectado', 'contenido', 'notificado_responsable', 'reportado_sic', 'cerrado')
  ),
  CONSTRAINT incidentes_plazo_positivo CHECK (plazo_sic_dias > 0),
  CONSTRAINT incidentes_textos CHECK (
    char_length(descripcion) BETWEEN 1 AND 500
    AND char_length(alcance) BETWEEN 1 AND 500
    AND char_length(datos_afectados) BETWEEN 1 AND 500
    AND char_length(severidad) BETWEEN 1 AND 80
  )
);
--> statement-breakpoint
CREATE TABLE alertas_incidente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id uuid NOT NULL REFERENCES incidentes (id),
  codigo text NOT NULL,
  dias_habiles_antes integer NOT NULL,
  fecha date NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alertas_incidente_codigo CHECK (codigo IN ('T-5', 'T-2', 'T-0')),
  CONSTRAINT alertas_incidente_dias CHECK (dias_habiles_antes IN (5, 2, 0)),
  CONSTRAINT alertas_incidente_unica UNIQUE (incidente_id, codigo)
);
--> statement-breakpoint
CREATE TABLE incidentes_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id uuid NOT NULL REFERENCES incidentes (id),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  notificado_en timestamptz NOT NULL,
  aviso_borrador text NOT NULL,
  dia_deteccion date NOT NULL,
  plazo_sic date NOT NULL,
  plazo_sic_dias integer NOT NULL,
  fuente_plazo text NOT NULL,
  festivos_cargados boolean NOT NULL,
  aviso_festivos text,
  alertas jsonb NOT NULL,
  descripcion text NOT NULL,
  alcance text NOT NULL,
  datos_afectados text NOT NULL,
  severidad text NOT NULL,
  estado text NOT NULL,
  CONSTRAINT incidentes_tenants_unico UNIQUE (incidente_id, tenant_id),
  CONSTRAINT incidentes_tenants_borrador CHECK (
    aviso_borrador LIKE 'BORRADOR – requiere revisión jurídica%'
  ),
  CONSTRAINT incidentes_tenants_estado CHECK (
    estado IN ('detectado', 'contenido', 'notificado_responsable', 'reportado_sic', 'cerrado')
  )
);
--> statement-breakpoint
CREATE INDEX incidentes_tenants_tenant_id_idx ON incidentes_tenants (tenant_id);
--> statement-breakpoint
CREATE TABLE notificaciones_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  usuario_id uuid NOT NULL REFERENCES usuarios (id),
  incidente_id uuid NOT NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  cuerpo text NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notificaciones_internas_tipo CHECK (tipo = 'aviso_incidente'),
  CONSTRAINT notificaciones_internas_borrador CHECK (
    cuerpo LIKE 'BORRADOR – requiere revisión jurídica%'
  )
);
--> statement-breakpoint
CREATE INDEX notificaciones_internas_tenant_id_idx ON notificaciones_internas (tenant_id);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'optisaas_incidente') THEN
    CREATE ROLE optisaas_incidente NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
REVOKE optisaas_incidente FROM optisaas_app;
--> statement-breakpoint
GRANT optisaas_incidente TO optisaas_app WITH INHERIT FALSE;
--> statement-breakpoint
REVOKE ALL ON parametros_incidente, operadores_plataforma, incidentes, alertas_incidente,
  incidentes_tenants, notificaciones_internas FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON parametros_incidente, operadores_plataforma, incidentes, alertas_incidente,
  incidentes_tenants, notificaciones_internas FROM optisaas_app;
--> statement-breakpoint
GRANT SELECT ON incidentes_tenants, notificaciones_internas TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON parametros_incidente, operadores_plataforma, incidentes,
  alertas_incidente, incidentes_tenants, notificaciones_internas TO optisaas_incidente;
--> statement-breakpoint
ALTER TABLE parametros_incidente ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE parametros_incidente FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE operadores_plataforma ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE operadores_plataforma FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE incidentes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE incidentes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE alertas_incidente ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE alertas_incidente FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE incidentes_tenants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE incidentes_tenants FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE notificaciones_internas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE notificaciones_internas FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY parametros_incidente_plataforma ON parametros_incidente
  FOR ALL TO optisaas_incidente
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY operadores_plataforma_plataforma ON operadores_plataforma
  FOR ALL TO optisaas_incidente
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY incidentes_plataforma ON incidentes
  FOR ALL TO optisaas_incidente
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY alertas_incidente_plataforma ON alertas_incidente
  FOR ALL TO optisaas_incidente
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY incidentes_tenants_plataforma ON incidentes_tenants
  FOR ALL TO optisaas_incidente
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY incidentes_tenants_admin ON incidentes_tenants
  FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) = 'admin'
  );
--> statement-breakpoint
CREATE POLICY notificaciones_internas_plataforma ON notificaciones_internas
  FOR ALL TO optisaas_incidente
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY notificaciones_internas_admin ON notificaciones_internas
  FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) = 'admin'
    AND usuario_id::text = current_setting('app.usuario_id', true)
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION rol_operador_plataforma(p_usuario uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM operadores_plataforma WHERE usuario_id = p_usuario;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION admins_activos_tenant(p_tenant uuid)
RETURNS TABLE (usuario_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT m.usuario_id
    FROM membresias m
    JOIN usuarios u ON u.id = m.usuario_id
   WHERE m.tenant_id = p_tenant
     AND m.rol = 'admin'
     AND u.estado = 'activo';
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION nombre_tenant_incidente(p_tenant uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT razon_social FROM tenants WHERE id = p_tenant;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION listar_opticas_incidente()
RETURNS TABLE (id uuid, razon_social text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.razon_social
    FROM tenants t
   WHERE t.estado <> 'cerrado'
   ORDER BY t.razon_social;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION rol_operador_plataforma(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admins_activos_tenant(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION nombre_tenant_incidente(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION listar_opticas_incidente() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION rol_operador_plataforma(uuid) TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admins_activos_tenant(uuid) TO optisaas_incidente;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION nombre_tenant_incidente(uuid) TO optisaas_incidente;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION listar_opticas_incidente() TO optisaas_incidente;
