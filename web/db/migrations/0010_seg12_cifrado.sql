-- SEG-12 (T11) — Claves de datos por tenant, sobres de texto clínico y
-- anexos, y secretos de adaptador. RLS ENABLE + FORCE. La clave maestra no
-- se guarda aquí: solo la DEK envuelta. El cifrado de volumen del disco es
-- de infraestructura, no de esta migración.
CREATE TABLE "claves_datos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "version" integer NOT NULL,
  "dek_cifrada" text NOT NULL,
  "version_kek" integer NOT NULL,
  "estado" text NOT NULL,
  "activa" boolean NOT NULL,
  "creada_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "claves_datos_version_positiva" CHECK ("version" >= 1),
  CONSTRAINT "claves_datos_kek_positiva" CHECK ("version_kek" >= 1),
  CONSTRAINT "claves_datos_estado_valido" CHECK ("estado" in ('activa', 'rotada', 'retirada')),
  CONSTRAINT "claves_datos_activa_coherente" CHECK (("estado" = 'activa') = "activa")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "claves_datos_tenant_version" ON "claves_datos" ("tenant_id", "version");
--> statement-breakpoint
CREATE UNIQUE INDEX "claves_datos_una_activa" ON "claves_datos" ("tenant_id") WHERE "estado" = 'activa';
--> statement-breakpoint
CREATE INDEX "claves_datos_tenant_id_idx" ON "claves_datos" ("tenant_id");
--> statement-breakpoint
CREATE TABLE "contenidos_cifrados" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "clase" text NOT NULL,
  "campo" text NOT NULL,
  "referencia" text NOT NULL,
  "version_dek" integer NOT NULL,
  "sobre" text NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "contenidos_cifrados_clase_valida" CHECK ("clase" in ('anexo', 'texto_clinico')),
  CONSTRAINT "contenidos_cifrados_campo_valido" CHECK ("campo" ~ '^[a-z0-9_.]{1,80}$'),
  CONSTRAINT "contenidos_cifrados_version_positiva" CHECK ("version_dek" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "contenidos_cifrados_referencia" ON "contenidos_cifrados" ("tenant_id", "clase", "campo", "referencia");
--> statement-breakpoint
CREATE INDEX "contenidos_cifrados_tenant_id_idx" ON "contenidos_cifrados" ("tenant_id");
--> statement-breakpoint
CREATE TABLE "secretos_adaptador" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "adaptador" text NOT NULL,
  "nombre" text NOT NULL,
  "version_dek" integer NOT NULL,
  "sobre" text NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "secretos_adaptador_adaptador_valido" CHECK ("adaptador" in ('facturacion', 'rda')),
  CONSTRAINT "secretos_adaptador_nombre_valido" CHECK ("nombre" in ('token', 'client_id', 'client_secret')),
  CONSTRAINT "secretos_adaptador_version_positiva" CHECK ("version_dek" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "secretos_adaptador_unico" ON "secretos_adaptador" ("tenant_id", "adaptador", "nombre");
--> statement-breakpoint
CREATE INDEX "secretos_adaptador_tenant_id_idx" ON "secretos_adaptador" ("tenant_id");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON claves_datos, contenidos_cifrados, secretos_adaptador TO optisaas_app;
--> statement-breakpoint
ALTER TABLE claves_datos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE claves_datos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE contenidos_cifrados ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE contenidos_cifrados FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE secretos_adaptador ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE secretos_adaptador FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY claves_datos_app ON claves_datos FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY contenidos_cifrados_app ON contenidos_cifrados FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY secretos_adaptador_app ON secretos_adaptador FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
