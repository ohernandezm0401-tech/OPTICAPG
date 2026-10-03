-- SEG-05 (T15) — Autorización de tratamiento, textos versionados y política.
-- RLS ENABLE + FORCE en toda tabla con tenant_id. El rol optisaas_app no es
-- superusuario ni tiene salto de RLS.
-- TODO(Q-17): la negativa se registra y no bloquea la atención. El texto es
-- borrador para revisión jurídica.
-- Rollback: DROP TABLE autorizaciones, politicas_tratamiento, textos_legales
-- CASCADE; DROP FUNCTION autorizaciones_proteger() y textos_legales_proteger();
-- restaurar los CHECK de documentos_firma y firmas a solo ejemplo_sintetico.
ALTER TABLE documentos_firma DROP CONSTRAINT documentos_firma_tipo_valido;
--> statement-breakpoint
ALTER TABLE documentos_firma ADD CONSTRAINT documentos_firma_tipo_valido
  CHECK (tipo in ('ejemplo_sintetico', 'autorizacion_datos'));
--> statement-breakpoint
ALTER TABLE firmas DROP CONSTRAINT firmas_documento_tipo_valido;
--> statement-breakpoint
ALTER TABLE firmas ADD CONSTRAINT firmas_documento_tipo_valido
  CHECK (documento_tipo in ('ejemplo_sintetico', 'autorizacion_datos'));
--> statement-breakpoint
CREATE TABLE "textos_legales" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "tipo" text NOT NULL,
  "codigo" text NOT NULL,
  "etiqueta" text NOT NULL,
  "opcional" boolean NOT NULL,
  "version" integer NOT NULL,
  "contenido" text NOT NULL,
  "hash" text NOT NULL,
  "vigente_desde" timestamptz NOT NULL,
  "es_vigente" boolean DEFAULT true NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "textos_legales_tipo_valido" CHECK ("tipo" in ('autorizacion_tratamiento', 'contacto_comercial', 'finalidad_opcional')),
  CONSTRAINT "textos_legales_version_positiva" CHECK ("version" >= 1),
  CONSTRAINT "textos_legales_hash" CHECK ("hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "textos_legales_codigo" CHECK ("codigo" ~ '^[a-z0-9_]{1,40}$')
);
--> statement-breakpoint
CREATE INDEX "textos_legales_tenant_id_idx" ON "textos_legales" ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "textos_legales_version_unica" ON "textos_legales" ("tenant_id", "codigo", "version");
--> statement-breakpoint
CREATE UNIQUE INDEX "textos_legales_vigente_unica" ON "textos_legales" ("tenant_id", "codigo") WHERE "es_vigente";
--> statement-breakpoint
CREATE TABLE "politicas_tratamiento" (
  "tenant_id" uuid PRIMARY KEY NOT NULL REFERENCES "tenants"("id"),
  "razon_social" text,
  "domicilio" text,
  "correo" text,
  "telefono" text,
  "finalidades" text,
  "derechos" text,
  "area_pqr" text,
  "procedimiento" text,
  "vigencia" text,
  "url_publica" text,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autorizaciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "paciente_id" uuid NOT NULL REFERENCES "pacientes"("id"),
  "texto_id" uuid NOT NULL REFERENCES "textos_legales"("id"),
  "finalidad" text NOT NULL,
  "otorgada" boolean NOT NULL,
  "estado" text NOT NULL,
  "representante_id" uuid REFERENCES "pacientes_representantes"("id"),
  "medio" text NOT NULL,
  "evidencia" jsonb NOT NULL,
  "firma_id" uuid REFERENCES "firmas"("id"),
  "contenido_exacto" text NOT NULL,
  "hash_texto" text NOT NULL,
  "registrada_en" timestamptz NOT NULL,
  "firmada_en" timestamptz,
  "revocada_en" timestamptz,
  "ip" text,
  "agente" text,
  CONSTRAINT "autorizaciones_estado_valido" CHECK ("estado" in ('pendiente', 'otorgada', 'negada', 'revocada')),
  CONSTRAINT "autorizaciones_hash" CHECK ("hash_texto" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "autorizaciones_medio_valido" CHECK ("medio" in ('presencial', 'electronico')),
  CONSTRAINT "autorizaciones_finalidad" CHECK ("finalidad" ~ '^[a-z0-9_]{1,40}$')
);
--> statement-breakpoint
CREATE INDEX "autorizaciones_tenant_id_idx" ON "autorizaciones" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "autorizaciones_paciente_id_idx" ON "autorizaciones" ("paciente_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION textos_legales_proteger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'el texto versionado no se borra' USING ERRCODE = '55000';
  END IF;
  IF NEW.contenido IS DISTINCT FROM OLD.contenido
     OR NEW.hash IS DISTINCT FROM OLD.hash
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.codigo IS DISTINCT FROM OLD.codigo
     OR NEW.tipo IS DISTINCT FROM OLD.tipo THEN
    RAISE EXCEPTION 'el texto versionado no se altera; cree una version nueva' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER textos_legales_proteger
  BEFORE UPDATE OR DELETE ON textos_legales
  FOR EACH ROW
  EXECUTE FUNCTION textos_legales_proteger();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION autorizaciones_proteger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'la autorizacion no se borra' USING ERRCODE = '55000';
  END IF;
  IF OLD.estado = 'revocada' THEN
    RAISE EXCEPTION 'autorizacion revocada inmutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.contenido_exacto IS DISTINCT FROM OLD.contenido_exacto
     OR NEW.hash_texto IS DISTINCT FROM OLD.hash_texto
     OR NEW.texto_id IS DISTINCT FROM OLD.texto_id
     OR NEW.medio IS DISTINCT FROM OLD.medio
     OR NEW.otorgada IS DISTINCT FROM OLD.otorgada
     OR NEW.finalidad IS DISTINCT FROM OLD.finalidad
     OR NEW.paciente_id IS DISTINCT FROM OLD.paciente_id
     OR NEW.firmada_en IS DISTINCT FROM OLD.firmada_en
     OR NEW.registrada_en IS DISTINCT FROM OLD.registrada_en THEN
    RAISE EXCEPTION 'autorizacion pasada inmutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER autorizaciones_proteger
  BEFORE UPDATE OR DELETE ON autorizaciones
  FOR EACH ROW
  EXECUTE FUNCTION autorizaciones_proteger();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON textos_legales, politicas_tratamiento, autorizaciones TO optisaas_app;
--> statement-breakpoint
ALTER TABLE textos_legales ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE textos_legales FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE politicas_tratamiento ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE politicas_tratamiento FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE autorizaciones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE autorizaciones FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY textos_legales_lectura_app ON textos_legales FOR SELECT TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY textos_legales_alta_app ON textos_legales FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('admin', 'asesor', 'auxiliar_clinico', 'auxiliar')
  );
--> statement-breakpoint
CREATE POLICY textos_legales_admin_update_app ON textos_legales FOR UPDATE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) = 'admin'
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) = 'admin'
  );
--> statement-breakpoint
CREATE POLICY politicas_tratamiento_lectura_app ON politicas_tratamiento FOR SELECT TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY politicas_tratamiento_alta_app ON politicas_tratamiento FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) = 'admin'
  );
--> statement-breakpoint
CREATE POLICY politicas_tratamiento_update_app ON politicas_tratamiento FOR UPDATE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) = 'admin'
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) = 'admin'
  );
--> statement-breakpoint
CREATE POLICY autorizaciones_app ON autorizaciones FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND paciente_id IN (SELECT id FROM pacientes)
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND paciente_id IN (SELECT id FROM pacientes)
  );
