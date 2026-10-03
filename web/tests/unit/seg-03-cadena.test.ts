// SEG-03 (T10) — Cadena en memoria (P), consulta de la vista (U) y guardas
// de contenido. Sin PostgreSQL: la cadena contra la base está en la integración.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { aCsv, calcularHash, verificarCadena, type EventoCanonico } from '../../lib/auditoria/cadena';
import { agenteAuditable, recursoIdAuditable } from '../../lib/auditoria/contenido';
import { actorFijo } from '../../lib/authz/sujetos';
import { decidirAccesoPanel } from '../../lib/authz/panel';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function evento(indice: number, tenant: string): EventoCanonico {
  return {
    tenant_id: tenant,
    ts: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, indice % 1000)),
    actor_id: '66666666-6666-4666-8666-666666666666',
    rol: 'optometra',
    sede_id: '33333333-3333-4333-8333-333333333333',
    recurso: 'R3',
    recurso_id: `hc-${indice}`,
    accion: 'lectura',
    resultado: 'ok',
    ip: '203.0.113.10',
    agente: 'prueba',
    request_id: `req-${indice}`,
  };
}

function cadenaDe(total: number) {
  const tenant = '11111111-1111-4111-8111-111111111111';
  let previo: Buffer | null = null;
  const filas = [];
  for (let indice = 0; indice < total; indice += 1) {
    const actual = evento(indice, tenant);
    const hash = calcularHash(previo, actual);
    filas.push({ id: indice + 1, hash_previo: previo, hash, evento: actual });
    previo = hash;
  }
  return filas;
}

describe('P: cadena SHA-256 de 10 000 eventos', () => {
  it('cierra íntegra y señala la posición exacta si se altera una fila', () => {
    const filas = cadenaDe(10_000);
    expect(verificarCadena(filas)).toEqual({ ok: true, eventos: 10_000 });
    const rota = cadenaDe(10_000);
    const posicion = 4321;
    rota[posicion - 1] = {
      ...rota[posicion - 1],
      evento: { ...rota[posicion - 1].evento, resultado: 'error' },
    };
    const resultado = verificarCadena(rota);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.posicion).toBe(posicion);
      expect(resultado.id).toBe(String(posicion));
      expect(resultado.motivo).toBe('hash');
    }
  });
});

describe('AC-SEG-03-4: el CSV y los campos no aceptan contenido clínico', () => {
  it('el CSV lleva el hash y no tiene columnas de diagnóstico ni fórmula', () => {
    const filas = cadenaDe(1);
    const csv = aCsv([
      {
        ...filas[0].evento,
        id: 1,
        hash_previo: filas[0].hash_previo,
        hash: filas[0].hash,
      },
    ]);
    expect(csv.split('\n')[0]).toContain('hash');
    expect(csv).toContain(filas[0].hash.toString('hex'));
    expect(csv.toLowerCase()).not.toContain('diagnóstico');
    expect(csv.toLowerCase()).not.toContain('formula');
  });

  it('rechaza un id o un agente con diagnóstico o fórmula', () => {
    expect(() => recursoIdAuditable('diagnóstico-miopía')).toThrow(/contenido clínico/);
    expect(() => agenteAuditable('OD +1.25')).toThrow(/contenido clínico/);
  });
});

describe('vista de bitácora: solo el rol autorizado entra', () => {
  it('admin, auditor y optómetra entran; asesor y owner no', () => {
    expect(decidirAccesoPanel(actorFijo('admin'), '/dashboard/auditoria').permitido).toBe(true);
    expect(decidirAccesoPanel(actorFijo('auditor'), '/dashboard/auditoria').permitido).toBe(true);
    expect(decidirAccesoPanel(actorFijo('optometra'), '/dashboard/auditoria').permitido).toBe(true);
    expect(decidirAccesoPanel(actorFijo('asesor'), '/dashboard/auditoria').permitido).toBe(false);
    expect(decidirAccesoPanel(actorFijo('owner'), '/dashboard/auditoria').permitido).toBe(false);
  });
});

describe('integración de eventos previos', () => {
  it('autenticación e intentos persistidos llaman la bitácora sin el correo', () => {
    const auth = readFileSync(path.join(RAIZ, 'lib/auth/servicio.ts'), 'utf8');
    const mfa = readFileSync(path.join(RAIZ, 'lib/auth/mfa/flujo.ts'), 'utf8');
    const intentos = readFileSync(path.join(RAIZ, 'db/autorizacion.ts'), 'utf8');
    const anexo = readFileSync(path.join(RAIZ, 'lib/auditoria/servicio.ts'), 'utf8');
    expect(auth).toContain('anexarBitacoraAutenticacion');
    expect(mfa).toContain('anexarBitacoraAutenticacion');
    expect(intentos).toContain('anexarIntentoDenegado');
    expect(anexo).not.toMatch(/anexarBitacoraAutenticacion\([\s\S]*correo/);
  });

  it('la migración deja RLS forzado, trigger y sin update ni delete para la app', () => {
    const sql = readFileSync(path.join(RAIZ, 'db/migrations/0009_seg03_auditoria.sql'), 'utf8');
    expect(sql).toContain('ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE auditoria FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY');
    expect(sql).toContain('BEFORE UPDATE OR DELETE');
    expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON auditoria FROM optisaas_app');
    expect(sql).toContain('optisaas_audit_writer');
    expect(sql).not.toMatch(/BYPASSRLS/i);
    expect(sql).not.toMatch(/SUPERUSER/i);
  });
});
