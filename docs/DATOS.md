# Capa de datos — PostgreSQL + Drizzle (PLT-02)

> T03 migra el **núcleo** (`tenants`, `sedes`, `usuarios`, `membresias`,
> `sesiones`). El resto de las entidades migra una por PR (pacientes → citas →
> …); cada PR deja la app compilando. Solo datos sintéticos; nunca datos
> reales de pacientes.

## 1. Mapa tabla actual → tabla nueva (spec §17.6)

| Hoy (`web/supabase_init.sql`, 22 tablas) | Destino | Nota | Estado |
|---|---|---|---|
| `empresas` | `tenants` | Se quitan `stripe_*`; `estado` con el flujo `onboarding → activo → suspendido → en_cierre → cerrado` (PLT-03). | ✅ T03 |
| `sedes` | `sedes` | `habilitacion_salud` (texto libre) → `tipo` (catálogo §10.3), `reps_codigo`; certificados a `certificados_sede` (ADM-01). | ✅ T03 (núcleo; certificados en ADM-01) |
| `usuarios` | `usuarios` + `membresias` + `perfiles_profesionales` | `registro_medico` → perfil profesional; el rol por sede vive en `membresias` (equivale a `usuarios_sedes` de la spec §17.1). | ✅ T03 (núcleo; perfiles en ADM-02) |
| — | `sesiones` | Sesiones servidoras revocables (SEG-01; la precede T05 con Argon2id/MFA). | ✅ T03 (apertura/revocación; autenticación en T05) |
| `pacientes` | `pacientes` + `representantes` + `autorizaciones` | Añadir campos de Res. 1995 art. 9; tipo `RC`. | ⏳ siguiente PR |
| `citas` (con HC embebida y factura) | `citas` + `atenciones` + `documentos_electronicos` | Separar clínica de facturación. | ⏳ siguiente PR |
| `historias_clinicas` | `atenciones` (+ adendas) | El contenido de demostración en memoria no se migra. | ⏳ siguiente PR |
| `inventario` | `productos` + `lotes` + `stock_movimientos` | Existencias por sede y lote (saldo = SUM). | ⏳ siguiente PR |
| `ordenes_trabajo`, `garantias`, `promociones` | Mismas, con estados ampliados y RLS | — | ⏳ siguiente PR |
| `caja_sesiones`, `transacciones_caja` | `caja_sesiones`, `caja_movimientos`, `arqueos` | Inmutables; diferencia = declarado − esperado. | ⏳ siguiente PR |
| `mensajes_logs` | `mensajes` | Sin contenido clínico. | ⏳ siguiente PR |
| `equipos_medicos`, `lecturas_ambientales`, `registros_*`, `concepto_sanitario`, `saneamiento_logs` | Igual, solo inserción con RLS | — | ⏳ siguiente PR |
| `proveedores`, `compras`, `configuracion_margenes` | Igual + `compra_items` | — | ⏳ siguiente PR |

## 2. Dónde vive cada cosa

| Pieza | Ruta | Notas |
|---|---|---|
| Esquema Drizzle (núcleo) | `web/db/esquema/nucleo.ts` | Español `snake_case`; UUID v4/v7 (`gen_random_uuid()`); `timestamptz`; dinero en COP enteros (`bigint`, sin dinero en el núcleo). |
| Conexión | `web/db/index.ts` | `server-only`: el build falla si se importa desde el navegador. Piscina `pg` perezosa con `DATABASE_URL` (o `DATABASE_URL_TEST` en pruebas). |
| Acciones | `web/db/nucleo.ts` | CRUD validado con Zod; exigen `tenant_id` explícito hasta que PLT-01 aporte `withTenantTx`. |
| Validación | `web/db/validacion/nucleo.ts` | DTOs de entrada/salida; nada fiscal con valor quemado. |
| Migraciones | `web/db/migrations/` | Solo `drizzle-kit generate`/`migrate`; ningún DDL manual. |
| Server Actions | `web/app/acciones/nucleo.ts` | Borde: formulario → Zod → Drizzle → revalidación. |
| Página de prueba | `web/app/nucleo` | Alta y listado de tenants persistidos (la usa la E2E). |
| Capa demo temporal | `web/lib/store.ts` | Solo memoria (Zustand); sin navegador ni SDK. Se vacía por entidad. |

## 3. Comandos

```bash
npm run db:generate   # SQL versionado desde el esquema (revisar el diff)
npm run db:migrate     # aplica `db/migrations` con DATABASE_URL (o _TEST)
npm run test:int       # integración contra PostgreSQL real (migrada en el test)
npm run test:e2e       # requiere app construida + base migrada (CI lo hace)
```

## 4. Hosting y residencia (Q-06)

TODO(Q-06): decisión de Orlando (proveedor y país) con revisión de abogado para
transferencias/subencargados; bloquea Gate A (PLT-06, PLT-07). Valor por defecto
aplicado (spec §11.9, PREGUNTAS_ABIERTAS.md): **PostgreSQL estándar + Drizzle,
sin SDK propietario**, de modo que cualquier opción sea intercambiable
(VPS propio, Supabase autoalojado u otro); destino en Colombia o país adecuado.
Sin pagos obligatorios: lo externo (facturación DIAN, pagos, WhatsApp, hosting)
va detrás de un puerto/adaptador intercambiable (regla 2).

## 5. Qué falta (no es de esta tarea)

- RLS `FORCE` + `withTenantTx` + roles `optisaas_app`/`optisaas_migrator` (PLT-01).
- Autenticación real (T05/SEG-01) y autorización por sede (SEG-02).
- Respaldos cifrados y restauración probada (PLT-07); secretos y cifrado (SEG-12).
- Alta de tenant con contrato de encargo (PLT-03); parámetros por tenant (PLT-11).
