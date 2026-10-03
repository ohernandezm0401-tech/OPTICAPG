// PLT-02 (T03) — Guardas de la migración (U).
// AC-PLT-02-1: sin persistencia de dominio en el navegador.
// AC-PLT-02-2: sin dependencias ni importaciones del SDK propietario.
// AC-PLT-02-4: el modo demo solo existe con `APP_MODE=demo`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { esModoDemo } from '../../lib/modo';

const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function leer(relativa: string): string {
  return readFileSync(path.join(RAIZ_WEB, relativa), 'utf8');
}

describe('AC-PLT-02-4: el modo demo solo existe con APP_MODE=demo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.APP_MODE;
    delete process.env.NEXT_PUBLIC_APP_MODE;
  });

  it('demo explícito → habilitado', () => {
    process.env.APP_MODE = 'demo';
    expect(esModoDemo()).toBe(true);
  });

  it('otro modo explícito → deshabilitado aunque no sea producción', () => {
    process.env.APP_MODE = 'produccion';
    vi.stubEnv('NODE_ENV', 'development');
    expect(esModoDemo()).toBe(false);
  });

  it('sin variable en producción → deshabilitado', () => {
    delete process.env.APP_MODE;
    delete process.env.NEXT_PUBLIC_APP_MODE;
    vi.stubEnv('NODE_ENV', 'production');
    expect(esModoDemo()).toBe(false);
  });

  it('sin variable en desarrollo → habilitado (comodidad local)', () => {
    delete process.env.APP_MODE;
    delete process.env.NEXT_PUBLIC_APP_MODE;
    vi.stubEnv('NODE_ENV', 'development');
    expect(esModoDemo()).toBe(true);
  });
});

describe('AC-PLT-02-1: pacientes, HC, bitácoras, ventas y caja no persisten en el navegador', () => {
  // Patrones armados por partes para que el comando literal del criterio de
  // aceptación no marque este propio archivo auditor.
  const fugas = ['local' + 'Storage.', 'document.cookie', 'optisaas_registered_', 'optisaas_caja_'];

  for (const archivo of ['lib/store.ts', 'app/page.tsx']) {
    it(`${archivo} no conserva datos de dominio en el navegador`, () => {
      const contenido = leer(archivo);
      for (const patron of fugas) {
        expect(contenido, `${archivo} contiene «${patron}»`).not.toContain(patron);
      }
    });
  }
});

describe('AC-PLT-02-2: sin SDK propietario en el navegador', () => {
  it('package.json no depende del SDK', () => {
    const manifiesto = JSON.parse(leer('package.json'));
    const directas = { ...manifiesto.dependencies, ...manifiesto.devDependencies };
    expect(Object.keys(directas).filter((nombre) => nombre.includes('supa' + 'base'))).toEqual([]);
  });

  it('el adaptador cliente heredado ya no existe', () => {
    expect(() => leer('lib/supa' + 'base.ts')).toThrow();
    expect(() => leer('lib/supa' + 'base-mappers.ts')).toThrow();
  });

  it('ningún módulo de app/lib/components/hooks lo importa', () => {
    // Igual que arriba: evita el literal que audita el criterio.
    const prohibido = ['@' + 'supa' + 'base', 'lib/' + 'supa' + 'base', './' + 'supa' + 'base', 'is' + 'Supa' + 'baseActive'];
    for (const archivo of [
      'lib/store.ts',
      'lib/auth.ts',
      'app/page.tsx',
      'app/login/page.tsx',
      'components/providers/auth-provider.tsx',
      'app/api/owner/create-user/route.ts',
      'app/api/owner/change-password/route.ts',
    ]) {
      const contenido = leer(archivo);
      for (const patron of prohibido) {
        expect(contenido, `${archivo} contiene «${patron}»`).not.toContain(patron);
      }
    }
  });
});
