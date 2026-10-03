// SEG-12 (T11) — Cifrado AES-256-GCM (U) y vista pública de adaptadores (S).
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  aadDato,
  cifrarAesGcm,
  cifrarConDek,
  descifrarAesGcm,
  descifrarConDek,
  ErrorCifrado,
  sha256Hex,
} from '../../lib/cifrado/aes';
import { CAMPOS_TEXTO_CLINICO, vistaPublicaAdaptador } from '../../lib/cifrado/campos';
import { conjuntoDesdePares, leerClavesMaestras } from '../../lib/cifrado/claves-maestras';

const TENANT = 'a1010101-1010-4101-8101-101010101010';

describe('AES-256-GCM (U)', () => {
  it('ida y vuelta conserva el hash y usa un IV distinto', () => {
    const clave = randomBytes(32);
    const claro = Buffer.from('anexo-sintetico', 'utf8');
    const aad = aadDato(TENANT, 'anexo', 1);
    const uno = cifrarAesGcm(clave, claro, aad);
    const dos = cifrarAesGcm(clave, claro, aad);
    expect(uno.iv.equals(dos.iv)).toBe(false);
    const abierto = descifrarAesGcm(clave, uno.iv, uno.tag, uno.cifrado, aad);
    expect(sha256Hex(abierto)).toBe(sha256Hex(claro));
  });

  it('alterar el ciphertext hace fallar el tag GCM', () => {
    const clave = randomBytes(32);
    const aad = aadDato(TENANT, 'anexo', 1);
    const partes = cifrarAesGcm(clave, Buffer.from('bytes-sinteticos'), aad);
    partes.cifrado[0] ^= 0xff;
    expect(() => descifrarAesGcm(clave, partes.iv, partes.tag, partes.cifrado, aad)).toThrow(ErrorCifrado);
  });

  it('una clave distinta no abre el sobre', () => {
    const aad = aadDato(TENANT, 'secreto_mfa', 1);
    const sobre = cifrarConDek(randomBytes(32), 1, aad, Buffer.from('secreto-sintetico', 'utf8'));
    expect(() => descifrarConDek(randomBytes(32), aad, sobre)).toThrow(/alterado|clave/);
    expect(sobre).not.toContain('secreto-sintetico');
  });
});

describe('clave maestra fuera del repo (U)', () => {
  it('rechaza un valor que no es 32 bytes y lee un archivo de versiones', () => {
    expect(() => leerClavesMaestras({})).toThrow(/clave maestra/);
    const v1 = randomBytes(32).toString('base64');
    const v2 = randomBytes(32).toString('base64');
    const conjunto = leerClavesMaestras(
      { APP_MASTER_KEY_FILE: '/run/secrets/optisaas-clave-maestra' },
      () => `1 ${v1}\n2 ${v2}\nactiva 2\n`,
    );
    expect(conjunto.activa).toBe(2);
    expect(conjunto.claves.size).toBe(2);
    expect(() => conjuntoDesdePares(3, [[1, randomBytes(32)]])).toThrow(/versión activa/);
  });
});

describe('AC-SEG-12-3 (S): la vista pública no incluye secretos', () => {
  it('solo devuelve adaptador, nombre y configurado', () => {
    const secreto = ['TOKEN', 'SINTETICO', 'NO', 'EXPONER'].join('-');
    const vista = vistaPublicaAdaptador({ adaptador: 'facturacion', nombre: 'token' });
    const cuerpo = JSON.stringify({ adaptadores: [vista], ruido: secreto });
    expect(Object.keys(vista).sort()).toEqual(['adaptador', 'configurado', 'nombre']);
    expect(JSON.stringify(vista)).not.toContain(secreto);
    expect(cuerpo).toContain(secreto);
    expect(CAMPOS_TEXTO_CLINICO).toContain('atenciones.contenido.a');
  });
});
