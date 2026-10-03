# Inventario de licencias de terceros (THIRD_PARTY_LICENSES.md)

> Alcance de T00 (solo documentación): este archivo lista las dependencias **directas**
> declaradas en `web/package.json`. No se cambió código ni dependencias en este PR.
> La auditoría del árbol transitivo (incluidos los hallazgos H-LIC-1/H-LIC-2 de la spec §14.4
> y Q-09) y el script `scripts/check-licenses.mjs` quedan para T01/T02.
> Ver `docs/DECISIONES.md` (ADR-002).

- Fecha de verificación en el registro npm: 3 de octubre de 2026 (UTC).
- Método: `npm view <paquete>@<versión declarada> license` (campo `license` del registro npm).
  La columna «versión» reproduce el rango declarado en `web/package.json`; la columna
  «licencia SPDX» es el valor devuelto por el registro para esa versión.
- Licencias permitidas por la regla 2: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC
  (más las admitidas para datos/herramientas según PLT-09: 0BSD, MIT-0, BlueOak-1.0.0,
  CC0-1.0, Unlicense, Python-2.0, CC-BY-4.0 solo datos).
- `web/package.json` declara `"private": true` y no declara campo `"license"`
  (equivalente a `UNLICENSED`; decisión pendiente Q-14, ver `docs/DECISIONES.md`).
- Excepciones aprobadas: ninguna en T00. Todo lo pendiente de decisión se marca
  `PENDIENTE Q-09` en T01, no aquí.

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
| `@tailwindcss/postcss` | `4.1.11` | MIT | dev |
| `@tailwindcss/typography` | `^0.5.19` | MIT | dev |
| `@types/bcryptjs` | `^2.4.6` | MIT | dev |
| `@types/node` | `^20` | MIT | dev |
| `@types/react` | `^19` | MIT | dev |
| `@types/react-dom` | `^19` | MIT | dev |
| `bcryptjs` | `^3.0.3` | BSD-3-Clause | dev |
| `eslint` | `9.39.1` | MIT | dev |
| `eslint-config-next` | `16.0.8` | MIT | dev |
| `tailwindcss` | `4.1.11` | MIT | dev |
| `tw-animate-css` | `^1.4.0` | MIT | dev |
| `typescript` | `5.9.3` | Apache-2.0 | dev |

## Pendiente (T01/T02, no excepciones en T00)

- Auditoría transitiva del `package-lock.json` (hallazgos H-LIC-1 `sharp-libvips` LGPL-3.0-or-later
  y H-LIC-2 `lightningcss`/`axe-core` MPL-2.0 citados en la spec §14.4 y Q-09): por verificar
  en T01 con `scripts/check-licenses.mjs`.
- `licenses.exceptions.json`: no existe en T00; se crea en T01/T02 si Orlando aprueba excepciones (Q-09).
- Licencia propia del proyecto: pendiente Q-14 (hoy `private: true` sin campo `license`).
