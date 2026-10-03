-- SEG-07 (T26) — Habeas Data y PQR del titular.
-- RLS ENABLE + FORCE en cada tabla con tenant_id.
-- TODO(Q-07): la causa de supresión clínica no fija años de retención.
-- TODO(Q-17): registrar la solicitud no resuelve la base legal de la HC.
-- TODO(Q-32): aviso_festivos si no hay festivos cargados.
-- BORRADOR – requiere revisión jurídica.
-- Rollback: DROP TABLE historial_datos_demograficos, banderas_dato,
-- bitacora_respuestas_titular, solicitudes_titular, secuencias_radicado_hd CASCADE;
CREATE TABLE solicitudes_titular (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id),
  paciente_id uuid REFERENCES pacientes(id),
  radicado text NOT NULL,
  tipo text NOT NULL,
  canal text NOT NULL,
  ambito text,
  descripcion text NOT NULL,
  radicada_en timestamptz NOT NULL,
  vence_en date NOT NULL,
  plazo_dias_habiles integer NOT NULL,
  festivos_cargados boolean NOT NULL,
  aviso_festivos text,
  estado text DEFAULT 'radicada' NOT NULL,
  recurso text,
  recurso_id uuid,
  atencion_id uuid REFERENCES atenciones(id),
  adenda_id uuid REFERENCES atencion_adendas(id),
  campo_ref text,
  marca_limite_en timestamptz,
  marcada_en timestamptz,
  marcada_por uuid REFERENCES usuarios(id),
  prorroga_hasta date,
  respuesta text,
  respondida_en timestamptz,
  respondida_por uuid REFERENCES usuarios(id),
  creado_en timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT solicitudes_titular_radicado_unico UNIQUE (tenant_id, radicado),
  CONSTRAINT solicitudes_titular_radicado_forma CHECK (radicado ~ '^HD-[0-9]{4}-[0-9]{6}$'),
  CONSTRAINT solicitudes_titular_tipo CHECK (tipo in ('consulta', 'reclamo', 'rectificacion', 'supresion', 'revocatoria')),
  CONSTRAINT solicitudes_titular_canal CHECK (canal in ('presencial', 'escrito', 'electronico')),
  CONSTRAINT solicitudes_titular_ambito CHECK (ambito is null or ambito in ('clinico', 'demografico')),
  CONSTRAINT solicitudes_titular_estado CHECK (estado in ('radicada', 'en_tramite', 'respondida', 'prorrogada', 'cerrada')),
  CONSTRAINT solicitudes_titular_plazo_positivo CHECK (plazo_dias_habiles > 0)
);
--> statement-breakpoint
CREATE INDEX solicitudes_titular_tenant_id_idx ON solicitudes_titular (tenant_id);
--> statement-breakpoint
CREATE INDEX solicitudes_titular_paciente_id_idx ON solicitudes_titular (paciente_id);
--> statement-breakpoint
CREATE TABLE bitacora_respuestas_titular (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id),
  solicitud_id uuid NOT NULL REFERENCES solicitudes_titular(id),
  tipo text NOT NULL,
  texto text NOT NULL,
  registrada_en timestamptz NOT NULL,
  registrada_por uuid NOT NULL REFERENCES usuarios(id),
  CONSTRAINT bitacora_respuestas_titular_tipo CHECK (tipo in ('respuesta', 'prorroga', 'marca', 'alerta', 'bloqueo_supresion'))
);
--> statement-breakpoint
CREATE INDEX bitacora_respuestas_titular_tenant_id_idx ON bitacora_respuestas_titular (tenant_id);
--> statement-breakpoint
CREATE INDEX bitacora_respuestas_titular_solicitud_id_idx ON bitacora_respuestas_titular (solicitud_id);
--> statement-breakpoint
CREATE UNIQUE INDEX bitacora_alerta_unica ON bitacora_respuestas_titular (solicitud_id) WHERE tipo = 'alerta';
--> statement-breakpoint
CREATE TABLE banderas_dato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id),
  recurso text NOT NULL,
  recurso_id uuid NOT NULL,
  tipo text NOT NULL,
  leyenda text NOT NULL,
  desde timestamptz NOT NULL,
  hasta timestamptz,
  solicitud_id uuid NOT NULL REFERENCES solicitudes_titular(id),
  CONSTRAINT banderas_dato_tipo CHECK (tipo = 'reclamo_en_tramite'),
  CONSTRAINT banderas_dato_leyenda CHECK (leyenda = 'reclamo en trámite')
);
--> statement-breakpoint
CREATE INDEX banderas_dato_tenant_id_idx ON banderas_dato (tenant_id);
--> statement-breakpoint
CREATE INDEX banderas_dato_recurso_idx ON banderas_dato (recurso, recurso_id);
--> statement-breakpoint
CREATE TABLE historial_datos_demograficos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sede_id uuid NOT NULL REFERENCES sedes(id),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  solicitud_id uuid NOT NULL REFERENCES solicitudes_titular(id),
  campo text NOT NULL,
  valor_anterior text NOT NULL,
  valor_nuevo text NOT NULL,
  registrado_en timestamptz NOT NULL,
  registrado_por uuid NOT NULL REFERENCES usuarios(id)
);
--> statement-breakpoint
CREATE INDEX historial_datos_demograficos_tenant_id_idx ON historial_datos_demograficos (tenant_id);
--> statement-breakpoint
CREATE INDEX historial_datos_demograficos_paciente_id_idx ON historial_datos_demograficos (paciente_id);
--> statement-breakpoint
CREATE TABLE secuencias_radicado_hd (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  anio integer NOT NULL,
  ultimo integer NOT NULL,
  PRIMARY KEY (tenant_id, anio),
  CONSTRAINT secuencias_radicado_hd_ultimo CHECK (ultimo >= 0)
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bitacora_respuestas_titular_bloquear()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'la bitácora de respuesta del titular no se modifica'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS bitacora_respuestas_titular_bloquear ON bitacora_respuestas_titular;
--> statement-breakpoint
CREATE TRIGGER bitacora_respuestas_titular_bloquear
  BEFORE UPDATE OR DELETE ON bitacora_respuestas_titular
  FOR EACH ROW EXECUTE FUNCTION bitacora_respuestas_titular_bloquear();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION historial_datos_demograficos_bloquear()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'el historial demográfico no se modifica'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS historial_datos_demograficos_bloquear ON historial_datos_demograficos;
--> statement-breakpoint
CREATE TRIGGER historial_datos_demograficos_bloquear
  BEFORE UPDATE OR DELETE ON historial_datos_demograficos
  FOR EACH ROW EXECUTE FUNCTION historial_datos_demograficos_bloquear();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION solicitudes_titular_antes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'la solicitud del titular no se borra'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.radicado IS DISTINCT FROM OLD.radicado
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.radicada_en IS DISTINCT FROM OLD.radicada_en
     OR NEW.vence_en IS DISTINCT FROM OLD.vence_en
     OR NEW.paciente_id IS DISTINCT FROM OLD.paciente_id THEN
    RAISE EXCEPTION 'la radicación no cambia de identidad ni de plazo'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS solicitudes_titular_antes ON solicitudes_titular;
--> statement-breakpoint
CREATE TRIGGER solicitudes_titular_antes
  BEFORE UPDATE OR DELETE ON solicitudes_titular
  FOR EACH ROW EXECUTE FUNCTION solicitudes_titular_antes();
--> statement-breakpoint
REVOKE ALL ON FUNCTION bitacora_respuestas_titular_bloquear() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION historial_datos_demograficos_bloquear() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION solicitudes_titular_antes() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION bitacora_respuestas_titular_bloquear() TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION historial_datos_demograficos_bloquear() TO optisaas_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION solicitudes_titular_antes() TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON solicitudes_titular, banderas_dato, secuencias_radicado_hd TO optisaas_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON bitacora_respuestas_titular, historial_datos_demograficos TO optisaas_app;
--> statement-breakpoint
REVOKE DELETE ON solicitudes_titular, banderas_dato, secuencias_radicado_hd, bitacora_respuestas_titular, historial_datos_demograficos FROM optisaas_app;
--> statement-breakpoint
REVOKE UPDATE ON bitacora_respuestas_titular, historial_datos_demograficos FROM optisaas_app;
--> statement-breakpoint
ALTER TABLE solicitudes_titular ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE solicitudes_titular FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bitacora_respuestas_titular ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bitacora_respuestas_titular FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE banderas_dato ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE banderas_dato FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE historial_datos_demograficos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE historial_datos_demograficos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE secuencias_radicado_hd ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE secuencias_radicado_hd FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY solicitudes_titular_tenant_app ON solicitudes_titular FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
--> statement-breakpoint
CREATE POLICY bitacora_respuestas_titular_tenant_app ON bitacora_respuestas_titular FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
--> statement-breakpoint
CREATE POLICY banderas_dato_tenant_app ON banderas_dato FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
--> statement-breakpoint
CREATE POLICY historial_datos_demograficos_tenant_app ON historial_datos_demograficos FOR ALL TO optisaas_app
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND sede_id::text = ANY (string_to_array(coalesce(current_setting('app.sedes', true), ''), ','))
  );
--> statement-breakpoint
CREATE POLICY secuencias_radicado_hd_tenant_app ON secuencias_radicado_hd FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
