// PLT-01 (T04) — Guardas estáticas del aislamiento (U).
// AC-PLT-01-2: el verificador `npm run db:check-rls` existe y está cableado.
// AC-PLT-01-1/3/4: la migración crea el rol sin privilegios elevados y las
// políticas con FORCE; el helper `withTenantTx` es la vía documentada.
// S: las rutas `/api/owner/*` siguen en memoria (TODO T05) y no consultan
// tablas de tenant, así que no agregan superficie IDOR en esta tarea.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAIZ_REPO = path.resolve(RAIZ_WEB, '..');

function leer(relativa: string): string {
  return readFileSync(path.join(RAIZ_WEB, relativa), 'utf8');
}

function migracionRls(): { nombre: string; contenido: string } {
  const dir = path.join(RAIZ_WEB, 'db', 'migrations');
  const archivo = readdirSync(dir)
    .filter((n) => n.endsWith('.sql') && n !== '0000_nosy_union_jack.sql')
    .sort()
    .at(-1);
  expect(archivo, 'falta la migración RLS posterior a 0000').toBeDefined();
  return { nombre: archivo as string, contenido: readFileSync(path.join(dir, archivo as string), 'utf8') };
}

describe('AC-PLT-01-2: verificador db:check-rls cableado', () => {
  it('package.json expone db:check-rls y ci:local lo ejecuta tras migrar', () => {
    const manifiesto = JSON.parse(leer('package.json'));
    expect(manifiesto.scripts['db:check-rls']).toBe('node scripts/check-rls.mjs');
    expect(manifiesto.scripts['ci:local']).toContain('db:migrate');
    expect(manifiesto.scripts['ci:local']).toContain('db:check-rls');
  });

  it('el script audita information_schema, FORCE y políticas', () => {
    expect(existsSync(path.join(RAIZ_WEB, 'scripts', 'check-rls.mjs'))).toBe(true);
    const script = leer(path.join('scripts', 'check-rls.mjs'));
    expect(script).toContain('information_schema');
    expect(script).toContain('relforcerowsecurity');
    expect(script).toContain('pg_policy');
    expect(script).toContain('optisaas_app');
  });

  it('la CI falla si hay tablas con tenant_id sin RLS FORCE', () => {
    const ci = readFileSync(path.join(RAIZ_REPO, '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(ci).toContain('db:check-rls');
    expect(ci.indexOf('db:check-rls')).toBeGreaterThan(ci.indexOf('db:migrate'));
  });
});

describe('AC-PLT-01-1/3/4: rol sin privilegios y FORCE en cada tabla', () => {
  it('el rol de aplicación se crea sin superusuario ni salto de RLS', () => {
    const { nombre, contenido } = migracionRls();
    expect(contenido).toContain('CREATE ROLE optisaas_app NOLOGIN');
    expect(contenido, `${nombre} concede salto de RLS`).not.toMatch(/BYPASSRLS/i);
    expect(contenido, `${nombre} concede superusuario`).not.toMatch(/SUPERUSER/i);
  });

  it('las cinco tablas del núcleo tienen ENABLE + FORCE y política', () => {
    const { contenido } = migracionRls();
    for (const tabla of ['tenants', 'sedes', 'usuarios', 'membresias', 'sesiones']) {
      expect(contenido).toContain(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
      expect(contenido).toContain(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
      expect(contenido).toContain(`TO optisaas_app`);
    }
    expect(contenido).toContain('CREATE POLICY');
  });

  it('las políticas leen app.tenant_id y app.sedes sin filtrar por error', () => {
    const { contenido } = migracionRls();
    expect(contenido).toContain(`current_setting('app.tenant_id', true)`);
    expect(contenido).toContain(`current_setting('app.sedes', true)`);
  });
});

describe('withTenantTx: única vía documentada para el contexto', () => {
  it('db/tenant.ts expone withTenantTx y fija las variables app.*', () => {
    expect(existsSync(path.join(RAIZ_WEB, 'db', 'tenant.ts'))).toBe(true);
    const helper = leer(path.join('db', 'tenant.ts'));
    expect(helper).toContain('export async function withTenantTx');
    for (const variable of ['app.tenant_id', 'app.usuario_id', 'app.sede_id', 'app.sedes', 'app.rol']) {
      expect(helper).toContain(variable);
    }
    expect(helper).toContain('SET LOCAL');
  });
});

describe('S: rutas owner sin superficie IDOR nueva', () => {
  it('/api/owner/* siguen en memoria y no consultan tablas de tenant', () => {
    for (const ruta of ['app/api/owner/create-user/route.ts', 'app/api/owner/change-password/route.ts']) {
      const contenido = leer(ruta);
      expect(contenido, `${ruta} ya toca la BD`).not.toContain('@/db/');
      expect(contenido, `${ruta} ya toca la BD`).not.toContain('tenant_id');
    }
  });
});
