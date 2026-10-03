CREATE TABLE "codigos_recuperacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"hash_codigo" text NOT NULL,
	"usado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credenciales_webauthn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"credencial_id" text NOT NULL,
	"clave_publica" text NOT NULL,
	"contador" integer DEFAULT 0 NOT NULL,
	"transportes" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_uso_en" timestamp with time zone,
	CONSTRAINT "credenciales_webauthn_contador_no_negativo" CHECK ("credenciales_webauthn"."contador" >= 0)
);
--> statement-breakpoint
CREATE TABLE "desafios_mfa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"proposito" text NOT NULL,
	"secreto_pendiente" text,
	"codigos_hash" jsonb,
	"codigos_entregados" integer DEFAULT 0 NOT NULL,
	"desafio_webauthn" text,
	"direccion_ip" text,
	"expira_en" timestamp with time zone NOT NULL,
	"consumido_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "desafios_mfa_proposito_valido" CHECK ("desafios_mfa"."proposito" in ('enrolar', 'verificar', 'reautenticar', 'passkey_registro', 'passkey_auth'))
);
--> statement-breakpoint
CREATE TABLE "factores_totp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"secreto_protegido" text NOT NULL,
	"ultimo_paso" integer,
	"confirmado_en" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eventos_autenticacion" DROP CONSTRAINT "eventos_autenticacion_tipo_valido";--> statement-breakpoint
ALTER TABLE "sesiones" ADD COLUMN "mfa_verificada_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sesiones" ADD COLUMN "pase_hash" text;--> statement-breakpoint
ALTER TABLE "sesiones" ADD COLUMN "pase_consumido_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "codigos_recuperacion" ADD CONSTRAINT "codigos_recuperacion_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codigos_recuperacion" ADD CONSTRAINT "codigos_recuperacion_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credenciales_webauthn" ADD CONSTRAINT "credenciales_webauthn_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credenciales_webauthn" ADD CONSTRAINT "credenciales_webauthn_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desafios_mfa" ADD CONSTRAINT "desafios_mfa_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desafios_mfa" ADD CONSTRAINT "desafios_mfa_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factores_totp" ADD CONSTRAINT "factores_totp_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factores_totp" ADD CONSTRAINT "factores_totp_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigos_recuperacion_tenant_id_idx" ON "codigos_recuperacion" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "codigos_recuperacion_usuario_id_idx" ON "codigos_recuperacion" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "credenciales_webauthn_tenant_id_idx" ON "credenciales_webauthn" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "credenciales_webauthn_usuario_id_idx" ON "credenciales_webauthn" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credenciales_webauthn_credencial_unica" ON "credenciales_webauthn" USING btree ("credencial_id");--> statement-breakpoint
CREATE INDEX "desafios_mfa_tenant_id_idx" ON "desafios_mfa" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "desafios_mfa_usuario_id_idx" ON "desafios_mfa" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "factores_totp_tenant_id_idx" ON "factores_totp" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "factores_totp_usuario_unico" ON "factores_totp" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sesiones_pase_hash_unico" ON "sesiones" USING btree ("pase_hash");--> statement-breakpoint
ALTER TABLE "eventos_autenticacion" ADD CONSTRAINT "eventos_autenticacion_tipo_valido" CHECK ("eventos_autenticacion"."tipo" in ('inicio_fallido', 'cuenta_bloqueada', 'inicio_ok', 'sesion_revocada', 'sesion_rotada', 'cierre_todas', 'limite_ip', 'contrasena_actualizada', 'mfa_alta', 'mfa_baja', 'mfa_fallo', 'mfa_ok'));