CREATE TABLE "bitacora_parametros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"valor_anterior" jsonb,
	"valor_nuevo" jsonb,
	"rotulo" text,
	"registrado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"anio" integer NOT NULL,
	"fecha" date NOT NULL,
	"nombre" text NOT NULL,
	"fuente" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "festivos_anio_coincide" CHECK (extract(year from "festivos"."fecha") = "festivos"."anio")
);
--> statement-breakpoint
CREATE TABLE "instantaneas_impuesto_linea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tarifa_impuesto_id" uuid NOT NULL,
	"impuesto_snapshot" jsonb NOT NULL,
	"cerrada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametros_tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"valor" jsonb,
	"rotulo" text,
	"vigente_desde" timestamp with time zone DEFAULT now() NOT NULL,
	"vigente_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarifas_impuesto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"porcentaje_bp" integer NOT NULL,
	"excluido" boolean NOT NULL,
	"exento" boolean NOT NULL,
	"vigente_desde" timestamp with time zone DEFAULT now() NOT NULL,
	"vigente_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tarifas_impuesto_porcentaje_bp_rango" CHECK ("tarifas_impuesto"."porcentaje_bp" >= 0 and "tarifas_impuesto"."porcentaje_bp" <= 10000)
);
--> statement-breakpoint
ALTER TABLE "bitacora_parametros" ADD CONSTRAINT "bitacora_parametros_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "festivos" ADD CONSTRAINT "festivos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instantaneas_impuesto_linea" ADD CONSTRAINT "instantaneas_impuesto_linea_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instantaneas_impuesto_linea" ADD CONSTRAINT "instantaneas_impuesto_linea_tarifa_impuesto_id_tarifas_impuesto_id_fk" FOREIGN KEY ("tarifa_impuesto_id") REFERENCES "public"."tarifas_impuesto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametros_tenant" ADD CONSTRAINT "parametros_tenant_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarifas_impuesto" ADD CONSTRAINT "tarifas_impuesto_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bitacora_parametros_tenant_id_idx" ON "bitacora_parametros" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "festivos_tenant_id_idx" ON "festivos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "festivos_tenant_anio_idx" ON "festivos" USING btree ("tenant_id","anio");--> statement-breakpoint
CREATE UNIQUE INDEX "festivos_tenant_fecha_unica" ON "festivos" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX "instantaneas_impuesto_linea_tenant_id_idx" ON "instantaneas_impuesto_linea" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "parametros_tenant_tenant_id_idx" ON "parametros_tenant" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parametros_tenant_clave_vigente_unica" ON "parametros_tenant" USING btree ("tenant_id","clave") WHERE "parametros_tenant"."vigente_hasta" is null;--> statement-breakpoint
CREATE INDEX "tarifas_impuesto_tenant_id_idx" ON "tarifas_impuesto" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tarifas_impuesto_nombre_vigente_unica" ON "tarifas_impuesto" USING btree ("tenant_id","nombre") WHERE "tarifas_impuesto"."vigente_hasta" is null;