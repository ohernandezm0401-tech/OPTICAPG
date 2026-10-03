CREATE TABLE "eventos_autenticacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"usuario_id" uuid,
	"tipo" text NOT NULL,
	"correo" text NOT NULL,
	"direccion_ip" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eventos_autenticacion_tipo_valido" CHECK ("eventos_autenticacion"."tipo" in ('inicio_fallido', 'cuenta_bloqueada', 'inicio_ok', 'sesion_revocada', 'sesion_rotada', 'cierre_todas', 'limite_ip', 'contrasena_actualizada'))
);
--> statement-breakpoint
CREATE TABLE "historial_contrasenas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"hash_password" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sesiones" ADD COLUMN "ultima_actividad_en" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sesiones" ADD COLUMN "inactividad_minutos" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "intentos_fallidos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "nivel_bloqueo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "bloqueado_hasta" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "ultimo_login" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "eventos_autenticacion" ADD CONSTRAINT "eventos_autenticacion_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_autenticacion" ADD CONSTRAINT "eventos_autenticacion_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_contrasenas" ADD CONSTRAINT "historial_contrasenas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_contrasenas" ADD CONSTRAINT "historial_contrasenas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eventos_autenticacion_tenant_id_idx" ON "eventos_autenticacion" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "eventos_autenticacion_usuario_id_idx" ON "eventos_autenticacion" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "eventos_autenticacion_ip_idx" ON "eventos_autenticacion" USING btree ("direccion_ip");--> statement-breakpoint
CREATE INDEX "historial_contrasenas_tenant_id_idx" ON "historial_contrasenas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "historial_contrasenas_usuario_id_idx" ON "historial_contrasenas" USING btree ("usuario_id");--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_inactividad_positiva" CHECK ("sesiones"."inactividad_minutos" > 0);--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_intentos_no_negativos" CHECK ("usuarios"."intentos_fallidos" >= 0);--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nivel_bloqueo_no_negativo" CHECK ("usuarios"."nivel_bloqueo" >= 0);