-- OPT-10 (T18) — Catálogos clínicos y glosario.
-- TODO(Q-23): CIE-10 y CUPS no se redistribuyen. Estas tablas nacen vacías.
-- La carga local (`npm run catalogos:cargar`) usa el rol de administración
-- (dueño de la conexión), no `optisaas_app` y sin salto de RLS.
--
-- RLS por tenant NO aplica a catalogo_cie10 ni catalogo_cups: son datos
-- globales de referencia, iguales para todos los tenants, y no tienen
-- tenant_id. El rol de la aplicación solo puede leerlas (SELECT).
-- glosario_abreviaturas sí es editable por tenant: RLS ENABLE + FORCE.
--
-- Rollback: DROP TABLE glosario_abreviaturas, catalogo_cups, catalogo_cie10;
CREATE TABLE catalogo_cie10 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  codigo text NOT NULL,
  descripcion text NOT NULL,
  version text NOT NULL,
  vigente_desde date NOT NULL,
  vigente_hasta date,
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT catalogo_cie10_codigo_formato CHECK (codigo ~ '^[A-Z0-9][A-Z0-9.\-]{0,31}$'),
  CONSTRAINT catalogo_cie10_descripcion_no_vacia CHECK (length(btrim(descripcion)) > 0),
  CONSTRAINT catalogo_cie10_version_no_vacia CHECK (length(btrim(version)) > 0),
  CONSTRAINT catalogo_cie10_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
);
--> statement-breakpoint
CREATE UNIQUE INDEX catalogo_cie10_codigo_version_unico ON catalogo_cie10 (codigo, version);
--> statement-breakpoint
CREATE TABLE catalogo_cups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  codigo text NOT NULL,
  descripcion text NOT NULL,
  version text NOT NULL,
  vigente_desde date NOT NULL,
  vigente_hasta date,
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT catalogo_cups_codigo_formato CHECK (codigo ~ '^[A-Z0-9][A-Z0-9.\-]{0,31}$'),
  CONSTRAINT catalogo_cups_descripcion_no_vacia CHECK (length(btrim(descripcion)) > 0),
  CONSTRAINT catalogo_cups_version_no_vacia CHECK (length(btrim(version)) > 0),
  CONSTRAINT catalogo_cups_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
);
--> statement-breakpoint
CREATE UNIQUE INDEX catalogo_cups_codigo_version_unico ON catalogo_cups (codigo, version);
--> statement-breakpoint
REVOKE ALL ON catalogo_cie10, catalogo_cups FROM PUBLIC;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON catalogo_cie10, catalogo_cups FROM optisaas_app;
--> statement-breakpoint
GRANT SELECT ON catalogo_cie10, catalogo_cups TO optisaas_app;
--> statement-breakpoint
CREATE TABLE glosario_abreviaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  abreviatura text NOT NULL,
  expansion text NOT NULL,
  creado_en timestamptz DEFAULT now() NOT NULL,
  actualizado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT glosario_abreviatura_formato CHECK (abreviatura ~ '^[A-ZÁÉÍÓÚÜÑ]{2,6}$'),
  CONSTRAINT glosario_expansion_no_vacia CHECK (length(btrim(expansion)) > 0)
);
--> statement-breakpoint
CREATE INDEX glosario_abreviaturas_tenant_id_idx ON glosario_abreviaturas (tenant_id);
--> statement-breakpoint
CREATE UNIQUE INDEX glosario_abreviaturas_tenant_abreviatura_unica ON glosario_abreviaturas (tenant_id, abreviatura);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON glosario_abreviaturas TO optisaas_app;
--> statement-breakpoint
ALTER TABLE glosario_abreviaturas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE glosario_abreviaturas FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY glosario_abreviaturas_tenant_app ON glosario_abreviaturas FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
