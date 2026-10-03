# Inventario de licencias de terceros (THIRD_PARTY_LICENSES.md)

> Alcance de T01 (PLT-09): este archivo lista las dependencias **directas**
> declaradas en `web/package.json` y el resultado de la auditoría **transitiva**
> de `web/package-lock.json` con `npm run licenses:check`
> (`web/scripts/check-licenses.mjs` + `web/licenses.exceptions.json`).
> Ver `docs/DECISIONES.md` (ADR-007 a ADR-010).

- Fecha de verificación en el registro npm: 3 de octubre de 2026 (UTC).
- Método: `npm view <paquete>@<versión declarada> license` (campo `license` del registro npm)
  para las directas cambiadas en T01 (`tailwindcss@3.4.17` → MIT; `@types/node@^22` → MIT);
  el resto de directas conserva la verificación de T00 (3-oct-2026). El árbol transitivo
  se audita con `npm run licenses:check`, que lee `package-lock.json` (518 paquetes).
- Licencias permitidas por la regla 2: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC
  (más las admitidas para datos/herramientas según PLT-09: 0BSD, MIT-0, BlueOak-1.0.0,
  CC0-1.0, Unlicense, Python-2.0, CC-BY-4.0 solo datos).
- `web/package.json` declara `"private": true` y `"license": "UNLICENSED"` explícito
  (decisión pendiente Q-14: por defecto el proyecto sigue privado y no se publica;
  ver `docs/DECISIONES.md`, TODO(Q-14)).
- Excepciones aprobadas definitivamente: ninguna. Todo lo pendiente de decisión de
  Orlando se marca `PENDIENTE Q-09` abajo y en `web/licenses.exceptions.json` (el
  verificador avisa sin fallar solo por esas entradas nominales).

## Dependencias de producción (`dependencies` en `web/package.json`)

| Paquete | Versión (declarada) | Licencia SPDX (registro npm) | Uso |
|---|---|---|---|
| `@base-ui/react` | `^1.4.1` | MIT | prod |
| `@hookform/resolvers` | `^5.2.1` | MIT | prod |
| `@supabase/supabase-js` | `^2.106.2` | MIT | prod |
| `autoprefixer` | `^10.4.21` | MIT | prod |
| `class-variance-authority` | `^0.7.1` | Apache-2.0 | prod |
| `clsx` | `^2.1.1` | MIT | prod |
| `date-fns` | `^4.1.0` | MIT | prod |
| `jsbarcode` | `^3.12.3` | MIT | prod |
| `lucide-react` | `^1.14.0` | ISC | prod |
| `motion` | `^12.23.24` | MIT | prod |
| `next` | `^15.4.9` | MIT | prod |
| `next-auth` | `^5.0.0-beta.31` | ISC | prod |
| `next-themes` | `^0.4.6` | MIT | prod |
| `postcss` | `^8.5.6` | MIT | prod |
| `react` | `^19.2.1` | MIT | prod |
| `react-dom` | `^19.2.1` | MIT | prod |
| `recharts` | `^3.8.1` | MIT | prod |
| `sonner` | `^2.0.7` | MIT | prod |
| `tailwind-merge` | `^3.3.1` | MIT | prod |
| `zustand` | `^5.0.13` | MIT | prod |

## Dependencias de desarrollo (`devDependencies` en `web/package.json`)

| Paquete | Versión (declarada) | Licencia SPDX (registro npm) | Uso |
|---|---|---|---|
| `@tailwindcss/typography` | `^0.5.19` | MIT | dev |
| `@types/bcryptjs` | `^2.4.6` | MIT | dev |
| `@types/node` | `^22` | MIT | dev |
| `@types/react` | `^19` | MIT | dev |
| `@types/react-dom` | `^19` | MIT | dev |
| `bcryptjs` | `^3.0.3` | BSD-3-Clause | dev |
| `eslint` | `9.39.1` | MIT | dev |
| `eslint-config-next` | `16.0.8` | MIT | dev |
| `tailwindcss` | `^3.4.17` | MIT | dev |
| `typescript` | `5.9.3` | Apache-2.0 | dev |

Cambios de T01 respecto a T00: `tailwindcss` 4.1.11 → `^3.4.17` (MIT, verificado en el
registro npm el 3-oct-2026; elimina `lightningcss` MPL-2.0 del árbol); retirados
`@tailwindcss/postcss` 4.1.11 (solo v4) y `tw-animate-css` `^1.4.0` (MIT pero solo v4 y
sin uso: nunca se importó su CSS); `@types/node` `^20` → `^22` (MIT; coherente con
`engines: node >=22.12`).

## Auditoría transitiva (`package-lock.json`, 518 paquetes)

Verificación: `npm run licenses:check` (pasa con avisos; 0 errores el 3-oct-2026).

| Paquete(s) | Licencia | Estado | Origen |
|---|---|---|---|
| `lightningcss` + 10 binarios de plataforma (vía Tailwind 4) | MPL-2.0 | **Eliminados en T01** (bajada a Tailwind 3.4.17) | — |
| `axe-core` 4.11.4 | MPL-2.0 | **PENDIENTE Q-09** (aviso, no falla) | transitiva vía `eslint-config-next`; solo herramienta de dev/pruebas de accesibilidad, no se distribuye con la tienda (nota de Orlando citada en T01; sin aprobación definitiva) |
| `@img/sharp-libvips-*` ×10, `@img/sharp-wasm32`, `@img/sharp-win32-*` ×3 | LGPL-3.0-or-later (pura o en expresión `Apache-2.0 AND …`) | **PENDIENTE Q-09** (aviso, no falla) | transitiva vía `next` → `sharp` (dependencia opcional); la optimización de imágenes está desactivada (`images.unoptimized: true`, la app no usa `next/image`) |
| `caniuse-lite` | CC-BY-4.0 | Permitida (solo datos) | base de datos de compatibilidad usada por Autoprefixer; sin código ejecutable |
| Resto del árbol (502 paquetes) | MIT / ISC / Apache-2.0 / BSD-2-Clause / BSD-3-Clause / 0BSD / BlueOak-1.0.0 / CC0-1.0 / Python-2.0 / Unlicense | Permitidas | — |

## Pendiente (decisión de Orlando, no excepciones aprobadas)

- TODO(Q-09): `axe-core` (MPL-2.0, solo dev/pruebas) y binarios `@img/sharp-*` (LGPL-3.0-or-later,
  opcionales de `next`). Hasta la decisión, `licenses:check` avisa sin fallar solo por las
  15 entradas nominales de `web/licenses.exceptions.json`; cualquier otra licencia fuera de
  la lista permitida hace fallar el verificador y la CI.
- TODO(Q-14): licencia propia del proyecto (hoy `private: true` + `"license": "UNLICENSED"`;
  no publicar el repo).
