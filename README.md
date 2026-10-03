# OptiSaaS v3.0

Plataforma SaaS multi-empresa y multi-sede para ópticas. El clon trae datos de demostración: no hace falta una base de datos para entrar y recorrer los paneles.

## Dónde está cada cosa

| Ruta | Qué es |
| --- | --- |
| [`web/`](web/) | Aplicación Next.js 15 (login, dashboards, API, esquema SQL) |
| [`landing/`](landing/) | Landing estática (`index.html`, `landing.css`, `landing.js`) |
| [`docs/`](docs/) | Plan de arquitectura y notas de diseño |
| [`PENDIENTES.md`](PENDIENTES.md) | Lo que falta antes de manejar datos clínicos reales |

## Requisitos

- Node.js 20 o superior
- npm

## Arrancar la aplicación

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000/login`.

Para el modo de demostración (solo datos sintéticos, nunca en producción),
genere cuentas locales con contraseñas aleatorias:

```bash
cd web
npm run seed:dev
```

## Cuentas de desarrollo

Solo para `npm run dev` con `APP_MODE=demo`. No las use en un entorno con datos reales.

`npm run seed:dev` genera las cuentas sintéticas en
`.credenciales-desarrollo.local.json` (no versionado) y muestra cada
contraseña una vez en su terminal. En producción el inicio de sesión de
demostración no existe. Ver [`docs/ENTORNOS.md`](docs/ENTORNOS.md).

## Comprobar el proyecto

```bash
cd web
npm run lint
npm run build
```

## Landing

Abre `landing/index.html` en el navegador. No comparte el servidor de Next.js.

## Base de datos más adelante

El esquema está en [`web/supabase_init.sql`](web/supabase_init.sql) (sin semillas: se retiraron en T05; use `npm run seed:demo`). Los pasos que faltan están en [`PENDIENTES.md`](PENDIENTES.md).

## Stack

Next.js 15, React 19, NextAuth v5, Tailwind CSS, Motion, Recharts y TypeScript. El estado de demostración vive en memoria (Zustand) y se reemplaza por Supabase cuando las variables de entorno están definidas.
