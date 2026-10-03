-- SEG-12 (T11) — Claves de datos por tenant, anexos cifrados y secretos
-- de adaptadores. RLS ENABLE + FORCE. El rol optisaas_app no es
-- superusuario ni tiene salto de RLS.
-- La columna `clave_version` de MFA queda nula en filas legadas (secreto
-- en claro de T08); el script `cifrado:recifrar-mfa` las pasa a sobre.
ALTER TABLE "factores_totp" ADD COLUMN "clave_version" integer;
--> statement-breakpoint
ALTER TABLE "desafios_mfa" ADD COLUMN "clave_version" integer;
--> statement-breakpoint
CREATE TABLE "claves_datos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "version" integer NOT NULL,
  "dek_cifrada" text NOT NULL,
  "kek_id" text NOT NULL,
  "estado" text NOT NULL,
  "creada_en" timestamptz DEFAULT now() NOT NULL,
  "activa" boolean NOT NULL,
  CONSTRAINT "claves_datos_version_positiva" CHECK ("version" >= 1),
  CONSTRAINT "claves_datos_estado_valido" CHECK ("estado" in ('activa', 'rotada', 'retirada')),
  CONSTRAINT "claves_datos_activa_coherente" CHECK (("estado" = 'activa') = "activa"),
  CONSTRAINT "claves_datos_tenant_version" UNIQUE ("tenant_id", "version")
);
--> statement-breakpoint
CREATE INDEX "claves_datos_tenant_id_idx" ON "claves_datos" ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "claves_datos_una_activa" ON "claves_datos" ("tenant_id") WHERE "activa";
--> statement-breakpoint
CREATE TABLE "anexos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "nombre" text NOT NULL,
  "mime" text,
  "tamano" integer NOT NULL,
  "hash_sha256" text NOT NULL,
  "contenido_cifrado" bytea NOT NULL,
  "clave_version" integer NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "anexos_tamano_no_negativo" CHECK ("tamano" >= 0),
  CONSTRAINT "anexos_hash_sha256" CHECK ("hash_sha256" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE INDEX "anexos_tenant_id_idx" ON "anexos" ("tenant_id");
--> statement-breakpoint
CREATE TABLE "secretos_adaptador" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "adaptador" text NOT NULL,
  "nombre" text NOT NULL,
  "valor_cifrado" text NOT NULL,
  "clave_version" integer NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "secretos_adaptador_adaptador_valido" CHECK ("adaptador" in ('facturacion', 'rda')),
  CONSTRAINT "secretos_adaptador_nombre" CHECK (char_length("nombre") between 1 and 80)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "secretos_adaptador_unico" ON "secretos_adaptador" ("tenant_id", "adaptador", "nombre");
--> statement-breakpoint
CREATE INDEX "secretos_adaptador_tenant_id_idx" ON "secretos_adaptador" ("tenant_id");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON claves_datos, anexos, secretos_adaptador TO optisaas_app;
--> statement-breakpoint
ALTER TABLE claves_datos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE claves_datos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE anexos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE anexos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE secretos_adaptador ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE secretos_adaptador FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY claves_datos_app ON claves_datos FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY anexos_app ON anexos FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY secretos_adaptador_app ON secretos_adaptador FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
