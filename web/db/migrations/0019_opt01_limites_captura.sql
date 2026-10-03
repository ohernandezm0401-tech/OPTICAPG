-- OPT-01 (T20) — Límites de captura configurables por tenant.
-- RLS ENABLE + FORCE. Sin fila, la aplicación usa los valores propuestos
-- de la spec (no son normativos). Cambiar el rango es actualizar esta fila.
-- Rollback: DROP TABLE limites_captura;
CREATE TABLE limites_captura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  esfera_min numeric(6, 2) NOT NULL,
  esfera_max numeric(6, 2) NOT NULL,
  cilindro_min numeric(6, 2) NOT NULL,
  cilindro_max numeric(6, 2) NOT NULL,
  eje_min integer NOT NULL,
  eje_max integer NOT NULL,
  adicion_min numeric(4, 2) NOT NULL,
  adicion_max numeric(4, 2) NOT NULL,
  agudeza_min numeric(4, 2) NOT NULL,
  agudeza_max numeric(4, 2) NOT NULL,
  dip_min integer NOT NULL,
  dip_max integer NOT NULL,
  dip_monocular_min integer NOT NULL,
  dip_monocular_max integer NOT NULL,
  creado_en timestamptz DEFAULT now() NOT NULL,
  actualizado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT limites_captura_esfera CHECK (esfera_min <= esfera_max),
  CONSTRAINT limites_captura_cilindro CHECK (cilindro_min <= cilindro_max),
  CONSTRAINT limites_captura_eje CHECK (eje_min <= eje_max),
  CONSTRAINT limites_captura_adicion CHECK (adicion_min <= adicion_max),
  CONSTRAINT limites_captura_agudeza CHECK (agudeza_min <= agudeza_max),
  CONSTRAINT limites_captura_dip CHECK (dip_min <= dip_max),
  CONSTRAINT limites_captura_dip_monocular CHECK (dip_monocular_min <= dip_monocular_max)
);
--> statement-breakpoint
CREATE UNIQUE INDEX limites_captura_tenant_unico ON limites_captura (tenant_id);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON limites_captura TO optisaas_app;
--> statement-breakpoint
ALTER TABLE limites_captura ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE limites_captura FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY limites_captura_tenant_app ON limites_captura FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
