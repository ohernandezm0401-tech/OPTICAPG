CREATE TABLE "membresias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"sede_id" uuid NOT NULL,
	"rol" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membresias_rol_valido" CHECK ("membresias"."rol" in ('admin', 'asesor', 'optometra', 'oftalmologo', 'auxiliar_clinico', 'tecnico_lab', 'auditor'))
);
--> statement-breakpoint
CREATE TABLE "sedes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"ciudad" text NOT NULL,
	"direccion" text,
	"tipo" text DEFAULT 'optica_sin_consultorio' NOT NULL,
	"reps_codigo" text,
	"estado" text DEFAULT 'activa' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sedes_tipo_valido" CHECK ("sedes"."tipo" in ('optica_con_consultorio', 'optica_sin_consultorio', 'profesional_independiente', 'ips', 'taller_optico', 'laboratorio_oftalmico', 'laboratorio_lc_protesis')),
	CONSTRAINT "sedes_estado_valido" CHECK ("sedes"."estado" in ('activa', 'inactiva', 'en_cierre'))
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"revocada_en" timestamp with time zone,
	"direccion_ip" text,
	"agente" text
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"razon_social" text NOT NULL,
	"nit" text NOT NULL,
	"digito_verificacion" varchar(1),
	"estado" text DEFAULT 'onboarding' NOT NULL,
	"plan_id" text,
	"politica_url" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_estado_valido" CHECK ("tenants"."estado" in ('onboarding', 'activo', 'suspendido', 'en_cierre', 'cerrado'))
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"hash_password" text,
	"estado" text DEFAULT 'invitado' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_estado_valido" CHECK ("usuarios"."estado" in ('invitado', 'activo', 'bloqueado', 'desactivado'))
);
--> statement-breakpoint
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_sede_id_sedes_id_fk" FOREIGN KEY ("sede_id") REFERENCES "public"."sedes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membresias_tenant_id_idx" ON "membresias" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "membresias_usuario_id_idx" ON "membresias" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "membresias_sede_id_idx" ON "membresias" USING btree ("sede_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membresias_usuario_sede_rol_unica" ON "membresias" USING btree ("usuario_id","sede_id","rol");--> statement-breakpoint
CREATE INDEX "sedes_tenant_id_idx" ON "sedes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sesiones_tenant_id_idx" ON "sesiones" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_nit_unico" ON "tenants" USING btree ("nit");--> statement-breakpoint
CREATE INDEX "usuarios_tenant_id_idx" ON "usuarios" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_tenant_email_unico" ON "usuarios" USING btree ("tenant_id","email");