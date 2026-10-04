import { describe, expect, it } from 'vitest';

import { mapaRolesPorSede, rolDeSede } from '../../lib/auth/rol-sede';

describe('rol de la sede activa', () => {
  it('no usa el primer rol de una lista sin orden', () => {
    const mapa = mapaRolesPorSede([
      { sede_id: 'sede-b', rol: 'optometra' },
      { sede_id: 'sede-a', rol: 'asesor' },
    ]);
    expect(rolDeSede(mapa, 'sede-a')).toBe('asesor');
    expect(rolDeSede(mapa, 'sede-b')).toBe('optometra');
    expect(rolDeSede(mapa, 'sede-b', 'owner_plataforma')).toBe('optometra');
    expect(rolDeSede(mapa, '', 'owner_plataforma')).toBe('owner_plataforma');
  });
});
