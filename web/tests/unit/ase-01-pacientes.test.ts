// ASE-01 / SEG-06 (T13) — Reglas de identificación, edad y mensajes a menores.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashDocumento } from '../../dominio/documento-hash';
import { evaluarElegibilidadMensajeComercial } from '../../dominio/elegibilidad-comercial';
import {
  avisoMayoriaDeEdad,
  edadCumplida,
  enmascararDocumento,
  esMenorDeEdad,
  faltaRepresentante,
  fichaSinDiagnosticoParaRol,
  MARCA_NO_APLICA,
  numeroDocumentoConsecutivo,
  numerosHcTrasFusion,
  siguienteNumHc,
  validarPaciente,
  type PacienteEntrada,
} from '../../dominio/pacientes';

const HOY = '2026-10-03';

function base(parcial: Partial<PacienteEntrada> = {}): PacienteEntrada {
  return {
    nombres: 'Ana Sintética',
    apellidos: 'Pérez Demo',
    tipo_doc: 'CC',
    num_doc: '9000001111',
    fecha_nacimiento: '1990-01-15',
    sexo: MARCA_NO_APLICA,
    estado_civil: MARCA_NO_APLICA,
    ocupacion: MARCA_NO_APLICA,
    direccion: MARCA_NO_APLICA,
    telefono: MARCA_NO_APLICA,
    acompanante: MARCA_NO_APLICA,
    responsable: MARCA_NO_APLICA,
    aseguradora: MARCA_NO_APLICA,
    tipo_vinculacion: 'no_aplica',
    ...parcial,
  };
}

describe('AC-ASE-01-1: campos del art. 9', () => {
  it('rechaza un campo vacío y acepta «No aplica» explícito', () => {
    const vacio = validarPaciente(base({ ocupacion: '   ' }), HOY);
    expect(vacio.ok).toBe(false);
    if (!vacio.ok) expect(vacio.errores.join(' ')).toContain('No aplica');
    const marcado = validarPaciente(base({ ocupacion: MARCA_NO_APLICA }), HOY);
    expect(marcado.ok).toBe(true);
  });

  it('no admite «No aplica» en el documento ni en el nombre', () => {
    const documento = validarPaciente(base({ num_doc: MARCA_NO_APLICA }), HOY);
    expect(documento.ok).toBe(false);
    const nombre = validarPaciente(base({ nombres: MARCA_NO_APLICA }), HOY);
    expect(nombre.ok).toBe(false);
  });
});

describe('AC-ASE-01-3: num_hc no vuelve al cupo al fusionar', () => {
  it('el siguiente número es el último más uno y la fusión no lo devuelve', () => {
    expect(siguienteNumHc(4)).toBe(5);
    expect(numerosHcTrasFusion([1, 2, 4])).toEqual([1, 2, 4]);
  });
});

describe('AC-ASE-01-4: el asesor no ve diagnósticos', () => {
  it('quita la clave diagnósticos para el asesor y la conserva para el optómetra', () => {
    const ficha = { id: '1', diagnosticos: [{ descripcion: 'H52.1 sintético' }] };
    const asesor = fichaSinDiagnosticoParaRol('asesor', ficha);
    expect('diagnosticos' in asesor).toBe(false);
    const optometra = fichaSinDiagnosticoParaRol('optometra', ficha);
    expect(optometra.diagnosticos).toHaveLength(1);
  });
});

describe('AC-SEG-06: edad en la fecha límite', () => {
  it('el día del cumpleaños 18 deja de ser menor; el día anterior sigue siéndolo', () => {
    expect(edadCumplida('2008-10-03', '2026-10-03')).toBe(18);
    expect(esMenorDeEdad('2008-10-03', '2026-10-03')).toBe(false);
    expect(edadCumplida('2008-10-03', '2026-10-02')).toBe(17);
    expect(esMenorDeEdad('2008-10-03', '2026-10-02')).toBe(true);
    expect(faltaRepresentante('2008-10-03', '2026-10-02', false)).toBe(true);
    expect(faltaRepresentante('2008-10-03', '2026-10-03', false)).toBe(false);
  });

  it('un paciente de 10 años sin representante no pasa la validación', () => {
    const menor = validarPaciente(base({ fecha_nacimiento: '2016-10-03', tipo_doc: 'TI' }), HOY);
    expect(menor.ok).toBe(false);
    if (!menor.ok) expect(menor.errores.join(' ')).toMatch(/representante/i);
  });

  it('al cumplir 18 conserva el aviso y no exige representante nuevo', () => {
    const aviso = avisoMayoriaDeEdad('2008-10-03', '2026-10-03', true);
    expect(aviso).toMatch(/18/);
    expect(aviso).toMatch(/no cambia/i);
    const adulto = validarPaciente(base({ fecha_nacimiento: '2008-10-03' }), HOY);
    expect(adulto.ok).toBe(true);
  });
});

describe('AC-SEG-06-3: mensaje comercial a un menor', () => {
  it('rechaza al paciente menor y acepta al representante o al adulto', () => {
    expect(
      evaluarElegibilidadMensajeComercial({
        fechaNacimiento: '2016-10-03',
        hoy: HOY,
        destinatario: 'paciente',
      }).aceptada,
    ).toBe(false);
    expect(
      evaluarElegibilidadMensajeComercial({
        fechaNacimiento: '2008-10-03',
        hoy: HOY,
        destinatario: 'paciente',
      }).aceptada,
    ).toBe(true);
    expect(
      evaluarElegibilidadMensajeComercial({
        fechaNacimiento: '2016-10-03',
        hoy: HOY,
        destinatario: 'representante',
      }).aceptada,
    ).toBe(true);
  });
});

describe('documento', () => {
  it('enmascara los últimos 4 y arma el consecutivo del menor sin documento', () => {
    expect(enmascararDocumento('9000001111')).toBe('••••1111');
    expect(numeroDocumentoConsecutivo('9000001111', 2)).toBe('9000001111-2');
    const clave = Buffer.alloc(32, 7);
    expect(hashDocumento('cc', '9000001111', clave)).toBe(hashDocumento('CC', '9000001111', clave));
  });
});

describe('la recepción no persiste pacientes en el navegador', () => {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const archivos = [
    'components/pacientes/recepcion-pacientes.tsx',
    'app/dashboard/asesor/pacientes/page.tsx',
    'app/dashboard/admin/pacientes/page.tsx',
    'app/dashboard/optometra/pacientes/page.tsx',
  ];

  it('no usa localStorage ni el almacén en memoria de la demo', () => {
    for (const relativo of archivos) {
      const texto = readFileSync(path.join(raiz, relativo), 'utf8');
      expect(texto).not.toContain('local' + 'Storage');
      expect(texto).not.toContain('useClinicStore');
      expect(texto).not.toContain('mockPacientes');
    }
  });
});
