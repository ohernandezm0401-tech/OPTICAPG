-- OPT-05 (T24) — Hash de verificación del texto canónico.
-- La tabla prescripciones ya tiene RLS ENABLE + FORCE (0022). Esta migración
-- no lo desactiva y no crea un rol con salto de RLS.
-- La función es SECURITY DEFINER porque la ruta pública no tiene tenant:
-- solo devuelve número, fecha de emisión, nombre y registro si el hash coincide.
-- Rollback: DROP FUNCTION verificar_prescripcion_por_hash(text);
-- DROP INDEX prescripciones_hash_verificacion_idx;
-- ALTER TABLE prescripciones DROP CONSTRAINT prescripciones_hash_verificacion;
-- ALTER TABLE prescripciones DROP COLUMN hash_verificacion;
ALTER TABLE prescripciones
  ADD COLUMN hash_verificacion text;
--> statement-breakpoint
ALTER TABLE prescripciones
  ADD CONSTRAINT prescripciones_hash_verificacion
  CHECK (hash_verificacion IS NULL OR hash_verificacion ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
CREATE INDEX prescripciones_hash_verificacion_idx
  ON prescripciones (hash_verificacion)
  WHERE hash_verificacion IS NOT NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION verificar_prescripcion_por_hash(p_hash text)
RETURNS TABLE (
  numero text,
  fecha_emision date,
  nombre_prescriptor text,
  registro_profesional text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.numero, p.fecha, p.nombre_prescriptor, p.registro_profesional
      FROM prescripciones p
     WHERE p.hash_verificacion = p_hash
       AND p.estado = 'firmada'
       AND p.numero IS NOT NULL
       AND p.fecha IS NOT NULL
       AND p.nombre_prescriptor IS NOT NULL
       AND p.registro_profesional IS NOT NULL
     LIMIT 1;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION verificar_prescripcion_por_hash(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION verificar_prescripcion_por_hash(text) TO optisaas_app;
