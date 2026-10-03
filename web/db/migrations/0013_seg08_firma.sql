-- SEG-08 (T14) — Firma electrónica simple, documento de ejemplo y OTP.
-- RLS ENABLE + FORCE en toda tabla con tenant_id. El rol optisaas_app no es
-- superusuario ni tiene salto de RLS.
-- TODO(Q-22): el hash y la hora del servidor no son sello de tiempo de una
-- TSA. PDF/A no está garantizado. Las HC, prescripciones y consentimientos
-- todavía no existen: solo `ejemplo_sintetico`.
-- BORRADOR – requiere revisión jurídica.
-- Rollback: DROP TABLE codigos_otp_firma, firmas, documentos_firma,
-- perfiles_profesionales CASCADE; DROP FUNCTION firma_documento_antes()
-- y firma_evidencia_antes().
CREATE TABLE "perfiles_profesionales" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "nombre_completo" text NOT NULL,
  "registro_profesional" text NOT NULL,
  "vigente_hasta" date,
  "verificado_por" uuid REFERENCES "usuarios"("id"),
  "verificado_en" timestamptz,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "perfiles_profesionales_tenant_id_idx" ON "perfiles_profesionales" ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "perfiles_profesionales_usuario_unico" ON "perfiles_profesionales" ("tenant_id", "usuario_id");
--> statement-breakpoint
CREATE TABLE "documentos_firma" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "sede_id" uuid NOT NULL REFERENCES "sedes"("id"),
  "tipo" text NOT NULL,
  "estado" text DEFAULT 'pendiente' NOT NULL,
  "titulo" text NOT NULL,
  "cuerpo" text NOT NULL,
  "hash_documento" text,
  "almacen_adaptador" text,
  "almacen_id" text,
  "sello_tsa_proveedor" text DEFAULT 'nulo' NOT NULL,
  "sello_tsa_token" text,
  "sellado_en" timestamptz,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "documentos_firma_tipo_valido" CHECK ("tipo" = 'ejemplo_sintetico'),
  CONSTRAINT "documentos_firma_estado_valido" CHECK ("estado" in ('pendiente', 'firmado', 'sellado')),
  CONSTRAINT "documentos_firma_hash" CHECK ("hash_documento" is null or "hash_documento" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "documentos_firma_sello_proveedor" CHECK ("sello_tsa_proveedor" in ('nulo', 'servidor', 'tsa_externa'))
);
--> statement-breakpoint
CREATE INDEX "documentos_firma_tenant_id_idx" ON "documentos_firma" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "documentos_firma_hash_idx" ON "documentos_firma" ("tenant_id", "hash_documento");
--> statement-breakpoint
CREATE TABLE "firmas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "sede_id" uuid NOT NULL REFERENCES "sedes"("id"),
  "tipo_firmante" text NOT NULL,
  "firmante_id" uuid REFERENCES "usuarios"("id"),
  "documento_tipo" text NOT NULL,
  "documento_id" uuid NOT NULL REFERENCES "documentos_firma"("id"),
  "hash_documento" text,
  "trazo_png_cifrado" text,
  "trazo_puntos_cifrado" text,
  "nombre_firmante" text,
  "nombre_cifrado" text,
  "documento_cifrado" text,
  "registro_profesional" text,
  "otp_verificado" boolean DEFAULT false NOT NULL,
  "otp_canal" text,
  "otp_verificado_en" timestamptz,
  "ip" text,
  "agente" text,
  "acuerdo_aceptado" boolean DEFAULT false NOT NULL,
  "sesion_id" uuid,
  "firmado_en" timestamptz NOT NULL,
  CONSTRAINT "firmas_tipo_firmante_valido" CHECK ("tipo_firmante" in ('profesional', 'paciente')),
  CONSTRAINT "firmas_documento_tipo_valido" CHECK ("documento_tipo" = 'ejemplo_sintetico'),
  CONSTRAINT "firmas_hash" CHECK ("hash_documento" is null or "hash_documento" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE INDEX "firmas_tenant_id_idx" ON "firmas" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "firmas_documento_id_idx" ON "firmas" ("documento_id");
--> statement-breakpoint
CREATE TABLE "codigos_otp_firma" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "documento_id" uuid NOT NULL REFERENCES "documentos_firma"("id"),
  "codigo_hash" text NOT NULL,
  "canal" text NOT NULL,
  "expira_en" timestamptz NOT NULL,
  "usado_en" timestamptz,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "codigos_otp_firma_hash" CHECK ("codigo_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "codigos_otp_firma_canal" CHECK ("canal" = 'pantalla_prueba')
);
--> statement-breakpoint
CREATE INDEX "codigos_otp_firma_tenant_id_idx" ON "codigos_otp_firma" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "codigos_otp_firma_documento_id_idx" ON "codigos_otp_firma" ("documento_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION firma_documento_antes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado = 'sellado' THEN
      RAISE EXCEPTION 'documento sellado inmutable' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.estado = 'sellado' THEN
    RAISE EXCEPTION 'documento sellado inmutable' USING ERRCODE = '55000';
  END IF;

  IF OLD.estado = 'firmado' AND NEW.estado NOT IN ('firmado', 'sellado') THEN
    RAISE EXCEPTION 'transicion de estado no permitida' USING ERRCODE = '55000';
  END IF;

  IF OLD.estado = 'pendiente' AND NEW.estado NOT IN ('pendiente', 'firmado') THEN
    RAISE EXCEPTION 'transicion de estado no permitida' USING ERRCODE = '55000';
  END IF;

  IF OLD.estado <> 'pendiente' AND (
    NEW.cuerpo IS DISTINCT FROM OLD.cuerpo OR NEW.titulo IS DISTINCT FROM OLD.titulo
    OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.sede_id IS DISTINCT FROM OLD.sede_id
  ) THEN
    RAISE EXCEPTION 'el contenido firmado no se edita' USING ERRCODE = '55000';
  END IF;

  IF OLD.hash_documento IS NOT NULL AND NEW.hash_documento IS DISTINCT FROM OLD.hash_documento THEN
    RAISE EXCEPTION 'el hash sellado no se modifica' USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER documentos_firma_antes
  BEFORE UPDATE OR DELETE ON documentos_firma
  FOR EACH ROW
  EXECUTE FUNCTION firma_documento_antes();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION firma_evidencia_antes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.hash_documento IS NOT NULL THEN
      RAISE EXCEPTION 'firma sellada inmutable' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.hash_documento IS NOT NULL THEN
    RAISE EXCEPTION 'firma sellada inmutable' USING ERRCODE = '55000';
  END IF;

  IF NEW.trazo_png_cifrado IS DISTINCT FROM OLD.trazo_png_cifrado
    OR NEW.trazo_puntos_cifrado IS DISTINCT FROM OLD.trazo_puntos_cifrado
    OR NEW.ip IS DISTINCT FROM OLD.ip
    OR NEW.firmado_en IS DISTINCT FROM OLD.firmado_en
    OR NEW.tipo_firmante IS DISTINCT FROM OLD.tipo_firmante
    OR NEW.nombre_cifrado IS DISTINCT FROM OLD.nombre_cifrado
    OR NEW.documento_cifrado IS DISTINCT FROM OLD.documento_cifrado
    OR NEW.otp_verificado IS DISTINCT FROM OLD.otp_verificado
  THEN
    RAISE EXCEPTION 'la evidencia de firma no se modifica' USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER firmas_antes
  BEFORE UPDATE OR DELETE ON firmas
  FOR EACH ROW
  EXECUTE FUNCTION firma_evidencia_antes();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON perfiles_profesionales, documentos_firma, firmas, codigos_otp_firma TO optisaas_app;
--> statement-breakpoint
ALTER TABLE perfiles_profesionales ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE perfiles_profesionales FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE documentos_firma ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE documentos_firma FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE firmas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE firmas FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE codigos_otp_firma ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE codigos_otp_firma FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY perfiles_profesionales_tenant_app ON perfiles_profesionales FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY documentos_firma_sede_app ON documentos_firma FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
--> statement-breakpoint
CREATE POLICY firmas_sede_app ON firmas FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
--> statement-breakpoint
CREATE POLICY codigos_otp_firma_tenant_app ON codigos_otp_firma FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
