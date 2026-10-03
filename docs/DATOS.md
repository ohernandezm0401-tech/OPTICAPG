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
| — | `sesiones` | Sesiones servidoras revocables (SEG-01). | ✅ T07 + T08 (`mfa_verificada_en`, pase de un solo uso) |
| — | `factores_totp`, `codigos_recuperacion`, `credenciales_webauthn`, `desafios_mfa` | Segundo factor (SEG-01). | ✅ T08. El secreto TOTP pasa por `proteccionEnvelope` (SEG-12, T11): la columna guarda el sobre AES-256-GCM, no el secreto. |
| — | `permisos_extra`, `intentos_autorizacion` | Excepciones de permiso e intentos denegados (SEG-02). | ✅ T09. RLS ENABLE+FORCE. El intento persistido entra en `auditoria` (T10). |
| — | `auditoria` | Bitácora append-only con hash SHA-256 por tenant (SEG-03). | ✅ T10. RLS ENABLE+FORCE. Sin UPDATE/DELETE. No guarda contenido clínico. |
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
| Entornos | `web/lib/entorno.ts` + `web/instrumentation.ts` | `APP_ENV` validado con Zod; en `produccion` el arranque aborta (PLT-10, T05; ver `docs/ENTORNOS.md`). |
| Semillas sintéticas | `web/db/seeds/sinteticos/` | JSON + sembrador idempotente (`npm run seed:demo`); cuentas locales con `npm run seed:dev` (PLT-10, T05). |
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

- Autorización (SEG-02, T09): la matriz vive en `web/lib/authz/matrix.ts` y las habilidades en `web/lib/authz/ability.ts`. Tablas `permisos_extra` e `intentos_autorizacion` (RLS ENABLE+FORCE, migración `0008`). Atenciones y prescripciones aún no tienen tabla ni endpoint (OPT-01, OPT-05); el contrato está en `web/lib/authz/rutas-clinicas.ts`. La autenticación de SEG-01 está en T07 y T08. La firma clínica que debe llamar `exigirMfaParaFirmarAtencion` llega con SEG-08.
- Bitácora (SEG-03, T10): tabla `auditoria` (migración `0009`), cadena SHA-256 en `web/lib/auditoria/cadena.mjs` (`node:crypto`). Verificador `npm run auditoria:verificar` (alias `audit:verify`). La lectura de HC reutilizable está en `web/lib/auditoria/lecturas.ts` (recurso de prueba `R3`; la atención real es OPT-01). Vista `/dashboard/auditoria` y CSV en `/api/auditoria/csv`. TODO(Q-07): sin plazo de conservación ni umbral de lecturas anómalas.
- Respaldos cifrados y restauración probada (PLT-07). El cifrado de los bytes reutiliza el módulo de SEG-12; el job de respaldo no está en esta tarea.
- Alta de tenant con contrato de encargo (PLT-03).

## 6. Aislamiento multi-tenant (PLT-01, T04)

Cada fila de negocio pertenece a un tenant y la base lo impone aunque falle
la aplicación. Solo datos sintéticos.

- Roles: `optisaas_app` (NOLOGIN, sin superusuario ni salto de RLS; lo crea
  la migración `0001_rls_aislamiento_tenant.sql`). Las migraciones corren con
  el dueño, sujeto a las políticas por el `FORCE`.
- RLS: `ENABLE` + `FORCE ROW LEVEL SECURITY` en las 5 tablas del núcleo, con
  al menos una política `TO optisaas_app` por tabla. Comparaciones en texto
  (`::text = current_setting(...)`): sin contexto o con otro tenant el
  resultado es 0 filas, nunca un error que filtre existencia.
- Regla por tabla: `usuarios`/`sesiones` exigen `tenant_id = app.tenant_id`;
  `membresias` exige además `sede_id` dentro de `app.sedes` (CSV de UUID);
  `sedes` permite INSERT por tenant (alta de sedes) pero leer/modificar/borrar
  solo filas de sedes autorizadas; `tenants` deja ver solo la fila propia.
- Contexto: `withTenantTx(ctx, fn)` (`web/db/tenant.ts`) abre transacción y
  fija `SET LOCAL app.tenant_id`, `app.usuario_id`, `app.sede_id`,
  `app.sedes`, `app.rol` (+ alias `app.role` de la spec).
- Verificación: `npm run db:check-rls` (`web/scripts/check-rls.mjs`) recorre
  `information_schema` y falla si alguna tabla con `tenant_id` no tiene RLS
  FORCE + política, o si el rol falta o tiene privilegios elevados. La CI lo
  ejecuta tras `db:migrate`; las pruebas están en
  `tests/int/aislamiento.test.ts` (matriz R/I/S) y
  `tests/unit/plt-01-guardas.test.ts` (U).
- Pendiente (no es de esta tarea): usuario de conexión de producción y
  residencia (Q-06, T05); alta de tenants por rol de aplicación (PLT-03, que
  definirá la vía elevada); CASL por sede en cada acción (SEG-02).

## 7. Parámetros, calendario hábil y tarifas (PLT-11, T06)

Los plazos y el IVA no viven en código. La siembra de un tenant
(`sembrarParametrosIniciales`) crea filas editables; no crea tarifas ni
festivos.

| Pieza | Ruta | Notas |
|---|---|---|
| Día hábil y `sumarDiasHabiles` | `web/dominio/calendario-habil.ts` | Omite sábado, domingo y festivos del conjunto. El día de partida no cuenta. |
| CSV de festivos | `web/dominio/festivos-csv.ts` + `web/db/parametros.ts` | TODO(Q-32): solo filas del CSV humano. Plantilla vacía en `web/db/festivos/plantilla.csv`. |
| Programación comercial | `web/dominio/mensajes-comerciales.ts` | Rechaza domingo y festivo. La ventana horaria de la Ley 2300 queda en SEG-16. |
| Snapshot de impuesto | `web/dominio/impuestos.ts` | Puntos básicos (`porcentaje_bp`). TODO(Q-31): sin porcentaje por defecto. |
| Tablas | `web/db/esquema/parametros.ts` | `parametros_tenant`, `festivos`, `tarifas_impuesto`, `instantaneas_impuesto_linea`, `bitacora_parametros`. |
| RLS | `web/db/migrations/0003_rls_parametros.sql` | `ENABLE` + `FORCE` y política `TO optisaas_app` en cada tabla con `tenant_id`. |

Valores iniciales (editables):

- `zona_horaria` = `America/Bogota`; `moneda` = `COP`.
- `retencion_historias_anios` = 15, rótulo «según Res. 839/2017 (verificada)».
- `plazo_conservacion_logs`, `plazo_conservacion_facturas` y `plazo_aviso_incidente` nacen en null con rótulo «provisional». TODO(Q-07): ningún número se presenta como obligación legal.
- TODO(Q-18): vigencia y cantidad de la prescripción no se siembran (las escribe el profesional en OPT-05).

La venta y el envío de mensajes todavía no existen. `cerrarLineaConImpuesto` guarda `impuesto_snapshot` y un disparador impide reescribirlo. `programarMensajeComercial(fecha, tenant)` es el predicado que usará SEG-16.

## 8. Cifrado envelope (SEG-12, T11)

AES-256-GCM con `node:crypto`. Cada tenant tiene una clave de datos (DEK) en `claves_datos`; la DEK se guarda envuelta con la clave maestra (KEK) del entorno. La KEK se lee de `APP_MASTER_KEY` o de `APP_MASTER_KEY_FILE` y no se versiona. Rotar la KEK re-envuelve la DEK y no reescribe los sobres. Rotar la DEK re-cifra por lotes (`rotarClaveDatos`).

El cifrado de volumen del disco del servidor es responsabilidad de infraestructura. Este repositorio no lo configura ni lo exige como dependencia.

Campos que la aplicación cifra antes de persistir (texto libre clínico y anexos). Los valores numéricos de refracción y el código CIE-10 no van en esta lista: OPT-01 los define como números y como catálogo. Las tablas de atención y de anexos de negocio llegan en OPT-01 y OPT-14; hasta entonces el sobre vive en `contenidos_cifrados`.

| Campo | Clase | Origen en la spec |
|---|---|---|
| `atenciones.contenido.a` | texto clínico | OPT-01 sección A (motivo y enfermedad actual) |
| `atenciones.contenido.b` | texto clínico | OPT-01 sección B (antecedentes) |
| `atenciones.contenido.f` | texto clínico | OPT-01 sección F (salud ocular, texto) |
| `atenciones.contenido.i` | texto clínico | OPT-01 sección I (conducta, plan, recomendaciones) |
| `atencion_adendas.motivo` | texto clínico | OPT-02 |
| `atencion_adendas.nuevo_valor` | texto clínico | OPT-02 |
| `remisiones.motivo` | texto clínico | OPT-16 |
| `archivo` (bytes del anexo) | anexo | OPT-14 |
| `factores_totp.secreto_protegido` y `desafios_mfa.secreto_pendiente` | secreto MFA | SEG-01, cerrado en T11 |
| `secretos_adaptador` (`facturacion` / `rda`: `token`, `client_id`, `client_secret`) | secreto de adaptador | SEG-12. `GET` y `POST /api/adaptadores` no devuelven el valor. |

`npm run secretos:buscar` recorre el repositorio con expresiones regulares propias (sin herramientas de licencia no permitida). La CI lo ejecuta.
