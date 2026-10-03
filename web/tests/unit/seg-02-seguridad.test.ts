// SEG-02 (T09) — S: IDOR, escalada horizontal y vertical. AC-SEG-02-2, 02-3 y 02-4.
// Las rutas /api/atenciones y /api/prescripciones aún no existen (OPT-01, OPT-05).
// El adaptador `atenderRutaClinica` es el contrato que esas rutas deben usar.
import { beforeEach, describe, expect, it } from 'vitest';

import { dtoTieneDiagnostico } from '../../lib/authz/dto';
import { listarIntentosDenegados, reiniciarIntentosDenegados } from '../../lib/authz/intentos';
import { atenderRutaClinica, type RegistroClinicoSintetico } from '../../lib/authz/rutas-clinicas';
import { cambiarSedeActiva } from '../../lib/authz/sede';
import { actorFijo, IDS_FIXTURE } from '../../lib/authz/sujetos';

const REGISTRO: RegistroClinicoSintetico = {
  id: '88888888-8888-4888-8888-888888888888',
  tenant_id: IDS_FIXTURE.tenant,
  sede_id: IDS_FIXTURE.sedeActiva,
  autor_id: IDS_FIXTURE.otroAutor,
  numero_verificacion: 'RX-SINTETICA-000',
  diagnostico: 'texto-sintetico',
  anamnesis: 'texto-sintetico',
  atencion_id: '99999999-9999-4999-8999-999999999999',
  valores_opticos: { esfera_od: '+1.25' },
  vigencia: '2026-12-31',
  borrador: true,
};

describe('AC-SEG-02-2: asesor frente a atención y prescripción', () => {
  const asesor = actorFijo('asesor');

  it('GET /api/atenciones/:id responde 403', () => {
    const respuesta = atenderRutaClinica({
      metodo: 'GET',
      ruta: '/api/atenciones/:id',
      actor: asesor,
      recurso_id: REGISTRO.id,
      registro: REGISTRO,
    });
    expect(respuesta.status).toBe(403);
    expect(JSON.stringify(respuesta.cuerpo)).not.toContain('texto-sintetico');
  });

  it('GET /api/prescripciones/:id devuelve el DTO reducido sin diagnóstico', () => {
    const respuesta = atenderRutaClinica({
      metodo: 'GET',
      ruta: '/api/prescripciones/:id',
      actor: asesor,
      recurso_id: REGISTRO.id,
      registro: REGISTRO,
    });
    expect(respuesta.status).toBe(200);
    expect(dtoTieneDiagnostico(respuesta.cuerpo)).toBe(false);
    expect(respuesta.cuerpo.numero_verificacion).toBe('RX-SINTETICA-000');
    expect(respuesta.cuerpo.valores_opticos).toEqual({ esfera_od: '+1.25' });
  });
});

describe('AC-SEG-02-3 y escalada', () => {
  beforeEach(() => reiniciarIntentosDenegados());

  it('editar una prescripción como asesor devuelve 403 y registra el intento', () => {
    const respuesta = atenderRutaClinica({
      metodo: 'PATCH',
      ruta: '/api/prescripciones/:id',
      actor: actorFijo('asesor'),
      recurso_id: REGISTRO.id,
      registro: REGISTRO,
    });
    expect(respuesta.status).toBe(403);
    const intentos = listarIntentosDenegados();
    expect(intentos.some((item) => item.accion === 'actualizar' && item.recurso === 'R5' && item.resultado === 'denegado')).toBe(
      true,
    );
  });

  it('S vertical: admin no lee la atención y el asesor no firma', () => {
    const admin = atenderRutaClinica({
      metodo: 'GET',
      ruta: '/api/atenciones/:id',
      actor: actorFijo('admin'),
      recurso_id: REGISTRO.id,
      registro: REGISTRO,
    });
    expect(admin.status).toBe(403);
    const firmar = atenderRutaClinica({
      metodo: 'PATCH',
      ruta: '/api/atenciones/:id',
      actor: actorFijo('asesor'),
      recurso_id: REGISTRO.id,
      registro: REGISTRO,
    });
    expect(firmar.status).toBe(403);
  });

  it('S horizontal e IDOR: otra sede y otro tenant responden 403 sin contenido', () => {
    const otraSede = atenderRutaClinica({
      metodo: 'GET',
      ruta: '/api/prescripciones/:id',
      actor: actorFijo('asesor'),
      recurso_id: REGISTRO.id,
      registro: { ...REGISTRO, sede_id: IDS_FIXTURE.sedeAjena },
    });
    expect(otraSede.status).toBe(403);
    const otroTenant = atenderRutaClinica({
      metodo: 'GET',
      ruta: '/api/prescripciones/:id',
      actor: actorFijo('asesor'),
      recurso_id: REGISTRO.id,
      registro: { ...REGISTRO, tenant_id: IDS_FIXTURE.otroTenant },
    });
    expect(otroTenant.status).toBe(403);
    expect(JSON.stringify(otroTenant.cuerpo)).not.toContain('texto-sintetico');
    expect(JSON.stringify(otraSede.cuerpo)).not.toContain('+1.25');
  });

  it('el optómetra de la sede lee la atención sintética', () => {
    const respuesta = atenderRutaClinica({
      metodo: 'GET',
      ruta: '/api/atenciones/:id',
      actor: actorFijo('optometra'),
      recurso_id: REGISTRO.id,
      registro: REGISTRO,
    });
    expect(respuesta.status).toBe(200);
    expect(respuesta.cuerpo.diagnostico).toBe('texto-sintetico');
  });
});

describe('AC-SEG-02-4: sede no autorizada', () => {
  beforeEach(() => reiniciarIntentosDenegados());

  it('cambiar a una sede ajena devuelve 403 y queda el intento', () => {
    const resultado = cambiarSedeActiva(actorFijo('asesor'), IDS_FIXTURE.sedeAjena);
    expect(resultado.status).toBe(403);
    expect(resultado.ok).toBe(false);
    expect(listarIntentosDenegados().some((item) => item.accion === 'cambiar_sede')).toBe(true);
  });

  it('cambiar a una sede autorizada devuelve 200', () => {
    const resultado = cambiarSedeActiva(actorFijo('admin'), IDS_FIXTURE.sedeAutorizada);
    expect(resultado.status).toBe(200);
    expect(resultado.sedeId).toBe(IDS_FIXTURE.sedeAutorizada);
  });
});
