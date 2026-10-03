// SEG-02 (T09) — Prueba R generada desde matrix.ts (AC-SEG-02-1) y reglas U.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { buildAbility } from '../../lib/authz/ability';
import { dtoPrescripcionParaDispensacion, dtoTieneDiagnostico } from '../../lib/authz/dto';
import {
  MAX_INTENTOS_IGUALES,
  listarIntentosDenegados,
  registrarIntentoDenegado,
  reiniciarIntentosDenegados,
} from '../../lib/authz/intentos';
import {
  celdasDeLaMatriz,
  casosGenerados,
  type RolMatriz,
} from '../../lib/authz/matrix';
import { decidirAccesoPanel } from '../../lib/authz/panel';
import { actorFijo, IDS_FIXTURE, sujetoDeCaso } from '../../lib/authz/sujetos';

describe('AC-SEG-02-1: casos generados desde matrix.ts', () => {
  const casos = casosGenerados();

  it('cubre al menos un caso por celda rol × recurso', () => {
    const celdas = new Set(casos.map((caso) => `${caso.rol}|${caso.recurso}`));
    expect(celdas.size).toBe(celdasDeLaMatriz());
    expect(casos.length).toBeGreaterThanOrEqual(celdas.size);
    for (const caso of casos) {
      expect(caso.id.length).toBeGreaterThan(0);
    }
  });

  it('cada caso permitido o denegado coincide con la habilidad', () => {
    const habilidades = new Map<RolMatriz, ReturnType<typeof buildAbility>>();
    const fallos: string[] = [];
    for (const caso of casos) {
      let habilidad = habilidades.get(caso.rol);
      if (!habilidad) {
        habilidad = buildAbility(actorFijo(caso.rol));
        habilidades.set(caso.rol, habilidad);
      }
      const obtuvo = habilidad.can(caso.accion, sujetoDeCaso(caso.rol, caso.recurso, caso.accion, caso.escenario));
      if (obtuvo !== caso.esperado) fallos.push(`${caso.id} obtuvo ${obtuvo} esperado ${caso.esperado}`);
    }
    expect(fallos).toEqual([]);
  });
});

describe('U: reglas transversales', () => {
  it('TODO(Q-10): admin no lee la historia clínica aunque el sujeto sea amplio', () => {
    const habilidad = buildAbility(actorFijo('admin'));
    expect(
      habilidad.can('leer', {
        tipo: 'R3',
        tenantId: IDS_FIXTURE.tenant,
        sedeId: IDS_FIXTURE.sedeActiva,
        autorId: IDS_FIXTURE.actor,
        pacientesEnSede: true,
        borrador: true,
      }),
    ).toBe(false);
    const fuente = readFileSync(new URL('../../lib/authz/matrix.ts', import.meta.url), 'utf8');
    expect(fuente).toContain('TODO(Q-10)');
  });

  it('owner_plataforma no lee contenido de tenant (R1–R3, R5)', () => {
    const habilidad = buildAbility(actorFijo('owner_plataforma'));
    for (const tipo of ['R1', 'R3', 'R5'] as const) {
      expect(
        habilidad.can('leer', {
          tipo,
          tenantId: IDS_FIXTURE.tenant,
          sedeId: IDS_FIXTURE.sedeActiva,
          metadatos: true,
          pacientesEnSede: true,
        }),
      ).toBe(false);
    }
    expect(habilidad.can('leer', { tipo: 'R24', plataforma: true })).toBe(true);
  });

  it('el alias owner equivale a owner_plataforma y oftalmologo a optometra', () => {
    const owner = buildAbility(actorFijo('owner_plataforma'));
    const alias = buildAbility({ ...actorFijo('owner_plataforma'), rol: 'owner' });
    expect(alias.can('crear', { tipo: 'R24', plataforma: true })).toBe(owner.can('crear', { tipo: 'R24', plataforma: true }));
    const opto = buildAbility(actorFijo('optometra'));
    const oftalmo = buildAbility({ ...actorFijo('optometra'), rol: 'oftalmologo' });
    const sujeto = sujetoDeCaso('optometra', 'R3', 'firmar', 'propia');
    expect(oftalmo.can('firmar', sujeto)).toBe(opto.can('firmar', sujeto));
  });

  it('sin tarjeta vigente no firma ni prescribe', () => {
    const habilidad = buildAbility(actorFijo('optometra', { tarjetaProfesionalVigente: false }));
    expect(habilidad.can('firmar', sujetoDeCaso('optometra', 'R3', 'firmar', 'propia'))).toBe(false);
    expect(habilidad.can('crear', sujetoDeCaso('optometra', 'R5', 'crear', 'propia'))).toBe(false);
    expect(habilidad.can('leer', sujetoDeCaso('optometra', 'R3', 'leer', 'propia'))).toBe(true);
  });

  it('break-glass de soporte solo con justificación y vencimiento futuro', () => {
    const base = actorFijo('soporte_plataforma');
    const sujeto = {
      tipo: 'R3' as const,
      tenantId: IDS_FIXTURE.tenant,
      sedeId: IDS_FIXTURE.sedeActiva,
    };
    expect(buildAbility(base).can('leer', sujeto)).toBe(false);
    const ahora = new Date('2026-10-03T15:00:00.000Z');
    const vigente = buildAbility({
      ...base,
      ahora,
      breakGlass: {
        activo: true,
        justificacion: 'incidente sintético',
        vence_en: '2026-10-03T16:00:00.000Z',
      },
    });
    expect(vigente.can('leer', sujeto)).toBe(true);
    const vencido = buildAbility({
      ...base,
      ahora,
      breakGlass: { activo: true, justificacion: 'incidente sintético', vence_en: '2026-10-03T14:00:00.000Z' },
    });
    expect(vencido.can('leer', sujeto)).toBe(false);
    const sinNota = buildAbility({
      ...base,
      ahora,
      breakGlass: { activo: true, justificacion: '   ', vence_en: '2026-10-03T16:00:00.000Z' },
    });
    expect(sinNota.can('leer', sujeto)).toBe(false);
  });

  it('sin sede activa autorizada no lee recursos de sede', () => {
    const habilidad = buildAbility(actorFijo('asesor', { sedeActiva: '', sedesAutorizadas: [] }));
    expect(habilidad.can('leer', sujetoDeCaso('asesor', 'R1', 'leer', 'propia', actorFijo('asesor')))).toBe(false);
  });

  it('director científico solicita en garantías y el optómetra no', () => {
    const director = buildAbility(actorFijo('director_cientifico'));
    const opto = buildAbility(actorFijo('optometra'));
    const sujeto = sujetoDeCaso('director_cientifico', 'R15', 'solicitar', 'propia');
    expect(director.can('solicitar', sujeto)).toBe(true);
    expect(opto.can('solicitar', sujetoDeCaso('optometra', 'R15', 'solicitar', 'propia'))).toBe(false);
  });

  it('el panel niega al owner el contenido de tenant y deja pasar su sección', () => {
    const owner = actorFijo('owner');
    expect(decidirAccesoPanel(owner, '/dashboard/owner').permitido).toBe(true);
    expect(decidirAccesoPanel(owner, '/dashboard/admin/pacientes').permitido).toBe(false);
    expect(decidirAccesoPanel(owner, '/dashboard/optometra/historia-clinica').permitido).toBe(false);
    expect(decidirAccesoPanel(owner, '/dashboard/asesor/ventas').permitido).toBe(false);
    const admin = actorFijo('admin');
    expect(decidirAccesoPanel(admin, '/dashboard/admin').permitido).toBe(true);
    expect(decidirAccesoPanel(admin, '/dashboard/optometra/historia-clinica').permitido).toBe(false);
    expect(decidirAccesoPanel(actorFijo('asesor'), '/dashboard/asesor/ventas').permitido).toBe(true);
    expect(decidirAccesoPanel(actorFijo('asesor'), '/dashboard/admin').permitido).toBe(false);
  });
});

describe('U: DTO reducido e intentos', () => {
  beforeEach(() => reiniciarIntentosDenegados());

  it('la dispensación no incluye diagnóstico ni id de atención', () => {
    const dto = dtoPrescripcionParaDispensacion({
      id: 'rx-sintetica',
      numero_verificacion: 'RX-000',
      atencion_id: 'atencion-sintetica',
      diagnostico: 'texto-sintetico',
      anamnesis: 'texto-sintetico',
      valores_opticos: { esfera_od: '+1.00' },
      vigencia: '2026-12-01',
    });
    expect(dtoTieneDiagnostico(dto)).toBe(false);
    expect(dto.valores_opticos.esfera_od).toBe('+1.00');
    expect(JSON.stringify(dto)).not.toContain('texto-sintetico');
  });

  it('el límite de ruido descarta el intento idéntico número 6', () => {
    const ahora = new Date('2026-10-03T15:00:00.000Z');
    for (let i = 0; i < MAX_INTENTOS_IGUALES; i += 1) {
      expect(
        registrarIntentoDenegado(
          {
            usuario_id: 'u',
            rol: 'asesor',
            tenant_id: 't',
            sede_id: 's',
            recurso: 'R5',
            recurso_id: 'rx',
            accion: 'actualizar',
          },
          { ahora },
        ).registrado,
      ).toBe(true);
    }
    expect(
      registrarIntentoDenegado(
        {
          usuario_id: 'u',
          rol: 'asesor',
          tenant_id: 't',
          sede_id: 's',
          recurso: 'R5',
          recurso_id: 'rx',
          accion: 'actualizar',
        },
        { ahora },
      ).registrado,
    ).toBe(false);
    expect(listarIntentosDenegados()).toHaveLength(MAX_INTENTOS_IGUALES);
  });
});

describe('U: el middleware no autoriza por rol', () => {
  it('solo redirige a login y no exime al owner', () => {
    const fuente = readFileSync(new URL('../../middleware.ts', import.meta.url), 'utf8');
    expect(fuente).toContain("new URL('/login'");
    expect(fuente).not.toContain('ROLE_ALLOWED_PATHS');
    expect(fuente).not.toContain("role === 'owner'");
    expect(fuente).toContain('x-optisaas-ruta');
  });
});
