-- ASE-01 / SEG-06 (T13) — Pacientes, representantes y diagnósticos.
-- RLS ENABLE + FORCE en toda tabla con tenant_id. El rol optisaas_app no es
-- superusuario ni tiene salto de RLS. num_hc no se modifica ni se reutiliza.
-- num_doc guarda el sobre de cifrado (T11), no el documento en claro.
CREATE TABLE "secuencias_hc" (
  "tenant_id" uuid PRIMARY KEY NOT NULL REFERENCES "tenants"("id"),
  "ultimo" integer NOT NULL,
  CONSTRAINT "secuencias_hc_no_negativo" CHECK ("ultimo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pacientes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "num_hc" integer NOT NULL,
  "tipo_doc" text NOT NULL,
  "num_doc" text NOT NULL,
  "num_doc_hash" text NOT NULL,
  "nombres" text NOT NULL,
  "apellidos" text NOT NULL,
  "fecha_nacimiento" date NOT NULL,
  "sexo" text NOT NULL,
  "estado_civil" text NOT NULL,
  "ocupacion" text NOT NULL,
  "direccion" text NOT NULL,
  "telefono" text NOT NULL,
  "email" text,
  "acompanante" text NOT NULL,
  "responsable" text NOT NULL,
  "aseguradora" text NOT NULL,
  "tipo_vinculacion" text NOT NULL,
  "sede_alta_id" uuid NOT NULL REFERENCES "sedes"("id"),
  "fecha_ultima_atencion" date,
  "estado" text DEFAULT 'activo' NOT NULL,
  "fusionado_en_id" uuid,
  "negativa_autorizacion" boolean DEFAULT false NOT NULL,
  "negativa_autorizacion_en" timestamptz,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "pacientes_tipo_doc_valido" CHECK ("tipo_doc" in ('CC','TI','RC','CE','PA','PE','PPT','NUIP')),
  CONSTRAINT "pacientes_estado_valido" CHECK ("estado" in ('activo','inactivo','fusionado')),
  CONSTRAINT "pacientes_vinculacion_valida" CHECK ("tipo_vinculacion" in ('particular','contributivo','subsidiado','especial','otro','no_aplica')),
  CONSTRAINT "pacientes_num_hc_positivo" CHECK ("num_hc" > 0),
  CONSTRAINT "pacientes_num_doc_hash" CHECK ("num_doc_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE INDEX "pacientes_tenant_id_idx" ON "pacientes" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "pacientes_sede_alta_id_idx" ON "pacientes" ("sede_alta_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pacientes_num_hc_unico" ON "pacientes" ("tenant_id", "num_hc");
--> statement-breakpoint
CREATE UNIQUE INDEX "pacientes_documento_activo_unico" ON "pacientes" ("tenant_id", "tipo_doc", "num_doc_hash") WHERE "estado" <> 'fusionado';
--> statement-breakpoint
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_fusionado_en_id_fk" FOREIGN KEY ("fusionado_en_id") REFERENCES "pacientes"("id");
--> statement-breakpoint
CREATE TABLE "representantes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "nombre" text NOT NULL,
  "tipo_doc" text NOT NULL,
  "num_doc" text NOT NULL,
  "num_doc_hash" text NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "representantes_tipo_doc_valido" CHECK ("tipo_doc" in ('CC','TI','RC','CE','PA','PE','PPT','NUIP')),
  CONSTRAINT "representantes_num_doc_hash" CHECK ("num_doc_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE INDEX "representantes_tenant_id_idx" ON "representantes" ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "representantes_documento_unico" ON "representantes" ("tenant_id", "tipo_doc", "num_doc_hash");
--> statement-breakpoint
CREATE TABLE "pacientes_representantes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "paciente_id" uuid NOT NULL REFERENCES "pacientes"("id"),
  "representante_id" uuid NOT NULL REFERENCES "representantes"("id"),
  "parentesco" text NOT NULL,
  "contacto" text NOT NULL,
  "vigente" boolean DEFAULT true NOT NULL,
  "es_quien_firmo" boolean DEFAULT true NOT NULL,
  "escucho_menor" boolean,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "cerrado_en" timestamptz
);
--> statement-breakpoint
CREATE INDEX "pacientes_representantes_tenant_id_idx" ON "pacientes_representantes" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "pacientes_representantes_paciente_id_idx" ON "pacientes_representantes" ("paciente_id");
--> statement-breakpoint
CREATE TABLE "paciente_diagnosticos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "paciente_id" uuid NOT NULL REFERENCES "pacientes"("id"),
  "descripcion_cifrada" text NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "paciente_diagnosticos_tenant_id_idx" ON "paciente_diagnosticos" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "paciente_diagnosticos_paciente_id_idx" ON "paciente_diagnosticos" ("paciente_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pacientes_num_hc_fijo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.num_hc IS DISTINCT FROM OLD.num_hc THEN
    RAISE EXCEPTION 'num_hc no se reutiliza ni se modifica' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pacientes_num_hc_fijo
  BEFORE UPDATE ON pacientes
  FOR EACH ROW
  EXECUTE FUNCTION pacientes_num_hc_fijo();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON secuencias_hc, pacientes, representantes, pacientes_representantes TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON paciente_diagnosticos TO optisaas_app;
--> statement-breakpoint
ALTER TABLE secuencias_hc ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE secuencias_hc FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE pacientes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE representantes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE representantes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE pacientes_representantes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE pacientes_representantes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE paciente_diagnosticos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE paciente_diagnosticos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY secuencias_hc_tenant_app ON secuencias_hc FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY pacientes_sede_app ON pacientes FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_alta_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_alta_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
--> statement-breakpoint
CREATE POLICY representantes_tenant_app ON representantes FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY pacientes_representantes_tenant_app ON pacientes_representantes FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND paciente_id IN (SELECT id FROM pacientes)
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND paciente_id IN (SELECT id FROM pacientes)
  );
--> statement-breakpoint
CREATE POLICY paciente_diagnosticos_lectura_app ON paciente_diagnosticos FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo', 'director_cientifico')
    AND paciente_id IN (SELECT id FROM pacientes)
  );
--> statement-breakpoint
CREATE POLICY paciente_diagnosticos_escritura_app ON paciente_diagnosticos FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo', 'director_cientifico')
    AND paciente_id IN (SELECT id FROM pacientes)
  );
--> statement-breakpoint
-- La recepción (asesor, auxiliar, admin) lee solo los eventos del recurso
-- pacientes en sus sedes. No abre el resto de la bitácora.
CREATE POLICY auditoria_lectura_pacientes_recepcion ON auditoria FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND recurso = 'pacientes'
    AND current_setting('app.rol', true) IN (
      'asesor', 'admin', 'auxiliar_clinico', 'auxiliar', 'optometra', 'oftalmologo', 'director_cientifico'
    )
    AND (
      sede_id IS NULL
      OR sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
    )
  );
