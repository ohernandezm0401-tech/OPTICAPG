// PLT-09 — Prueba unitaria de humo (T02, esqueleto ampliable en T05 y ss.).
// Lógica pura, sin BD ni navegador: verifica la combinación de clases de
// `lib/utils.ts` (`cn`), usada en toda la interfaz en español.
import { describe, expect, it } from 'vitest';

import { cn } from '../../lib/utils';

describe('humo unitario: combinación de clases (cn)', () => {
  it('une clases e ignora valores falsos', () => {
    expect(cn('px-2', false && 'oculto', 'py-1')).toBe('px-2 py-1');
  });

  it('resuelve conflictos de Tailwind a favor de la última clase', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
