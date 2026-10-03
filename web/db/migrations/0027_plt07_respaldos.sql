-- PLT-07 (T28) — Registro de respaldos lógicos y de pruebas de restauración.
-- El volcado es de toda la base, así que estas tablas no llevan tenant_id.
-- Aun así nacen con RLS ENABLE + FORCE y una política. optisaas_app solo
-- puede consultar y, sin política propia, no ve filas.
-- La credencial de administración va en DATABASE_URL_RESPALDO, fuera del
-- repositorio. No es el rol de la aplicación. Ver docs/RESPALDOS.md.
-- TODO(Q-07): rpo y rto nacen sin valor. El rótulo queda en provisional.
-- Rollback: DROP TABLE pruebas_restauracion, respaldos, parametros_continuidad;
CREATE TABLE parametros_continuidad (
  clave text PRIMARY KEY,
  valor text,
  unidad text,
  rotulo text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parametros_continuidad_clave CHECK (clave IN ('rpo', 'rto')),
  CONSTRAINT parametros_continuidad_rotulo CHECK (rotulo = 'provisional'),
  CONSTRAINT parametros_continuidad_valor CHECK (valor IS NULL OR char_length(valor) > 0)
);
--> statement-breakpoint
INSERT INTO parametros_continuidad (clave, valor, unidad, rotulo) VALUES
  ('rpo', NULL, NULL, 'provisional'),
  ('rto', NULL, NULL, 'provisional');
--> statement-breakpoint
CREATE TABLE respaldos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  inicio timestamptz NOT NULL,
  fin timestamptz,
  tamano bigint,
  hash_sha256 text,
  destino text,
  cifrado text NOT NULL DEFAULT 'AES-256-GCM',
  resultado text,
  estado text NOT NULL,
  CONSTRAINT respaldos_tipo CHECK (tipo IN ('logico_pg_dump')),
  CONSTRAINT respaldos_estado CHECK (estado IN ('programado', 'ejecutado', 'verificado', 'expirado')),
  CONSTRAINT respaldos_resultado CHECK (resultado IS NULL OR resultado IN ('ok', 'fallo')),
  CONSTRAINT respaldos_cifrado CHECK (cifrado = 'AES-256-GCM'),
  CONSTRAINT respaldos_tamano CHECK (tamano IS NULL OR tamano >= 0),
  CONSTRAINT respaldos_hash CHECK (hash_sha256 IS NULL OR hash_sha256 ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE pruebas_restauracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respaldo_id uuid NOT NULL REFERENCES respaldos (id),
  resultado text NOT NULL,
  evidencia jsonb NOT NULL,
  ejecutada_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pruebas_restauracion_resultado CHECK (resultado IN ('ok', 'fallo'))
);
--> statement-breakpoint
CREATE INDEX pruebas_restauracion_respaldo_id_idx ON pruebas_restauracion (respaldo_id);
--> statement-breakpoint
REVOKE ALL ON parametros_continuidad, respaldos, pruebas_restauracion FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON parametros_continuidad, respaldos, pruebas_restauracion FROM optisaas_app;
--> statement-breakpoint
GRANT SELECT ON parametros_continuidad, respaldos, pruebas_restauracion TO optisaas_app;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'optisaas_respaldo') THEN
    CREATE ROLE optisaas_respaldo NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
REVOKE optisaas_respaldo FROM optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON parametros_continuidad, respaldos, pruebas_restauracion TO optisaas_respaldo;
--> statement-breakpoint
ALTER TABLE parametros_continuidad ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE parametros_continuidad FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE respaldos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE respaldos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE pruebas_restauracion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE pruebas_restauracion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY parametros_continuidad_respaldo ON parametros_continuidad
  FOR ALL TO optisaas_respaldo
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY respaldos_respaldo ON respaldos
  FOR ALL TO optisaas_respaldo
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY pruebas_restauracion_respaldo ON pruebas_restauracion
  FOR ALL TO optisaas_respaldo
  USING (true)
  WITH CHECK (true);
