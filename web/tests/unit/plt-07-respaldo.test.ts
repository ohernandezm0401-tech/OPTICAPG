// PLT-07 (T28) — Cifrado del respaldo, destino y parámetros sin valor.
// AC-PLT-07-1 (el sobre no se abre sin la clave), AC-PLT-07-3 (S: un byte
// alterado falla GCM). La prueba con PostgreSQL real está en tests/int.
import { randomBytes } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { hallazgosEnTexto } from '../../lib/cifrado/patrones-secretos.mjs';
import { entornoPermitePruebaRestauracion, leerParContinuidad } from '../../lib/respaldo/continuidad.mjs';
import { destinoCompatibleS3, destinoDisco } from '../../lib/respaldo/destino.mjs';
import {
  abrirRespaldo,
  cifrarRespaldo,
  ErrorCifrado,
  leerClaveRespaldo,
  verificarAutenticidad,
} from '../../lib/respaldo/formato.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('AC-PLT-07-1: el respaldo cifrado no se lee sin la clave', () => {
  it('el plano no aparece en el sobre y una clave distinta falla', () => {
    const clave = randomBytes(32);
    const marca = `sintetico-t28-${randomBytes(8).toString('hex')}`;
    const plano = Buffer.from(`-- volcado sintético ${marca}\n`, 'utf8');
    const sobre = cifrarRespaldo(clave, plano);
    expect(sobre.includes(Buffer.from(marca))).toBe(false);
    expect(sobre.includes(Buffer.from('volcado sintético'))).toBe(false);
    expect(abrirRespaldo(clave, sobre).toString('utf8')).toContain(marca);
    expect(() => abrirRespaldo(randomBytes(32), sobre)).toThrow(ErrorCifrado);
    const comprobacion = verificarAutenticidad(randomBytes(32), sobre);
    expect(comprobacion.autentico).toBe(false);
  });

  it('BACKUP_KEY vacía no se confunde con un valor y el error no la repite', () => {
    expect(() => leerClaveRespaldo({})).toThrow(/BACKUP_KEY/);
    const clave = randomBytes(32).toString('base64');
    expect(leerClaveRespaldo({ BACKUP_KEY: clave }).equals(Buffer.from(clave, 'base64'))).toBe(true);
  });
});

describe('AC-PLT-07-3: un byte alterado falla la autenticidad GCM', () => {
  it('cambiar el último byte del sobre rechaza el descifrado', () => {
    const clave = randomBytes(32);
    const sobre = cifrarRespaldo(clave, Buffer.from('contenido sintético de respaldo', 'utf8'));
    const alterado = Buffer.from(sobre);
    alterado[alterado.length - 1] ^= 0x01;
    const comprobacion = verificarAutenticidad(clave, alterado);
    expect(comprobacion.autentico).toBe(false);
    if (!comprobacion.autentico) expect(comprobacion.motivo).toMatch(/alterado/);
    expect(verificarAutenticidad(clave, sobre).autentico).toBe(true);
  });
});

describe('destino configurable', () => {
  it('el disco local guarda el archivo con modo 0600', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'optisaas-destino-'));
    dirs.push(dir);
    const destino = destinoDisco(dir);
    const { ubicacion } = await destino.guardar('respaldo-prueba.enc', Buffer.from('sobre'));
    expect(statSync(ubicacion).mode & 0o777).toBe(0o600);
    expect((await destino.leer(ubicacion)).toString('utf8')).toBe('sobre');
    chmodSync(ubicacion, 0o600);
  });

  it('el puerto compatible con S3 no llama a un SDK si no hay adaptador', async () => {
    const destino = destinoCompatibleS3(null);
    await expect(destino.guardar('a.enc', Buffer.from('x'))).rejects.toThrow(/sin SDK/);
    const memoria = new Map<string, Buffer>();
    const conAdaptador = destinoCompatibleS3({
      async putObject(nombre, contenido) {
        memoria.set(nombre, Buffer.from(contenido));
        return `memoria/${nombre}`;
      },
      async getObject(ubicacion) {
        const nombre = ubicacion.replace(/^memoria\//, '');
        const datos = memoria.get(nombre);
        if (!datos) throw new Error('no está');
        return datos;
      },
    });
    const guardado = await conAdaptador.guardar('b.enc', Buffer.from('cifrado'));
    expect(guardado.ubicacion).toBe('memoria/b.enc');
    expect((await conAdaptador.leer(guardado.ubicacion)).toString('utf8')).toBe('cifrado');
  });
});

describe('TODO(Q-07): RPO y RTO sin valor asumido', () => {
  it('una fila nula sigue nula y no se rellena con horas', () => {
    const par = leerParContinuidad([
      { clave: 'rpo', valor: null, rotulo: 'provisional' },
      { clave: 'rto', valor: null, rotulo: 'provisional' },
    ]);
    expect(par.rpo).toBeNull();
    expect(par.rto).toBeNull();
    expect(par.rotulo).toBe('provisional');
    expect(par.nota).toContain('TODO(Q-07)');
    expect(par.rpo).not.toEqual(expect.any(Number));
    expect(par.rto).not.toEqual(expect.any(Number));
  });

  it('la prueba de restauración no corre en producción', () => {
    expect(entornoPermitePruebaRestauracion({ APP_ENV: 'produccion' })).toBe(false);
    expect(entornoPermitePruebaRestauracion({ APP_ENV: 'pruebas' })).toBe(true);
    expect(entornoPermitePruebaRestauracion({})).toBe(false);
  });
});

describe('guardas de la migración y de los scripts', () => {
  it('package.json expone backup:run y backup:restore-test', () => {
    const manifiesto = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
    expect(manifiesto.scripts['backup:run']).toBe('node scripts/respaldo.mjs run');
    expect(manifiesto.scripts['backup:restore-test']).toBe('node scripts/respaldo.mjs restore-test');
  });

  it('las tablas nuevas tienen RLS ENABLE+FORCE y no conceden salto de RLS', () => {
    const sql = readFileSync(path.join(RAIZ, 'db/migrations/0027_plt07_respaldos.sql'), 'utf8');
    for (const tabla of ['parametros_continuidad', 'respaldos', 'pruebas_restauracion']) {
      expect(sql).toContain(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
    }
    expect(sql).toContain('CREATE POLICY');
    expect(sql).toContain('CREATE ROLE optisaas_respaldo NOLOGIN');
    expect(sql).not.toMatch(/tenant_id\s+uuid/i);
    expect(sql).not.toMatch(/BYPASSRLS/i);
    expect(sql).not.toMatch(/SUPERUSER/i);
    expect(sql).toContain('TODO(Q-07)');
    expect(sql).toContain("'provisional'");
  });

  it('una asignación de BACKUP_KEY en un archivo versionado sería un hallazgo', () => {
    const linea = ['BACKUP', '_KEY='].join('') + 'A'.repeat(24);
    expect(hallazgosEnTexto(linea, 'memoria.env').some((hallazgo) => hallazgo.id === 'backup-key-asignada')).toBe(
      true,
    );
    expect(hallazgosEnTexto('# BACKUP_KEY=\n', 'memoria.env')).toEqual([]);
  });
});
