-- SEG-01 (T08) — RLS ENABLE + FORCE en las tablas nuevas con tenant_id.
-- El rol optisaas_app no es superusuario ni tiene salto de RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON factores_totp, codigos_recuperacion, credenciales_webauthn, desafios_mfa TO optisaas_app;
--> statement-breakpoint
ALTER TABLE factores_totp ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE factores_totp FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE codigos_recuperacion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE codigos_recuperacion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE credenciales_webauthn ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE credenciales_webauthn FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE desafios_mfa ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE desafios_mfa FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY factores_totp_app ON factores_totp FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY codigos_recuperacion_app ON codigos_recuperacion FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY credenciales_webauthn_app ON credenciales_webauthn FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
--> statement-breakpoint
CREATE POLICY desafios_mfa_app ON desafios_mfa FOR ALL TO optisaas_app
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
