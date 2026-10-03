// SEG-01 (T08) — Segundo factor sin base de datos (U).
// Cubre el hash de recuperación, TOTP (incluido el rechazo de reuso del
// mismo paso), la política de roles, la ventana de 10 min y el QR propio.
import { describe, expect, it } from 'vitest';

import {
  debePedirSegundoFactor,
  mfaEsObligatoria,
} from '../../lib/auth/mfa/politica';
import { esSobreTexto } from '../../lib/cifrado/aes.mjs';
import { svgQr } from '../../lib/auth/mfa/qr';
import { evaluarMfaParaFirma, VENTANA_MFA_RECIENTE_MS } from '../../lib/auth/mfa/reciente';
import {
  codigoTotp,
  generarCodigosRecuperacion,
  hashearCodigoRecuperacion,
  hashesCoinciden,
  nuevoSecretoTotp,
  uriTotp,
  verificarTotp,
} from '../../lib/auth/mfa/totp';
import { resolverWebAuthn } from '../../lib/auth/mfa/webauthn';

const AHORA = new Date('2026-10-03T15:00:00.000Z');

describe('SEG-01 U: hash de recuperación y TOTP', () => {
  it('hashea 10 códigos de un solo uso y no guarda el texto', () => {
    const codigos = generarCodigosRecuperacion();
    expect(codigos).toHaveLength(10);
    expect(new Set(codigos).size).toBe(10);
    for (const codigo of codigos) {
      expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
      const hash = hashearCodigoRecuperacion(codigo);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).not.toBe(codigo);
      expect(hashesCoinciden(hash, codigo.toLowerCase())).toBe(true);
      expect(hashesCoinciden(hash, `${codigo}x`)).toBe(false);
    }
  });

  it('acepta el TOTP del paso y rechaza el mismo paso otra vez', () => {
    const secreto = nuevoSecretoTotp();
    const codigo = codigoTotp(secreto, AHORA);
    expect(codigo).toMatch(/^\d{6}$/);
    const primero = verificarTotp(secreto, codigo, AHORA, null);
    expect(primero.valido).toBe(true);
    if (!primero.valido) return;
    expect(verificarTotp(secreto, codigo, AHORA, primero.paso).valido).toBe(false);
    expect(verificarTotp(secreto, '000000', AHORA, null).valido).toBe(false);
    const siguiente = new Date(AHORA.getTime() + 31_000);
    const otro = verificarTotp(secreto, codigoTotp(secreto, siguiente), siguiente, primero.paso);
    expect(otro.valido).toBe(true);
  });
});

describe('SEG-01 U: política, ventana de firma y QR', () => {
  it('obliga a los roles clínicos y deja el asesor según la bandera', () => {
    expect(mfaEsObligatoria(['optometra'], false)).toBe(true);
    expect(mfaEsObligatoria(['admin'], false)).toBe(true);
    expect(mfaEsObligatoria(['director_cientifico'], false)).toBe(true);
    expect(mfaEsObligatoria(['oftalmologo'], false)).toBe(true);
    expect(mfaEsObligatoria(['asesor'], false)).toBe(false);
    expect(mfaEsObligatoria(['asesor'], true)).toBe(true);
    expect(debePedirSegundoFactor(true, false)).toBe('enrolar');
    expect(debePedirSegundoFactor(false, true)).toBe('verificar');
    expect(debePedirSegundoFactor(false, false)).toBeNull();
  });

  it('AC-SEG-01-4 U: a los 10 min exactos sirve; un milisegundo después no', () => {
    const marca = AHORA;
    const limite = new Date(marca.getTime() + VENTANA_MFA_RECIENTE_MS);
    const despues = new Date(limite.getTime() + 1);
    expect(evaluarMfaParaFirma(marca, limite)).toEqual({ ok: true });
    expect(evaluarMfaParaFirma(marca, despues)).toEqual({ ok: false, requiereReautenticacion: true });
    expect(evaluarMfaParaFirma(null, marca)).toEqual({ ok: false, requiereReautenticacion: true });
    expect(evaluarMfaParaFirma(new Date(marca.getTime() + 1), marca)).toEqual({
      ok: false,
      requiereReautenticacion: true,
    });
  });

  it('el QR del URI TOTP es determinista y no incrusta el secreto como texto', () => {
    const uri = uriTotp('JBSWY3DPEHPK3PXP', 'optometra@example.invalid');
    const svg = svgQr(uri);
    expect(svg).toBe(svgQr(uri));
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('<rect ');
    expect(svg).not.toContain('JBSWY3DPEHPK3PXP');
    expect(svg).not.toContain('<script');
  });

  it('un secreto TOTP nuevo no tiene forma de sobre cifrado', () => {
    expect(esSobreTexto(nuevoSecretoTotp())).toBe(false);
  });

  it('en local el relying party sale del origen; en producción sin variables no hay passkey', () => {
    expect(resolverWebAuthn('http://127.0.0.1:3100', { APP_ENV: 'desarrollo' })).toEqual({
      rpID: '127.0.0.1',
      origin: 'http://127.0.0.1:3100',
    });
    expect(resolverWebAuthn('http://127.0.0.1:3100', { APP_ENV: 'produccion' })).toBeNull();
    expect(
      resolverWebAuthn('https://optica.example', {
        APP_ENV: 'produccion',
        WEBAUTHN_RP_ID: 'optica.example',
        WEBAUTHN_ORIGIN: 'https://optica.example',
      }),
    ).toEqual({ rpID: 'optica.example', origin: 'https://optica.example' });
    expect(
      resolverWebAuthn('https://otro.example', {
        APP_ENV: 'produccion',
        WEBAUTHN_RP_ID: 'optica.example',
        WEBAUTHN_ORIGIN: 'https://optica.example',
      }),
    ).toBeNull();
  });
});
