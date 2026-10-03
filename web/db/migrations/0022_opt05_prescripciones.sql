-- OPT-05 (T23) — Prescripción del art. 17.
-- RLS ENABLE + FORCE. El marco de T12 cubre borrador → firmada.
-- `sustituida` y `vencida` no se escriben: un UPDATE de la fila firmada
-- está prohibido. La sucesora trae `sustituye_a`; la vigencia se compara
-- con el día civil. TODO(Q-18): vigencia_hasta no tiene DEFAULT.
-- ASE-07 todavía no existe.
-- Rollback: DROP TABLE prescripciones, secuencias_prescripcion CASCADE;
-- DROP FUNCTION prescripcion_grupo(integer), prescripcion_cantidad_en_letras(integer),
-- prescripcion_cantidad_coincide(integer, text), prescripciones_coherencia();
-- restaurar los CHECK de documentos_firma y firmas sin prescripcion.
ALTER TABLE documentos_firma DROP CONSTRAINT documentos_firma_tipo_valido;
--> statement-breakpoint
ALTER TABLE documentos_firma ADD CONSTRAINT documentos_firma_tipo_valido
  CHECK (tipo in ('ejemplo_sintetico', 'autorizacion_datos', 'atencion_clinica', 'consentimiento_clinico', 'prescripcion'));
--> statement-breakpoint
ALTER TABLE firmas DROP CONSTRAINT firmas_documento_tipo_valido;
--> statement-breakpoint
ALTER TABLE firmas ADD CONSTRAINT firmas_documento_tipo_valido
  CHECK (documento_tipo in ('ejemplo_sintetico', 'autorizacion_datos', 'atencion_clinica', 'consentimiento_clinico', 'prescripcion'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prescripcion_grupo(n integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  unidades text[] := ARRAY['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve'];
  diez text[] := ARRAY['diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
  veinti text[] := ARRAY['veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
  decenas text[] := ARRAY['','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  centenas text[] := ARRAY['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
  c integer;
  r integer;
  d integer;
  u integer;
  partes text := '';
BEGIN
  IF n = 0 THEN
    RETURN '';
  END IF;
  IF n = 100 THEN
    RETURN 'cien';
  END IF;
  c := n / 100;
  r := n % 100;
  IF c > 0 THEN
    partes := centenas[c + 1];
  END IF;
  IF r > 0 AND r < 10 THEN
    partes := btrim(partes || ' ' || unidades[r + 1]);
  ELSIF r >= 10 AND r < 20 THEN
    partes := btrim(partes || ' ' || diez[r - 9]);
  ELSIF r >= 20 AND r < 30 THEN
    partes := btrim(partes || ' ' || veinti[r - 19]);
  ELSIF r >= 30 THEN
    d := r / 10;
    u := r % 10;
    IF u = 0 THEN
      partes := btrim(partes || ' ' || decenas[d]);
    ELSE
      partes := btrim(partes || ' ' || decenas[d] || ' y ' || unidades[u + 1]);
    END IF;
  END IF;
  RETURN partes;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prescripcion_cantidad_en_letras(n integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  miles integer;
  resto integer;
  cabeza text;
BEGIN
  IF n IS NULL OR n < 1 OR n > 999999 THEN
    RAISE EXCEPTION 'la cantidad en letras solo cubre enteros de 1 a 999999' USING ERRCODE = '22023';
  END IF;
  IF n < 1000 THEN
    RETURN prescripcion_grupo(n);
  END IF;
  miles := n / 1000;
  resto := n % 1000;
  IF miles = 1 THEN
    cabeza := 'mil';
  ELSE
    cabeza := prescripcion_grupo(miles) || ' mil';
  END IF;
  IF resto = 0 THEN
    RETURN cabeza;
  END IF;
  RETURN cabeza || ' ' || prescripcion_grupo(resto);
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prescripcion_cantidad_coincide(n integer, letras text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF n IS NULL OR letras IS NULL THEN
    RETURN false;
  END IF;
  RETURN lower(regexp_replace(btrim(letras), '\s+', ' ', 'g')) = prescripcion_cantidad_en_letras(n);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;
--> statement-breakpoint
CREATE TABLE secuencias_prescripcion (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  anio integer NOT NULL,
  ultimo integer NOT NULL,
  PRIMARY KEY (tenant_id, anio),
  CONSTRAINT secuencias_prescripcion_anio CHECK (anio BETWEEN 2000 AND 9999),
  CONSTRAINT secuencias_prescripcion_ultimo CHECK (ultimo >= 0 AND ultimo <= 999999)
);
--> statement-breakpoint
CREATE TABLE prescripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id),
  atencion_id uuid NOT NULL REFERENCES atenciones(id),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  profesional_id uuid NOT NULL REFERENCES usuarios(id),
  numero text,
  anio integer,
  consecutivo integer,
  tipo text NOT NULL,
  estado text DEFAULT 'borrador' NOT NULL,
  contenido text NOT NULL,
  firmado_por uuid REFERENCES usuarios(id),
  firmado_en timestamptz,
  hash_contenido text,
  sustituye_a uuid,
  prestador_nombre text,
  direccion text,
  telefono text,
  correo text,
  lugar text,
  fecha date,
  paciente_nombre text,
  paciente_documento text,
  numero_hc text,
  tipo_usuario text,
  dispositivo text,
  agudeza_visual text,
  forma_uso text,
  distancia_pupilar text,
  filtro text,
  duracion_tratamiento text,
  cantidad_num integer,
  cantidad_letras text,
  indicaciones text,
  vigencia_hasta date,
  nombre_prescriptor text,
  registro_profesional text,
  firma_id uuid REFERENCES firmas(id),
  documento_firma_id uuid REFERENCES documentos_firma(id),
  hash_pdf text,
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT prescripciones_tipo_valido CHECK (
    tipo in ('lentes_oftalmicos', 'lentes_contacto', 'baja_vision', 'protesis_ocular', 'terapia_visual')
  ),
  CONSTRAINT prescripciones_estado_valido CHECK (estado in ('borrador', 'firmada')),
  CONSTRAINT prescripciones_numero_formato CHECK (numero is null or numero ~ '^RX-[0-9]{4}-[0-9]{6}$'),
  CONSTRAINT prescripciones_hash_pdf CHECK (hash_pdf is null or hash_pdf ~ '^[a-f0-9]{64}$'),
  CONSTRAINT prescripciones_cantidad_rango CHECK (
    cantidad_num is null or (cantidad_num >= 1 and cantidad_num <= 999999)
  ),
  CONSTRAINT prescripciones_art17_chk CHECK (
    estado = 'borrador'
    OR (
      estado = 'firmada'
      AND length(btrim(prestador_nombre)) > 0
      AND length(btrim(direccion)) > 0
      AND length(btrim(telefono)) > 0
      AND length(btrim(correo)) > 0
      AND length(btrim(lugar)) > 0
      AND fecha IS NOT NULL
      AND length(btrim(paciente_nombre)) > 0
      AND length(btrim(paciente_documento)) > 0
      AND length(btrim(numero_hc)) > 0
      AND length(btrim(tipo_usuario)) > 0
      AND length(btrim(dispositivo)) > 0
      AND length(btrim(agudeza_visual)) > 0
      AND length(btrim(forma_uso)) > 0
      AND length(btrim(distancia_pupilar)) > 0
      AND length(btrim(filtro)) > 0
      AND length(btrim(duracion_tratamiento)) > 0
      AND cantidad_num IS NOT NULL
      AND length(btrim(cantidad_letras)) > 0
      AND prescripcion_cantidad_coincide(cantidad_num, cantidad_letras)
      AND length(btrim(indicaciones)) > 0
      AND vigencia_hasta IS NOT NULL
      AND length(btrim(nombre_prescriptor)) > 0
      AND length(btrim(registro_profesional)) > 0
      AND firma_id IS NOT NULL
      AND documento_firma_id IS NOT NULL
      AND numero IS NOT NULL
      AND hash_pdf IS NOT NULL
    )
  )
);
--> statement-breakpoint
ALTER TABLE prescripciones
  ADD CONSTRAINT prescripciones_sustituye_a_fkey
  FOREIGN KEY (sustituye_a) REFERENCES prescripciones(id);
--> statement-breakpoint
CREATE INDEX prescripciones_tenant_id_idx ON prescripciones (tenant_id);
--> statement-breakpoint
CREATE INDEX prescripciones_atencion_id_idx ON prescripciones (atencion_id);
--> statement-breakpoint
CREATE INDEX prescripciones_paciente_id_idx ON prescripciones (paciente_id);
--> statement-breakpoint
CREATE UNIQUE INDEX prescripciones_numero_unico ON prescripciones (tenant_id, numero) WHERE numero IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX prescripciones_sustituye_unica ON prescripciones (sustituye_a) WHERE sustituye_a IS NOT NULL;
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
CREATE TRIGGER prescripciones_coherencia
  BEFORE INSERT OR UPDATE ON prescripciones
  FOR EACH ROW
  EXECUTE FUNCTION prescripciones_coherencia();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON secuencias_prescripcion, prescripciones TO optisaas_app;
--> statement-breakpoint
ALTER TABLE secuencias_prescripcion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE secuencias_prescripcion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE prescripciones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE prescripciones FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY secuencias_prescripcion_tenant_app ON secuencias_prescripcion
  FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo')
  );
--> statement-breakpoint
CREATE POLICY prescripciones_lectura_app ON prescripciones
  FOR SELECT TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY prescripciones_alta_app ON prescripciones
  FOR INSERT TO optisaas_app
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo')
  );
--> statement-breakpoint
CREATE POLICY prescripciones_borrador_app ON prescripciones
  FOR UPDATE TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND estado = 'borrador'
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo')
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND current_setting('app.rol', true) IN ('optometra', 'oftalmologo')
  );
--> statement-breakpoint
REVOKE ALL ON FUNCTION prescripcion_grupo(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION prescripcion_grupo(integer) TO optisaas_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION prescripcion_cantidad_en_letras(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION prescripcion_cantidad_en_letras(integer) TO optisaas_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION prescripcion_cantidad_coincide(integer, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION prescripcion_cantidad_coincide(integer, text) TO optisaas_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION prescripciones_coherencia() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION prescripciones_coherencia() TO optisaas_app;
--> statement-breakpoint
SELECT aplicar_marco_inmutabilidad('public.prescripciones'::regclass);
