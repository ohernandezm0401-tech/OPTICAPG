-- OPT-01 / OPT-24 (T19) — Atención optométrica tipada.
-- RLS ENABLE + FORCE en cada tabla con tenant_id. El marco de T12
-- (`aplicar_marco_inmutabilidad`) cubre el paso borrador → firmado.
-- TODO(Q-25): modalidad admite el valor reservado telemedicina; la
-- aplicación solo persiste presencial y no hay lógica de teleconsulta.
-- TODO(Q-26): la firma de la fila la hace el optómetra; el auxiliar
-- queda en borrador por la matriz CASL, no por un trigger nuevo.
-- Rollback: DROP TABLE planes_manejo, diagnosticos, examenes_optometricos, atenciones;
-- restaurar los CHECK de documentos_firma y firmas sin atencion_clinica.
ALTER TABLE documentos_firma DROP CONSTRAINT documentos_firma_tipo_valido;
--> statement-breakpoint
ALTER TABLE documentos_firma ADD CONSTRAINT documentos_firma_tipo_valido
  CHECK (tipo in ('ejemplo_sintetico', 'autorizacion_datos', 'atencion_clinica'));
--> statement-breakpoint
ALTER TABLE firmas DROP CONSTRAINT firmas_documento_tipo_valido;
--> statement-breakpoint
ALTER TABLE firmas ADD CONSTRAINT firmas_documento_tipo_valido
  CHECK (documento_tipo in ('ejemplo_sintetico', 'autorizacion_datos', 'atencion_clinica'));
--> statement-breakpoint
CREATE TABLE atenciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  cita_id uuid,
  profesional_id uuid NOT NULL REFERENCES usuarios(id),
  tipo text NOT NULL,
  modalidad text DEFAULT 'presencial' NOT NULL,
  estado text DEFAULT 'borrador' NOT NULL,
  contenido text NOT NULL,
  firmado_por uuid REFERENCES usuarios(id),
  firmado_en timestamptz,
  hash_contenido text,
  folio integer,
  fecha_atencion timestamptz DEFAULT now() NOT NULL,
  schema_version integer DEFAULT 1 NOT NULL,
  firma_documento_id uuid REFERENCES documentos_firma(id),
  version_borrador integer DEFAULT 1 NOT NULL,
  creado_en timestamptz DEFAULT now() NOT NULL,
  actualizado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT atenciones_tipo_valido CHECK (tipo in ('primera_vez', 'control', 'lc', 'pediatrica', 'baja_vision', 'terapia', 'tamizaje')),
  CONSTRAINT atenciones_modalidad_valida CHECK (modalidad in ('presencial', 'telemedicina')),
  CONSTRAINT atenciones_estado_valido CHECK (estado in ('borrador', 'firmado')),
  CONSTRAINT atenciones_schema_version CHECK (schema_version >= 1)
);
--> statement-breakpoint
CREATE INDEX atenciones_tenant_id_idx ON atenciones (tenant_id);
--> statement-breakpoint
CREATE INDEX atenciones_paciente_id_idx ON atenciones (paciente_id);
--> statement-breakpoint
CREATE UNIQUE INDEX atenciones_paciente_folio_unico ON atenciones (paciente_id, folio) WHERE folio IS NOT NULL;
--> statement-breakpoint
CREATE TABLE examenes_optometricos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  atencion_id uuid NOT NULL REFERENCES atenciones(id),
  estado text DEFAULT 'borrador' NOT NULL,
  contenido text NOT NULL,
  firmado_por uuid REFERENCES usuarios(id),
  firmado_en timestamptz,
  hash_contenido text,
  esfera_od numeric(6, 2),
  cilindro_od numeric(6, 2),
  eje_od integer,
  adicion_od numeric(4, 2),
  agudeza_od numeric(4, 2),
  esfera_oi numeric(6, 2),
  cilindro_oi numeric(6, 2),
  eje_oi integer,
  adicion_oi numeric(4, 2),
  agudeza_oi numeric(4, 2),
  dip numeric(5, 2),
  dip_monocular_od numeric(5, 2),
  dip_monocular_oi numeric(5, 2),
  creado_en timestamptz DEFAULT now() NOT NULL,
  actualizado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT examenes_optometricos_estado_valido CHECK (estado in ('borrador', 'firmado'))
);
--> statement-breakpoint
CREATE INDEX examenes_optometricos_tenant_id_idx ON examenes_optometricos (tenant_id);
--> statement-breakpoint
CREATE UNIQUE INDEX examenes_optometricos_atencion_unica ON examenes_optometricos (atencion_id);
--> statement-breakpoint
CREATE TABLE diagnosticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  atencion_id uuid NOT NULL REFERENCES atenciones(id),
  estado text DEFAULT 'borrador' NOT NULL,
  contenido text NOT NULL,
  firmado_por uuid REFERENCES usuarios(id),
  firmado_en timestamptz,
  hash_contenido text,
  codigo_cie10 text NOT NULL,
  descripcion text NOT NULL,
  principal boolean DEFAULT false NOT NULL,
  creado_en timestamptz DEFAULT now() NOT NULL,
  actualizado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT diagnosticos_estado_valido CHECK (estado in ('borrador', 'firmado')),
  CONSTRAINT diagnosticos_codigo_formato CHECK (codigo_cie10 ~ '^[A-Z0-9][A-Z0-9.\-]{0,31}$'),
  CONSTRAINT diagnosticos_descripcion_no_vacia CHECK (length(btrim(descripcion)) > 0)
);
--> statement-breakpoint
CREATE INDEX diagnosticos_tenant_id_idx ON diagnosticos (tenant_id);
--> statement-breakpoint
CREATE INDEX diagnosticos_atencion_id_idx ON diagnosticos (atencion_id);
--> statement-breakpoint
CREATE UNIQUE INDEX diagnosticos_principal_unico ON diagnosticos (atencion_id) WHERE principal = true;
--> statement-breakpoint
CREATE TABLE planes_manejo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  atencion_id uuid NOT NULL REFERENCES atenciones(id),
  estado text DEFAULT 'borrador' NOT NULL,
  contenido text NOT NULL,
  firmado_por uuid REFERENCES usuarios(id),
  firmado_en timestamptz,
  hash_contenido text,
  conducta text NOT NULL,
  recomendaciones text,
  remision text,
  proximo_control date,
  creado_en timestamptz DEFAULT now() NOT NULL,
  actualizado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT planes_manejo_estado_valido CHECK (estado in ('borrador', 'firmado')),
  CONSTRAINT planes_manejo_conducta_no_vacia CHECK (length(btrim(conducta)) > 0)
);
--> statement-breakpoint
CREATE INDEX planes_manejo_tenant_id_idx ON planes_manejo (tenant_id);
--> statement-breakpoint
CREATE UNIQUE INDEX planes_manejo_atencion_unica ON planes_manejo (atencion_id);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON atenciones, examenes_optometricos, diagnosticos, planes_manejo TO optisaas_app;
--> statement-breakpoint
ALTER TABLE atenciones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE atenciones FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE examenes_optometricos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE examenes_optometricos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE diagnosticos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE diagnosticos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE planes_manejo ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE planes_manejo FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY atenciones_tenant_app ON atenciones FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY examenes_optometricos_tenant_app ON examenes_optometricos FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY diagnosticos_tenant_app ON diagnosticos FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY planes_manejo_tenant_app ON planes_manejo FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
SELECT aplicar_marco_inmutabilidad('public.atenciones'::regclass);
--> statement-breakpoint
SELECT aplicar_marco_inmutabilidad('public.examenes_optometricos'::regclass);
--> statement-breakpoint
SELECT aplicar_marco_inmutabilidad('public.diagnosticos'::regclass);
--> statement-breakpoint
SELECT aplicar_marco_inmutabilidad('public.planes_manejo'::regclass);
