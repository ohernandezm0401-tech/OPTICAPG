-- Aislamiento por sede, historial de identificación, anexos y rotación.
-- La sede vacía no autoriza filas. El rol optisaas_app no puede saltarse
-- la inmutabilidad ni borrar anexos. La rotación de DEK y la fusión de
-- historia corren como dueño de la tabla, con una GUC local.
-- Rollback: restaurar las políticas de 0018/0022 y las funciones de 0026
-- (no automatizado).
CREATE OR REPLACE FUNCTION sede_autorizada(p_sede uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_sede IS NOT NULL
     AND position(
       ',' || p_sede::text || ','
       IN ',' || coalesce(current_setting('app.sedes', true), '') || ','
     ) > 0;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sede_autorizada(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION sede_autorizada(uuid) TO optisaas_app;
--> statement-breakpoint
DROP POLICY IF EXISTS atenciones_tenant_app ON atenciones;
--> statement-breakpoint
CREATE POLICY atenciones_tenant_app ON atenciones FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_autorizada(sede_id)
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_autorizada(sede_id)
  );
--> statement-breakpoint
DROP POLICY IF EXISTS examenes_optometricos_tenant_app ON examenes_optometricos;
--> statement-breakpoint
CREATE POLICY examenes_optometricos_tenant_app ON examenes_optometricos FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND EXISTS (
      SELECT 1 FROM atenciones a
       WHERE a.id = examenes_optometricos.atencion_id
         AND a.tenant_id = examenes_optometricos.tenant_id
         AND sede_autorizada(a.sede_id)
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND EXISTS (
      SELECT 1 FROM atenciones a
       WHERE a.id = examenes_optometricos.atencion_id
         AND a.tenant_id = examenes_optometricos.tenant_id
         AND sede_autorizada(a.sede_id)
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS diagnosticos_tenant_app ON diagnosticos;
--> statement-breakpoint
CREATE POLICY diagnosticos_tenant_app ON diagnosticos FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND EXISTS (
      SELECT 1 FROM atenciones a
       WHERE a.id = diagnosticos.atencion_id
         AND a.tenant_id = diagnosticos.tenant_id
         AND sede_autorizada(a.sede_id)
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND EXISTS (
      SELECT 1 FROM atenciones a
       WHERE a.id = diagnosticos.atencion_id
         AND a.tenant_id = diagnosticos.tenant_id
         AND sede_autorizada(a.sede_id)
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS planes_manejo_tenant_app ON planes_manejo;
--> statement-breakpoint
CREATE POLICY planes_manejo_tenant_app ON planes_manejo FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND EXISTS (
      SELECT 1 FROM atenciones a
       WHERE a.id = planes_manejo.atencion_id
         AND a.tenant_id = planes_manejo.tenant_id
         AND sede_autorizada(a.sede_id)
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND EXISTS (
      SELECT 1 FROM atenciones a
       WHERE a.id = planes_manejo.atencion_id
         AND a.tenant_id = planes_manejo.tenant_id
         AND sede_autorizada(a.sede_id)
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS prescripciones_lectura_app ON prescripciones;
--> statement-breakpoint
CREATE POLICY prescripciones_lectura_app ON prescripciones
  FOR SELECT TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_autorizada(sede_id)
  );
--> statement-breakpoint
DROP POLICY IF EXISTS prescripciones_alta_app ON prescripciones;
--> statement-breakpoint
CREATE POLICY prescripciones_alta_app ON prescripciones
  FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_autorizada(sede_id)
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo')
  );
--> statement-breakpoint
DROP POLICY IF EXISTS prescripciones_borrador_app ON prescripciones;
--> statement-breakpoint
CREATE POLICY prescripciones_borrador_app ON prescripciones
  FOR UPDATE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_autorizada(sede_id)
    AND estado = 'borrador'
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo')
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_autorizada(sede_id)
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo')
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION inmutabilidad_antes_fila()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  estado_origen text;
  doc jsonb;
BEGIN
  IF current_setting('app.fusion_hc', true) = '1'
     AND current_user IS DISTINCT FROM 'optisaas_app'
     AND TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'paciente_id' - 'actualizado_en')
       IS DISTINCT FROM (to_jsonb(OLD) - 'paciente_id' - 'actualizado_en') THEN
      RAISE EXCEPTION 'la fusion solo reasigna el paciente'
        USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  IF current_setting('app.rotacion_dek', true) = '1'
     AND current_user IS DISTINCT FROM 'optisaas_app'
     AND TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.estado IS DISTINCT FROM OLD.estado THEN
      RAISE EXCEPTION 'la rotacion no altera id, tenant ni estado'
        USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'registro firmado inmutable: DELETE prohibido'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.estado IN ('firmado', 'firmada', 'adendado') THEN
    RAISE EXCEPTION 'registro firmado inmutable: UPDATE prohibido'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM 'borrador' THEN
    RAISE EXCEPTION 'transicion de estado no permitida: % -> %', OLD.estado, NEW.estado
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id) THEN
    RAISE EXCEPTION 'id y tenant_id no se modifican'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.estado IS NULL OR NEW.estado NOT IN ('borrador', 'firmado', 'firmada') THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'transicion de estado no permitida: % -> %', OLD.estado, NEW.estado
        USING ERRCODE = '55000';
    END IF;
    RAISE EXCEPTION 'transicion de estado no permitida: %', NEW.estado
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'adendas' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.entidad !~ '^[a-z_][a-z0-9_]{0,62}$' THEN
      RAISE EXCEPTION 'entidad de adenda invalida'
        USING ERRCODE = '55000';
    END IF;
    IF NEW.adenda_de IS DISTINCT FROM NEW.entidad_id THEN
      RAISE EXCEPTION 'adenda_de debe apuntar al registro original'
        USING ERRCODE = '55000';
    END IF;
    EXECUTE format(
      'SELECT estado FROM public.%I WHERE id = $1 AND tenant_id = $2',
      NEW.entidad
    ) INTO estado_origen USING NEW.entidad_id, NEW.tenant_id;
    IF estado_origen IS DISTINCT FROM 'firmado' THEN
      RAISE EXCEPTION 'solo se adenda un registro firmado'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  IF NEW.estado = 'borrador' THEN
    NEW.firmado_por := NULL;
    NEW.firmado_en := NULL;
    NEW.hash_contenido := NULL;
    RETURN NEW;
  END IF;

  IF NEW.firmado_por IS NULL THEN
    RAISE EXCEPTION 'firmado_por obligatorio al firmar'
      USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u
     WHERE u.id = NEW.firmado_por AND u.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'firmado_por no pertenece al tenant'
      USING ERRCODE = '55000';
  END IF;

  NEW.firmado_en := now();
  NEW.hash_contenido := NULL;
  doc := to_jsonb(NEW) - 'hash_contenido';
  NEW.hash_contenido := encode(digest(convert_to(doc::text, 'UTF8'), 'sha256'), 'hex');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION anexos_antes_fila()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'anexo clinico: DELETE prohibido'
      USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'anexo clinico: TRUNCATE prohibido'
      USING ERRCODE = '55000';
  END IF;
  IF current_setting('app.rotacion_dek', true) = '1'
     AND current_user IS DISTINCT FROM 'optisaas_app'
     AND NEW.id IS NOT DISTINCT FROM OLD.id
     AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id
     AND NEW.nombre IS NOT DISTINCT FROM OLD.nombre
     AND NEW.mime IS NOT DISTINCT FROM OLD.mime
     AND NEW.tamano IS NOT DISTINCT FROM OLD.tamano
     AND NEW.hash_sha256 IS NOT DISTINCT FROM OLD.hash_sha256
     AND NEW.creado_en IS NOT DISTINCT FROM OLD.creado_en THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'anexo clinico: UPDATE prohibido'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS anexos_fila ON anexos;
--> statement-breakpoint
CREATE TRIGGER anexos_fila
  BEFORE UPDATE OR DELETE ON anexos
  FOR EACH ROW EXECUTE FUNCTION anexos_antes_fila();
--> statement-breakpoint
DROP TRIGGER IF EXISTS anexos_truncate ON anexos;
--> statement-breakpoint
CREATE TRIGGER anexos_truncate
  BEFORE TRUNCATE ON anexos
  FOR EACH STATEMENT EXECUTE FUNCTION inmutabilidad_rechazar_truncate();
--> statement-breakpoint
REVOKE ALL ON FUNCTION anexos_antes_fila() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION anexos_antes_fila() TO optisaas_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON anexos FROM optisaas_app;
--> statement-breakpoint
ALTER TABLE politica_retencion DROP CONSTRAINT politica_retencion_tipo;
--> statement-breakpoint
ALTER TABLE politica_retencion ADD CONSTRAINT politica_retencion_tipo CHECK (
  tipo_documento in (
    'historia_clinica',
    'archivo_gestion',
    'archivo_central',
    'prescripcion',
    'consentimiento',
    'factura_electronica',
    'log_auditoria',
    'anexo_clinico'
  )
);
--> statement-breakpoint
INSERT INTO politica_retencion (tenant_id, tipo_documento, anios, base_normativa, verificado)
SELECT t.id, 'anexo_clinico', 15,
       'anexo de la historia clinica; misma retencion minima de 15 anos. Res. 839/2017 art. 3',
       true
  FROM tenants t
ON CONFLICT (tenant_id, tipo_documento) DO NOTHING;
--> statement-breakpoint
ALTER TABLE atencion_adendas DROP CONSTRAINT atencion_adendas_campo_valido;
--> statement-breakpoint
ALTER TABLE atencion_adendas ADD CONSTRAINT atencion_adendas_campo_valido CHECK (campo_ref in (
  'esfera_od', 'cilindro_od', 'eje_od', 'adicion_od', 'agudeza_od',
  'esfera_oi', 'cilindro_oi', 'eje_oi', 'adicion_oi', 'agudeza_oi',
  'dip', 'dip_monocular_od', 'dip_monocular_oi',
  'diagnostico', 'alergias'
));
--> statement-breakpoint
ALTER TABLE atencion_adendas DROP CONSTRAINT atencion_adendas_ref_valida;
--> statement-breakpoint
ALTER TABLE atencion_adendas ADD CONSTRAINT atencion_adendas_ref_valida CHECK (
  valor_anterior_ref ~ '^(examenes_optometricos\.[a-z_]+|diagnosticos\.descripcion|atenciones\.alergias|atencion_adendas:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
);
--> statement-breakpoint
CREATE TABLE historial_identificacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  campo text NOT NULL,
  valor_anterior text NOT NULL,
  valor_nuevo text NOT NULL,
  registrado_en timestamptz DEFAULT now() NOT NULL,
  registrado_por uuid NOT NULL REFERENCES usuarios(id),
  CONSTRAINT historial_identificacion_campo CHECK (campo in ('tipo_doc', 'num_doc', 'fecha_nacimiento'))
);
--> statement-breakpoint
CREATE INDEX historial_identificacion_paciente_id_idx ON historial_identificacion (paciente_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION historial_identificacion_bloquear()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'el historial de identificacion no se modifica'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER historial_identificacion_fila
  BEFORE UPDATE OR DELETE ON historial_identificacion
  FOR EACH ROW EXECUTE FUNCTION historial_identificacion_bloquear();
--> statement-breakpoint
REVOKE ALL ON FUNCTION historial_identificacion_bloquear() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION historial_identificacion_bloquear() TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON historial_identificacion TO optisaas_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON historial_identificacion FROM optisaas_app;
--> statement-breakpoint
ALTER TABLE historial_identificacion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE historial_identificacion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY historial_identificacion_tenant_app ON historial_identificacion
  FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prescripciones_coherencia()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  paciente uuid;
  estado_atencion text;
  hc text;
  tipo_perfil text;
  registro text;
  vigente date;
  estado_perfil text;
  zona text;
  hoy date;
  estado_anterior text;
  paciente_anterior uuid;
  atencion_anterior uuid;
BEGIN
  IF current_setting('app.fusion_hc', true) = '1'
     AND current_user IS DISTINCT FROM 'optisaas_app'
     AND TG_OP = 'UPDATE'
     AND NEW.estado IS NOT DISTINCT FROM OLD.estado
     AND NEW.id IS NOT DISTINCT FROM OLD.id
     AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id
     AND NEW.atencion_id IS NOT DISTINCT FROM OLD.atencion_id THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.rotacion_dek', true) = '1'
     AND current_user IS DISTINCT FROM 'optisaas_app'
     AND TG_OP = 'UPDATE'
     AND NEW.estado IS NOT DISTINCT FROM OLD.estado
     AND NEW.id IS NOT DISTINCT FROM OLD.id
     AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id
     AND NEW.paciente_id IS NOT DISTINCT FROM OLD.paciente_id
     AND NEW.atencion_id IS NOT DISTINCT FROM OLD.atencion_id THEN
    RETURN NEW;
  END IF;
  IF NEW.estado IS DISTINCT FROM 'firmada' THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.rol', true) NOT IN ('optometra', 'oftalmologo') THEN
    RAISE EXCEPTION 'solo optometra u oftalmologo puede firmar la prescripcion' USING ERRCODE = '42501';
  END IF;
  SELECT a.paciente_id, a.estado
    INTO paciente, estado_atencion
    FROM atenciones a
   WHERE a.id = NEW.atencion_id
     AND a.tenant_id = NEW.tenant_id;
  IF paciente IS NULL OR paciente IS DISTINCT FROM NEW.paciente_id OR estado_atencion IS DISTINCT FROM 'firmado' THEN
    RAISE EXCEPTION 'la prescripcion exige una atencion firmada del mismo paciente' USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM diagnosticos d
     WHERE d.atencion_id = NEW.atencion_id
       AND d.tenant_id = NEW.tenant_id
       AND d.principal = true
       AND d.estado = 'firmado'
  ) THEN
    RAISE EXCEPTION 'la prescripcion exige el diagnostico principal firmado' USING ERRCODE = '55000';
  END IF;
  SELECT p.num_hc::text INTO hc
    FROM pacientes p
   WHERE p.id = NEW.paciente_id
     AND p.tenant_id = NEW.tenant_id;
  IF hc IS NULL OR hc IS DISTINCT FROM btrim(NEW.numero_hc) THEN
    RAISE EXCEPTION 'el numero de historia clinica no corresponde al paciente' USING ERRCODE = '55000';
  END IF;
  SELECT valor #>> '{}' INTO zona
    FROM parametros_tenant
   WHERE tenant_id = NEW.tenant_id
     AND clave = 'zona_horaria'
     AND vigente_hasta IS NULL
   LIMIT 1;
  IF zona IS NULL OR zona = '' THEN
    zona := 'America/Bogota';
  END IF;
  hoy := (now() AT TIME ZONE zona)::date;
  SELECT pf.tipo, pf.registro_profesional, pf.vigente_hasta, pf.estado
    INTO tipo_perfil, registro, vigente, estado_perfil
    FROM perfiles_profesionales pf
   WHERE pf.usuario_id = NEW.firmado_por
     AND pf.tenant_id = NEW.tenant_id;
  IF estado_perfil IS DISTINCT FROM 'verificado'
     OR registro IS NULL
     OR registro IS DISTINCT FROM btrim(NEW.registro_profesional)
     OR vigente IS NULL
     OR vigente < hoy
     OR (tipo_perfil IS NOT NULL AND tipo_perfil NOT IN ('optometra', 'oftalmologo')) THEN
    RAISE EXCEPTION 'solo un profesional con registro vigente puede firmar la prescripcion' USING ERRCODE = '55000';
  END IF;
  IF NEW.sustituye_a IS NOT NULL THEN
    SELECT pr.estado, pr.paciente_id, pr.atencion_id
      INTO estado_anterior, paciente_anterior, atencion_anterior
      FROM prescripciones pr
     WHERE pr.id = NEW.sustituye_a
       AND pr.tenant_id = NEW.tenant_id;
    IF estado_anterior IS DISTINCT FROM 'firmada'
       OR paciente_anterior IS DISTINCT FROM NEW.paciente_id
       OR atencion_anterior IS DISTINCT FROM NEW.atencion_id THEN
      RAISE EXCEPTION 'la correccion debe referenciar la prescripcion firmada anterior' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION entregas_hc_antes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.fusion_hc', true) = '1'
     AND current_user IS DISTINCT FROM 'optisaas_app'
     AND TG_OP = 'UPDATE'
     AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id
     AND NEW.estado IS NOT DISTINCT FROM OLD.estado
     AND NEW.costo_cop IS NOT DISTINCT FROM OLD.costo_cop
     AND NEW.solicitante IS NOT DISTINCT FROM OLD.solicitante THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'la entrega de la hc no se borra'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.estado = 'entregada' THEN
    RAISE EXCEPTION 'entrega registrada inmutable'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.estado = 'solicitada' AND NEW.estado NOT IN ('solicitada', 'generada') THEN
    RAISE EXCEPTION 'transicion de estado no permitida'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.estado = 'generada' AND NEW.estado NOT IN ('generada', 'entregada') THEN
    RAISE EXCEPTION 'transicion de estado no permitida'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.paciente_id IS DISTINCT FROM OLD.paciente_id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.costo_cop IS DISTINCT FROM OLD.costo_cop
     OR NEW.solicitante IS DISTINCT FROM OLD.solicitante THEN
    RAISE EXCEPTION 'la entrega no cambia de paciente ni de costo'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION autorizaciones_proteger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.fusion_hc', true) = '1'
     AND current_user IS DISTINCT FROM 'optisaas_app'
     AND TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) - 'paciente_id') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'paciente_id') THEN
    RETURN NEW;
  END IF;
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
CREATE OR REPLACE FUNCTION fusionar_historia_paciente(p_origen uuid, p_destino uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant text;
  t_origen uuid;
  t_destino uuid;
BEGIN
  tenant := current_setting('app.tenant_id', true);
  IF tenant IS NULL OR tenant = '' THEN
    RAISE EXCEPTION 'falta el tenant' USING ERRCODE = '42501';
  END IF;
  IF p_origen IS NOT DISTINCT FROM p_destino THEN
    RAISE EXCEPTION 'no se puede fusionar un paciente consigo mismo' USING ERRCODE = '55000';
  END IF;
  SELECT tenant_id INTO t_origen FROM pacientes WHERE id = p_origen;
  SELECT tenant_id INTO t_destino FROM pacientes WHERE id = p_destino;
  IF t_origen IS NULL OR t_destino IS NULL
     OR t_origen IS DISTINCT FROM t_destino
     OR t_origen::text IS DISTINCT FROM tenant THEN
    RAISE EXCEPTION 'los pacientes no pertenecen al tenant' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM atenciones o
      JOIN atenciones d
        ON d.paciente_id = p_destino
       AND d.folio IS NOT NULL
       AND d.folio = o.folio
     WHERE o.paciente_id = p_origen
       AND o.folio IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'la fusion choca con un folio de la historia que se conserva' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM marcas_retencion o
      JOIN marcas_retencion d
        ON d.paciente_id = p_destino
       AND d.tenant_id = o.tenant_id
       AND d.tipo = o.tipo
     WHERE o.paciente_id = p_origen
  ) THEN
    RAISE EXCEPTION 'la fusion choca con una marca de retencion' USING ERRCODE = '23505';
  END IF;
  PERFORM set_config('app.fusion_hc', '1', true);
  UPDATE atenciones SET paciente_id = p_destino WHERE paciente_id = p_origen AND tenant_id = t_origen;
  UPDATE prescripciones SET paciente_id = p_destino WHERE paciente_id = p_origen AND tenant_id = t_origen;
  UPDATE consentimientos SET paciente_id = p_destino WHERE paciente_id = p_origen AND tenant_id = t_origen;
  UPDATE autorizaciones SET paciente_id = p_destino WHERE paciente_id = p_origen AND tenant_id = t_origen;
  UPDATE entregas_hc SET paciente_id = p_destino WHERE paciente_id = p_origen AND tenant_id = t_origen;
  UPDATE marcas_retencion SET paciente_id = p_destino WHERE paciente_id = p_origen AND tenant_id = t_origen;
  PERFORM set_config('app.fusion_hc', '', true);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION fusionar_historia_paciente(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION fusionar_historia_paciente(uuid, uuid) TO optisaas_app;
