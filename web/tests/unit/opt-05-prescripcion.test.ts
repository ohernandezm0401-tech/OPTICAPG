// OPT-05 (T23) — Validador por campo, cantidad, dispensación y PDF.
// AC-OPT-05-1, AC-OPT-05-2, AC-OPT-05-6. Datos sintéticos.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { desplazarDias } from '../../dominio/fechas';
import { hashSha256, textoVisiblePdf } from '../../dominio/firma';
import {
  CAMPOS_ART17,
  cantidadCoincide,
  cantidadEnLetras,
  esDispensable,
  estadoVisiblePrescripcion,
  fechaDeFirma,
  formatearNumeroPrescripcion,
  hashVerificacionPrescripcion,
  lineasPrescripcion,
  puedeFirmarPrescripcion,
  respuestaVerificacion,
  textosElementosArt17,
  urlVerificacionPrescripcion,
  validarFirmaPrescripcion,
  type CampoArt17,
  type PrescripcionFirmaEntrada,
  type PrescripcionNormalizada,
} from '../../dominio/prescripcion';
import { renderizarPdfPrescripcion } from '../../lib/firma/pdf';

const AHORA = new Date('2026-10-03T15:00:00.000Z');
const HOY = fechaDeFirma(AHORA);

function completa(parcial: Partial<PrescripcionFirmaEntrada> = {}): PrescripcionFirmaEntrada {
  const base: PrescripcionFirmaEntrada = {
    prestador_nombre: 'Optica Sintetica T23',
    direccion: 'Calle 23',
    telefono: '3000000023',
    correo: 'sede.t23@example.invalid',
    lugar: 'Bogota',
    fecha: HOY,
    paciente_nombre: 'Ana Sintetica',
    paciente_documento: '900123023',
    numero_hc: '23',
    tipo_usuario: 'particular',
    dispositivo: 'lentes oftalmicos sinteticos',
    agudeza_visual: '20/20',
    forma_uso: 'No aplica',
    distancia_pupilar: '62',
    filtro: 'No aplica',
    duracion_tratamiento: 'No aplica',
    cantidad_num: 2,
    cantidad_letras: 'dos',
    indicaciones: 'Uso sintetico',
    vigencia_hasta: '2027-04-01',
    nombre_prescriptor: 'Optometra Sintetico T23',
    registro_profesional: 'RP-SINTETICO-23',
    firma: true,
    tipo: 'lentes_oftalmicos',
  };
  return { ...base, ...parcial };
}

function campoVacio(campo: CampoArt17): PrescripcionFirmaEntrada {
  if (campo === 'cantidad_num') return completa({ cantidad_num: null });
  if (campo === 'firma') return completa({ firma: false });
  return completa({ [campo]: '' });
}

describe('lentes de contacto', () => {
  it('rechaza «No aplica» en dispositivo, forma de uso y distancia pupilar', () => {
    const resultado = validarFirmaPrescripcion(
      completa({
        tipo: 'lentes_contacto',
        dispositivo: 'No aplica',
        forma_uso: 'No aplica',
        distancia_pupilar: 'No aplica',
      }),
      AHORA,
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    const campos = resultado.problemas.map((problema) => problema.campo);
    expect(campos).toEqual(expect.arrayContaining(['dispositivo', 'forma_uso', 'distancia_pupilar']));
  });
});

describe('AC-OPT-05-1: cada campo del art. 17', () => {
  it('falla nombrando el campo que falta', () => {
    expect(CAMPOS_ART17.length).toBeGreaterThanOrEqual(15);
    for (const campo of CAMPOS_ART17) {
      const resultado = validarFirmaPrescripcion(campoVacio(campo), AHORA);
      expect(resultado.ok, campo).toBe(false);
      if (resultado.ok) continue;
      expect(resultado.problemas.some((item) => item.campo === campo && item.mensaje.includes(campo)), campo).toBe(true);
    }
  });

  it('TODO(Q-18): la vigencia vacía no se rellena', () => {
    const resultado = validarFirmaPrescripcion(completa({ vigencia_hasta: '' }), AHORA);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.problemas.some((item) => item.campo === 'vigencia_hasta')).toBe(true);
      expect(JSON.stringify(resultado.problemas)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });
});

describe('AC-OPT-05-2: cantidad en números y en letras', () => {
  it('acepta el par que coincide y rechaza el que no', () => {
    const bien = validarFirmaPrescripcion(completa(), AHORA);
    expect(bien.ok).toBe(true);
    if (bien.ok) {
      expect(bien.datos.cantidad_num).toBe(2);
      expect(bien.datos.cantidad_letras).toBe('dos');
    }
    const mal = validarFirmaPrescripcion(completa({ cantidad_letras: 'tres' }), AHORA);
    expect(mal.ok).toBe(false);
    if (!mal.ok) expect(mal.problemas.some((item) => item.campo === 'cantidad_letras')).toBe(true);
  });
});

describe('AC-OPT-05-3 y AC-OPT-05-6: estado visible y dispensación', () => {
  it('la corrección se ve como sustituida y la vencida no es dispensable', () => {
    expect(
      estadoVisiblePrescripcion({
        estadoAlmacenado: 'firmada',
        sustituida: true,
        vigenciaHasta: '2027-04-01',
        hoyBogota: HOY,
      }),
    ).toBe('sustituida');
    const vencida = esDispensable({
      estadoAlmacenado: 'firmada',
      sustituida: false,
      numeroHc: '23',
      vigenciaHasta: '2020-01-01',
      hoyBogota: HOY,
      registroProfesional: 'RP-SINTETICO-23',
      registroVigenteHasta: '2099-12-31',
      ahora: AHORA,
    });
    expect(vencida).toEqual({ dispensable: false, motivo: 'vencida' });
    const vigente = esDispensable({
      estadoAlmacenado: 'firmada',
      sustituida: false,
      numeroHc: '23',
      vigenciaHasta: '2027-04-01',
      hoyBogota: HOY,
      registroProfesional: 'RP-SINTETICO-23',
      registroVigenteHasta: '2099-12-31',
      ahora: AHORA,
    });
    expect(vigente.dispensable).toBe(true);
  });
});

describe('roles de firma ya existentes', () => {
  it('firma optometra y oftalmologo; el asesor no', () => {
    expect(puedeFirmarPrescripcion('optometra')).toBe(true);
    expect(puedeFirmarPrescripcion('oftalmologo')).toBe(true);
    expect(puedeFirmarPrescripcion('asesor')).toBe(false);
    expect(puedeFirmarPrescripcion('auxiliar_clinico')).toBe(false);
  });
});

describe('P: cantidad, vigencia y dispensación', () => {
  function lcg(semilla: number) {
    let estado = semilla >>> 0;
    return () => {
      estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
      return estado;
    };
  }

  it('la cantidad en letras coincide consigo y no con otro entero', () => {
    const aleatorio = lcg(23);
    for (let caso = 0; caso < 80; caso += 1) {
      const n = (aleatorio() % 5000) + 1;
      expect(cantidadCoincide(n, cantidadEnLetras(n)), String(n)).toBe(true);
      const otra = n === 5000 ? 1 : n + 1;
      expect(cantidadCoincide(n, cantidadEnLetras(otra))).toBe(false);
    }
    expect(cantidadEnLetras(1000)).toBe('mil');
    expect(cantidadEnLetras(2001)).toBe('dos mil uno');
    expect(formatearNumeroPrescripcion(2026, 1)).toBe('RX-2026-000001');
  });

  it('sin vigencia escrita no hay fecha inventada y una fecha anterior no se dispensa', () => {
    const aleatorio = lcg(18);
    for (let caso = 0; caso < 40; caso += 1) {
      const resultado = validarFirmaPrescripcion(completa({ vigencia_hasta: caso % 2 === 0 ? '' : '   ' }), AHORA);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.problemas.map((item) => item.campo)).toContain('vigencia_hasta');
      const dias = (aleatorio() % 400) + 1;
      const pasada = desplazarDias(HOY, -dias);
      expect(
        esDispensable({
          estadoAlmacenado: 'firmada',
          sustituida: false,
          numeroHc: '23',
          vigenciaHasta: pasada,
          hoyBogota: HOY,
          registroProfesional: 'RP-1',
          registroVigenteHasta: '2099-12-31',
          ahora: AHORA,
        }).motivo,
      ).toBe('vencida');
    }
  });

  it('la URL de verificación no inventa un dominio y la respuesta pública no copia al paciente', () => {
    const aleatorio = lcg(24);
    const validacion = validarFirmaPrescripcion(completa(), AHORA);
    expect(validacion.ok).toBe(true);
    if (!validacion.ok) return;
    for (let caso = 0; caso < 40; caso += 1) {
      const n = (aleatorio() % 5000) + 1;
      const datos: PrescripcionNormalizada & { numero: string } = {
        ...validacion.datos,
        cantidad_num: n,
        cantidad_letras: cantidadEnLetras(n),
        numero: formatearNumeroPrescripcion(2026, (caso % 999999) + 1),
      };
      expect(textosElementosArt17(datos)).toHaveLength(15);
      const hash = hashVerificacionPrescripcion(lineasPrescripcion(datos));
      const relativa = urlVerificacionPrescripcion(hash);
      expect(relativa).toBe(`/verificar/prescripcion/${hash}`);
      expect(relativa.includes('://')).toBe(false);
      const absoluta = urlVerificacionPrescripcion(hash, 'http://127.0.0.1:3000');
      expect(absoluta).toBe(`http://127.0.0.1:3000/verificar/prescripcion/${hash}`);
      const publica = respuestaVerificacion({
        numero: datos.numero,
        fecha_emision: datos.fecha,
        nombre_prescriptor: datos.nombre_prescriptor,
        registro_profesional: datos.registro_profesional,
        paciente_nombre: datos.paciente_nombre,
        paciente_documento: datos.paciente_documento,
      });
      expect(Object.keys(publica).sort()).toEqual([
        'coincide',
        'fecha_emision',
        'nombre_prescriptor',
        'numero',
        'registro_profesional',
      ]);
      expect(JSON.stringify(publica)).not.toContain(datos.paciente_nombre);
      expect(JSON.stringify(publica)).not.toContain(datos.paciente_documento);
    }
    expect(respuestaVerificacion(null)).toEqual({ coincide: false });
  });
});

describe('AC-OPT-05-4: PDF con los 15 elementos', () => {
  it('compara el PDF con la lista de los 15 elementos, el prescriptor y la URL', async () => {
    const validacion = validarFirmaPrescripcion(completa(), AHORA);
    expect(validacion.ok).toBe(true);
    if (!validacion.ok) return;
    const datos: PrescripcionNormalizada & { numero: string } = { ...validacion.datos, numero: 'RX-2026-000001' };
    const elementos = textosElementosArt17(datos);
    expect(elementos).toHaveLength(15);
    const lineas = lineasPrescripcion(datos);
    const hash = hashVerificacionPrescripcion(lineas);
    const url = urlVerificacionPrescripcion(hash, 'http://127.0.0.1:3000');
    const pdf = await renderizarPdfPrescripcion({
      lineas,
      nombreProfesional: datos.nombre_prescriptor,
      registroProfesional: datos.registro_profesional,
      lineaProfesional: 'Firmado electrónicamente por Optometra Sintetico T23, registro profesional RP-SINTETICO-23',
      urlVerificacion: url,
    });
    const texto = textoVisiblePdf(pdf);
    for (const elemento of elementos) expect(texto, elemento).toContain(elemento);
    expect(texto).toContain('Nombre completo del prescriptor: Optometra Sintetico T23');
    expect(texto).toContain('Registro profesional: RP-SINTETICO-23');
    expect(texto).toContain('Cantidad total: 2 (dos)');
    expect(texto).toContain(url);
    expect(texto).toContain('BORRADOR');
    expect(texto).not.toContain('tachado');
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(hashSha256(pdf)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('migración', () => {
  it('pide RLS y no pone vigencia por defecto', () => {
    const sql = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations/0022_opt05_prescripciones.sql'),
      'utf8',
    );
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('FORCE ROW LEVEL SECURITY');
    expect(sql).toContain("aplicar_marco_inmutabilidad('public.prescripciones'::regclass)");
    expect(sql).not.toMatch(/vigencia_hasta\s+date\s+default/i);
    expect(sql).toContain('TODO(Q-18)');
    const verificacion = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations/0023_opt05_verificacion_prescripcion.sql'),
      'utf8',
    );
    expect(verificacion).toContain('verificar_prescripcion_por_hash');
    expect(verificacion).not.toContain('DISABLE ROW LEVEL SECURITY');
    expect(verificacion).not.toContain('BYPASSRLS');
    expect(verificacion).toContain('nombre_prescriptor');
    expect(verificacion).not.toContain('paciente_nombre');
    expect(verificacion).not.toContain('paciente_documento');
  });
});
