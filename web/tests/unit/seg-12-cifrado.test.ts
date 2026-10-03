// SEG-12 (T11) — Cifrado envelope sin base de datos (U, S).
// AC-SEG-12-1 (U/S): sin la clave el sobre falla; con la clave el hash coincide.
// AC-SEG-12-3 (S): el DTO de adaptadores no incluye el secreto.
import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { aTexto, cifrarBytes, descifrarBytes, ErrorCifrado, esSobreTexto } from '../../lib/cifrado/aes.mjs';
import { CAMPOS_TEXTO_CLINICO } from '../../lib/cifrado/campos.mjs';
import { decodificarClaveMaestra } from '../../lib/cifrado/kek.mjs';
import { respuestaPublicaAdaptadores } from '../../lib/cifrado/almacen.mjs';
import { hallazgosEnTexto } from '../../lib/cifrado/patrones-secretos.mjs';

function hash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

describe('AC-SEG-12-1 U/S: AES-256-GCM', () => {
  it('devuelve el plano con la clave correcta y falla si el tag o la clave no corresponden', () => {
    const clave = randomBytes(32);
    const plano = Buffer.from('anexo sintético de retinografía', 'utf8');
    const aad = Buffer.from('datos:tenant', 'utf8');
    const sobre = cifrarBytes(clave, plano, 1, aad);
    const abierto = descifrarBytes(clave, sobre, aad);
    expect(hash(abierto.plano)).toBe(hash(plano));
    expect(abierto.plano.equals(plano)).toBe(true);
    expect(esSobreTexto(aTexto(sobre))).toBe(true);
    expect(sobre.includes(plano)).toBe(false);

    const alterado = Buffer.from(sobre);
    alterado[alterado.length - 1] ^= 0x01;
    expect(() => descifrarBytes(clave, alterado, aad)).toThrow(ErrorCifrado);

    expect(() => descifrarBytes(randomBytes(32), sobre, aad)).toThrow(/clave no corresponde/);
    expect(() => decodificarClaveMaestra(Buffer.from('corta').toString('base64'))).toThrow(ErrorCifrado);
  });
});

describe('texto clínico y secretos de adaptadores', () => {
  it('lista los campos de texto libre de la spec y no otros', () => {
    expect(CAMPOS_TEXTO_CLINICO).toEqual([
      'atenciones.contenido',
      'atencion_diagnosticos.descripcion',
      'atencion_adendas.motivo',
      'atencion_adendas.nuevo_valor',
      'prescripciones.indicaciones',
    ]);
  });

  it('AC-SEG-12-3 S: la respuesta pública no arrastra el secreto ni el sobre', () => {
    const secreto = ['token', 'sintetico', 'factus'].join('-');
    const sobre = `opt1:${secreto}`;
    const json = JSON.stringify(
      respuestaPublicaAdaptadores([
        {
          id: '11111111-1111-4111-8111-111111111111',
          adaptador: 'facturacion',
          nombre: 'api',
          secreto,
          valor_cifrado: sobre,
          configurado: true,
        },
      ]),
    );
    expect(json).not.toContain(secreto);
    expect(json).not.toContain('valor_cifrado');
    expect(json).toContain('"configurado":true');
  });

  it('S: un JWT armado en memoria se detecta y una frase vacía no', () => {
    const jwt = ['ey', 'J'].join('') + ['hbGciOiJIUzI1NiJ9', 'cGF5bG9hZA', 'firmafirmafirma'].join('.');
    const hallazgos = hallazgosEnTexto(jwt, 'memoria.txt');
    expect(hallazgos.some((item: { id: string }) => item.id === 'jwt')).toBe(true);
    expect(hallazgosEnTexto('óptica sintética sin credenciales', 'memoria.txt')).toEqual([]);
  });
});
