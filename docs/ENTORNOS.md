# Entornos, datos sintéticos y retiro de credenciales (PLT-10)

> Solo datos sintéticos en desarrollo y pruebas; nunca datos reales de
> pacientes. Sin secretos en el repo. Este documento es técnico y no contiene
> texto legal.

## 1. Entornos (`APP_ENV`)

| `APP_ENV` | Uso | Datos permitidos |
|---|---|---|
| `desarrollo` | `npm run dev` local | Solo sintéticos |
| `pruebas` | CI y pruebas (Vitest, Playwright) | Solo sintéticos |
| `produccion` | Despliegue real | Solo reales del tenant, con RLS y contrato |
| `demo` | Alias histórico de `desarrollo` (compatibilidad con `APP_MODE=demo` de T03) | Solo sintéticos |

`APP_ENV` se valida con Zod al arrancar (`web/lib/entorno.ts`, ejecutada
desde `web/instrumentation.ts`). Sin variable se asume `desarrollo`, salvo
con `NODE_ENV=production`, donde se asume `produccion` (postura segura). El
servidor E2E de Playwright declara `APP_ENV=desarrollo` (jamás `produccion`):
desde T07 las cuentas locales solo se aceptan en `desarrollo` o `demo`.

## 2. Bloqueo de arranque en producción

Con `APP_ENV=produccion` la app **no arranca** si detecta cualquiera de:

1. `AUTH_SECRET` ausente, igual al valor de ejemplo de `.env.example` o de
   menos de 32 caracteres. Genere uno con `openssl rand -base64 32`.
2. Modo de demostración activo (`APP_MODE=demo`).
3. Bandera de datos sintéticos (`DATOS_SINTETICOS=true` o `SEED_DEMO=true`).
4. Adaptador de facturación simulado (`FACTURACION_ADAPTADOR=simulado`).
5. Rastros de desarrollo en disco (módulo local de credenciales o semillas).

El error lista cada motivo. Pruebas: `tests/unit/plt-10-entornos.test.ts`
(AC-PLT-10-1).

## 3. Cuentas de demostración (sin secretos en el repo)

Las contraseñas de demostración se retiraron del repo y del aviso de `/login`:

```bash
cd web
npm run seed:dev   # genera .credenciales-desarrollo.local.json (no versionado)
npm run dev        # con APP_MODE=demo en .env.local
```

`seed:dev` crea contraseñas aleatorias por máquina y las deja en dos lugares
(no versionados): la variable `CUENTAS_DEV_JSON` de `.env.local` (que la app
lee al iniciar sesión; el archivo se crea si no existe) y
`.credenciales-desarrollo.local.json` (que leen las pruebas E2E). Si el
archivo ya existe, se niega a sobrescribirlo (repita con `--forzar`). Se niega
a correr con `APP_ENV=produccion`. El inicio con esas cuentas locales solo
existe si `APP_ENV` es `desarrollo` o `demo` y el modo demo está activo
(`lib/auth/cuentas-locales.ts`). En `pruebas` y en `produccion` el inicio es
contra la tabla `usuarios` (Argon2id). En producción, además, el arranque
aborta si detecta rastros de desarrollo (`lib/entorno.ts`).

Las pruebas E2E leen ese archivo local (`tests/e2e/demo.spec.ts`); la CI lo
genera antes de `test:e2e`. Prueba: `tests/e2e/entornos.spec.ts`
(AC-PLT-10-2: el login de producción no expone contraseñas).

Las cuentas locales de `seed:dev` no pasan por MFA: no existen en `usuarios`.
Un `admin` u `optometra` de la base sí tiene que enrolar el segundo factor
antes de abrir sesión (T08).

## 3.1 Passkeys (opcional)

`WEBAUTHN_RP_ID` y `WEBAUTHN_ORIGIN` no son secretos. Si ambas están definidas,
el origen de la petición tiene que coincidir. Si faltan, fuera de producción
solo se acepta `localhost` o `127.0.0.1`. En producción sin esas variables el
endpoint de llaves de acceso no abre el relying party (no se toma el `Host`
del cliente como configuración de producción). Ver `web/.env.example`.

## 4. Semilla sintética (`seed:demo`)

```bash
# Con PostgreSQL de desarrollo o pruebas arriba:
npm run seed:demo
```

- Fuente: `web/db/seeds/sinteticos/datos.json` (2 tenants, 3 sedes,
  5 usuarios, 5 membresías).
- Cada fila lleva `es_sintetico=true`; los NIT usan el prefijo reservado
  `900.000.` y los correos el dominio reservado `@example.invalid`
  (validados antes de insertar en `db/seeds/sinteticos/reservados.ts`).
- Idempotente: `ON CONFLICT DO NOTHING`; correr dos veces deja la base igual.
- Se niega con `APP_ENV=produccion`.
- Pruebas: `tests/int/sembrar-sinteticos.test.ts` (AC-PLT-10-3).

## 5. Reglas de anonimización

Ningún dato real entra a desarrollo o pruebas (la importación de pacientes en
entornos no productivos está deshabilitada por diseño: no existe esa ruta):

1. Todo dato de prueba lleva `es_sintetico=true` y usa identificadores
   reservados (`900.000.*`, `@example.invalid`, nombres con «(demo)»).
2. Prohibido copiar volcados de producción a desarrollo/pruebas; prohibido
   reenviar correos o mensajes reales desde esos entornos.
3. Los documentos generados en modo simulado llevan la leyenda
   «SIMULACIÓN — SIN VALIDEZ FISCAL/CLÍNICA» y prefijo `SIM-` (spec §13).
4. Las futuras tablas clínicas persistirán el marcador sintético en columna
   propia; esta semilla ya lo exige por fila en origen.

## 6. Verificación del retiro (AC-PLT-10-2)

```bash
rg -n "owner123|dev-credentials" web/ supabase_init.sql
```

Debe devolver cero resultados (el comando vive solo en este documento, fuera
de `web/`, para no marcarse a sí mismo). Prueba automatizada:
`tests/unit/plt-10-entornos.test.ts`.

## 7. Valores por defecto aplicados (regla 6)

Sin decisión abierta que afecte a esta tarea salvo las ya registradas:
Q-06 (hosting y residencia: PostgreSQL estándar + Drizzle, destino Colombia o
país adecuado; ver `docs/DATOS.md`) y Q-09/Q-14 (licencias y licencia propia;
ver `THIRD_PARTY_LICENSES.md`). No se inventó ninguna norma, cifra, tarifa ni
catálogo.
