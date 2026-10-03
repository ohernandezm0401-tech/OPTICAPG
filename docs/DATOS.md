# Capa de datos — PostgreSQL + Drizzle (PLT-02)

> T03 migra el **núcleo** (`tenants`, `sedes`, `usuarios`, `membresias`,
> `sesiones`). El resto de las entidades migra una por PR (pacientes → citas →
> …); cada PR deja la app compilando. Solo datos sintéticos; nunca datos
> reales de pacientes.

## 1. Mapa tabla actual → tabla nueva (spec §17.6)

| Hoy (`web/supabase_init.sql`, 22 tablas) | Destino | Nota | Estado |
|---|---|---|---|
| `empresas` | `tenants` | Se quitan `stripe_*`; `estado` con el flujo `onboarding → activo → suspendido → en_cierre → cerrado` (PLT-03). | ✅ T03 |
| `sedes` | `sedes` | `habilitacion_salud` (texto libre) → `tipo` (catálogo §10.3), `reps_codigo`; certificados a `certificados_sede` (ADM-01). | ✅ T03 núcleo; T16 añade director, tecnovigilancia, espejo del certificado y `certificados_sede` |
| `usuarios` | `usuarios` + `membresias` + `perfiles_profesionales` + `invitaciones_usuario` | `registro_medico` → perfil profesional; el rol por sede vive en `membresias` (equivale a `usuarios_sedes` de la spec §17.1). La invitación guarda solo el hash del enlace. | ✅ T03 núcleo; T14 perfil; T17 invitación, documento, entidad, firma cifrada y estado |
| — | `sesiones` | Sesiones servidoras revocables (SEG-01). | ✅ T07 + T08 (`mfa_verificada_en`, pase de un solo uso) |
| — | `factores_totp`, `codigos_recuperacion`, `credenciales_webauthn`, `desafios_mfa` | Segundo factor (SEG-01). | ✅ T08. El secreto TOTP pasa por `ProteccionSecretoMfa` con sobre AES-256-GCM (T11). |
| — | `permisos_extra`, `intentos_autorizacion` | Excepciones de permiso e intentos denegados (SEG-02). | ✅ T09. RLS ENABLE+FORCE. El intento persistido entra en `auditoria` (T10). |
| — | `auditoria` | Bitácora append-only con hash SHA-256 por tenant (SEG-03). | ✅ T10. RLS ENABLE+FORCE. Sin UPDATE/DELETE. No guarda contenido clínico. |
| `pacientes` | `pacientes` + `representantes` + `pacientes_representantes` + `autorizaciones` | Campos de identificación del art. 9; tipos `CC, TI, RC, CE, PA, PE, PPT, NUIP`. `num_doc` cifrado (T11) y `num_doc_hash` HMAC. Autorizaciones de tratamiento (SEG-05, T15) en `autorizaciones`, textos en `textos_legales` y política en `politicas_tratamiento`. | ✅ T13 + T15 |
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
| Semillas sintéticas | `web/db/seeds/sinteticos/` | JSON + sembrador idempotente (`npm run seed:demo` para el núcleo; `sembrarDatosSinteticos` también inserta pacientes sintéticos de T13). Cuentas locales con `npm run seed:dev` (PLT-10, T05). |
| Pacientes | `web/db/esquema/pacientes.ts`, `web/db/pacientes.ts`, `web/dominio/pacientes.ts` | Recepción en `web/components/pacientes/recepcion-pacientes.tsx`. RLS en `0012_ase01_pacientes.sql`. TODO(Q-17) en `negativa_autorizacion`. |
| Sedes y certificados | `web/dominio/sedes.ts`, `web/db/sedes-habilitacion.ts`, `web/db/esquema/sedes-habilitacion.ts` | ADM-01 (T16). Extiende `sedes` (no la duplica). `certificados_sede` con RLS ENABLE+FORCE en `0015_adm01_sedes.sql`. TODO(Q-01) vencida no bloquea; TODO(Q-19) director y tecnovigilancia; TODO(Q-20) REPS libre. |
| Autorización de datos | `web/db/esquema/tratamiento.ts`, `web/db/autorizaciones.ts`, `web/dominio/autorizacion-datos.ts` | SEG-05 (T15). Plantillas versionadas, evidencia, revocatoria de contacto y política por tenant. RLS en `0014_seg05_autorizacion.sql`. Textos con rótulo de borrador jurídico. `puedeAbrirAtencion` y `puedeContactarComercialmente` quedan para las atenciones y para SEG-16. |
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

- Autorización (SEG-02, T09): la matriz vive en `web/lib/authz/matrix.ts` y las habilidades en `web/lib/authz/ability.ts`. Tablas `permisos_extra` e `intentos_autorizacion` (RLS ENABLE+FORCE, migración `0008`). Atenciones y prescripciones aún no tienen tabla ni endpoint (OPT-01, OPT-05); el contrato está en `web/lib/authz/rutas-clinicas.ts`. La autenticación de SEG-01 está en T07 y T08. La firma del documento de ejemplo (SEG-08, T14) llama `exigirMfaParaFirmarAtencion`.
- Bitácora (SEG-03, T10): tabla `auditoria` (migración `0009`), cadena SHA-256 en `web/lib/auditoria/cadena.mjs` (`node:crypto`). Verificador `npm run auditoria:verificar` (alias `audit:verify`). La lectura de HC reutilizable está en `web/lib/auditoria/lecturas.ts` (recurso de prueba `R3`; la atención real es OPT-01). Vista `/dashboard/auditoria` y CSV en `/api/auditoria/csv`. TODO(Q-07): sin plazo de conservación ni umbral de lecturas anómalas.
- Respaldos cifrados y restauración probada (PLT-07). El cifrado de anexos y secretos está en SEG-12 (T11); el respaldo del volumen sigue siendo infraestructura.
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

AES-256-GCM con `node:crypto`. Cada tenant tiene una clave de datos (DEK) en `claves_datos`; la DEK se guarda envuelta con la clave maestra (KEK) del entorno (`APP_MASTER_KEY` o `APP_MASTER_KEY_FILE`, nunca en el repo). Rotar la KEK solo reenvuelve DEK (`rotarClaveMaestra`). Rotar la DEK re-cifra por lotes (`rotarClaveDatos`) y pasa la clave anterior por `activa → rotada → retirada`.

El cifrado de disco o de volumen del servidor es responsabilidad de la infraestructura. No es una dependencia de código ni se configura aquí.

### Campos cifrados en la aplicación

El plano no se persiste. Las tablas clínicas de atención todavía no existen (OPT-01, OPT-05); el nombre del campo ya está cerrado en `web/lib/cifrado/campos.mjs` para cuando se creen.

| Campo | Dónde | Estado |
|---|---|---|
| `atenciones.contenido` | jsonb de la atención (secciones A–I de la spec §17.3) | Contrato. La tabla llega con OPT-01. |
| `atencion_diagnosticos.descripcion` | Texto del diagnóstico | Contrato. OPT-01. |
| `atencion_adendas.motivo` | Motivo de la adenda | Contrato. SEG-04 / OPT-01. |
| `atencion_adendas.nuevo_valor` | Valor nuevo de la adenda | Contrato. SEG-04 / OPT-01. |
| `prescripciones.indicaciones` | Indicaciones en texto libre | Contrato. OPT-05. |
| `anexos.contenido_cifrado` | Bytes del anexo | ✅ T11. OPT-14 añadirá el vínculo a la atención. |
| `factores_totp.secreto_protegido` | Secreto TOTP | ✅ T11. Filas en claro de T08: `npm run cifrado:recifrar-mfa` (solo desarrollo y pruebas). |
| `desafios_mfa.secreto_pendiente` | Secreto TOTP aún no confirmado | ✅ T11. El mismo script. |
| `secretos_adaptador.valor_cifrado` | Token de facturación u OAuth RDA (`adaptador` `facturacion` o `rda`) | ✅ T11. `GET/POST /api/adaptadores` solo devuelve id, adaptador, nombre y `configurado`. |

`claves_datos`, `anexos` y `secretos_adaptador` nacen con RLS `ENABLE` + `FORCE` y política `TO optisaas_app` (migración `0010`).

Buscador de secretos en el árbol versionado: `npm run secretos:buscar` (sin dependencia npm; corre en CI). No lee `.env.local`. Omite `web/.agents/` y los lockfiles.

## 9. Marco de inmutabilidad (SEG-04, T12)

Una fila firmada no se edita ni se borra. La corrección es un INSERT en `adendas`. No hay ventana de 24 horas.

| Pieza | Ruta | Notas |
|---|---|---|
| Estados | `web/lib/inmutabilidad/estados.ts` | `borrador → firmado` (registro) o `firmada` (adenda). `adendado` solo se calcula si hay adendas. TODO(Q-17). |
| Tabla | `adendas` | `entidad`, `entidad_id`, `adenda_de`, `motivo`, `contenido`, `firmado_por`, `firmado_en`, `hash_contenido`, `tenant_id`. RLS `ENABLE` + `FORCE` (migración `0011`). |
| Triggers | `aplicar_marco_inmutabilidad(regclass)` | Exige las siete columnas del marco y rechaza `UPDATE`/`DELETE`/`TRUNCATE` de lo firmado. La hora de firma es `now()` del servidor. |
| Consulta | `consulta_registro_con_adendas` | Original y adendas, con autor y hora en `America/Bogota`. |
| Verificación | `verificar_hash_contenido` y `npm run inmutabilidad:verificar` | SHA-256 del JSON de la fila sin `hash_contenido`. TODO(Q-22): no es sello de tiempo. |

Las tablas de historia clínica todavía no existen. La tarea que las cree debe ejecutar `select aplicar_marco_inmutabilidad('public.<tabla>'::regclass)` y no publicar un endpoint `DELETE`. El borrado de un borrador lo permite el trigger; hay que anotarlo en la bitácora con la acción `anular`.

`atencion_adendas.motivo` y `atencion_adendas.nuevo_valor` siguen siendo el contrato de cifrado de T11 para cuando exista la atención. El marco genérico no cifra: guarda el texto que reciba.

## 10. Firma electrónica (SEG-08, T14)

Servicio genérico. Las historias, prescripciones y consentimientos todavía no existen: el tipo persistido es `ejemplo_sintetico`.

| Pieza | Ruta | Notas |
|---|---|---|
| Reglas | `web/dominio/firma.ts` | SHA-256, MFA reciente, vigencia declarada de la tarjeta, evidencia del paciente. |
| PDF | `web/lib/firma/pdf.tsx` | `@react-pdf/renderer` MIT. TODO(Q-22): no es PDF/A. |
| Puertos | `web/lib/firma/puertos.ts` | `SelloTiempoPort`: `nulo` (sin TSA), `servidor` (hora + hash), `tsa_externa` (contrato, sin cliente de pago). |
| Almacén | `web/lib/firma/almacen.ts` | `bd_cifrada` usa `anexos` de T11. `disco_cifrado` escribe el mismo sobre en disco. |
| Tablas | `perfiles_profesionales`, `documentos_firma`, `firmas`, `codigos_otp_firma` | RLS `ENABLE`+`FORCE` (migración `0013`). `vigente_hasta` no tiene valor por defecto. |
| Pantallas | `/dashboard/optometra/firma`, `/dashboard/asesor/firma`, verificador en admin y optómetra | UI en español. El verificador compara el PDF subido con el hash del tenant. |

TODO(Q-22): valor por defecto aplicado — firma electrónica simple, hash SHA-256 y sellado propio. La TSA externa queda apagada. BORRADOR – requiere revisión jurídica.

## 11. Usuarios, rol por sede y perfil profesional (ADM-02, T17)

No se crea `usuarios_sedes`: el rol por sede sigue en `membresias`. `perfiles_profesionales` se extiende (documento, tipo, entidad, firma cifrada, estado). `invitaciones_usuario` nace con RLS `ENABLE`+`FORCE` (migración `0016`).

| Pieza | Ruta | Notas |
|---|---|---|
| Reglas | `web/dominio/usuarios-adm.ts` | Un admin no asigna `owner` ni un rol de rango mayor. El enlace vence a las 72 h (ventana operativa, no plazo legal) y es de un solo uso. |
| Correo | `web/lib/correo/puerto.ts` | `CorreoPort`. El adaptador de desarrollo registra el enlace y no lo envía. |
| Servicio | `web/db/usuarios-adm.ts` | Invitación, cambio de rol, desactivación (no borra firmas; revoca sesiones) y verificación manual del perfil. |
| Pantallas | `/dashboard/admin/usuarios`, `/invitacion/[token]` | UI en español. Sin registro profesional vigente no se muestra «Firmar como profesional». |

TODO(NV-23): no hay API oficial de tarjeta profesional. La verificación es manual. `entidad` no tiene catálogo ni valor por defecto.

## 12. Catálogos clínicos CIE-10, CUPS y glosario (OPT-10, T18)

TODO(Q-23): la licencia de CIE-10 y CUPS no está verificada. Valor por defecto aplicado: no se redistribuyen en el repositorio. Se cargan en local con el rol de administración de la base (`npm run catalogos:cargar -- archivo.csv`). La fuente prevista es el archivo que publica el Ministerio de Salud y la Protección Social a través de SISPRO; no se fija una URL ni un archivo oficial.

| Pieza | Ruta | Notas |
|---|---|---|
| Formato y búsqueda en memoria | `web/dominio/catalogos.mjs` | Encabezado `tipo,codigo,descripcion,version,vigente_desde`. |
| CSV sintético de 10 filas | `web/datos/catalogos/sintetico-prueba.csv` | Única excepción de AC-OPT-10-2. Marcado `SINTETICO`. No trae descripciones oficiales. |
| Comprobación de archivos | `npm run catalogos:check` | Falla si aparece otro CSV/XLSX/JSON de CIE-10 o CUPS. |
| Tablas | `catalogo_cie10`, `catalogo_cups`, `glosario_abreviaturas` | Migración `0017_opt10_catalogos.sql`. |
| Glosario | `/dashboard/admin/catalogos` y `/dashboard/optometra/catalogos` | Editable por el `admin` del tenant. Una abreviatura fuera de glosario avisa y no bloquea. |

`catalogo_cie10` y `catalogo_cups` no tienen `tenant_id`. El RLS por tenant no aplica: el código es el mismo para todas las ópticas. `optisaas_app` solo tiene `SELECT`. La carga hace `INSERT` con el rol de administración (dueño de `DATABASE_URL`), sin salto de RLS. `glosario_abreviaturas` sí lleva `tenant_id` y nace con RLS `ENABLE` + `FORCE` y política. `npm run db:check-rls` sigue auditando toda tabla con `tenant_id`.
