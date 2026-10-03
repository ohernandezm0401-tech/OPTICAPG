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

Con las variables de Supabase vacías, el login usa las cuentas de desarrollo de `web/lib/dev-credentials.ts`. Esas cuentas son ficticias y dejan de usarse en cuanto configuras Supabase.

## Cuentas de desarrollo

Solo para `npm run dev`. No las uses en un entorno con datos reales.

| Correo | Contraseña | Rol | A dónde entra |
| --- | --- | --- | --- |
| `admin@visiontotal.com` | `admin123` | Administrador de Ópticas Visión Total | `/dashboard/admin` |
| `carlos@visiontotal.com` | `asesor123` | Asesor, sede Norte | `/dashboard/asesor` |
| `dra.vega@visiontotal.com` | `opto123` | Optómetra, sede Norte | `/dashboard/optometra` |
| `admin@opticentro.com` | `admin123` | Administrador de OptiCentro Express | `/dashboard/admin` |
| `owner@optisaas.co` | `owner123` | Owner de la plataforma | `/dashboard/owner` |

El administrador de Visión Total puede cambiar entre Sucursal Norte y Sucursal Sur desde el encabezado. OptiCentro solo ve la sede de Medellín.

## Comprobar el proyecto

```bash
cd web
npm run lint
npm run build
```

## Landing

Abre `landing/index.html` en el navegador. No comparte el servidor de Next.js.

## Base de datos más adelante

El esquema está en [`web/supabase_init.sql`](web/supabase_init.sql). El bloque del usuario owner es una semilla de desarrollo: no lo ejecutes en producción. Los pasos que faltan están en [`PENDIENTES.md`](PENDIENTES.md).

## Stack

Next.js 15, React 19, NextAuth v5, Tailwind CSS, Motion, Recharts y TypeScript. El estado de demostración vive en memoria (Zustand) y se reemplaza por Supabase cuando las variables de entorno están definidas.
