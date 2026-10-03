// SEG-01 (T07) — Contraseñas (U).
// AC-SEG-01-5 (parte estática): el hash no es la contraseña y el código no
// escribe la contraseña en logs. El bloqueo de 15 min y la no enumeración
// contra PostgreSQL están en `tests/int/seg-01-autenticacion.test.ts`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  INTENTOS_PARA_BLOQUEO,
  MINUTOS_BLOQUEO_BASE,
  minutosDeBloqueo,
  minutosInactividad,
  leerLimiteIntentosIp,
} from '../../lib/auth/bloqueo';
import { hashearContrasena, verificarContrasena } from '../../lib/auth/contrasena';
import { permiteCuentasLocales } from '../../lib/auth/cuentas-locales';
import { evaluarPoliticaContrasena } from '../../lib/auth/politica-contrasena';
import { cuerpoHttpInicio, MENSAJE_CREDENCIALES_INVALIDAS } from '../../lib/auth/puerto';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('U: política y Argon2id', () => {
  it('exige 12 caracteres y rechaza la lista local', () => {
    expect(evaluarPoliticaContrasena('corta')).toEqual({
      ok: false,
      mensaje: 'La contraseña debe tener al menos 12 caracteres.',
    });
    expect(evaluarPoliticaContrasena('Password1234')).toEqual({
      ok: false,
      mensaje: 'Esa contraseña no está permitida. Elige otra.',
    });
    expect(evaluarPoliticaContrasena('una-frase-larga-local')).toEqual({ ok: true });
  });

  it('el primer bloqueo dura 15 min y el siguiente lo duplica', () => {
    expect(INTENTOS_PARA_BLOQUEO).toBe(5);
    expect(MINUTOS_BLOQUEO_BASE).toBe(15);
    expect(minutosDeBloqueo(1)).toBe(15);
    expect(minutosDeBloqueo(2)).toBe(30);
    expect(minutosDeBloqueo(3)).toBe(60);
  });

  it('la inactividad clínica no supera 15 min; sin parámetro tampoco', () => {
    expect(minutosInactividad(['optometra'], null)).toBe(15);
    expect(minutosInactividad(['optometra'], 60)).toBe(15);
    expect(minutosInactividad(['asesor'], null)).toBe(15);
    expect(minutosInactividad(['asesor'], 30)).toBe(30);
  });

  it('el límite por IP no tiene valor por defecto', () => {
    expect(leerLimiteIntentosIp({})).toBeNull();
    expect(leerLimiteIntentosIp({ AUTH_LIMITE_INTENTOS_IP: '3' })).toBe(3);
    expect(leerLimiteIntentosIp({ AUTH_LIMITE_INTENTOS_IP: 'no' })).toBeNull();
  });

  it('hashea con Argon2id y no devuelve la contraseña en claro', async () => {
    const plana = 'una-frase-larga-local';
    const hash = await hashearContrasena(plana);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).toContain('m=19456,t=2,p=1');
    expect(hash).not.toContain(plana);
    expect(await verificarContrasena(hash, plana)).toBe(true);
    expect(await verificarContrasena(hash, 'otra-frase-distinta')).toBe(false);
  });
});

describe('U: cuentas locales solo en desarrollo', () => {
  it('pruebas y producción no aceptan el login local', () => {
    expect(permiteCuentasLocales({ APP_ENV: 'desarrollo', APP_MODE: 'demo' })).toBe(true);
    expect(permiteCuentasLocales({ APP_ENV: 'demo', APP_MODE: 'demo' })).toBe(true);
    expect(permiteCuentasLocales({ APP_ENV: 'pruebas', APP_MODE: 'demo' })).toBe(false);
    expect(permiteCuentasLocales({ APP_ENV: 'produccion', APP_MODE: 'demo', NODE_ENV: 'production' })).toBe(
      false,
    );
  });
});

describe('AC-SEG-01-5: sin contraseñas en claro en logs ni en la respuesta', () => {
  it('la respuesta HTTP de un fallo no incluye la contraseña ni distingue la cuenta', () => {
    const plana = 'una-frase-larga-local';
    const cuerpo = cuerpoHttpInicio({
      ok: false,
      mensaje: MENSAJE_CREDENCIALES_INVALIDAS,
      continuarConCuentasLocales: true,
    });
    expect(cuerpo).toEqual({ error: MENSAJE_CREDENCIALES_INVALIDAS });
    expect(JSON.stringify(cuerpo)).not.toContain(plana);
    expect(JSON.stringify(cuerpo)).not.toContain('inexistente');
  });

  it('ningún console.* de auth o de las rutas API menciona la contraseña', () => {
    const raices = [path.join(RAIZ, 'lib', 'auth'), path.join(RAIZ, 'app', 'api')];
    const archivos: string[] = [];
    const visitar = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = path.join(dir, nombre);
        if (statSync(ruta).isDirectory()) visitar(ruta);
        else if (/\.(ts|tsx|mjs)$/.test(nombre)) archivos.push(ruta);
      }
    };
    raices.forEach(visitar);
    const sospechosas: string[] = [];
    for (const archivo of archivos) {
      const lineas = readFileSync(archivo, 'utf8').split('\n');
      lineas.forEach((linea, indice) => {
        if (!/console\.(log|info|debug|warn|error)/.test(linea)) return;
        if (/(contrasena|password|newPassword|credentials)/i.test(linea)) {
          sospechosas.push(`${path.relative(RAIZ, archivo)}:${indice + 1}`);
        }
      });
    }
    expect(sospechosas).toEqual([]);
  });
});
