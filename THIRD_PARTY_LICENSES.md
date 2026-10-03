# Inventario de licencias de terceros (THIRD_PARTY_LICENSES.md)

> Alcance de T01 (PLT-09): este archivo lista las dependencias **directas**
> declaradas en `web/package.json` y el resultado de la auditoría **transitiva**
> de `web/package-lock.json` con `npm run licenses:check`
> (`web/scripts/check-licenses.mjs` + `web/licenses.exceptions.json`).
> Ver `docs/DECISIONES.md` (ADR-007 a ADR-010).

- Fecha de verificación en el registro npm: 3 de octubre de 2026 (UTC).
- T06 (PLT-11) no agrega dependencias. El calendario hábil, el CSV de festivos
  y las tarifas usan la biblioteca estándar y las dependencias ya auditadas
  (`drizzle-orm` Apache-2.0, `zod` MIT, `pg` MIT). No hubo paquete nuevo que
  verificar en el registro npm.
- Método: `npm view <paquete>@<versión declarada> license` (campo `license` del registro npm)
  para las directas cambiadas en T01 (`tailwindcss@3.4.17` → MIT; `@types/node@^22` → MIT),
  en T02 (`vitest@2.1.9` → MIT; `@playwright/test@1.63.0` → Apache-2.0; `pg@8.23.1` → MIT;
  `@types/pg@8.23.1` → MIT) y en T03 (`drizzle-orm@0.45.3` → Apache-2.0;
  `drizzle-kit@0.31.11` → MIT; `server-only@0.0.1` → MIT; `zod@4.6.5` → MIT);
  el resto de directas conserva la verificación de T00 (3-oct-2026). El árbol transitivo
  se audita con `npm run licenses:check`, que lee `package-lock.json` (697 paquetes tras T03).
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
| `autoprefixer` | `^10.4.21` | MIT | prod |
| `class-variance-authority` | `^0.7.1` | Apache-2.0 | prod |
| `clsx` | `^2.1.1` | MIT | prod |
| `date-fns` | `^4.1.0` | MIT | prod |
| `drizzle-orm` | `^0.45.3` | Apache-2.0 | prod (capa de datos servidor; T03) |
| `jsbarcode` | `^3.12.3` | MIT | prod |
| `lucide-react` | `^1.14.0` | ISC | prod |
| `motion` | `^12.23.24` | MIT | prod |
| `next` | `^15.4.9` | MIT | prod |
| `next-auth` | `^5.0.0-beta.31` | ISC | prod (Auth.js v5, todavía en beta; T07) |
| `@node-rs/argon2` | `^2.2.1` | MIT | prod (Argon2id; T07) |
| `otplib` | `^13.5.0` | MIT | prod (TOTP; T08) |
| `@simplewebauthn/server` | `^14.0.3` | MIT | prod (passkeys; T08; peer opcional de next-auth pide `^9`, se usa 14 con `--legacy-peer-deps`) |
| `next-themes` | `^0.4.6` | MIT | prod |
| `pg` | `^8.23.1` | MIT | prod (controlador PostgreSQL solo-servidor; T03; era dev en T02) |
| `postcss` | `^8.5.6` | MIT | prod |
| `react` | `^19.2.1` | MIT | prod |
| `react-dom` | `^19.2.1` | MIT | prod |
| `recharts` | `^3.8.1` | MIT | prod |
| `server-only` | `^0.0.1` | MIT | prod (garantiza conexión solo-servidor; T03) |
| `sonner` | `^2.0.7` | MIT | prod |
| `tailwind-merge` | `^3.3.1` | MIT | prod |
| `zod` | `^4.6.5` | MIT | prod (DTOs del borde servidor; T03) |
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
| `drizzle-kit` | `^0.31.11` | MIT | dev (migraciones versionadas; T03) |
| `eslint` | `9.39.1` | MIT | dev |
| `eslint-config-next` | `16.0.8` | MIT | dev |
| `tailwindcss` | `^3.4.17` | MIT | dev |
| `typescript` | `5.9.3` | Apache-2.0 | dev |
| `vitest` | `^2.1.8` (instalado 2.1.9) | MIT | dev (pruebas unitarias e integración; T02) |
| `@playwright/test` | `^1.63.0` | Apache-2.0 | dev (pruebas E2E; T02) |
| `@types/pg` | `^8.23.1` | MIT | dev (tipos de `pg` para `tsc --noEmit`; T02) |

Cambios de T01 respecto a T00: `tailwindcss` 4.1.11 → `^3.4.17` (MIT, verificado en el
registro npm el 3-oct-2026; elimina `lightningcss` MPL-2.0 del árbol); retirados
`@tailwindcss/postcss` 4.1.11 (solo v4) y `tw-animate-css` `^1.4.0` (MIT pero solo v4 y
sin uso: nunca se importó su CSS); `@types/node` `^20` → `^22` (MIT; coherente con
`engines: node >=22.12`).

Cambios de T02 respecto a T01: se agregan `vitest` `^2.1.8` (MIT), `@playwright/test`
`^1.63.0` (Apache-2.0), `pg` `^8.23.1` (MIT, solo pruebas de integración) y `@types/pg`
`^8.23.1` (MIT), verificados en el registro npm el 3-oct-2026. Decisión de versión:
primero se probó `vitest@5.0.3` (MIT), pero su `vite@8.3.2` trae `lightningcss@1.33.0`
(MPL-2.0, 12 errores en `licenses:check`); se bajó a `vitest@2.1.9` (MIT, con Vite 5
basado en esbuild) y el árbol quedó limpio (618 paquetes, 0 errores). Ver
`docs/DECISIONES.md` (ADR-011).

Cambios de T03 respecto a T02: se retira `@supabase/supabase-js` (el navegador ya no
usa SDK propietario; la capa demo queda en memoria y la persistencia es PostgreSQL
vía Server Actions) y se agregan `drizzle-orm` `^0.45.3` (Apache-2.0),
`drizzle-kit` `^0.31.11` (MIT, solo migraciones), `server-only` `^0.0.1` (MIT,
garantiza conexión solo-servidor) y `zod` `^4.6.5` (MIT, DTOs del borde),
verificados en el registro npm el 3-oct-2026. `pg` `^8.23.1` (MIT) pasa de
`devDependencies` a `dependencies` (controlador de la capa servidor). Ver
`docs/DECISIONES.md` (ADR-012).

Cambios de T04 respecto a T03: **sin dependencias nuevas** (restricción de la
tarea: solo `pg`, ya declarado MIT, para `scripts/check-rls.mjs`; sin intrusos
en `package-lock.json`). Ver `docs/DECISIONES.md` (ADR-013).

Cambios de T05 respecto a T04: **sin dependencias nuevas** (`zod` MIT ya instalado
en T03, reutilizado para `APP_ENV` en `web/lib/entorno.ts`). Ver
`docs/DECISIONES.md` (ADR-014) y `docs/ENTORNOS.md`.

Cambios de T07 respecto a T06: se agrega `@node-rs/argon2` `^2.2.1` (MIT,
verificado con `npm view @node-rs/argon2@2.2.1 license` y el mismo campo en
los 13 binarios opcionales `@node-rs/argon2-*@2.2.1`, todos MIT, el 3-oct-2026).
`next-auth` ya estaba en `^5.0.0-beta.31` (ISC; `npm view next-auth@5.0.0-beta.31 license`
y `npm view next-auth@5.0.0-beta.32 license` → ISC). No se sube de beta.31 a
beta.32: la versión ya fijada en el candado cumple «5.0.0-beta.x». Ninguna
transitiva nueva de Argon2 trae LGPL/MPL (`licenses:check`: 711 paquetes, 0
errores, los mismos 15 avisos PENDIENTE Q-09). No hizo falta TODO(Q-09) por
esta tarea. Ver `docs/DECISIONES.md` (ADR-015).

Cambios de T08 respecto a T07: se agregan `otplib` `^13.5.0` (MIT, verificado
con `npm view otplib@13.5.0 license` el 3-oct-2026) y
`@simplewebauthn/server` `^14.0.3` (MIT, `npm view @simplewebauthn/server@14.0.3 license`).
Transitivas directas revisadas en el mismo registro: `@otplib/core`,
`@otplib/hotp`, `@otplib/totp`, `@otplib/uri`, `@otplib/plugin-crypto-noble`
(MIT), `@noble/hashes` (MIT), `@scure/base` (MIT), `@peculiar/asn1-schema`,
`@peculiar/asn1-x509`, `@peculiar/utils` (MIT), `@hexagon/base64` (MIT),
`@levischuck/tiny-cbor` (MIT), `tsyringe` (MIT), `pvtsutils` / `pvutils` (MIT),
`reflect-metadata` (Apache-2.0), `tslib` (0BSD, permitida por
`scripts/check-licenses.mjs`). No se instala `@simplewebauthn/browser` ni una
librería de QR. El QR es código propio (`web/lib/auth/mfa/qr.ts`). Ver
`docs/DECISIONES.md` (ADR-016).

## Auditoría transitiva (`package-lock.json`, 711 paquetes)

Verificación: `npm run licenses:check` (pasa con avisos; 0 errores el 3-oct-2026 tras T07, 711 paquetes).

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
