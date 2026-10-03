# FASES_CURSOR — tareas ejecutables por un agente de código (Cursor, Muse Spark 1.3, esfuerzo medio)

**Versión:** 1.0 · **Fecha:** 2 de octubre de 2026 (hora Colombia, UTC-5) · Parte de `ESPECIFICACION_OPTISAAS.md` (la spec). Todo en español. Nada de esto se ha lanzado en Cursor: está listo para que Orlando lo apruebe.

## 0. Cómo usar este archivo
- **Una tarea = un PR pequeño.** Cada tarea tiene un *prompt autocontenido* (bloque de texto): se pega tal cual en Cursor. Incluye las reglas fijas, el problema, qué hacer, restricciones de licencia, criterios de terminado (los criterios de aceptación de la spec, copiados) y las pruebas requeridas.
- **Costo:** las tareas son pequeñas a propósito (tamaño **S** ≈ un archivo de lógica + pruebas; **M** ≈ un módulo con migración, API, pantalla y pruebas). Para bajar tokens: abrir un agente nuevo por tarea, no pegar la spec completa (el agente la lee desde `docs/spec/` solo en las secciones que cita) y no pedir refactors amplios. Esfuerzo medio por defecto; subir a alto solo en T04 (RLS), T09 (permisos), T12 (inmutabilidad) y T41 (facturación), donde un error es caro. No hay cifras exactas de consumo por tarea: se mide con el panel de uso de Cursor tras las primeras tres.
- **Orden:** respetar «Prerrequisitos». Las tareas de una misma fase sin dependencia entre sí pueden ir en paralelo.
- **Puertas (gates):** A = T00–T33 mergeadas y checklist §16.1 de la spec firmado (más T76 si Q-05 concluye que el piloto está obligado); B = A + T34–T47 + decisión Q-03 (más T75 si Q-02 es sí); C = B + T48–T61; D = T62–T74; E = T75–T76 (solo si Q-04/Q-05 lo exigen). **Ningún dato real de pacientes antes de la puerta A.**
- **Tareas condicionadas:** T75 y T76 (F5) no se ejecutan hasta que la aplicabilidad esté confirmada; T74 es opcional (P2).
- **Verificación independiente:** `python3 _build/check_spec.py` (en el paquete de la spec) comprueba que cada funcionalidad tenga tarea, que las dependencias no tengan ciclos y que las Q citadas existan.

## 1. Reglas fijas (se repiten dentro de cada prompt)
```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.
```

## 2. Índice de tareas
| Tarea | Fase | Título | Tam. | Funcionalidades | Depende de | Decisiones abiertas |
|---|---|---|---|---|---|---|
| T00 | F0 | Reglas del agente, copia de la spec y esqueleto de licencias | S | PLT-09 | — | — |
| T01 | F0 | Resolver la auditoría de licencias del repo y fijar Node 22 | M | PLT-09 | T00 | Q-09, Q-14 |
| T02 | F0 | CI, Vitest, Playwright y PostgreSQL de pruebas | M | PLT-09, PLT-10 | T01 | Q-09 |
| T03 | F1 | Capa de datos servidor: PostgreSQL + Drizzle + migraciones (núcleo) | M | PLT-02 | T02 | Q-06 |
| T04 | F1 | Aislamiento multi-tenant con RLS FORCE y contexto por transacción | M | PLT-01 | T03 | — |
| T05 | F1 | Entornos, datos sintéticos y retiro de credenciales de desarrollo | S | PLT-10 | T03 | — |
| T06 | F1 | Parámetros por tenant, calendario hábil y tarifas | S | PLT-11 | T04 | Q-07, Q-31, Q-32 |
| T07 | F1 | Autenticación: Argon2id, sesiones revocables y AuthPort | M | SEG-01 | T04, T05 | — |
| T08 | F1 | MFA: TOTP, códigos de recuperación y passkeys opcionales | S | SEG-01 | T07 | — |
| T09 | F1 | Autorización rol × sede × recurso con CASL y pruebas tabla-dirigidas | M | SEG-02 | T07 | Q-10 |
| T10 | F1 | Bitácora de auditoría append-only con hash encadenado | M | SEG-03 | T09 | — |
| T11 | F1 | Gestión de secretos y cifrado envelope | M | SEG-12 | T03 | — |
| T12 | F1 | Marco de inmutabilidad: estados, firma y adenda | M | SEG-04 | T10 | — |
| T13 | F1 | Pacientes: identificación completa, menores y representante | M | ASE-01, SEG-06 | T04, T09, T12 | Q-17 |
| T14 | F1 | Firma electrónica, sellado de documentos y puertos de almacenamiento | M | SEG-08 | T11, T12 | Q-22 |
| T15 | F1 | Autorización de tratamiento de datos y política por tenant | M | SEG-05 | T13, T14 | Q-17 |
| T16 | F1 | Sedes, tipo de establecimiento, certificados y director científico | M | ADM-01 | T09, T06 | Q-01, Q-19, Q-20 |
| T17 | F1 | Usuarios, roles por sede y perfil profesional | M | ADM-02 | T09, T08 | — |
| T18 | F1 | Catálogos clínicos CIE-10 y CUPS por carga local y glosario | S | OPT-10 | T04 | Q-23 |
| T19 | F1 | Historia clínica de optometría: modelo y API | M | OPT-01, OPT-24 | T12, T13, T14, T18 | Q-25, Q-26 |
| T20 | F1 | Historia clínica: interfaz por secciones | M | OPT-01 | T19 | — |
| T21 | F1 | Adendas y correcciones con historial visible | S | OPT-02 | T20 | — |
| T22 | F1 | Consentimientos informados clínicos | M | OPT-04 | T15, T14, T20 | Q-17 |
| T23 | F1 | Prescripción art. 17: modelo y validación | M | OPT-05 | T19, T17, T06 | Q-18 |
| T24 | F1 | Prescripción: PDF legible y pantalla | S | OPT-05 | T23, T14 | — |
| T25 | F1 | Entrega de la HC al paciente | S | OPT-06 | T21, T14 | — |
| T26 | F1 | Habeas Data y PQR del paciente | M | SEG-07 | T15, T06 | Q-17 |
| T27 | F1 | Retención de 15 años, estados de archivo y bloqueo de eliminación | S | SEG-09 | T12, T06 | Q-07 |
| T28 | F1 | Respaldos cifrados y restauración probada | M | PLT-07 | T11, T03 | Q-07 |
| T29 | F1 | Registro de incidentes y runbook | S | SEG-11 | T10, T06 | Q-07 |
| T30 | F1 | Endurecimiento de la aplicación web | M | SEG-13 | T07 | — |
| T31 | F1 | Alta de tenant (onboarding), residencia de datos y subencargados | M | PLT-03, PLT-06 | T16, T15 | Q-06, Q-08, Q-15, Q-29 |
| T32 | F1 | Paquete documental de cumplimiento (plantillas para revisión jurídica) | S | SEG-15 | T31 | Q-15, Q-27 |
| T33 | F1 | Sistema de diseño, UX y accesibilidad | M | PLT-12 | T01 | Q-09 |
| T34 | F2 | Catálogo de productos, taxonomía y movimientos de stock por sede | M | ADM-05 | T09, T06 | Q-24, Q-28 |
| T35 | F2 | Retiro del scraping y carga de listas del proveedor | S | ADM-22 | T34 | Q-23 |
| T36 | F2 | Impuestos, numeración y documentos fiscales por sede | S | ADM-03 | T06 | Q-03, Q-31 |
| T37 | F2 | Caja: apertura, arqueo, cierre y diferencias | M | ASE-05 | T09, T03 | — |
| T38 | F2 | Cotización → orden de venta → abonos → saldo | M | ASE-03 | T34, T37 | — |
| T39 | F2 | Vínculo prescripción↔orden: verificación prescrito vs. dispensado | M | ASE-07 | T38, T24 | — |
| T40 | F2 | POS de vitrina con código de barras y pagos mixtos | M | ASE-04 | T34, T37 | — |
| T41 | F2 | FacturacionPort: simulado, asistido y proveedor HTTP genérico | M | ADM-09 | T36 | Q-03 |
| T42 | F2 | Emisión de factura o tiquete con adquirente identificado | S | ASE-06 | T41, T40, T38 | — |
| T43 | F2 | Orden de laboratorio/taller con estados, QC y bitácora | M | ASE-08 | T39 | — |
| T44 | F2 | Entrega al paciente con confirmación y recibo | S | ASE-09 | T43, T14 | — |
| T45 | F2 | Agenda de citas y agenda clínica | M | ASE-02, OPT-03 | T13, T20 | — |
| T46 | F2 | Contactología: adaptación de lentes de contacto | M | OPT-07 | T23, T22, T34 | Q-28 |
| T47 | F2 | Hand-off clínico → venta y control de calidad del optómetra | S | OPT-08, OPT-09 | T39, T43 | — |
| T48 | F3 | Planes y suscripción con pago manual (retirar Stripe) | M | PLT-04 | T09 | Q-11 |
| T49 | F3 | Panel de plataforma sin acceso a contenido | S | PLT-05 | T48, T10 | — |
| T50 | F3 | Traslados entre sedes, conteos físicos y kardex | M | ADM-06 | T34 | — |
| T51 | F3 | Lotes, vencimiento, registro INVIMA y retiros (recall) | M | ADM-07 | T50, T40 | Q-28 |
| T52 | F3 | Compras, proveedores y órdenes de compra | S | ADM-08 | T34 | — |
| T53 | F3 | Convenios, promociones y tarifas en la venta | M | ADM-12, ASE-11 | T38 | — |
| T54 | F3 | Garantías, cambios y devoluciones | M | ASE-10, ADM-11 | T44, T42 | — |
| T55 | F3 | Comisiones de asesores sin incentivar sustitución | S | ADM-13, ASE-13 | T38, T54 | — |
| T56 | F3 | Importación masiva (Excel/CSV) con declaración responsable | M | ADM-15 | T15, T13 | Q-01 |
| T57 | F3 | Cumplimiento sanitario operativo y tablero de pendientes | M | ADM-10, ADM-16 | T16, T29 | — |
| T58 | F3 | Preferencias de contacto, recordatorios y controles clínicos | M | SEG-16, ASE-12, OPT-11 | T45, T15 | Q-13 |
| T59 | F3 | Panel y KPIs por sede y consolidados (sin datos clínicos) | S | ADM-04 | T42, T40 | — |
| T60 | F3 | Cierre de contrato, exportación del tenant y disposición final | M | PLT-08, SEG-10 | T27, T28 | — |
| T61 | F3 | Acceso de terceros a la HC y traslado entre profesionales/sedes | M | SEG-14 | T25, T14 | Q-27 |
| T62 | F4 | Plantillas de examen por tipo de consulta e historial comparativo | M | OPT-15, OPT-12 | T20 | — |
| T63 | F4 | Optometría pediátrica | M | OPT-19 | T62, T13 | — |
| T64 | F4 | Baja visión | M | OPT-17 | T62, T23, T34 | — |
| T65 | F4 | Terapia visual, ortóptica y pleóptica | M | OPT-18 | T62, T41 | — |
| T66 | F4 | Adjuntos e imágenes clínicas | M | OPT-14 | T11, T30 | Q-09 |
| T67 | F4 | Remisiones, interconsultas, certificados y rol oftalmólogo | M | OPT-16, OPT-22 | T20, T14 | Q-26 |
| T68 | F4 | Tamizaje visual, brigadas y prótesis oculares | M | OPT-20, OPT-21 | T15, T23 | Q-29 |
| T69 | F4 | Validaciones de plausibilidad y alertas de calidad de datos | S | OPT-13, ASE-16 | T20, T43 | Q-21 |
| T70 | F4 | Exportación contable (Siigo/World Office configurable) | S | ADM-14 | T42 | Q-30 |
| T71 | F4 | CRM, campañas, reportes programados y API de lectura | M | ADM-17, ADM-18 | T58, T59 | — |
| T72 | F4 | Booking en línea, tienda opcional y reservas de producto | M | ADM-20, ASE-14 | T45, T15 | Q-12 |
| T73 | F4 | Taller/laboratorio como tenant o sede y pedidos externos | M | ADM-21, ASE-15 | T43 | — |
| T74 | F4 | Adaptador UBL 2.1 propio (opcional, P2) | M | ADM-09 | T41 | Q-03 |
| T75 | F5 | RIPS (Res. 948/2026) y facturación a pagadores — CONDICIONADA | M | ADM-19 | T41, T21 | Q-02, Q-04 |
| T76 | F5 | RDA/IHCE (FHIR) — CONDICIONADA | M | OPT-23 | T18, T21 | Q-05 |


## 3.0 F0 Base técnica (previa a F1)

### T00 — Reglas del agente, copia de la spec y esqueleto de licencias
**Funcionalidades:** PLT-09 · **Tamaño:** S · **Depende de:** —

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T00 — Reglas del agente, copia de la spec y esqueleto de licencias   [F0 Base técnica (previa a F1); tamaño S]
Funcionalidades de la spec: PLT-09 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).

PROBLEMA Y RESULTADO ESPERADO
El repo no tiene reglas para agentes ni la especificación dentro; el `package.json` no declara licencia y no existe inventario de terceros.

QUÉ HACER
1. Crear `docs/AGENTE_REGLAS.md` con las reglas fijas de esta tarea (copiar el bloque «Reglas fijas» de `FASES_CURSOR.md`).
2. Copiar la spec a `docs/spec/` (ESPECIFICACION_OPTISAAS.md, RUBRICA_99.md, FASES_CURSOR.md, PREGUNTAS_ABIERTAS.md).
3. Crear `THIRD_PARTY_LICENSES.md` (tabla paquete · versión · licencia SPDX · uso: prod/dev) y `docs/DECISIONES.md` (registro de ADR).
4. No cambiar código de la app ni dependencias en este PR.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Solo documentación.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-09-1: Añadir una dependencia GPL/LGPL/AGPL/BSL/SSPL a `package.json` hace fallar `licenses:check`.
- AC-PLT-09-2: `npm run licenses:check` pasa en `main` con las excepciones listadas.
- AC-PLT-09-3: Todo PR ejecuta lint + typecheck + pruebas + build.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-09: Verificación de la propia CI (PR de prueba con dependencia prohibida).
```

### T01 — Resolver la auditoría de licencias del repo y fijar Node 22
**Funcionalidades:** PLT-09 · **Tamaño:** M · **Depende de:** T00

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T01 — Resolver la auditoría de licencias del repo y fijar Node 22   [F0 Base técnica (previa a F1); tamaño M]
Funcionalidades de la spec: PLT-09 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T00.

PROBLEMA Y RESULTADO ESPERADO
La auditoría del 2-oct-2026 (459 paquetes) encontró MPL-2.0 ×4 (`lightningcss` vía Tailwind 4; `axe-core` vía `eslint-config-next`) y LGPL-3.0-or-later ×2 (`@img/sharp-libvips` vía `next`→`sharp`). Además `next.config.ts` tiene `eslint.ignoreDuringBuilds: true` y el dominio `picsum.photos`; `package.json` no declara licencia.

QUÉ HACER
1. Probar la opción estricta de Q-09: bajar a Tailwind 3.4.17 (MIT) con la configuración equivalente y verificar que `npm run build` y el aspecto de las pantallas no se rompen; probar `images.unoptimized: true` y `npm ci --omit=optional` para excluir `sharp`. Documentar en `docs/DECISIONES.md` qué funcionó y qué no.
2. Si una de las dos no es viable sin romper el build, **no** forzarla: dejar el paquete, marcarlo `PENDIENTE Q-09` en `THIRD_PARTY_LICENSES.md` y avisar en la descripción del PR.
3. Agregar `.nvmrc` con Node 22 y `engines` (`node >=22.12`); poner `"license": "UNLICENSED"` explícito con `private: true` (Q-14).
4. Quitar `eslint.ignoreDuringBuilds` (arreglar o justificar las 3 advertencias existentes) y eliminar el dominio `picsum.photos`.
5. Crear `scripts/check-licenses.mjs` que lea `package-lock.json` y falle ante cualquier licencia fuera de MIT/Apache-2.0/BSD-2/BSD-3/ISC/0BSD/MIT-0/BlueOak-1.0.0/CC0-1.0/Python-2.0/CC-BY-4.0 (solo datos) y avise (no falle) para MPL-2.0/LGPL listados como `PENDIENTE Q-09`.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: tailwindcss 3.4.17 (MIT); sin dependencias nuevas.
- No agregar herramientas de pago. No ejecutar scripts de postinstall de terceros sin revisión (`--ignore-scripts` en CI).
- Decisiones abiertas que la afectan: Q-09, Q-14. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-09-1: Añadir una dependencia GPL/LGPL/AGPL/BSL/SSPL a `package.json` hace fallar `licenses:check`.
- AC-PLT-09-2: `npm run licenses:check` pasa en `main` con las excepciones listadas.
- AC-PLT-09-3: Todo PR ejecuta lint + typecheck + pruebas + build.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-09: Verificación de la propia CI (PR de prueba con dependencia prohibida).
```

### T02 — CI, Vitest, Playwright y PostgreSQL de pruebas
**Funcionalidades:** PLT-09, PLT-10 · **Tamaño:** M · **Depende de:** T01

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T02 — CI, Vitest, Playwright y PostgreSQL de pruebas   [F0 Base técnica (previa a F1); tamaño M]
Funcionalidades de la spec: PLT-09, PLT-10 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T01.

PROBLEMA Y RESULTADO ESPERADO
No hay framework de pruebas ni CI. Se necesita una base mínima para que todos los PRs posteriores sean verificables con PostgreSQL real (sin mocks de BD).

QUÉ HACER
1. Agregar Vitest (MIT) y Playwright `@playwright/test` (Apache-2.0) con scripts `test`, `test:int`, `test:e2e`.
2. Definir un PostgreSQL de pruebas reproducible: `docker-compose.test.yml` con `postgres:16` (PostgreSQL License) y servicio equivalente en GitHub Actions; variable `DATABASE_URL_TEST`.
3. Workflow `.github/workflows/ci.yml`: `npm ci --ignore-scripts`, lint, `tsc --noEmit`, tests, `scripts/check-licenses.mjs`, build. Sin secretos de pago ni servicios de terceros.
4. Una prueba de humo de cada tipo (unitaria, integración que hace `select 1`, E2E que abre `/login`).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: vitest (MIT), @playwright/test (Apache-2.0).
- Si las condiciones gratuitas de GitHub Actions no son aceptables (Q-09), dejar también `npm run ci:local` que ejecute lo mismo.
- Decisiones abiertas que la afectan: Q-09. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-09-1: Añadir una dependencia GPL/LGPL/AGPL/BSL/SSPL a `package.json` hace fallar `licenses:check`.
- AC-PLT-09-2: `npm run licenses:check` pasa en `main` con las excepciones listadas.
- AC-PLT-09-3: Todo PR ejecuta lint + typecheck + pruebas + build.
- AC-PLT-10-1: `APP_ENV=produccion` con `AUTH_SECRET` por defecto aborta el arranque con mensaje claro.
- AC-PLT-10-2: `rg -n "owner123|dev-credentials" web/ supabase_init.sql` no devuelve resultados en la rama principal.
- AC-PLT-10-3: `seed:demo` es idempotente y no usa documentos reales (validado contra patrón reservado).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-09: Verificación de la propia CI (PR de prueba con dependencia prohibida).
- PLT-10: U (guardas de arranque), I (seed), E.
```


## 3.1 F1 Cumplimiento y datos reales

### T03 — Capa de datos servidor: PostgreSQL + Drizzle + migraciones (núcleo)
**Funcionalidades:** PLT-02 · **Tamaño:** M · **Depende de:** T02

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T03 — Capa de datos servidor: PostgreSQL + Drizzle + migraciones (núcleo)   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: PLT-02 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T02.

PROBLEMA Y RESULTADO ESPERADO
La app guarda todo en `localStorage` y `supabase_init.sql` tiene RLS solo en 7 de 22 tablas. Se debe migrar a una capa de datos que solo exista en el servidor.

QUÉ HACER
1. Instalar `drizzle-orm` (Apache-2.0), `drizzle-kit` y `pg` (MIT); configurar la conexión **solo en código de servidor** (`server-only`); migraciones versionadas en `web/db/migrations`.
2. Esquema núcleo en español `snake_case` (spec §17.1): `tenants`, `sedes`, `usuarios`, `membresias` (usuario×sede×rol), `sesiones`. UUID v4/v7, `timestamptz`, dinero entero COP.
3. Eliminar el uso del cliente de Supabase en el navegador (dejar adaptador de lectura temporal marcado `@deprecated` solo si es imprescindible para no romper pantallas).
4. Documentar en `docs/DATOS.md` el mapa tabla actual → tabla nueva (spec §17.6).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: drizzle-orm (Apache-2.0), drizzle-kit (MIT), pg (MIT), server-only (MIT).
- Decisiones abiertas que la afectan: Q-06. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-02-1: `rg "localStorage" web/` no devuelve usos que persistan pacientes, HC, bitácoras de cumplimiento, ventas ni caja (solo preferencias de UI).
- AC-PLT-02-2: `rg "supabase" web/ --glob '!*.md'` no devuelve dependencias en `package.json` ni importaciones en código cliente.
- AC-PLT-02-3: Recargar el navegador o abrir otra sesión conserva los datos creados (persistidos en BD).
- AC-PLT-02-4: `npm run build` y `npm run lint` pasan; el modo demo sigue accesible solo con `APP_MODE=demo`.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-02: I (cada acción contra BD real), E (crear paciente → recargar → persiste), P (esquemas Zod vs. tipos).
```

### T04 — Aislamiento multi-tenant con RLS FORCE y contexto por transacción
**Funcionalidades:** PLT-01 · **Tamaño:** M · **Depende de:** T03

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T04 — Aislamiento multi-tenant con RLS FORCE y contexto por transacción   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: PLT-01 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T03.

PROBLEMA Y RESULTADO ESPERADO
El aislamiento entre ópticas (tenants) debe ser verificable. Hoy solo 7 de 22 tablas tienen RLS y el rol de aplicación puede saltárselo.

QUÉ HACER
1. Rol de aplicación sin `BYPASSRLS` ni superusuario; `ENABLE` y `FORCE ROW LEVEL SECURITY` en **toda** tabla con `tenant_id`.
2. Helper `withTenantTx(ctx, fn)` que abre una transacción y ejecuta `SET LOCAL app.tenant_id`, `app.user_id`, `app.sede_id`, `app.rol`; las políticas leen `current_setting('app.tenant_id', true)`.
3. Prueba generada: recorre `information_schema` y falla si alguna tabla con `tenant_id` no tiene RLS FORCE y política.
4. Pruebas con dos tenants: lectura/escritura cruzada devuelve 0 filas / error; sin contexto no se ve nada.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: Sin dependencias nuevas.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-01-1: Dadas dos empresas A y B, una sesión de A que ejecuta `SELECT`/`UPDATE`/`DELETE` sobre cada tabla de negocio no afecta ni ve filas de B (0 filas, sin error de permisos que filtre existencia).
- AC-PLT-01-2: Un script de verificación (`npm run db:check-rls`) falla en CI si existe una tabla con columna `tenant_id` sin RLS `FORCE` o sin política.
- AC-PLT-01-3: Con el rol `optisaas_app` sin variables `app.*` establecidas, toda consulta devuelve 0 filas.
- AC-PLT-01-4: Un usuario con sedes {S1} no lee ni escribe filas de S2 del mismo tenant en tablas por sede.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-01: R (matriz × tablas), I (PostgreSQL real vía contenedor de servicio), S (IDOR por `id` de otro tenant en cada endpoint).
```

### T05 — Entornos, datos sintéticos y retiro de credenciales de desarrollo
**Funcionalidades:** PLT-10 · **Tamaño:** S · **Depende de:** T03

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T05 — Entornos, datos sintéticos y retiro de credenciales de desarrollo   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: PLT-10 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T03.

PROBLEMA Y RESULTADO ESPERADO
Hay credenciales de demo públicas en el README, una semilla SQL de `owner` con contraseña de prueba y datos ficticios mezclables con reales.

QUÉ HACER
1. Variable `APP_ENV` (`desarrollo|pruebas|produccion`) validada con Zod al arrancar; en `produccion` la app **no arranca** si detecta `dev-credentials`, semillas o bandera de datos sintéticos.
2. Mover las semillas a `db/seeds/sinteticos/` con marcador `es_sintetico=true` por fila; borrar del repo la semilla SQL del owner y las contraseñas del README (reemplazar por `npm run seed:dev` que genera contraseñas aleatorias locales).
3. Un documento `docs/ENTORNOS.md`: ningún dato real entra a desarrollo/pruebas; reglas de anonimización.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: zod (MIT).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-10-1: `APP_ENV=produccion` con `AUTH_SECRET` por defecto aborta el arranque con mensaje claro.
- AC-PLT-10-2: `rg -n "owner123|dev-credentials" web/ supabase_init.sql` no devuelve resultados en la rama principal.
- AC-PLT-10-3: `seed:demo` es idempotente y no usa documentos reales (validado contra patrón reservado).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-10: U (guardas de arranque), I (seed), E.
```

### T06 — Parámetros por tenant, calendario hábil y tarifas
**Funcionalidades:** PLT-11 · **Tamaño:** S · **Depende de:** T04

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T06 — Parámetros por tenant, calendario hábil y tarifas   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: PLT-11 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T04.

PROBLEMA Y RESULTADO ESPERADO
Plazos legales (15 días hábiles, términos de Habeas Data), vigencias e IVA no pueden estar fijos en código ni inventarse.

QUÉ HACER
1. Tabla `parametros_tenant` (zona horaria `America/Bogota` por defecto, moneda COP, retención en años, plazos) y tabla `festivos(anio, fecha, nombre, fuente)`.
2. Función `sumarDiasHabiles(fecha, n, tenant)` que usa la tabla de festivos; carga de festivos **desde un CSV que aporta un humano** (Q-32): el agente no inventa festivos.
3. Tarifas de impuesto como tabla parametrizable **sin valor por defecto** (Q-31).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Retención 15 años como valor inicial editable y rotulado «según Res. 839/2017 (verificada)»; plazos de logs y facturas rotulados «provisional» (Q-07).
- Decisiones abiertas que la afectan: Q-07, Q-31, Q-32. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-11-1: Cambiar el IVA de una categoría no altera ventas ya cerradas (se guarda snapshot en la línea).
- AC-PLT-11-2: Una fecha en domingo/festivo es rechazada por el programador de mensajes comerciales.
- AC-PLT-11-3: No existe `0.19` ni `IVA_RATE` literal en código de dominio.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-11: U, I, P.
```

### T07 — Autenticación: Argon2id, sesiones revocables y AuthPort
**Funcionalidades:** SEG-01 · **Tamaño:** M · **Depende de:** T04, T05

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T07 — Autenticación: Argon2id, sesiones revocables y AuthPort   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-01 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T04, T05.

PROBLEMA Y RESULTADO ESPERADO
NextAuth v5 está en beta y hay credenciales de desarrollo; se necesita autenticación robusta y reemplazable.

QUÉ HACER
1. Interfaz `AuthPort` en `web/lib/auth/` con implementación Auth.js v5 (ISC; versión beta documentada) y dejar la alternativa Better Auth (MIT) anotada en `docs/DECISIONES.md`.
2. Contraseñas con Argon2id (`@node-rs/argon2`, MIT), política de longitud y lista de contraseñas prohibidas; límite de intentos y bloqueo progresivo.
3. Sesiones en BD (revocables) con rotación, cierre de todas las sesiones y expiración por inactividad.
4. Retirar el login de `dev-credentials` (queda solo en `desarrollo`).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: next-auth 5.0.0-beta.x (ISC), @node-rs/argon2 (MIT).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-01-2: Cinco contraseñas erróneas bloquean la cuenta 15 min y se registra el evento; la respuesta no distingue «usuario inexistente».
- AC-SEG-01-3: Una sesión revocada deja de ser válida en ≤ 1 petición.
- AC-SEG-01-5: No existen contraseñas en texto plano en repositorio, logs ni respuestas de API.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-01: U (hash, TOTP), I, S (fuerza bruta, enumeración, fijación de sesión), E.
```

### T08 — MFA: TOTP, códigos de recuperación y passkeys opcionales
**Funcionalidades:** SEG-01 · **Tamaño:** S · **Depende de:** T07

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T08 — MFA: TOTP, códigos de recuperación y passkeys opcionales   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: SEG-01 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T07.

PROBLEMA Y RESULTADO ESPERADO
El personal clínico accede a datos sensibles; se exige segundo factor para roles clínicos y administrativos.

QUÉ HACER
1. TOTP con `otplib` (MIT), 10 códigos de recuperación de un solo uso (hash), enrolamiento con QR.
2. Passkeys/WebAuthn opcionales con `@simplewebauthn/server` (MIT).
3. MFA obligatoria para `admin`, `optometra`, `director_cientifico`; configurable para `asesor`.
4. Eventos de seguridad (alta, baja, fallo) hacia el registro de auditoría cuando exista (T10) o a una tabla temporal con migración posterior.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: otplib (MIT), @simplewebauthn/server (MIT).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-01-1: Un usuario `optometra` sin MFA configurada no puede completar el login (se le obliga a enrolarla).
- AC-SEG-01-4: Firmar una atención con MFA > 10 min exige reautenticación.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-01: U (hash, TOTP), I, S (fuerza bruta, enumeración, fijación de sesión), E.
```

### T09 — Autorización rol × sede × recurso con CASL y pruebas tabla-dirigidas
**Funcionalidades:** SEG-02 · **Tamaño:** M · **Depende de:** T07

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T09 — Autorización rol × sede × recurso con CASL y pruebas tabla-dirigidas   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-02 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T07.

PROBLEMA Y RESULTADO ESPERADO
`middleware.ts` deja al `owner` entrar a todas las secciones y no hay matriz de permisos formal.

QUÉ HACER
1. Implementar la matriz de la spec §4 con `@casl/ability` (MIT): roles `admin`, `asesor`, `optometra`, `director_cientifico`, `auxiliar_clinico`, `soporte_plataforma`, `owner_plataforma`; alcance por sede.
2. Guardas en **servidor** (rutas API, server actions, componentes servidor); `middleware.ts` solo redirige a login, no autoriza datos.
3. El `owner_plataforma` **no** accede a contenido de tenants (PLT-05); `admin` no lee HC (Q-10).
4. Prueba generada desde la matriz: para cada rol×recurso×acción×sede propia/ajena verifica permitido/denegado en la capa de aplicación y, cuando hay tabla, en la BD (RLS).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: @casl/ability (MIT).
- Decisiones abiertas que la afectan: Q-10. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-02-1: El test generado desde `matrix.ts` ejecuta ≥ 1 caso por celda y todos pasan.
- AC-SEG-02-2: Un `asesor` que llama `GET /api/atenciones/:id` recibe 403 y un `GET /api/prescripciones/:id` recibe el DTO reducido sin diagnóstico.
- AC-SEG-02-3: Intentar editar una prescripción como `asesor` devuelve 403 y registra el intento.
- AC-SEG-02-4: Cambiar a una sede no autorizada devuelve 403.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-02: R (generada), S (IDOR, escalada horizontal/vertical), U.
```

### T10 — Bitácora de auditoría append-only con hash encadenado
**Funcionalidades:** SEG-03 · **Tamaño:** M · **Depende de:** T09

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T10 — Bitácora de auditoría append-only con hash encadenado   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-03 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T09.

PROBLEMA Y RESULTADO ESPERADO
No hay registro de quién vio o cambió datos clínicos. Debe ser a prueba de manipulación y cubrir lecturas.

QUÉ HACER
1. Tabla `auditoria` append-only (sin UPDATE/DELETE por permisos y triggers), con `hash_previo` y `hash` (SHA-256) por tenant; verificador `npm run auditoria:verificar`.
2. Middleware de servidor que registra acción, recurso, id, usuario, sede, IP y resultado, **incluyendo lecturas de HC**; nunca guarda el contenido clínico, solo referencias.
3. Vista de consulta para el rol autorizado; exportación CSV con hash.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: `node:crypto` (sin dependencias).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-03-1: `UPDATE auditoria …` y `DELETE FROM auditoria` fallan para todos los roles de la aplicación.
- AC-SEG-03-2: Abrir una HC genera exactamente un evento `lectura` con actor y sede; abrirla de nuevo genera otro.
- AC-SEG-03-3: Alterar manualmente una fila (como superusuario en la prueba) hace que `audit:verify` informe la posición exacta rota.
- AC-SEG-03-4: Ningún evento contiene diagnóstico, valores de fórmula ni texto libre clínico.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-03: I, S, P (cadena con 10 000 eventos), R.
```

### T11 — Gestión de secretos y cifrado envelope
**Funcionalidades:** SEG-12 · **Tamaño:** M · **Depende de:** T03

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T11 — Gestión de secretos y cifrado envelope   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-12 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T03.

PROBLEMA Y RESULTADO ESPERADO
Datos clínicos y adjuntos deben cifrarse y los secretos no pueden vivir en el repo (hoy hubo una URL y clave de Supabase en un script).

QUÉ HACER
1. Módulo `cifrado`: clave maestra por entorno (variable/archivo fuera del repo), claves de datos por tenant, AES-256-GCM con `node:crypto`, rotación de clave con re-cifrado por lotes.
2. Campos cifrados a nivel de aplicación para texto libre clínico y adjuntos (definir lista en `docs/DATOS.md`); `.env.example` sin valores reales; `gitleaks`-equivalente propio: script que busca patrones de secretos en el repo (sin herramientas con licencia no permitida).
3. Pruebas: ida y vuelta, detección de alteración (tag GCM), rotación.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: `node:crypto`.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-12-1: Un anexo cifrado leído sin la clave correcta falla; con clave correcta devuelve el original (hash igual).
- AC-SEG-12-2: Rotar la KEK no cambia los datos descifrados.
- AC-SEG-12-3: Ningún endpoint devuelve secretos de adaptadores.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-12: U, I, S.
```

### T12 — Marco de inmutabilidad: estados, firma y adenda
**Funcionalidades:** SEG-04 · **Tamaño:** M · **Depende de:** T10

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T12 — Marco de inmutabilidad: estados, firma y adenda   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-04 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T10.

PROBLEMA Y RESULTADO ESPERADO
Una HC no puede modificarse tras firmada (Res. 1995/1999). El código actual deja editar en la UI durante 24 h, regla que no está en las normas leídas.

QUÉ HACER
1. Máquina de estados reutilizable `borrador → firmado → (adendado)`; triggers de BD que impiden UPDATE/DELETE de filas firmadas y permiten solo INSERT de adendas.
2. Tabla genérica `adendas(entidad, entidad_id, motivo, contenido, firmado_por, firmado_en)`.
3. Eliminar la ventana de 24 h de la UI.
4. Pruebas de BD: intento de UPDATE/DELETE sobre fila firmada falla incluso con rol de aplicación.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: Sin dependencias nuevas.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-04-1: Tras firmar, `UPDATE historias… SET …` falla con error de BD (probado también con el rol de aplicación).
- AC-SEG-04-2: Crear una adenda deja el original intacto, vincula `adenda_de` y la vista muestra ambos con autor y hora.
- AC-SEG-04-3: El `hash_contenido` recalculado coincide con el almacenado; si se altera la fila (prueba con superusuario), el verificador lo detecta.
- AC-SEG-04-4: No existe endpoint `DELETE` sobre registros firmados.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-04: I, P (propiedad: ninguna secuencia de operaciones modifica un firmado), S.
```

### T13 — Pacientes: identificación completa, menores y representante
**Funcionalidades:** ASE-01, SEG-06 · **Tamaño:** M · **Depende de:** T04, T09, T12

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T13 — Pacientes: identificación completa, menores y representante   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: ASE-01, SEG-06 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T04, T09, T12.

PROBLEMA Y RESULTADO ESPERADO
Los pacientes viven en `localStorage`; `tipoDocumento` no incluye RC; faltan datos exigidos por la Res. 1995/1999 art. 9 y el manejo de menores.

QUÉ HACER
1. Tablas `pacientes`, `representantes`, `pacientes_representantes` (spec §17.2) con tipos de documento CC, TI, RC, CE, PA, PE, PPT, NUIP y verificación de duplicados.
2. Pantallas de recepción: búsqueda por documento/nombre, alta, edición con historial de cambios.
3. Menores: representante legal obligatorio, edad calculada, mayoría de edad advertida (sin cambiar de estado automáticamente sin revisión).
4. Migrar los datos del `localStorage` de demostración a semillas sintéticas; **eliminar** el almacenamiento de pacientes en el navegador.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: zod (MIT), react-hook-form (MIT).
- Decisiones abiertas que la afectan: Q-17. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-01-1: No se guarda un paciente sin los campos obligatorios del art. 9 (los no aplicables se marcan «No aplica» explícito).
- AC-ASE-01-2: Registrar el mismo tipo+número de documento dos veces advierte y ofrece abrir el existente.
- AC-ASE-01-3: `num_hc` es único por tenant y no se reutiliza al fusionar duplicados.
- AC-ASE-01-4: Un `asesor` no puede leer diagnósticos al abrir el paciente (prueba R).
- AC-SEG-06-1: No se puede guardar un paciente de 10 años sin representante.
- AC-SEG-06-2: Un paciente que cumple 18 años deja de requerir representante pero conserva el histórico de quién firmó.
- AC-SEG-06-3: Mensajes comerciales a un menor son rechazados por el motor de mensajería.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-01: U, I, R, E, A.
- SEG-06: U (edad en fecha límite), I, E.
```

### T14 — Firma electrónica, sellado de documentos y puertos de almacenamiento
**Funcionalidades:** SEG-08 · **Tamaño:** M · **Depende de:** T11, T12

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T14 — Firma electrónica, sellado de documentos y puertos de almacenamiento   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-08 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T11, T12.

PROBLEMA Y RESULTADO ESPERADO
Las HC, prescripciones y consentimientos deben quedar firmados con integridad verificable.

QUÉ HACER
1. Servicio de firma electrónica simple (usuario autenticado con MFA + `signature_pad` MIT para firma manuscrita del paciente) que produce hash SHA-256 del PDF y registra evidencias.
2. PDF con `@react-pdf/renderer` (MIT); PDF/A **no garantizado** (Q-22), documentarlo.
3. `AlmacenamientoPort` con implementación en disco/BD cifrados; `SelloTiempoPort` con implementación nula y contrato para una TSA opcional (de pago, no obligatoria).
4. Verificador público interno: sube un PDF y valida su hash contra el registro.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: @react-pdf/renderer (MIT), signature_pad (MIT).
- Decisiones abiertas que la afectan: Q-22. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-08-1: Un PDF sellado, modificado un byte, falla la verificación (`verify` devuelve `false`).
- AC-SEG-08-2: Firmar sin MFA reciente o sin tarjeta profesional vigente se rechaza.
- AC-SEG-08-3: La evidencia de firma del paciente (trazo, hora, IP, OTP) se exporta junto al documento.
- AC-SEG-08-4: El PDF contiene nombre completo, registro profesional, fecha y hora (Res. 1995 art. 5).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-08: U (hash/verify), I, S, E.
```

### T15 — Autorización de tratamiento de datos y política por tenant
**Funcionalidades:** SEG-05 · **Tamaño:** M · **Depende de:** T13, T14

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T15 — Autorización de tratamiento de datos y política por tenant   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-05 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T13, T14.

PROBLEMA Y RESULTADO ESPERADO
La HC es dato sensible (Ley 1581 art. 5); se necesita autorización previa, expresa e informada, con finalidades separadas.

QUÉ HACER
1. Plantillas versionadas de autorización (texto en **borrador para abogado**) con finalidades separadas: tratamiento clínico, contacto, y cada finalidad opcional.
2. Registro por paciente: versión del texto, fecha, medio, firma/aceptación; revocatoria; negativa registrada sin bloquear la atención (Q-17).
3. Política de tratamiento por tenant editable, con aviso de privacidad generado.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Ningún texto legal se presenta como definitivo: rotular «Borrador sujeto a revisión jurídica».
- Decisiones abiertas que la afectan: Q-17. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-05-1: Registrar un paciente exige capturar la autorización (otorgada/negada) antes de abrir una atención clínica, salvo urgencia marcada (Ley 1581 art. 10, a validar por abogado).
- AC-SEG-05-2: La casilla de contacto comercial está desmarcada por defecto y no bloquea el registro.
- AC-SEG-05-3: Se puede exportar la evidencia de una autorización (texto exacto, hash, hora, medio).
- AC-SEG-05-4: Cambiar el texto crea una nueva versión sin alterar autorizaciones pasadas.
- AC-SEG-05-5: Revocar una autorización de contacto detiene todo envío comercial (SEG-16).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-05: U, I, E, A.
```

### T16 — Sedes, tipo de establecimiento, certificados y director científico
**Funcionalidades:** ADM-01 · **Tamaño:** M · **Depende de:** T09, T06

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T16 — Sedes, tipo de establecimiento, certificados y director científico   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: ADM-01 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T09, T06.

PROBLEMA Y RESULTADO ESPERADO
Cada sede debe declarar su tipo (D. 1030/2007), certificado, vencimiento y director científico.

QUÉ HACER
1. Tabla `sedes` con `tipo_establecimiento` (óptica sin consultorio, óptica con consultorio, taller óptico, laboratorio), `certificado_numero`, `certificado_vence`, `director_cientifico_id`, `responsable_tecnovigilancia_id` (Q-19), código REPS (campo libre, Q-20).
2. Alertas de vencimiento a 90/60/30 días y estado `vigente|por_vencer|vencido`; sede vencida muestra banner y **no bloquea** la atención clínica (Q-01).
3. Los módulos habilitados dependen del tipo de sede (spec §10.3).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-01, Q-19, Q-20. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-01-1: Al crear una sede `optica_sin_consultorio` sin certificado de dispensación o sin director científico, el sistema la marca «incompleta» y muestra qué falta.
- AC-ADM-01-2: Un certificado que vence en 29 días genera alerta de 30 días, y vencido genera alerta roja (prueba con reloj simulado).
- AC-ADM-01-3: Asignar un cuarto establecimiento al mismo director produce advertencia bloqueante con override de `admin` auditado.
- AC-ADM-01-4: Sede `laboratorio_oftalmico` no ofrece POS al público.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-01: U (fechas), I, E, R.
```

### T17 — Usuarios, roles por sede y perfil profesional
**Funcionalidades:** ADM-02 · **Tamaño:** M · **Depende de:** T09, T08

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T17 — Usuarios, roles por sede y perfil profesional   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: ADM-02 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T09, T08.

PROBLEMA Y RESULTADO ESPERADO
La prescripción exige profesional con registro; el admin gestiona usuarios por sede.

QUÉ HACER
1. CRUD de usuarios con invitación por correo (enlace de un solo uso) y asignación de rol por sede (`membresias`).
2. Perfil profesional del optómetra: nombre, documento, tarjeta profesional, entidad, firma digitalizada; vigencia y estado; verificación **manual** (no se asume API oficial: NV-23).
3. Desactivar usuario no borra su rastro; cierre de sus sesiones.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-02-1: Un `optometra` sin registro profesional no ve el botón «firmar»; la API devuelve 403.
- AC-ADM-02-2: Un `admin` no puede crear otro `owner` ni escalarse permisos.
- AC-ADM-02-3: Desactivar un usuario mantiene visibles sus firmas históricas.
- AC-ADM-02-4: El registro y cambio de rol aparecen en la bitácora.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-02: R, I, S, E.
```

### T18 — Catálogos clínicos CIE-10 y CUPS por carga local y glosario
**Funcionalidades:** OPT-10 · **Tamaño:** S · **Depende de:** T04

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T18 — Catálogos clínicos CIE-10 y CUPS por carga local y glosario   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: OPT-10 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T04.

PROBLEMA Y RESULTADO ESPERADO
El diagnóstico se codifica con CIE-10 y los procedimientos con CUPS; su licencia/uso no está verificada (Q-23), por eso no se redistribuyen en el repo.

QUÉ HACER
1. Tabla `catalogo_cie10` / `catalogo_cups` y comando `npm run catalogos:cargar -- archivo.csv` con validación de formato; el repo incluye solo un CSV **sintético de 10 filas** para pruebas.
2. Búsqueda con autocompletado por código/descripción; glosario de abreviaturas ópticas (AV, OD, OI, DIP, ADD…) editable.
3. Documentar fuente oficial y que la licencia está pendiente (Q-23).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-23. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-10-1: Buscar «H52.1» devuelve el código y su descripción oficial cargada.
- AC-OPT-10-2: El repositorio no contiene archivos de catálogo con licencia no verificada (comprobación en CI por lista de archivos).
- AC-OPT-10-3: Una abreviatura fuera de glosario genera advertencia no bloqueante.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-10: U, I.
```

### T19 — Historia clínica de optometría: modelo y API
**Funcionalidades:** OPT-01, OPT-24 · **Tamaño:** M · **Depende de:** T12, T13, T14, T18

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T19 — Historia clínica de optometría: modelo y API   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: OPT-01, OPT-24 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T12, T13, T14, T18.

PROBLEMA Y RESULTADO ESPERADO
La HC está embebida en `Cita` y los valores ópticos son `string`. Debe separarse en entidades tipadas y firmadas.

QUÉ HACER
1. Entidades `atenciones`, `examenes_optometricos`, `diagnosticos`, `planes_manejo` (spec §17.3) con valores ópticos numéricos validados por Zod (esfera, cilindro, eje, adición, agudeza, DIP).
2. Estados `borrador → firmado`; solo `optometra` firma; auxiliar solo borrador (Q-26); campo `modalidad` (`presencial` por defecto) reservado sin UI de telemedicina (Q-25, OPT-24).
3. API de servidor con autorización CASL y auditoría de lectura; retirar `Cita.hc` embebida.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: zod (MIT).
- Decisiones abiertas que la afectan: Q-25, Q-26. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-01-2: Tras firmar, cualquier intento de modificar el contenido (UI, API, SQL de aplicación) falla.
- AC-OPT-01-4: El diagnóstico exige código CIE-10 del catálogo cargado (OPT-10); no se acepta texto libre como diagnóstico principal.
- AC-OPT-01-5: Un `asesor` y un `admin` (sin rol clínico) reciben 403 al abrir la atención.
- AC-OPT-01-6: Cada apertura genera evento de lectura en bitácora.
- AC-OPT-01-7: Una atención de paciente menor sin representante no se puede iniciar.
- AC-OPT-24-1: El campo `modalidad` existe, es `presencial` por defecto y no hay UI de telemedicina.
- AC-OPT-24-2: Ninguna ruta ni menú menciona teleconsulta.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-01: U (esquemas Zod, rangos), I (triggers de inmutabilidad), R, E (flujo completo con teclado), A.
- OPT-24: I.
```

### T20 — Historia clínica: interfaz por secciones
**Funcionalidades:** OPT-01 · **Tamaño:** M · **Depende de:** T19

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T20 — Historia clínica: interfaz por secciones   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: OPT-01 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T19.

PROBLEMA Y RESULTADO ESPERADO
El optómetra necesita capturar la HC de forma ordenada y rápida.

QUÉ HACER
1. Formulario por secciones (motivo, antecedentes, agudeza, refracción, queratometría, salud ocular, diagnóstico, plan) con guardado de borrador automático y validación inline.
2. Firma con confirmación y resumen previo; tras firmar la pantalla es de solo lectura.
3. Accesibilidad: navegación por teclado, etiquetas, contraste (prueba axe en CI).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: react-hook-form (MIT), zod (MIT).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-01-1: Un optómetra con registro vigente crea una atención, la autoguarda, la firma y la ve con folio, hora de servidor y sello.
- AC-OPT-01-3: Valores fuera de límite de captura (p. ej. eje 200) son rechazados con mensaje; cambiar el límite es configuración, no código.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-01: U (esquemas Zod, rangos), I (triggers de inmutabilidad), R, E (flujo completo con teclado), A.
```

### T21 — Adendas y correcciones con historial visible
**Funcionalidades:** OPT-02 · **Tamaño:** S · **Depende de:** T20

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T21 — Adendas y correcciones con historial visible   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: OPT-02 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T20.

PROBLEMA Y RESULTADO ESPERADO
Corregir un error en una HC firmada se hace con una nota nueva, nunca editando (Res. 1995/1999).

QUÉ HACER
1. Botón «Agregar adenda» con motivo obligatorio; la HC original y las adendas se ven en línea de tiempo.
2. Cada adenda firmada y auditada; PDF de HC incluye adendas.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-02-1: Corregir un valor de refracción crea adenda y conserva el original visible.
- AC-OPT-02-2: La vista de historial muestra quién, cuándo y por qué.
- AC-OPT-02-3: La adenda aparece en la copia entregada al paciente (OPT-06).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-02: I, E, P.
```

### T22 — Consentimientos informados clínicos
**Funcionalidades:** OPT-04 · **Tamaño:** M · **Depende de:** T15, T14, T20

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T22 — Consentimientos informados clínicos   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: OPT-04 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T15, T14, T20.

PROBLEMA Y RESULTADO ESPERADO
Procedimientos (adaptación de lentes de contacto, dilatación, etc.) requieren consentimiento informado versionado.

QUÉ HACER
1. Plantillas de consentimiento por procedimiento (texto **borrador para abogado**) con versión; firma del paciente o representante; anexo con hash vinculado a la atención.
2. No se puede iniciar un procedimiento que requiere consentimiento sin uno vigente.
3. Revocatoria registrada sin borrar el original.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-17. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-04-1: No se puede iniciar adaptación de LC sin consentimiento firmado de la plantilla vigente.
- AC-OPT-04-2: Cambiar el texto crea nueva versión; consentimientos anteriores conservan su versión.
- AC-OPT-04-3: El PDF del consentimiento queda anexo a la atención con hash y firma.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-04: I, E, A.
```

### T23 — Prescripción art. 17: modelo y validación
**Funcionalidades:** OPT-05 · **Tamaño:** M · **Depende de:** T19, T17, T06

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T23 — Prescripción art. 17: modelo y validación   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: OPT-05 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T19, T17, T06.

PROBLEMA Y RESULTADO ESPERADO
El art. 17 del Decreto 1030/2007 fija 15 elementos mínimos de la fórmula; sin ellos no se puede entregar una prescripción legal. **Esta tarea adelanta OPT-05 a F1 respecto al informe de producto** (el vínculo con la orden sigue en F2).

QUÉ HACER
1. Entidad `prescripciones` con: prestador/profesional, dirección, teléfono/correo; lugar y fecha; paciente y documento; **número de HC**; tipo de usuario; dispositivo prescrito; agudeza visual; distancia pupilar; **vigencia** (obligatoria **sin valor por defecto**, Q-18); cantidad **en números y letras**; firma y registro profesional (spec OPT-05 y F-02, F-03).
2. Validación Zod + CHECK en BD: no se puede firmar si falta cualquiera de los elementos; solo `optometra`/`oftalmologo` con registro vigente.
3. Numeración consecutiva por tenant; inmutable al firmar; corrección con nueva prescripción que referencia la anterior.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: zod (MIT).
- Decisiones abiertas que la afectan: Q-18. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-05-1: Intentar firmar una prescripción sin alguno de los campos del art. 17 (prueba por cada campo) falla indicando cuál falta.
- AC-OPT-05-2: La cantidad se guarda en número y en letras y coinciden (validación).
- AC-OPT-05-3: Tras firmar, la prescripción es inmutable; la corrección crea una nueva y marca la anterior `sustituida`.
- AC-OPT-05-5: Un `asesor` no puede crearla ni modificarla (403).
- AC-OPT-05-6: La prescripción incluye número de HC y vigencia; una vencida no es dispensable (ASE-07).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-05: U (validador por campo), I, R, E (PDF), P.
```

### T24 — Prescripción: PDF legible y pantalla
**Funcionalidades:** OPT-05 · **Tamaño:** S · **Depende de:** T23, T14

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T24 — Prescripción: PDF legible y pantalla   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: OPT-05 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T23, T14.

PROBLEMA Y RESULTADO ESPERADO
La fórmula debe entregarse por escrito, legible, en castellano y sin siglas fuera de lex artis (D. 1030 art. 16).

QUÉ HACER
1. PDF A4 con todos los elementos, cantidad en números y letras, QR/URL de verificación del hash, sin enmendaduras.
2. Pantalla de prescripción en la HC; botón de descarga/impresión; auditoría de la emisión.
3. Prueba que compara el PDF generado con una lista de los 15 elementos.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: @react-pdf/renderer (MIT).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-05-4: El PDF contiene los 15 elementos, el nombre completo y registro del prescriptor, y su hash coincide con el almacenado.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-05: U (validador por campo), I, R, E (PDF), P.
```

### T25 — Entrega de la HC al paciente
**Funcionalidades:** OPT-06 · **Tamaño:** S · **Depende de:** T21, T14

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T25 — Entrega de la HC al paciente   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: OPT-06 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T21, T14.

PROBLEMA Y RESULTADO ESPERADO
El paciente tiene derecho a una copia de su HC (Ley 1751 art. 10; Res. 1995).

QUÉ HACER
1. Solicitud y entrega de copia electrónica gratuita en PDF con hash y registro de entrega; verificación de identidad.
2. Terceros: no desde el sistema hasta SEG-14 (F3).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-06-1: La copia de una HC con 3 atenciones y 1 adenda contiene todo en orden cronológico con sellos.
- AC-OPT-06-2: El hash del PDF queda registrado y la entrega auditada.
- AC-OPT-06-3: No se entrega a terceros sin base registrada.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-06: I, E.
```

### T26 — Habeas Data y PQR del paciente
**Funcionalidades:** SEG-07 · **Tamaño:** M · **Depende de:** T15, T06

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T26 — Habeas Data y PQR del paciente   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-07 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T15, T06.

PROBLEMA Y RESULTADO ESPERADO
El titular puede consultar, actualizar, rectificar y suprimir sus datos; hay plazos en días hábiles (Ley 1581 arts. 14-15).

QUÉ HACER
1. Registro de solicitudes (consulta, reclamo, rectificación, supresión, revocatoria) con radicado y contador de días hábiles (T06).
2. Supresión **bloqueada** para datos que están en retención de HC (SEG-09); responde con la causa legal.
3. Alertas por vencimiento de plazo y bitácora de respuesta.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-17. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-07-1: Radicar un reclamo calcula `vence_en` = 15 días hábiles (excluye sábados, domingos y festivos cargados) y muestra el semáforo.
- AC-SEG-07-2: A las 48 h hábiles sin marcar, aparece alerta; al marcar, el dato muestra «reclamo en trámite».
- AC-SEG-07-3: Una rectificación genera adenda y deja el original visible.
- AC-SEG-07-4: La respuesta queda archivada con fecha y quién respondió.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-07: U (cálculo de días hábiles con casos límite), I, E.
```

### T27 — Retención de 15 años, estados de archivo y bloqueo de eliminación
**Funcionalidades:** SEG-09 · **Tamaño:** S · **Depende de:** T12, T06

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T27 — Retención de 15 años, estados de archivo y bloqueo de eliminación   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: SEG-09 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T12, T06.

PROBLEMA Y RESULTADO ESPERADO
Res. 839/2017: conservación mínima de 15 años; el sistema no debe permitir borrar HC antes.

QUÉ HACER
1. Estados `activo → archivo_gestion → archivo_central → disposicion_final_pendiente`; fechas calculadas desde el último folio.
2. Prohibición técnica de DELETE en tablas clínicas (trigger) y bloqueo de purga antes del plazo.
3. La política aplica también si el tenant contrata profesionales sin ser prestador (E-04).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-07. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-09-1: Para un paciente cuya última atención fue hace 14 años y 11 meses, intentar eliminar su HC falla con error auditado.
- AC-SEG-09-2: El estado de archivo se calcula correctamente en los límites (5 años, 15 años) (prueba con fechas fijas).
- AC-SEG-09-3: Una marca de retención duplicada impide marcar la HC como elegible a los 15 años.
- AC-SEG-09-4: La política muestra en pantalla qué plazos están ✅ verificados y cuáles ⚠️ son provisionales.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-09: U (cálculo), I (triggers), P.
```

### T28 — Respaldos cifrados y restauración probada
**Funcionalidades:** PLT-07 · **Tamaño:** M · **Depende de:** T11, T03

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T28 — Respaldos cifrados y restauración probada   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: PLT-07 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T11, T03.

PROBLEMA Y RESULTADO ESPERADO
Sin respaldos probados no hay continuidad ni cumplimiento de retención.

QUÉ HACER
1. Script `backup` con `pg_dump` + cifrado AES-256-GCM, destino configurable (disco/almacenamiento compatible), verificación de integridad.
2. Prueba automatizada de restauración en una BD limpia y comparación de conteos; RPO/RTO como parámetros (Q-07), sin valor asumido.
3. Runbook `docs/RESPALDOS.md`.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-07. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-07-1: `npm run backup:run` en el entorno de prueba produce un archivo cifrado que no es legible sin la clave.
- AC-PLT-07-2: `npm run backup:restore-test` restaura en una BD temporal y reporta OK con conteos coincidentes.
- AC-PLT-07-3: Un respaldo con un byte alterado falla la verificación de autenticidad (GCM).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-07: I, S (manipulación del archivo), prueba de restauración en CI sobre datos sintéticos.
```

### T29 — Registro de incidentes y runbook
**Funcionalidades:** SEG-11 · **Tamaño:** S · **Depende de:** T10, T06

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T29 — Registro de incidentes y runbook   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: SEG-11 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T10, T06.

PROBLEMA Y RESULTADO ESPERADO
Hay obligación de reportar incidentes a la SIC en 15 días hábiles (Circular Única) y de avisar a la óptica afectada.

QUÉ HACER
1. Tabla `incidentes` (detección, alcance, tenants afectados, contención, aviso a la óptica, reporte SIC, cierre) con cronómetro de días hábiles.
2. Plantillas de aviso (borrador para abogado) y runbook `docs/INCIDENTES.md`.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-07. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-11-1: Crear un incidente calcula la fecha límite de 15 días hábiles y genera alertas a T-5, T-2 y T-0.
- AC-SEG-11-2: Marcar tenants afectados dispara una notificación interna al admin de cada uno y queda en bitácora.
- AC-SEG-11-3: Existe `docs/seguridad/RUNBOOK_INCIDENTES.md` con roles y pasos.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-11: U (plazos), I, E.
```

### T30 — Endurecimiento de la aplicación web
**Funcionalidades:** SEG-13 · **Tamaño:** M · **Depende de:** T07

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T30 — Endurecimiento de la aplicación web   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: SEG-13 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T07.

PROBLEMA Y RESULTADO ESPERADO
No hay cabeceras de seguridad ni limitación de tasa; la app maneja datos sensibles.

QUÉ HACER
1. Cabeceras (CSP estricta sin `unsafe-inline` si es viable, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), implementadas en `next.config`/middleware sin librerías con licencias no permitidas.
2. CSRF en mutaciones, validación de entradas con Zod, límite de tasa por IP/usuario, subida de archivos con tipos y tamaños permitidos.
3. Pruebas de seguridad: inyección SQL, IDOR entre tenants, XSS reflejado, acceso sin sesión.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-13-1: Un escáner de cabeceras interno (prueba) confirma CSP, HSTS y demás en todas las rutas.
- AC-SEG-13-2: Una petición mutante sin token/origen válido devuelve 403.
- AC-SEG-13-3: Subir un `.html` renombrado a `.png` es rechazado.
- AC-SEG-13-4: Un enlace de descarga expirado devuelve 410.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-13: S (OWASP: XSS, CSRF, IDOR, subida), U.
```

### T31 — Alta de tenant (onboarding), residencia de datos y subencargados
**Funcionalidades:** PLT-03, PLT-06 · **Tamaño:** M · **Depende de:** T16, T15

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T31 — Alta de tenant (onboarding), residencia de datos y subencargados   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: PLT-03, PLT-06 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T16, T15.

PROBLEMA Y RESULTADO ESPERADO
Crear una óptica cliente exige contrato de encargo, verificación regulatoria y registro de dónde viven sus datos.

QUÉ HACER
1. Asistente de alta: razón social, NIT, tipo de persona (Q-15), sedes, tipo de establecimiento, aceptación del contrato de encargo (borrador).
2. Inventario de subencargados y país de alojamiento (Q-06) visible en el panel; checklist RNBD (C-09).
3. No se activan módulos clínicos sin checklist mínimo completo.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-06, Q-08, Q-15, Q-29. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-03-1: Un tenant en `onboarding` recibe 403 al intentar crear un paciente.
- AC-PLT-03-2: La aceptación del contrato se puede exportar con versión, hash y sello de tiempo.
- AC-PLT-03-3: Una sede `optica_sin_consultorio` no muestra el menú de HC ni permite `POST /atenciones`.
- AC-PLT-03-4: Sin código REPS en una sede con consultorio, el módulo clínico permanece inactivo y se explica el motivo.
- AC-PLT-06-1: Activar un adaptador sin país declarado está bloqueado.
- AC-PLT-06-2: Activar uno con país fuera de la lista exige confirmación documentada y queda marcado «requiere revisión jurídica».
- AC-PLT-06-3: El inventario exporta a PDF/CSV.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-03: E (flujo completo), I (bloqueos por estado), R.
- PLT-06: U, I, E.
```

### T32 — Paquete documental de cumplimiento (plantillas para revisión jurídica)
**Funcionalidades:** SEG-15 · **Tamaño:** S · **Depende de:** T31

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T32 — Paquete documental de cumplimiento (plantillas para revisión jurídica)   [F1 Cumplimiento y datos reales; tamaño S]
Funcionalidades de la spec: SEG-15 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T31.

PROBLEMA Y RESULTADO ESPERADO
El cumplimiento exige documentos (política de tratamiento, contrato de encargo, análisis de riesgos, procedimiento de incidentes) que el abogado debe revisar.

QUÉ HACER
1. Plantillas Markdown/PDF generadas desde el sistema, todas rotuladas «BORRADOR – no usar sin revisión jurídica».
2. Checklist de controles implementados generado desde el código; búsqueda automatizada en CI que prohíbe afirmar certificaciones (ISO/IEC 27001, etc.) inexistentes.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-15, Q-27. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-15-1: Existen los 9 documentos con el encabezado de borrador y una tabla «Pendiente de abogado».
- AC-SEG-15-2: El checklist de controles se genera desde el código (qué controles P0 están implementados) y se incluye en el análisis de riesgos.
- AC-SEG-15-3: Ninguna plantilla afirma una certificación (ISO/IEC 27001 u otra) que el producto no tenga (búsqueda automatizada de términos en CI).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-15: Revisión de contenido (checklist) y enlace roto en CI.
```

### T33 — Sistema de diseño, UX y accesibilidad
**Funcionalidades:** PLT-12 · **Tamaño:** M · **Depende de:** T01

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T33 — Sistema de diseño, UX y accesibilidad   [F1 Cumplimiento y datos reales; tamaño M]
Funcionalidades de la spec: PLT-12 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T01.

PROBLEMA Y RESULTADO ESPERADO
Las pantallas actuales no tienen un sistema de diseño ni pruebas de accesibilidad.

QUÉ HACER
1. Componentes base (botón, campo, tabla, diálogo, aviso) en `web/components/ui` con Tailwind; tema en español de Colombia (es-CO), formato de moneda COP y fecha dd/mm/aaaa.
2. Prueba de accesibilidad con `axe-core` (MPL-2.0), **excepción ya aceptada por Orlando solo para pruebas** (informe legal §5); `@axe-core/playwright` también es MPL-2.0 y no está nombrado en esa excepción: confirmar en Q-09 antes de instalarlo; si no se confirma, usar `axe-core` directamente dentro de Playwright o una lista de revisión manual. Nunca se distribuye con la app.
3. Navegación por teclado y estados de carga/errores consistentes.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: axe-core (MPL-2.0, excepción aceptada solo para pruebas); @axe-core/playwright pendiente de confirmar (Q-09).
- Decisiones abiertas que la afectan: Q-09. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-12-1: Las pantallas principales de cada rol pasan `axe` sin violaciones «serious/critical» (prueba A).
- AC-PLT-12-2: Todo el flujo «crear HC → firmar → generar fórmula» se completa solo con teclado (prueba E).
- AC-PLT-12-3: En 360 px de ancho no hay desbordamiento horizontal en POS ni en HC.
- AC-PLT-12-4: Una prueba E2E cuenta las acciones de los flujos con meta de UX y falla si superan la meta; el resultado queda en el PR.
- AC-PLT-12-5: Existe `docs/UX_VALIDACION.md` con el protocolo de prueba con usuarios reales (lo ejecuta una persona, no el agente) y un registro de resultados vacío.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-12: A (axe en Playwright, MPL-2.0 solo pruebas), E (teclado), capturas visuales de referencia.
```


## 3.2 F2 Flujo clínico→venta

### T34 — Catálogo de productos, taxonomía y movimientos de stock por sede
**Funcionalidades:** ADM-05 · **Tamaño:** M · **Depende de:** T09, T06

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T34 — Catálogo de productos, taxonomía y movimientos de stock por sede   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: ADM-05 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T09, T06.

PROBLEMA Y RESULTADO ESPERADO
El stock actual es único (sin sede) y el catálogo no distingue clases ni exigencias regulatorias.

QUÉ HACER
1. Taxonomía de 13 categorías (spec §10.2) con banderas: `requiere_prescripcion`, `dispositivo_medico`, `clase`, `registro_invima`, `retractable`; gafas de sol y productos de salud visual como categorías configurables con advertencia (Q-24).
2. Tablas `productos`, `variantes`, `existencias(sede)`, `movimientos_stock` (el saldo se deriva de movimientos); códigos de barras.
3. Pantallas de catálogo y ajuste de stock con motivo.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-24, Q-28. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-05-1: El saldo de un producto es siempre la suma de sus movimientos (prueba de propiedad con operaciones aleatorias).
- AC-ADM-05-2: Un lente marcado «bajo prescripción» no puede añadirse a una venta sin prescripción (cubre ASE-07).
- AC-ADM-05-3: Un producto con lote vencido no se puede vender y aparece en alerta.
- AC-ADM-05-4: Existen productos de ejemplo de **todas** las categorías del §10.2 en el seed demo.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-05: U, I, P, E.
```

### T35 — Retiro del scraping y carga de listas del proveedor
**Funcionalidades:** ADM-22 · **Tamaño:** S · **Depende de:** T34

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T35 — Retiro del scraping y carga de listas del proveedor   [F2 Flujo clínico→venta; tamaño S]
Funcionalidades de la spec: ADM-22 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T34.

PROBLEMA Y RESULTADO ESPERADO
`scripts/scrape-lentes.js` extrae de un tercero con términos de uso sin revisar (Q-23) y `plans-config.ts` ofrece `inventoryScraping`.

QUÉ HACER
1. Eliminar el script, el JSON scrapeado y cualquier referencia de `plans-config`/UI; documentar el riesgo en `docs/DECISIONES.md`.
2. Formulario/CSV simple para cargar listas de precios del proveedor con trazabilidad (fuente, fecha, quién); la importación masiva llega en F3 (T56).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-23. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-22-1: `rg scrape web/ scripts/` no devuelve resultados.
- AC-ADM-22-2: Cada producto importado conserva el origen de su dato.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-22: I.
```

### T36 — Impuestos, numeración y documentos fiscales por sede
**Funcionalidades:** ADM-03 · **Tamaño:** S · **Depende de:** T06

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T36 — Impuestos, numeración y documentos fiscales por sede   [F2 Flujo clínico→venta; tamaño S]
Funcionalidades de la spec: ADM-03 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T06.

PROBLEMA Y RESULTADO ESPERADO
Cada sede necesita sus tarifas, resoluciones de numeración y documentos fiscales.

QUÉ HACER
1. Tablas de tarifas (sin valor por defecto, Q-31), prefijos y rangos de numeración con vigencia y alertas de agotamiento.
2. Declaración «obligado a facturar electrónicamente» por tenant asistida, **sin asumir** que toda óptica lo es (Q-03).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-03, Q-31. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-03-1: Sin configuración fiscal completa, el botón «emitir factura» está deshabilitado con explicación.
- AC-ADM-03-2: El consecutivo no supera el rango; al 90 % del rango se alerta.
- AC-ADM-03-3: Cambiar la tarifa de una categoría no modifica ventas cerradas.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-03: U, I.
```

### T37 — Caja: apertura, arqueo, cierre y diferencias
**Funcionalidades:** ASE-05 · **Tamaño:** M · **Depende de:** T09, T03

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T37 — Caja: apertura, arqueo, cierre y diferencias   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: ASE-05 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T09, T03.

PROBLEMA Y RESULTADO ESPERADO
Sin control de caja no se concilian ventas y abonos.

QUÉ HACER
1. Sesión de caja por sede/usuario: apertura con base, movimientos, arqueo ciego, cierre con diferencia y justificación; reapertura solo con permiso y auditoría.
2. Dinero en enteros COP; una sola caja abierta por usuario.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-05-1: No se puede vender con la caja cerrada.
- AC-ASE-05-2: El cierre calcula esperado = base + ingresos efectivo − egresos y muestra la diferencia.
- AC-ASE-05-3: Una diferencia sobre el umbral requiere aprobación del admin.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-05: U, I, E.
```

### T38 — Cotización → orden de venta → abonos → saldo
**Funcionalidades:** ASE-03 · **Tamaño:** M · **Depende de:** T34, T37

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T38 — Cotización → orden de venta → abonos → saldo   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: ASE-03 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T34, T37.

PROBLEMA Y RESULTADO ESPERADO
El flujo de venta de lentes es: cotizar, ordenar, abonar y saldar; hoy no hay máquina de estados.

QUÉ HACER
1. Estados `cotizacion → orden → con_abono → saldada → entregada | anulada`; abonos con medio de pago; descuentos manuales con motivo.
2. Los convenios y promociones de ADM-12 se aplican después (F3).
3. Cálculo exacto en enteros con redondeo documentado; pruebas de propiedades.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: Sin dependencias nuevas.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-03-1: Una orden con total 1.190.000 y abonos 400.000 + 300.000 muestra saldo 490.000.
- AC-ASE-03-2: Entregar con saldo > 0 pide autorización del `admin` con MFA y queda en bitácora.
- AC-ASE-03-3: Anular una orden con abonos crea los movimientos/nota crédito correspondientes y no borra nada.
- AC-ASE-03-4: Una orden con lentes oftálmicos no se puede confirmar sin prescripción verificada.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-03: U (cálculos, redondeo), I, E.
```

### T39 — Vínculo prescripción↔orden: verificación prescrito vs. dispensado
**Funcionalidades:** ASE-07 · **Tamaño:** M · **Depende de:** T38, T24

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T39 — Vínculo prescripción↔orden: verificación prescrito vs. dispensado   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: ASE-07 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T38, T24.

PROBLEMA Y RESULTADO ESPERADO
El art. 18 del D. 1030/2007 obliga al dispensador a verificar la prescripción antes de entregar un dispositivo bajo prescripción.

QUÉ HACER
1. Una orden con lentes oftálmicos exige prescripción **firmada, vigente y de profesional con registro**; compara parámetros ordenados vs. prescritos y marca `con_diferencias` (requiere aprobación del profesional).
2. El asesor no edita valores de la prescripción (solo lectura); checklist de información al usuario obligatorio antes de entregar.
3. Pruebas: prescripción vencida, de usuario sin registro, ausente, con diferencias.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-07-1: Confirmar una orden con lentes oftálmicos sin prescripción válida devuelve error con el motivo (prueba con prescripción vencida, de usuario sin registro y ausente).
- AC-ASE-07-2: Si el lente ordenado difiere del prescrito, la orden queda `con_diferencias` y no avanza sin aprobación del profesional.
- AC-ASE-07-3: Un `asesor` no puede editar valores de la prescripción (API 403, UI solo lectura).
- AC-ASE-07-4: No se puede marcar «entregada» sin checklist de información al usuario.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-07: U (reglas), I, R, E.
```

### T40 — POS de vitrina con código de barras y pagos mixtos
**Funcionalidades:** ASE-04 · **Tamaño:** M · **Depende de:** T34, T37

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T40 — POS de vitrina con código de barras y pagos mixtos   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: ASE-04 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T34, T37.

PROBLEMA Y RESULTADO ESPERADO
La venta de mostrador (monturas, accesorios, líquidos, gafas de lectura y de sol) necesita rapidez.

QUÉ HACER
1. Lector USB (teclado) y cámara con `html5-qrcode` (Apache-2.0) o `@zxing/library` (Apache-2.0); pagos mixtos; cambio; atajos de teclado.
2. Productos bajo prescripción redirigen al flujo de orden; FEFO en productos con lote; descuento de stock y movimiento de caja en una transacción.
3. Impresión: PDF 80 mm con `@react-pdf/renderer` y, opcional, servicio local con `node-thermal-printer` (ISC).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: html5-qrcode (Apache-2.0), @zxing/library (Apache-2.0), node-thermal-printer (ISC).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-04-1: Escanear un código existente agrega el ítem en < 300 ms (medido en prueba E con BD local).
- AC-ASE-04-2: Pago mixto efectivo+tarjeta suma el total exacto y calcula el cambio.
- AC-ASE-04-3: Intentar vender un lente oftálmico en POS rápido redirige a orden.
- AC-ASE-04-4: La venta descuenta el stock y crea transacción de caja con una sola transacción de BD (atomicidad probada con fallo inyectado).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-04: U, I (atomicidad), E, A.
```

### T41 — FacturacionPort: simulado, asistido y proveedor HTTP genérico
**Funcionalidades:** ADM-09 · **Tamaño:** M · **Depende de:** T36

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T41 — FacturacionPort: simulado, asistido y proveedor HTTP genérico   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: ADM-09 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T36.

PROBLEMA Y RESULTADO ESPERADO
La factura electrónica DIAN choca con la regla «sin servicios de pago obligatorios». Se resuelve con un puerto intercambiable; no se inventan APIs gratuitas (Q-03).

QUÉ HACER
1. Interfaz `FacturacionPort` (emitir, consultar, anular/nota crédito, reintentar) y tabla `documentos_electronicos` con estados `pendiente → enviado → aceptado | rechazado | simulado`.
2. Adaptadores: `simulado` (por defecto, con leyenda visible «NO ES FACTURA ELECTRÓNICA»), `asistido_dian` (prepara datos y los muestra para facturar manualmente en la solución gratuita de la DIAN, sin integración automática ⚠️) y `proveedor_http` genérico configurable (el proveedor lo paga el cliente final).
3. Cola de reintentos con `pg-boss` (MIT; Node ≥ 22.12) y modo degradado si falla el proveedor.
4. Nada de claves de proveedor en el repo.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: pg-boss (MIT).
- Decisiones abiertas que la afectan: Q-03. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-09-1: Con el adaptador simulado, una venta genera un documento con leyenda de simulación y estado `simulado`; con `APP_ENV=produccion` el arranque falla si ese adaptador está activo.
- AC-ADM-09-2: No existe endpoint para editar o borrar un documento `aceptado`; la devolución crea nota crédito vinculada al CUFE original.
- AC-ADM-09-3: Una línea con texto que contiene «miopía», «OD», «esfera» o un nº de HC es rechazada por el validador.
- AC-ADM-09-4: Sustituir el adaptador `simulado` por un adaptador de prueba (contrato HTTP simulado) no requiere cambios en `ventas/*` (prueba de contrato del puerto).
- AC-ADM-09-5: Una caída del proveedor deja el documento `pendiente_transmision` y se reintenta con backoff (pg-boss).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-09: U (validador, numeración), I (nota crédito), prueba de contrato del puerto (mismo test para todos los adaptadores), E.
```

### T42 — Emisión de factura o tiquete con adquirente identificado
**Funcionalidades:** ASE-06 · **Tamaño:** S · **Depende de:** T41, T40, T38

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T42 — Emisión de factura o tiquete con adquirente identificado   [F2 Flujo clínico→venta; tamaño S]
Funcionalidades de la spec: ASE-06 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T41, T40, T38.

PROBLEMA Y RESULTADO ESPERADO
El cierre de la venta debe dejar un documento fiscal con el adquirente correcto.

QUÉ HACER
1. Paso `documentada` de la venta: selección de adquirente (consumidor final o identificado), emisión por `FacturacionPort`, estado visible y reimpresión.
2. Rechazo del proveedor muestra motivo y permite corregir/reintentar; el estado `simulado` se distingue de `aceptado` y no permite imprimir sin leyenda.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-06-1: Una venta sin adquirente válido no emite FEV (solo consumidor final cuando la norma lo permita).
- AC-ASE-06-2: Rechazo del proveedor muestra motivo y permite corregir/reintentar.
- AC-ASE-06-3: El estado `simulado` se distingue visualmente de `aceptado` y no permite imprimir sin la leyenda de simulación.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-06: E, I.
```

### T43 — Orden de laboratorio/taller con estados, QC y bitácora
**Funcionalidades:** ASE-08 · **Tamaño:** M · **Depende de:** T39

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T43 — Orden de laboratorio/taller con estados, QC y bitácora   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: ASE-08 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T39.

PROBLEMA Y RESULTADO ESPERADO
Los lentes se fabrican en taller o laboratorio y requieren trazabilidad y control de calidad.

QUÉ HACER
1. Estados `pendiente → en_taller → control_calidad → listo | rehacer`; datos de montaje (altura, DIP, tipo de montura), bitácora por cambio de estado.
2. QC con comparación de potencias medidas vs. prescritas y tolerancias parametrizables (sin valores inventados: el usuario las define).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-08-1: Una OT no puede saltar de `por_enviar` a `entregada`; transiciones inválidas devuelven error.
- AC-ASE-08-2: Cada transición queda en `ot_eventos` con usuario y hora de servidor.
- AC-ASE-08-3: Una OT atrasada aparece en la alerta de la sede.
- AC-ASE-08-4: El QC del optómetra requiere registrar la lensometría medida y compara con lo prescrito (informativo, no diagnóstico).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-08: U (máquina de estados), I, E.
```

### T44 — Entrega al paciente con confirmación y recibo
**Funcionalidades:** ASE-09 · **Tamaño:** S · **Depende de:** T43, T14

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T44 — Entrega al paciente con confirmación y recibo   [F2 Flujo clínico→venta; tamaño S]
Funcionalidades de la spec: ASE-09 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T43, T14.

PROBLEMA Y RESULTADO ESPERADO
Entregar sin checklist ni firma deja sin evidencia la dispensación.

QUÉ HACER
1. Checklist de información al usuario (D. 1030 art. 18), firma del paciente y recibo; cálculo de fecha de garantía; bloqueo de entrega con checklist incompleto.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-09-1: No se registra entrega sin firma/confirmación del recibidor.
- AC-ASE-09-2: Tras la entrega se calcula la fecha de garantía legal/comercial y se muestra en el recibo.
- AC-ASE-09-3: Entregar con el checklist de información al usuario incompleto está bloqueado.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-09: E, I.
```

### T45 — Agenda de citas y agenda clínica
**Funcionalidades:** ASE-02, OPT-03 · **Tamaño:** M · **Depende de:** T13, T20

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T45 — Agenda de citas y agenda clínica   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: ASE-02, OPT-03 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T13, T20.

PROBLEMA Y RESULTADO ESPERADO
No hay agenda con estados ni conciliación entre recepción y consultorio.

QUÉ HACER
1. Agenda por sede/profesional con estados `programada → confirmada → en_sala → en_atencion → atendida | no_asistio | cancelada`; evitar solapes.
2. Vista del optómetra con sala de espera y acceso a la HC solo del paciente en atención.
3. `react-big-calendar` (MIT) o tabla propia.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: react-big-calendar (MIT).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-02-1: Dos citas del mismo profesional no pueden solaparse (restricción de BD con rango).
- AC-ASE-02-2: La vista de agenda del asesor no devuelve campos clínicos.
- AC-ASE-02-3: Cada cambio de estado registra hora y usuario.
- AC-OPT-03-1: Iniciar atención desde la agenda enlaza `cita_id` y cambia el estado a `en_consulta`.
- AC-OPT-03-2: Un profesional no ve citas de otro profesional salvo permiso de la sede.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-02: U, I (restricción de exclusión), E.
- OPT-03: E, R.
```

### T46 — Contactología: adaptación de lentes de contacto
**Funcionalidades:** OPT-07 · **Tamaño:** M · **Depende de:** T23, T22, T34

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T46 — Contactología: adaptación de lentes de contacto   [F2 Flujo clínico→venta; tamaño M]
Funcionalidades de la spec: OPT-07 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T23, T22, T34.

PROBLEMA Y RESULTADO ESPERADO
La adaptación de lentes de contacto es un servicio clínico con seguimiento y exige consentimiento y prescripción propias.

QUÉ HACER
1. Ficha de adaptación (curva base, diámetro, material, régimen de reemplazo, solución recomendada) con control de seguimiento.
2. Prescripción de LC con sus propios parámetros; consentimiento vigente obligatorio; lentes de contacto y líquidos como productos de clase regulada (D. 4725/2005 ⚠️ clase a confirmar por el usuario).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-28. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-07-1: No se puede registrar un lente definitivo sin al menos un lente de prueba o justificación.
- AC-OPT-07-2: La solución recomendada es un producto con registro y lote vigentes.
- AC-OPT-07-3: Los controles generan citas sugeridas (OPT-11).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-07: I, E.
```

### T47 — Hand-off clínico → venta y control de calidad del optómetra
**Funcionalidades:** OPT-08, OPT-09 · **Tamaño:** S · **Depende de:** T39, T43

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T47 — Hand-off clínico → venta y control de calidad del optómetra   [F2 Flujo clínico→venta; tamaño S]
Funcionalidades de la spec: OPT-08, OPT-09 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T39, T43.

PROBLEMA Y RESULTADO ESPERADO
El optómetra recomienda y el asesor vende; la calidad se revisa en conjunto.

QUÉ HACER
1. Recomendación del optómetra visible al asesor sin exponer el contenido clínico (solo lo necesario).
2. Revisión de calidad del optómetra sobre el trabajo de taller y concepto técnico para garantías (el enlace con ASE-10 llega en F3).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-08-1: La API del asesor no devuelve diagnóstico al leer la recomendación.
- AC-OPT-08-2: Al crear la orden se precarga la recomendación y se enlaza.
- AC-OPT-09-1: Un QC rechazado devuelve la OT a `reproceso`.
- AC-OPT-09-2: El concepto técnico queda enlazado a la garantía y a la OT.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-08: R, I, E.
- OPT-09: I, E.
```


## 3.3 F3 Operación multisede

### T48 — Planes y suscripción con pago manual (retirar Stripe)
**Funcionalidades:** PLT-04 · **Tamaño:** M · **Depende de:** T09

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T48 — Planes y suscripción con pago manual (retirar Stripe)   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: PLT-04 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T09.

PROBLEMA Y RESULTADO ESPERADO
`plans-config.ts` cobra $500.000 / $1.500.000 / $4.500.000 COP/mes con Stripe, muy por encima del mercado; Stripe cobra comisión.

QUÉ HACER
1. Planes parametrizables según la hipótesis de la spec §12.2 (Esencial/Clínica/Cadena, sede adicional, prueba 15 días, anual = 10 meses por 12) **pendientes de Q-11**; límites aplicados por servidor.
2. `PagosPlataformaPort` con `pago_manual` (soporte registra el pago) por defecto y adaptador Stripe opcional deshabilitado; retirar la dependencia `stripe` del bundle por defecto.
3. Mora ⇒ solo lectura + exportación; eliminar el límite de historias por mes.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-11. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-04-1: `rg stripe web/ -i` solo aparece en el adaptador opcional y en la documentación.
- AC-PLT-04-2: Un tenant `suspendida` puede leer y exportar HC pero recibe 403 en cualquier escritura nueva.
- AC-PLT-04-3: El owner registra un pago manual y el estado pasa a `activa` con auditoría.
- AC-PLT-04-4: Superar el límite de sedes impide crear una sede nueva con mensaje claro y no afecta datos existentes.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-04: U (reglas de límites), I, E (registro de pago y suspensión).
```

### T49 — Panel de plataforma sin acceso a contenido
**Funcionalidades:** PLT-05 · **Tamaño:** S · **Depende de:** T48, T10

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T49 — Panel de plataforma sin acceso a contenido   [F3 Operación multisede; tamaño S]
Funcionalidades de la spec: PLT-05 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T48, T10.

PROBLEMA Y RESULTADO ESPERADO
El dueño del SaaS necesita ver tenants, planes y salud, sin leer datos de pacientes.

QUÉ HACER
1. Panel con tenants, planes, uso agregado y estado de respaldos; sin consultas a tablas clínicas; acceso de soporte con «break glass» por tiempo limitado, auditado y con aprobación del tenant.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-05-1: Una sesión `owner` recibe 403 en cualquier endpoint de contenido (R1-R6).
- AC-PLT-05-2: Un acceso break-glass sin justificación se rechaza; uno aprobado expira y la lectura posterior da 403.
- AC-PLT-05-3: Cada lectura durante break-glass aparece en la bitácora del tenant con `actor=soporte`.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-05: R, I, E.
```

### T50 — Traslados entre sedes, conteos físicos y kardex
**Funcionalidades:** ADM-06 · **Tamaño:** M · **Depende de:** T34

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T50 — Traslados entre sedes, conteos físicos y kardex   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: ADM-06 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T34.

PROBLEMA Y RESULTADO ESPERADO
El stock hoy no se distingue por sede.

QUÉ HACER
1. Traslado `solicitado → enviado → recibido` con diferencias; conteo físico con ajuste auditado; kardex por producto/sede.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-06-1: Un traslado despachado y recibido deja stock origen −n, destino +n y 2 movimientos enlazados.
- AC-ADM-06-2: Un conteo con diferencia no cambia stock hasta aprobación; luego genera movimiento de ajuste.
- AC-ADM-06-3: El kardex de un producto reproduce exactamente el saldo.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-06: I, P, E.
```

### T51 — Lotes, vencimiento, registro INVIMA y retiros (recall)
**Funcionalidades:** ADM-07 · **Tamaño:** M · **Depende de:** T50, T40

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T51 — Lotes, vencimiento, registro INVIMA y retiros (recall)   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: ADM-07 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T50, T40.

PROBLEMA Y RESULTADO ESPERADO
Líquidos y lentes de contacto tienen lote y vencimiento; los retiros del mercado requieren localizar ventas.

QUÉ HACER
1. Lote/vencimiento/registro por movimiento; FEFO; bloqueo de vencidos; búsqueda de pacientes que recibieron un lote retirado.
2. El registro INVIMA es informativo (Q-28), no se certifica.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-28. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-07-1: Buscar un lote devuelve todas las ventas que lo contienen.
- AC-ADM-07-2: Un lote retirado no es vendible y el stock se segrega.
- AC-ADM-07-3: La venta sugiere el lote que vence primero.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-07: I, E.
```

### T52 — Compras, proveedores y órdenes de compra
**Funcionalidades:** ADM-08 · **Tamaño:** S · **Depende de:** T34

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T52 — Compras, proveedores y órdenes de compra   [F3 Operación multisede; tamaño S]
Funcionalidades de la spec: ADM-08 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T34.

PROBLEMA Y RESULTADO ESPERADO
Falta el ciclo de abastecimiento.

QUÉ HACER
1. Proveedores, órdenes de compra, recepción parcial con entrada a stock y costo promedio.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-08-1: Recibir 10 unidades suma 10 al stock de la sede de destino con movimiento y lote.
- AC-ADM-08-2: El costo promedio se recalcula correctamente (casos de prueba con valores fijos).
- AC-ADM-08-3: Una compra anulada revierte sus movimientos con contra-asiento.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-08: U, I, E.
```

### T53 — Convenios, promociones y tarifas en la venta
**Funcionalidades:** ADM-12, ASE-11 · **Tamaño:** M · **Depende de:** T38

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T53 — Convenios, promociones y tarifas en la venta   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: ADM-12, ASE-11 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T38.

PROBLEMA Y RESULTADO ESPERADO
Convenios con empresas/EPS son descuentos o tarifas, no facturación a pagadores (Q-02).

QUÉ HACER
1. Convenios con vigencia y reglas; promociones/combos; aplicación en cotización y orden con trazabilidad del descuento.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-12-1: Una promoción fuera de vigencia no se aplica en POS.
- AC-ADM-12-2: Un combo no se aplica si los lentes no corresponden a la prescripción verificada.
- AC-ADM-12-3: Se conserva el historial de versiones de cada promoción.
- AC-ASE-11-1: Un convenio vencido no se puede aplicar.
- AC-ASE-11-2: La línea de factura del descuento no incluye datos clínicos.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-12: U (reglas), I, E.
- ASE-11: U, I, E.
```

### T54 — Garantías, cambios y devoluciones
**Funcionalidades:** ASE-10, ADM-11 · **Tamaño:** M · **Depende de:** T44, T42

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T54 — Garantías, cambios y devoluciones   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: ASE-10, ADM-11 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T44, T42.

PROBLEMA Y RESULTADO ESPERADO
Las garantías necesitan causa, resolución y contrapartida contable.

QUÉ HACER
1. Resolución `reparacion|cambio|devolucion_dinero|sin_garantia`; la devolución genera nota crédito (ADM-09) y contra-movimiento de caja; vista consolidada para el admin.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ASE-10-1: Una devolución de dinero genera nota crédito vinculada y egreso de caja.
- AC-ASE-10-2: La garantía por fórmula crea una nueva prescripción enlazada sin modificar la anterior.
- AC-ASE-10-3: Se alerta cuando faltan 30 días para vencer la garantía.
- AC-ADM-11-1: Los totales coinciden con la suma de garantías individuales.
- AC-ADM-11-2: Filtra por sede y laboratorio.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ASE-10: I, E.
- ADM-11: I, E.
```

### T55 — Comisiones de asesores sin incentivar sustitución
**Funcionalidades:** ADM-13, ASE-13 · **Tamaño:** S · **Depende de:** T38, T54

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T55 — Comisiones de asesores sin incentivar sustitución   [F3 Operación multisede; tamaño S]
Funcionalidades de la spec: ADM-13, ASE-13 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T38, T54.

PROBLEMA Y RESULTADO ESPERADO
Las comisiones no deben empujar a vender un producto distinto al prescrito.

QUÉ HACER
1. Reglas de comisión por categoría/margen; las devoluciones las reducen; el asesor ve solo las propias (R).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-13-1: Una devolución revierte la comisión proporcional.
- AC-ADM-13-2: Crear una regla «bono por cambiar el lente prescrito» es rechazado con mensaje.
- AC-ASE-13-1: Un asesor no accede a comisiones de otro (R).
- AC-ASE-13-2: Una devolución posterior reduce la comisión visible del asesor.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-13: U, I.
- ASE-13: R, E.
```

### T56 — Importación masiva (Excel/CSV) con declaración responsable
**Funcionalidades:** ADM-15 · **Tamaño:** M · **Depende de:** T15, T13

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T56 — Importación masiva (Excel/CSV) con declaración responsable   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: ADM-15 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T15, T13.

PROBLEMA Y RESULTADO ESPERADO
Las ópticas migran pacientes y catálogos desde Excel; hay riesgo de datos sin autorización.

QUÉ HACER
1. Importación con `exceljs` (MIT) o CSV, previsualización, validación por fila y reporte de errores; declaración responsable de que existe autorización de los titulares; **HC históricas solo como anexos «migrada»** (Q-01).
2. No usar el paquete `xlsx` de npm (estancado).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: exceljs (MIT).
- Decisiones abiertas que la afectan: Q-01. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-15-1: Un archivo con 1000 filas y 20 inválidas importa 980 y descarga las 20 con motivo.
- AC-ADM-15-2: Sin declaración responsable no se puede aplicar una importación de pacientes.
- AC-ADM-15-3: Reimportar el mismo archivo no duplica pacientes.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-15: U, I, E.
```

### T57 — Cumplimiento sanitario operativo y tablero de pendientes
**Funcionalidades:** ADM-10, ADM-16 · **Tamaño:** M · **Depende de:** T16, T29

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T57 — Cumplimiento sanitario operativo y tablero de pendientes   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: ADM-10, ADM-16 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T16, T29.

PROBLEMA Y RESULTADO ESPERADO
Saneamiento, residuos, equipos y tecnovigilancia hoy viven en papel.

QUÉ HACER
1. Registros periódicos (saneamiento, residuos, mantenimiento de equipos, conceptos) con vencimientos; reporte de eventos adversos a tecnovigilancia (registro interno).
2. Tablero de pendientes regulatorios por sede (certificados, solicitudes de Habeas Data, respaldos, incidentes).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-10-1: Un evento «serio» muestra cuenta regresiva de 72 h y alerta al responsable.
- AC-ADM-10-2: El reporte trimestral exporta todos los eventos no serios del periodo.
- AC-ADM-10-3: No es posible editar un registro de residuos ya guardado (solo anotación correctiva).
- AC-ADM-16-1: Cada fuente de alerta (≥ 8) aparece con conteo correcto en datos de prueba.
- AC-ADM-16-2: El PDF se firma/sella (SEG-08).
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-10: I, U (reloj), E.
- ADM-16: I, E.
```

### T58 — Preferencias de contacto, recordatorios y controles clínicos
**Funcionalidades:** SEG-16, ASE-12, OPT-11 · **Tamaño:** M · **Depende de:** T45, T15

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T58 — Preferencias de contacto, recordatorios y controles clínicos   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: SEG-16, ASE-12, OPT-11 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T45, T15.

PROBLEMA Y RESULTADO ESPERADO
Los recordatorios deben respetar la Ley 2300/2023 (¿servicio o publicidad? Q-13) y las preferencias.

QUÉ HACER
1. `MensajeriaPort` con `wa.me` asistido (el usuario envía), SMTP (`nodemailer`, MIT-0) y WhatsApp Cloud API opcional **pagada por el cliente**; ventanas horarias y canales por paciente.
2. Controles programados y próximo control; lista de recalls; ningún envío masivo automático sin Q-13.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: nodemailer (MIT-0).
- Decisiones abiertas que la afectan: Q-13. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-16-1: Un mensaje comercial programado para domingo se reprograma/rechaza con motivo registrado.
- AC-SEG-16-2: El segundo mensaje comercial del mismo día al mismo paciente se bloquea.
- AC-SEG-16-3: «STOP» desactiva el canal de inmediato.
- AC-SEG-16-4: A un menor no se le programa mensaje comercial (SEG-06).
- AC-ASE-12-1: El mensaje de «lentes listos» no contiene valores de fórmula.
- AC-ASE-12-2: Con el adaptador `wa.me`, el sistema genera el enlace con texto y registra el envío cuando el asesor confirma.
- AC-OPT-11-1: Un control con fecha pasada sin cita aparece en vencidos.
- AC-OPT-11-2: El mensaje de recordatorio no contiene diagnóstico.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-16: U (reglas con tabla de casos), I, E.
- ASE-12: U, I, E.
- OPT-11: U, I, E.
```

### T59 — Panel y KPIs por sede y consolidados (sin datos clínicos)
**Funcionalidades:** ADM-04 · **Tamaño:** S · **Depende de:** T42, T40

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T59 — Panel y KPIs por sede y consolidados (sin datos clínicos)   [F3 Operación multisede; tamaño S]
Funcionalidades de la spec: ADM-04 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T42, T40.

PROBLEMA Y RESULTADO ESPERADO
El administrador necesita indicadores sin ver HC.

QUÉ HACER
1. Ventas, ticket, conversión cotización→orden, tiempos de taller, caja; consolidación entre sedes; gráficos con Recharts (MIT).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: recharts (MIT).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-04-1: Cambiar la sede activa recalcula todos los KPIs con datos solo de esa sede (prueba comparando con consulta SQL independiente).
- AC-ADM-04-2: Ningún endpoint de KPIs devuelve campos clínicos.
- AC-ADM-04-3: Un `asesor` ve solo sus ventas.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-04: I (valores esperados), R, E.
```

### T60 — Cierre de contrato, exportación del tenant y disposición final
**Funcionalidades:** PLT-08, SEG-10 · **Tamaño:** M · **Depende de:** T27, T28

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T60 — Cierre de contrato, exportación del tenant y disposición final   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: PLT-08, SEG-10 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T27, T28.

PROBLEMA Y RESULTADO ESPERADO
Al terminar el servicio el tenant debe poder llevarse sus datos; la eliminación solo procede tras la retención.

QUÉ HACER
1. Exportación completa (datos estructurados + PDFs con hash); retención de lo exigido; disposición final asistida con acta firmada y bloqueo antes de cumplirse el plazo.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-PLT-08-1: La exportación de un tenant de prueba contiene el 100 % de pacientes y HC (conteo coincide con la BD) y el manifiesto valida los hashes.
- AC-PLT-08-2: Descargar la exportación exige MFA reciente y queda en bitácora.
- AC-PLT-08-3: Un tenant `en_cierre` no puede eliminarse mientras existan HC dentro de retención.
- AC-SEG-10-1: No se puede ejecutar sin los 2 avisos registrados con ≥ 8 días de diferencia.
- AC-SEG-10-2: Se genera un acta PDF sellada con inventario.
- AC-SEG-10-3: No hay opción de eliminar un solo documento de una HC.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- PLT-08: I, P (conteos), S.
- SEG-10: I, E.
```

### T61 — Acceso de terceros a la HC y traslado entre profesionales/sedes
**Funcionalidades:** SEG-14 · **Tamaño:** M · **Depende de:** T25, T14

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T61 — Acceso de terceros a la HC y traslado entre profesionales/sedes   [F3 Operación multisede; tamaño M]
Funcionalidades de la spec: SEG-14 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T25, T14.

PROBLEMA Y RESULTADO ESPERADO
Entregas a terceros (autoridades, otros prestadores) requieren autorización u orden y acta (A-08).

QUÉ HACER
1. Solicitud, autorización/orden, entrega con registro y acta de traslado con folios, hash y firma de quien entrega y recibe.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-27. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-SEG-14-1: Entregar HC a un tercero sin base legal o autorización registrada es imposible.
- AC-SEG-14-2: El enlace de entrega expira en el plazo configurado y cada acceso queda en bitácora.
- AC-SEG-14-3: Trasladar la HC de un paciente a otra sede del tenant genera acta con folios, hash y firma de quien entrega y de quien recibe.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- SEG-14: I, S, E.
```


## 3.4 F4 Especialidades y diferenciales

### T62 — Plantillas de examen por tipo de consulta e historial comparativo
**Funcionalidades:** OPT-15, OPT-12 · **Tamaño:** M · **Depende de:** T20

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T62 — Plantillas de examen por tipo de consulta e historial comparativo   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: OPT-15, OPT-12 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T20.

PROBLEMA Y RESULTADO ESPERADO
Un examen de contactología, pediatría o baja visión no usa los mismos campos.

QUÉ HACER
1. Motor de plantillas versionadas (campos tipados y validaciones) y comparación con la fórmula anterior del mismo paciente.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-15-1: Una atención pediátrica muestra las secciones de OPT-19 y exige representante.
- AC-OPT-15-2: Cambiar la plantilla no altera atenciones previas.
- AC-OPT-12-1: Comparar dos atenciones resalta los campos que cambiaron.
- AC-OPT-12-2: Cada visualización queda auditada.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-15: U, I, E.
- OPT-12: I, E.
```

### T63 — Optometría pediátrica
**Funcionalidades:** OPT-19 · **Tamaño:** M · **Depende de:** T62, T13

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T63 — Optometría pediátrica   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: OPT-19 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T62, T13.

PROBLEMA Y RESULTADO ESPERADO
Pediatría exige pruebas y consentimiento del representante.

QUÉ HACER
1. Plantilla pediátrica (pruebas por edad definidas con el profesional, sin inventar valores normativos), representante obligatorio y recordatorios de control.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-19-1: No se inicia atención pediátrica sin representante.
- AC-OPT-19-2: El sistema no propone dosis de cicloplejía.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-19: I, E.
```

### T64 — Baja visión
**Funcionalidades:** OPT-17 · **Tamaño:** M · **Depende de:** T62, T23, T34

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T64 — Baja visión   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: OPT-17 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T62, T23, T34.

PROBLEMA Y RESULTADO ESPERADO
La baja visión incluye evaluación funcional, ayudas ópticas y entrenamiento.

QUÉ HACER
1. Evaluación funcional, prescripción de ayudas (lupas, telescopios, filtros) como productos del catálogo y plan de entrenamiento con seguimiento.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-17-1: Una atención de baja visión usa su plantilla y se firma como cualquier atención.
- AC-OPT-17-2: Registrar la entrega de una ayuda descuenta stock y genera prescripción tipo `baja_vision`.
- AC-OPT-17-3: Las sesiones de entrenamiento se registran con fecha y progreso.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-17: I, E.
```

### T65 — Terapia visual, ortóptica y pleóptica
**Funcionalidades:** OPT-18 · **Tamaño:** M · **Depende de:** T62, T41

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T65 — Terapia visual, ortóptica y pleóptica   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: OPT-18 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T62, T41.

PROBLEMA Y RESULTADO ESPERADO
Son tratamientos por sesiones con plan, evolución y facturación por sesión.

QUÉ HACER
1. Plan con número de sesiones, ejercicios, evolución firmada por sesión, estado `plan_activo → en_curso → completado | suspendido`; facturación por sesión vía `FacturacionPort`.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-18-1: Se crea un plan de 12 sesiones, se firman 5 y el avance (5/12) se muestra.
- AC-OPT-18-2: Una sesión firmada no se edita; se corrige por adenda.
- AC-OPT-18-3: La facturación de sesiones usa descripción comercial («Sesión de terapia visual») sin diagnóstico.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-18: I, E.
```

### T66 — Adjuntos e imágenes clínicas
**Funcionalidades:** OPT-14 · **Tamaño:** M · **Depende de:** T11, T30

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T66 — Adjuntos e imágenes clínicas   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: OPT-14 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T11, T30.

PROBLEMA Y RESULTADO ESPERADO
Retinografías, topografías y OCT se adjuntan a la atención.

QUÉ HACER
1. Subida con validación de tipo (PNG/JPEG/PDF) y tamaño, cifrado, miniaturas con `jimp` (MIT, sin `sharp`), hash y vínculo a la atención.
2. El antivirus ClamAV es GPL: **no** usarlo; documentar la limitación y validar tipo por firma de archivo.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: jimp (MIT).
- Decisiones abiertas que la afectan: Q-09. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-14-1: Un anexo subido se descarga idéntico (hash) y su archivo en disco es ilegible sin clave.
- AC-OPT-14-2: Se rechaza un ejecutable renombrado.
- AC-OPT-14-3: El anexo aparece en la copia de HC.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-14: I, S, E.
```

### T67 — Remisiones, interconsultas, certificados y rol oftalmólogo
**Funcionalidades:** OPT-16, OPT-22 · **Tamaño:** M · **Depende de:** T20, T14

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T67 — Remisiones, interconsultas, certificados y rol oftalmólogo   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: OPT-16, OPT-22 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T20, T14.

PROBLEMA Y RESULTADO ESPERADO
El optómetra remite a oftalmología y el oftalmólogo responde en el mismo sistema.

QUÉ HACER
1. Remisión e interconsulta en PDF firmado; certificado de examen; rol `oftalmologo` con plantilla base (la de oftalmología se define con un oftalmólogo, Q-26).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-26. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-16-1: La remisión firmada es inmutable y aparece en la HC.
- AC-OPT-16-2: El certificado no incluye diagnóstico por defecto.
- AC-OPT-22-1: Un `oftalmologo` con registro firma y prescribe; sin registro no.
- AC-OPT-22-2: Una remisión del optómetra llega al oftalmólogo de la sede.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-16: I, E.
- OPT-22: R, I.
```

### T68 — Tamizaje visual, brigadas y prótesis oculares
**Funcionalidades:** OPT-20, OPT-21 · **Tamaño:** M · **Depende de:** T15, T23

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T68 — Tamizaje visual, brigadas y prótesis oculares   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: OPT-20, OPT-21 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T15, T23.

PROBLEMA Y RESULTADO ESPERADO
Las brigadas registran muchas personas con datos mínimos; las prótesis tienen seguimiento propio.

QUÉ HACER
1. Registro masivo simplificado con autorización por participante (Q-29) y modo sin conexión **no incluido** en esta fase.
2. Prótesis oculares: toma de medidas, entrega y seguimiento con consentimiento.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-29. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-20-1: Registrar 50 participantes con autorización en < 10 min (usabilidad, prueba E cronometrada).
- AC-OPT-20-2: Un participante sin autorización no avanza.
- AC-OPT-21-1: El estado cambia con registro de usuario y hora.
- AC-OPT-21-2: La entrega requiere consentimiento.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-20: E, I.
- OPT-21: I, E.
```

### T69 — Validaciones de plausibilidad y alertas de calidad de datos
**Funcionalidades:** OPT-13, ASE-16 · **Tamaño:** S · **Depende de:** T20, T43

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T69 — Validaciones de plausibilidad y alertas de calidad de datos   [F4 Especialidades y diferenciales; tamaño S]
Funcionalidades de la spec: OPT-13, ASE-16 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T20, T43.

PROBLEMA Y RESULTADO ESPERADO
Detectar errores de captura (no diagnóstico, Q-21).

QUÉ HACER
1. Reglas parametrizables de rangos e incoherencias con advertencia que el usuario puede aceptar (queda registrado); alertas comerciales y de calidad de datos.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-21. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-13-1: Un eje de 270 es rechazado; una adición de 6,00 genera advertencia.
- AC-OPT-13-2: Ningún mensaje contiene términos diagnósticos.
- AC-ASE-16-1: Una venta con margen < umbral genera alerta.
- AC-ASE-16-2: Ninguna alerta menciona diagnóstico.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-13: U (tabla de casos), revisión de textos.
- ASE-16: U, I.
```

### T70 — Exportación contable (Siigo/World Office configurable)
**Funcionalidades:** ADM-14 · **Tamaño:** S · **Depende de:** T42

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T70 — Exportación contable (Siigo/World Office configurable)   [F4 Especialidades y diferenciales; tamaño S]
Funcionalidades de la spec: ADM-14 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T42.

PROBLEMA Y RESULTADO ESPERADO
El contador necesita exportar ventas e impuestos.

QUÉ HACER
1. CSV con mapeo de columnas editable (Q-30); sin afirmar compatibilidad certificada con ningún software.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-30. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-14-1: Exportar un mes produce CSV cuyos totales coinciden con el reporte de ventas.
- AC-ADM-14-2: Cambiar el mapeo modifica columnas sin cambiar datos.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-14: I, P.
```

### T71 — CRM, campañas, reportes programados y API de lectura
**Funcionalidades:** ADM-17, ADM-18 · **Tamaño:** M · **Depende de:** T58, T59

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T71 — CRM, campañas, reportes programados y API de lectura   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: ADM-17, ADM-18 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T58, T59.

PROBLEMA Y RESULTADO ESPERADO
Fidelización y análisis para cadenas.

QUÉ HACER
1. Segmentos y campañas respetando preferencias y Ley 2300; reportes programados con `pg-boss`; API de solo lectura con claves por tenant y límites.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-17-1: Un segmento no puede definirse por diagnóstico.
- AC-ADM-17-2: Pacientes sin autorización comercial se excluyen automáticamente.
- AC-ADM-18-1: Una clave sin alcance de `ventas` recibe 403 en ventas.
- AC-ADM-18-2: Toda llamada queda en la bitácora.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-17: U, I.
- ADM-18: S, I.
```

### T72 — Booking en línea, tienda opcional y reservas de producto
**Funcionalidades:** ADM-20, ASE-14 · **Tamaño:** M · **Depende de:** T45, T15

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T72 — Booking en línea, tienda opcional y reservas de producto   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: ADM-20, ASE-14 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T45, T15.

PROBLEMA Y RESULTADO ESPERADO
La reserva en línea reduce llamadas; la tienda tiene riesgos de retracto (Q-12).

QUÉ HACER
1. Booking con datos mínimos (sin motivo clínico), autorización antes de confirmar y anti-abuso; tienda **deshabilitada por defecto**; reservas de producto y etiquetas de precio.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-12. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-20-1: Una reserva pública no revela disponibilidad de otros pacientes ni datos clínicos.
- AC-ADM-20-2: La tienda no se publica si faltan los datos del art. 50.
- AC-ASE-14-1: Un producto reservado no aparece disponible para otro cliente.
- AC-ASE-14-2: Etiquetas imprimibles en lote.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-20: E, S (abuso, enumeración).
- ASE-14: I, E.
```

### T73 — Taller/laboratorio como tenant o sede y pedidos externos
**Funcionalidades:** ADM-21, ASE-15 · **Tamaño:** M · **Depende de:** T43

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T73 — Taller/laboratorio como tenant o sede y pedidos externos   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: ADM-21, ASE-15 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T43.

PROBLEMA Y RESULTADO ESPERADO
Un taller óptico o laboratorio es un establecimiento con su propia habilitación (D. 1030/2007).

QUÉ HACER
1. Tipo `taller_optico|laboratorio` con módulos propios y `LaboratorioPort` para pedidos a laboratorios externos (adaptador de archivo/HTTP configurable).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-21-1: Un cliente persona natural no puede registrarse como comprador.
- AC-ADM-21-2: Todo cambio de estado deja responsable y hora.
- AC-ASE-15-1: Un adaptador manual genera el PDF/Excel de pedido con todos los campos de la OT.
- AC-ASE-15-2: Un cambio de estado externo actualiza la OT con evento.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-21: I, E.
- ASE-15: I (contrato del puerto), E.
```

### T74 — Adaptador UBL 2.1 propio (opcional, P2)
**Funcionalidades:** ADM-09 · **Tamaño:** M · **Depende de:** T41

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T74 — Adaptador UBL 2.1 propio (opcional, P2)   [F4 Especialidades y diferenciales; tamaño M]
Funcionalidades de la spec: ADM-09 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T41.

PROBLEMA Y RESULTADO ESPERADO
Alternativa sin proveedor: generar UBL 2.1 y firmarlo. La firma XAdES-EPES con `xml-crypto` **no está verificada** (NV-22).

QUÉ HACER
1. Prototipo `ubl21_propio` con `xmlbuilder2` (MIT) y `xml-crypto` (MIT) contra el ambiente de habilitación de la DIAN; sin compromiso de producción; documentar lo que falte.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: xmlbuilder2 (MIT), xml-crypto (MIT), node-forge (elegir BSD-3-Clause).
- Decisiones abiertas que la afectan: Q-03. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- Criterio propio de esta tarea: el adaptador `ubl21_propio` pasa la prueba de contrato del puerto (AC-ADM-09-4), **no** se activa por defecto y lo que falta (XAdES-EPES, habilitación DIAN) queda documentado como no verificado.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-09: U (validador, numeración), I (nota crédito), prueba de contrato del puerto (mismo test para todos los adaptadores), E.
```


## 3.5 F5 RIPS/IHCE (condicionada)

### T75 — RIPS (Res. 948/2026) y facturación a pagadores — CONDICIONADA
**Funcionalidades:** ADM-19 · **Tamaño:** M · **Depende de:** T41, T21

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T75 — RIPS (Res. 948/2026) y facturación a pagadores — CONDICIONADA   [F5 RIPS/IHCE (condicionada); tamaño M]
Funcionalidades de la spec: ADM-19 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T41, T21.

PROBLEMA Y RESULTADO ESPERADO
Solo si Q-02 y Q-04 confirman que aplica. **No ejecutar antes.**

QUÉ HACER
1. Generación de RIPS conforme a Res. 948/2026 (leer la norma vigente; no inventar estructura), validaciones y estado de radicación; `RIPSPort` intercambiable.

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: ninguna nueva salvo que la necesites y cumpla la regla 2.
- Decisiones abiertas que la afectan: Q-02, Q-04. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-ADM-19-1: Con la bandera «factura a pagadores» desactivada, el módulo no aparece.
- AC-ADM-19-2: Para una factura de prueba se genera el JSON conforme al esquema de la versión configurada; la prueba falla si cambia la versión sin actualizar el generador.
- AC-ADM-19-3: El plazo de 22 días hábiles se calcula y alerta.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- ADM-19: U (esquema), I, E; validador oficial ⚠️.
```

### T76 — RDA/IHCE (FHIR) — CONDICIONADA
**Funcionalidades:** OPT-23 · **Tamaño:** M · **Depende de:** T18, T21

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.

TAREA T76 — RDA/IHCE (FHIR) — CONDICIONADA   [F5 RIPS/IHCE (condicionada); tamaño M]
Funcionalidades de la spec: OPT-23 (fichas en docs/spec/ESPECIFICACION_OPTISAAS.md; si T00 aún no está mergeada, usa el texto de abajo).
Prerrequisitos (PRs mergeados): T18, T21.

PROBLEMA Y RESULTADO ESPERADO
Solo si Q-05 confirma obligación. **No ejecutar antes.**

QUÉ HACER
1. Resumen Digital de Atención según Res. 1888/2025 (leída) y Res. 866/2021; `IHCEPort`; si se usa FHIR, preferir `@medplum/fhirtypes` (Apache-2.0) y validar sin librerías de licencia no estándar (descartado: fhirpath.js).

RESTRICCIONES DE LICENCIA Y ALCANCE
- Dependencias nuevas permitidas en esta tarea: @medplum/fhirtypes (Apache-2.0).
- Decisiones abiertas que la afectan: Q-05. Aplica el valor por defecto de PREGUNTAS_ABIERTAS.md y marca el código con TODO(Q-nn).

CRITERIOS DE TERMINADO (cada uno debe tener al menos una prueba que lo verifique)
- AC-OPT-23-1: Para una atención de prueba se genera un Bundle FHIR que valida contra el esquema/perfil cargado (si se dispone de uno oficial utilizable).
- AC-OPT-23-2: Con la bandera «actor IHCE» desactivada, no se genera ni envía nada.
- AC-OPT-23-3: Un rechazo del servicio queda con detalle y reintento.
- Todas las reglas fijas 1–6 se cumplen y el PR no incluye cambios ajenos a la tarea.

PRUEBAS REQUERIDAS (tipos: U unitaria Vitest, I integración con PostgreSQL real, R permisos/RLS, E extremo a extremo Playwright, S seguridad, A accesibilidad, P propiedades)
- OPT-23: U (mapeo), I, E (contra simulador local).
```
