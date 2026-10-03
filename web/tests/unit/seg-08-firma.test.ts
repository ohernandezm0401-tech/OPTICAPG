// SEG-08 (T14) — U: hash, verify, MFA/tarjeta, evidencia y texto del PDF.
import { describe, expect, it } from 'vitest';

import {
  AVISO_PDF_A,
  evaluarFirmaProfesional,
  hashSha256,
  lineaSelloProfesional,
  modificarUnByte,
  presentarBogota,
  puedeFirmarComoProfesional,
  puedeRecogerFirmaPaciente,
  tarjetaDeclaradaVigente,
  textoVisiblePdf,
  verificarHash,
  armarEvidenciaPaciente,
} from '../../dominio/firma';
import { renderizarPdfFirma } from '../../lib/firma/pdf';
import {
  ErrorSelloTiempo,
  crearAlmacenMemoria,
  crearSelloNulo,
  crearSelloServidor,
  crearSelloTsaExterna,
  rutaArchivoDisco,
} from '../../lib/firma/puertos';

const AHORA = new Date('2026-10-03T15:00:00.000Z');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('AC-SEG-08-1: un byte distinto no verifica', () => {
  it('verify devuelve false si se modifica un byte', () => {
    const original = Buffer.from('documento-sintetico-sellado');
    const hash = hashSha256(original);
    expect(verificarHash(original, hash)).toBe(true);
    const alterado = modificarUnByte(original);
    expect(alterado).not.toEqual(original);
    expect(verificarHash(alterado, hash)).toBe(false);
  });
});

describe('AC-SEG-08-2: sin MFA reciente o sin tarjeta vigente', () => {
  it('rechaza cada causa por separado', () => {
    const sinMfa = evaluarFirmaProfesional({
      mfaReciente: false,
      registroProfesional: 'RP-SINTETICO-14',
      vigenteHasta: '2026-10-03',
      ahora: AHORA,
    });
    expect(sinMfa).toEqual({ ok: false, motivo: 'mfa_reciente' });

    const sinTarjeta = evaluarFirmaProfesional({
      mfaReciente: true,
      registroProfesional: null,
      vigenteHasta: null,
      ahora: AHORA,
    });
    expect(sinTarjeta).toEqual({ ok: false, motivo: 'tarjeta_profesional' });

    const vencida = evaluarFirmaProfesional({
      mfaReciente: true,
      registroProfesional: 'RP-SINTETICO-14',
      vigenteHasta: '2026-10-02',
      ahora: AHORA,
    });
    expect(vencida).toEqual({ ok: false, motivo: 'tarjeta_profesional' });

    expect(
      evaluarFirmaProfesional({
        mfaReciente: true,
        registroProfesional: 'RP-SINTETICO-14',
        vigenteHasta: '2026-10-03',
        ahora: AHORA,
      }).ok,
    ).toBe(true);
  });

  it('la vigencia usa el día civil de Bogotá y no asume un plazo', () => {
    // 02:30 UTC del 3 ya es 21:30 del 2 en Bogotá. El 2 sigue vigente; el 1 no.
    const nocheUtc = new Date('2026-10-03T02:30:00.000Z');
    expect(tarjetaDeclaradaVigente('RP-SINTETICO-14', '2026-10-02', nocheUtc)).toBe(true);
    expect(tarjetaDeclaradaVigente('RP-SINTETICO-14', '2026-10-01', nocheUtc)).toBe(false);
    expect(tarjetaDeclaradaVigente('RP-SINTETICO-14', null, nocheUtc)).toBe(false);
  });
});

describe('AC-SEG-08-3: la evidencia exportable trae trazo, hora, IP y OTP', () => {
  it('arma los cuatro datos junto al documento', () => {
    const evidencia = armarEvidenciaPaciente({
      trazoPng: PNG,
      trazoPuntos: [{ points: [{ x: 1, y: 2, time: 3 }] }],
      firmadoEn: AHORA,
      ip: '192.0.2.15',
      otpVerificado: true,
      otpCanal: 'pantalla_prueba',
      otpVerificadoEn: AHORA,
    });
    expect(evidencia.trazo_png_base64).toBe(PNG.toString('base64'));
    expect(evidencia.trazo_puntos).toEqual([{ points: [{ x: 1, y: 2, time: 3 }] }]);
    expect(evidencia.hora_utc).toBe(AHORA.toISOString());
    expect(evidencia.hora_bogota).toBe(presentarBogota(AHORA));
    expect(evidencia.ip).toBe('192.0.2.15');
    expect(evidencia.otp).toEqual({
      verificado: true,
      canal: 'pantalla_prueba',
      verificado_en: AHORA.toISOString(),
    });
  });
});

describe('AC-SEG-08-4: el PDF lleva nombre, registro, fecha y hora', () => {
  it('el archivo contiene el sello del profesional', async () => {
    const linea = lineaSelloProfesional('Camila Vega Sintetica', 'RP-SINTETICO-14', AHORA);
    const pdf = await renderizarPdfFirma({
      titulo: 'Ejemplo sintetico',
      cuerpo: 'Cuerpo sintetico sin paciente real.',
      lineaProfesional: linea,
      nombreProfesional: 'Camila Vega Sintetica',
      registroProfesional: 'RP-SINTETICO-14',
      horaBogota: presentarBogota(AHORA),
      paciente: {
        nombre: 'Paciente Sintetico',
        documento: '900000014',
        horaBogota: presentarBogota(AHORA),
        ip: '192.0.2.15',
        otpVerificado: true,
        otpCanal: 'pantalla_prueba',
        trazoDataUrl: `data:image/png;base64,${PNG.toString('base64')}`,
      },
    });
    const texto = textoVisiblePdf(pdf);
    expect(texto).toContain('Camila Vega Sintetica');
    expect(texto).toContain('RP-SINTETICO-14');
    expect(texto).toContain(presentarBogota(AHORA));
    expect(texto).toContain('Firmado electrónicamente por Camila Vega Sintetica');
    expect(texto).toContain(AVISO_PDF_A);
    expect(verificarHash(modificarUnByte(pdf), hashSha256(pdf))).toBe(false);
  });
});

describe('puertos de sello y almacenamiento', () => {
  it('el sello nulo no entrega token y el del servidor sí entrega hora', async () => {
    const hash = hashSha256(Buffer.from('abc'));
    const nulo = await crearSelloNulo().sellar(hash, AHORA);
    const propio = await crearSelloServidor().sellar(hash, AHORA);
    expect(nulo).toEqual({ proveedor: 'nulo', token: null, sellado_en: null, hash });
    expect(propio.proveedor).toBe('servidor');
    expect(propio.token).toBeNull();
    expect(propio.sellado_en).toBe(AHORA.toISOString());
    await expect(crearSelloTsaExterna().sellar(hash, AHORA)).rejects.toBeInstanceOf(ErrorSelloTiempo);
  });

  it('el contrato de memoria no entrega el archivo a otro tenant', async () => {
    const almacen = crearAlmacenMemoria();
    const tenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const otro = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const guardado = await almacen.guardar({
      tenantId: tenant,
      nombre: 'ejemplo.pdf',
      mime: 'application/pdf',
      contenido: Buffer.from('%PDF-sintetico'),
    });
    const leido = await almacen.leer(tenant, guardado.id);
    expect(leido?.hash).toBe(guardado.hash);
    expect(verificarHash(leido!.contenido, guardado.hash)).toBe(true);
    expect(await almacen.leer(otro, guardado.id)).toBeNull();
  });

  it('la ruta de disco rechaza un identificador que no es UUID', () => {
    expect(() =>
      rutaArchivoDisco('/tmp/optisaas-almacen', '../etc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bin'),
    ).toThrow(/no es válido/);
  });
});

describe('permisos de la firma', () => {
  it('el asesor recoge la firma del paciente y no firma como profesional', () => {
    expect(puedeRecogerFirmaPaciente('asesor')).toBe(true);
    expect(puedeFirmarComoProfesional('asesor')).toBe(false);
    expect(puedeFirmarComoProfesional('optometra')).toBe(true);
    expect(puedeFirmarComoProfesional('admin')).toBe(false);
  });
});
