-- PLT-11 (T06) — RLS ENABLE + FORCE y política por tenant en las tablas
-- nuevas con `tenant_id`. Mismo rol `optisaas_app` de PLT-01: sin
-- superusuario ni salto de RLS. La instantánea de impuesto de una línea
-- cerrada no se reescribe (AC-PLT-11-1).
GRANT SELECT, INSERT, UPDATE, DELETE ON
  parametros_tenant,
  festivos,
  tarifas_impuesto,
  instantaneas_impuesto_linea,
  bitacora_parametros
TO optisaas_app;
--> statement-breakpoint
ALTER TABLE parametros_tenant ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE parametros_tenant FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE festivos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE festivos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tarifas_impuesto ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tarifas_impuesto FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE instantaneas_impuesto_linea ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE instantaneas_impuesto_linea FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bitacora_parametros ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bitacora_parametros FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY parametros_tenant_app ON parametros_tenant FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY festivos_tenant_app ON festivos FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY tarifas_impuesto_app ON tarifas_impuesto FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY instantaneas_impuesto_linea_app ON instantaneas_impuesto_linea FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY bitacora_parametros_app ON bitacora_parametros FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION impedir_cambio_instantanea_impuesto()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.impuesto_snapshot IS DISTINCT FROM OLD.impuesto_snapshot
     OR NEW.tarifa_impuesto_id IS DISTINCT FROM OLD.tarifa_impuesto_id THEN
    RAISE EXCEPTION 'la instantánea de impuesto de una línea cerrada no se modifica';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER instantaneas_impuesto_linea_inmutable
  BEFORE UPDATE OF impuesto_snapshot, tarifa_impuesto_id
  ON instantaneas_impuesto_linea
  FOR EACH ROW
  EXECUTE FUNCTION impedir_cambio_instantanea_impuesto();
