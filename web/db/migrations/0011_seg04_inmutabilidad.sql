-- SEG-04 (T12) — Marco de inmutabilidad: estados, firma y adenda.
-- Las tablas clínicas (historias, atenciones, prescripciones) todavía no
-- existen. Quien las cree (T19 y siguientes) debe llamar
-- `aplicar_marco_inmutabilidad('nombre_tabla')` después del CREATE TABLE.
-- Columnas exigidas: id uuid, tenant_id uuid, estado text, contenido text,
-- firmado_por uuid, firmado_en timestamptz, hash_contenido text.
-- Estados almacenados: borrador → firmado (registro) o firmada (adenda).
-- `adendado` no se guarda: lo deriva la consulta si hay adendas.
-- TODO(Q-17): el borrador no es el registro oficial hasta firmar; esa
-- interpretación la confirma el abogado. No hay ventana de edición por horas.
-- TODO(Q-22): el hash SHA-256 no es sello de tiempo (SEG-08).
-- El borrado de un borrador lo permite el trigger. T19 debe anotarlo en la
-- bitácora (acción `anular`); desde aquí no se escribe la cadena de T10.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
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
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado IN ('firmado', 'firmada', 'adendado') THEN
      RAISE EXCEPTION 'registro firmado inmutable: DELETE prohibido'
        USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
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

  -- Hora del servidor. El valor que mande el cliente se descarta.
  NEW.firmado_en := now();
  NEW.hash_contenido := NULL;
  doc := to_jsonb(NEW) - 'hash_contenido';
  NEW.hash_contenido := encode(digest(convert_to(doc::text, 'UTF8'), 'sha256'), 'hex');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION inmutabilidad_rechazar_truncate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'registro firmado inmutable: TRUNCATE prohibido'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION aplicar_marco_inmutabilidad(p_tabla regclass)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  i integer;
  requerida text;
  tipo_real text;
  requeridas text[] := ARRAY[
    'id', 'tenant_id', 'estado', 'contenido', 'firmado_por', 'firmado_en', 'hash_contenido'
  ];
  tipos text[] := ARRAY['uuid', 'uuid', 'text', 'text', 'uuid', 'timestamptz', 'text'];
BEGIN
  FOR i IN 1..array_length(requeridas, 1) LOOP
    requerida := requeridas[i];
    SELECT t.typname INTO tipo_real
      FROM pg_attribute a
      JOIN pg_type t ON t.oid = a.atttypid
     WHERE a.attrelid = p_tabla
       AND a.attname = requerida
       AND a.attnum > 0
       AND NOT a.attisdropped;
    IF tipo_real IS NULL THEN
      RAISE EXCEPTION 'la tabla % no tiene la columna % del marco', p_tabla, requerida
        USING ERRCODE = '55000';
    END IF;
    IF tipo_real IS DISTINCT FROM tipos[i] THEN
      RAISE EXCEPTION 'la columna %.% debe ser % (es %)', p_tabla, requerida, tipos[i], tipo_real
        USING ERRCODE = '55000';
    END IF;
  END LOOP;

  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS inmutabilidad_coherencia_chk', p_tabla);
  EXECUTE format(
    'ALTER TABLE %s ADD CONSTRAINT inmutabilidad_coherencia_chk CHECK (
       (estado = ''borrador'' AND hash_contenido IS NULL AND firmado_en IS NULL AND firmado_por IS NULL)
       OR (
         estado IN (''firmado'', ''firmada'')
         AND hash_contenido ~ ''^[a-f0-9]{64}$''
         AND firmado_en IS NOT NULL
         AND firmado_por IS NOT NULL
       )
     )',
    p_tabla
  );

  EXECUTE format('DROP TRIGGER IF EXISTS inmutabilidad_fila ON %s', p_tabla);
  EXECUTE format(
    'CREATE TRIGGER inmutabilidad_fila
       BEFORE INSERT OR UPDATE OR DELETE ON %s
       FOR EACH ROW EXECUTE FUNCTION inmutabilidad_antes_fila()',
    p_tabla
  );
  EXECUTE format('DROP TRIGGER IF EXISTS inmutabilidad_truncate ON %s', p_tabla);
  EXECUTE format(
    'CREATE TRIGGER inmutabilidad_truncate
       BEFORE TRUNCATE ON %s
       FOR EACH STATEMENT EXECUTE FUNCTION inmutabilidad_rechazar_truncate()',
    p_tabla
  );
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION verificar_hash_contenido(p_tabla regclass, p_id uuid)
RETURNS TABLE (coincide boolean, almacenado text, calculado text, motivo text)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  doc jsonb;
  guardado text;
  recalculado text;
  estado_fila text;
BEGIN
  EXECUTE format('SELECT to_jsonb(t) FROM %s t WHERE t.id = $1', p_tabla)
    INTO doc USING p_id;
  IF doc IS NULL THEN
    coincide := false;
    almacenado := NULL;
    calculado := NULL;
    motivo := 'fila_ausente';
    RETURN NEXT;
    RETURN;
  END IF;
  estado_fila := doc->>'estado';
  guardado := doc->>'hash_contenido';
  recalculado := encode(
    digest(convert_to((doc - 'hash_contenido')::text, 'UTF8'), 'sha256'),
    'hex'
  );
  almacenado := guardado;
  calculado := recalculado;
  IF estado_fila = 'borrador' OR guardado IS NULL THEN
    coincide := false;
    motivo := 'sin_firma';
  ELSIF guardado = recalculado THEN
    coincide := true;
    motivo := 'ok';
  ELSE
    coincide := false;
    motivo := 'hash_distinto';
  END IF;
  RETURN NEXT;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION consulta_registro_con_adendas(p_tabla regclass, p_id uuid)
RETURNS TABLE (
  orden integer,
  tipo text,
  registro_id uuid,
  adenda_de uuid,
  autor uuid,
  hora timestamptz,
  hora_bogota text,
  estado_visible text,
  motivo text,
  contenido text
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  nombre text;
BEGIN
  SELECT c.relname INTO nombre FROM pg_class c WHERE c.oid = p_tabla;
  RETURN QUERY EXECUTE format($q$
    SELECT s.orden, s.tipo, s.registro_id, s.adenda_de, s.autor, s.hora, s.hora_bogota,
           s.estado_visible, s.motivo, s.contenido
      FROM (
        SELECT
          0 AS orden,
          'original'::text AS tipo,
          t.id AS registro_id,
          NULL::uuid AS adenda_de,
          t.firmado_por AS autor,
          t.firmado_en AS hora,
          to_char(t.firmado_en AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI:SS') AS hora_bogota,
          CASE
            WHEN t.estado = 'firmado' AND EXISTS (
              SELECT 1 FROM adendas a
               WHERE a.tenant_id = t.tenant_id
                 AND a.entidad = $2
                 AND a.entidad_id = t.id
            ) THEN 'adendado'
            ELSE t.estado
          END AS estado_visible,
          NULL::text AS motivo,
          t.contenido
        FROM %s t
        WHERE t.id = $1
        UNION ALL
        SELECT
          row_number() OVER (ORDER BY a.firmado_en, a.id)::int AS orden,
          'adenda'::text,
          a.id,
          a.adenda_de,
          a.firmado_por,
          a.firmado_en,
          to_char(a.firmado_en AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI:SS'),
          a.estado,
          a.motivo,
          a.contenido
        FROM adendas a
        JOIN %s t ON t.id = $1 AND a.tenant_id = t.tenant_id
        WHERE a.entidad = $2 AND a.entidad_id = $1
      ) s
     ORDER BY s.orden
  $q$, p_tabla, p_tabla) USING p_id, nombre;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION inmutabilidad_antes_fila() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION inmutabilidad_rechazar_truncate() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION aplicar_marco_inmutabilidad(regclass) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION verificar_hash_contenido(regclass, uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION consulta_registro_con_adendas(regclass, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION inmutabilidad_antes_fila() TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION inmutabilidad_rechazar_truncate() TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION verificar_hash_contenido(regclass, uuid) TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION consulta_registro_con_adendas(regclass, uuid) TO optisaas_app;
--> statement-breakpoint
CREATE TABLE "adendas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "entidad" text NOT NULL,
  "entidad_id" uuid NOT NULL,
  "adenda_de" uuid NOT NULL,
  "motivo" text NOT NULL,
  "contenido" text NOT NULL,
  "estado" text DEFAULT 'borrador' NOT NULL,
  "firmado_por" uuid REFERENCES "usuarios"("id"),
  "firmado_en" timestamptz,
  "hash_contenido" text,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "adendas_entidad_valida" CHECK ("entidad" ~ '^[a-z_][a-z0-9_]{0,62}$'),
  CONSTRAINT "adendas_motivo_largo" CHECK (char_length("motivo") BETWEEN 1 AND 4000),
  CONSTRAINT "adendas_contenido_largo" CHECK (char_length("contenido") BETWEEN 1 AND 20000),
  CONSTRAINT "adendas_adenda_de_original" CHECK ("adenda_de" = "entidad_id")
);
--> statement-breakpoint
CREATE INDEX "adendas_tenant_entidad_idx" ON "adendas" ("tenant_id", "entidad", "entidad_id");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON adendas TO optisaas_app;
--> statement-breakpoint
ALTER TABLE adendas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE adendas FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY adendas_tenant_app ON adendas FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
SELECT aplicar_marco_inmutabilidad('public.adendas'::regclass);
