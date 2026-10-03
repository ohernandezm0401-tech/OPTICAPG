-- SEG-02 (T09) — Tablas de autorización y RLS ENABLE + FORCE.
CREATE TABLE "permisos_extra" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE cascade,
  "sede_id" uuid REFERENCES "sedes"("id") ON DELETE cascade,
  "recurso" text NOT NULL,
  "accion" text NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "permisos_extra_recurso_valido" CHECK ("recurso" in ('R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11','R12','R13','R14','R15','R16','R17','R18','R19','R20','R21','R22','R23','R24')),
  CONSTRAINT "permisos_extra_accion_valida" CHECK ("accion" in ('crear','leer','actualizar','firmar','anular','exportar','solicitar'))
);
--> statement-breakpoint
CREATE INDEX "permisos_extra_tenant_id_idx" ON "permisos_extra" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "permisos_extra_usuario_id_idx" ON "permisos_extra" ("usuario_id");
--> statement-breakpoint
CREATE INDEX "permisos_extra_sede_id_idx" ON "permisos_extra" ("sede_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "permisos_extra_unico" ON "permisos_extra" ("usuario_id","sede_id","recurso","accion");
--> statement-breakpoint
CREATE TABLE "intentos_autorizacion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE cascade,
  "rol" text NOT NULL,
  "sede_id" uuid REFERENCES "sedes"("id"),
  "recurso" text NOT NULL,
  "recurso_id" text,
  "accion" text NOT NULL,
  "resultado" text DEFAULT 'denegado' NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "intentos_autorizacion_resultado_valido" CHECK ("resultado" = 'denegado'),
  CONSTRAINT "intentos_autorizacion_accion_valida" CHECK ("accion" in ('crear','leer','actualizar','firmar','anular','exportar','solicitar','cambiar_sede'))
);
--> statement-breakpoint
CREATE INDEX "intentos_autorizacion_tenant_id_idx" ON "intentos_autorizacion" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "intentos_autorizacion_usuario_id_idx" ON "intentos_autorizacion" ("usuario_id");
--> statement-breakpoint
-- RLS ENABLE + FORCE. El rol optisaas_app no es superusuario ni tiene salto de RLS.
-- El rol optisaas_app no es superusuario ni tiene salto de RLS.
-- `permisos_extra` espeja R18: admin escribe en sus sedes; el perfil propio
-- solo lee su fila; owner y soporte leen metadatos de las sedes del contexto;
-- auditor no lee. `intentos_autorizacion` solo inserta el propio intento y
-- no tiene política de UPDATE ni DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE ON permisos_extra TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON intentos_autorizacion TO optisaas_app;
--> statement-breakpoint
ALTER TABLE permisos_extra ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE permisos_extra FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE intentos_autorizacion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE intentos_autorizacion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY permisos_extra_lectura_app ON permisos_extra FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND (
      sede_id IS NULL
      OR sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
    )
    AND (
      current_setting('app.rol', true) IN ('admin', 'owner_plataforma', 'owner', 'soporte_plataforma', 'soporte')
      OR (
        usuario_id::text = current_setting('app.usuario_id', true)
        AND current_setting('app.rol', true) IN (
          'asesor', 'optometra', 'oftalmologo', 'director_cientifico', 'auxiliar_clinico', 'tecnico_lab'
        )
      )
    )
  );
--> statement-breakpoint
CREATE POLICY permisos_extra_escritura_app ON permisos_extra FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
    AND current_setting('app.rol', true) = 'admin'
  );
--> statement-breakpoint
CREATE POLICY permisos_extra_cambio_app ON permisos_extra FOR UPDATE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
    AND current_setting('app.rol', true) = 'admin'
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
    AND current_setting('app.rol', true) = 'admin'
  );
--> statement-breakpoint
CREATE POLICY intentos_autorizacion_lectura_app ON intentos_autorizacion FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND (
      sede_id IS NULL
      OR sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
    )
    AND (
      current_setting('app.rol', true) IN ('admin', 'auditor')
      OR usuario_id::text = current_setting('app.usuario_id', true)
    )
  );
--> statement-breakpoint
CREATE POLICY intentos_autorizacion_insercion_app ON intentos_autorizacion FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND usuario_id::text = current_setting('app.usuario_id', true)
    AND (
      sede_id IS NULL
      OR sede_id::text = ANY (string_to_array(current_setting('app.sedes', true), ','))
    )
  );
