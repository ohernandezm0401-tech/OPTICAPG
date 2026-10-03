# ESPECIFICACIÓN MAESTRA DE PRODUCTO — OptiSaaS (OPTICAPG)

**Versión:** 1.0 · **Fecha:** 2 de octubre de 2026 (hora Colombia, UTC-5) · **Idioma:** español
**Dueño del producto:** Orlando (Orlans Heavy) · **Destinatario técnico:** agente de código de Cursor (modelo Muse Spark 1.3, esfuerzo medio)
**Repositorio:** https://github.com/ohernandezm0401-tech/OPTICAPG · app Next.js en `web/` de la rama `cursor/ordenar-app-mock-e4a2` (PR #1)

> **Aviso.** Este documento traduce a funcionalidades los informes de investigación de producto (`/workspace/informe-optica.md`) y de requisitos legales (`/workspace/optisaas_legal/REQUISITOS_LEGALES_OPTISAAS.md`). **No es asesoría jurídica.** Todo lo marcado ⚠️ **NO VERIFICADO** es una hipótesis que debe confirmar un abogado, un consultor de habilitación en salud, un contador o la autoridad correspondiente antes de apoyarse en ello. Nada aquí se ha publicado ni enviado a terceros.

## 0. Cómo leer este documento

### 0.1 Marcas de verificación (heredadas de los informes)
| Marca | Significado |
|---|---|
| ✅ **VERIFICADO** | El texto oficial (o la licencia/paquete) fue leído por quien elaboró el informe de origen, o por mí el 2-oct-2026 donde lo indico expresamente (licencias vía registro npm, archivos LICENSE de PostgreSQL/Valkey/Redis, auditoría del árbol de dependencias). |
| ⚠️ **NO VERIFICADO** | Extracto de buscador, fuente secundaria o texto no abierto. Se trata como hipótesis. **No se inventa ni se asume.** |

### 0.2 Prioridades y fases
- **P0** = bloquea el uso con datos reales de pacientes (ilegal o riesgo alto sin ella) **o** es condición técnica de otra función P0. **P1** = necesaria para operar con normalidad (primeras semanas de un piloto controlado). **P2** = madurez/diferencial.
- **Fases (orden pedido por el dueño):** **F1** cumplimiento y datos reales · **F2** flujo clínico→venta · **F3** operación multisede · **F4** especialidades y diferenciales · **F5** RIPS/IHCE (condicionada a confirmación legal).
- **Puertas de salida (gates):**
  - **Gate A — Piloto clínico con datos reales, sin venta:** todas las funciones P0 de F1 cumplidas + checklist documental (§16.1) firmado. **Condición adicional:** si Q-05 concluye que el piloto es actor obligado de la IHCE, OPT-23 (RDA, hoy F5) pasa a ser requisito de este gate.
  - **Gate B — Piloto operativo completo (clínica + venta):** Gate A + todas las P0 de F2 + decisión de facturación electrónica tomada (PREGUNTAS_ABIERTAS Q-03). Si el piloto factura a EPS (Q-02), ADM-19 (RIPS) pasa a ser requisito de este gate.
  - **Gate C — Comercial multisede:** Gate B + P0/P1 de F3.
  - **Gate D — Especialidades completas:** F4. **Gate E — Reporte a pagadores / interoperabilidad:** F5 (solo si Q-04/Q-05 resuelven que aplica).
  - **Desviación documentada respecto al orden sugerido por el informe de producto:** el informe pone «fórmula completa en PDF» en la fase 2. Aquí **OPT-05 (prescripción con todos los campos del art. 17 del Decreto 1030/2007) está en F1**, porque el asesor legal la clasifica P0 (F-02, F-03: sin ella no se puede entregar una fórmula legal con datos reales). Lo que queda en F2 es el **vínculo prescripción → orden de venta y la verificación al dispensar** (ASE-07, art. 18). También **PLT-11 (parámetros, calendario hábil y retención) está en F1** porque los plazos de derechos (SEG-07), retención (SEG-09) y vigencia de la fórmula (OPT-05) dependen de él.
  - Con **datos sintéticos** se desarrolla sin restricción en cualquier fase; **datos reales de pacientes no entran a ningún entorno antes del Gate A**.

### 0.3 Convenciones
- **IDs de funcionalidad:** `PLT-nn` (plataforma multi-tenant) · `SEG-nn` (seguridad y cumplimiento transversal) · `ADM-nn` (Administrador) · `ASE-nn` (Asesor de Ventas) · `OPT-nn` (Optómetra/clínica). Criterios de aceptación: `AC-<ID>-n`.
- **IDs legales** (`A-01`…`M-03`): se refieren a la tabla del informe legal (`REQUISITOS_LEGALES_OPTISAAS.md`). El campo «Legal» de cada ficha cita norma + ID.
- **Tipos de prueba:** **U** unitaria (Vitest) · **I** integración contra PostgreSQL real (no mocks de BD) · **R** prueba de RLS/permisos (matriz tabla-dirigida) · **E** extremo a extremo (Playwright) · **S** prueba de seguridad (autenticación, inyección, IDOR) · **A** accesibilidad (Playwright + axe, ver §14) · **P** prueba de propiedades/regresión de datos.
- **Dinero:** enteros en pesos colombianos (COP) — nunca `float`. **Fechas:** `timestamptz` en UTC, presentadas en `America/Bogota`.
- **Alcance de roles pedido por el dueño:** Administrador, Asesor de Ventas, Optómetra + transversales (Seguridad/Cumplimiento y Plataforma multi-tenant). El rol `owner` del código actual (dueño del SaaS, Orlando) se trata como **rol de plataforma** dentro de «Plataforma multi-tenant».

## 1. Reglas del dueño (no negociables) y cómo se aplican
1. **Solo software 100 % libre y gratuito**, dependencias con licencia **MIT, Apache-2.0, BSD-2/3-Clause o ISC** (se indica la licencia exacta). Aceptadas por ser equivalentes permisivas en el árbol transitivo: 0BSD, MIT-0, BlueOak-1.0.0, CC0-1.0, Unlicense, Python-2.0, CC-BY-4.0 (datos), siempre revisadas por la CI (§14.4). **Prohibido:** GPL, LGPL, AGPL, open core, BSL, SSPL, RSAL, «source-available».
2. **Excepción ya aceptada por Orlando** (según el informe legal §5, memoria compartida de Ingeniería): `axe-core` (MPL-2.0) **solo en pruebas de accesibilidad**, sin distribuirse con el producto. **No se extiende a ninguna otra licencia sin nueva aprobación** (ver hallazgo H-LIC-2 y Q-09).
3. **Sin servicios de pago obligatorios.** Todo lo que choca (facturación DIAN, pagos, WhatsApp, hosting de BD) se aísla detrás de un **puerto/adaptador intercambiable** (§11); el producto debe arrancar y operar con el adaptador gratuito/manual por defecto. Un servicio de pago solo puede ser un adaptador **opcional** que el cliente final contrata y paga.
4. **No inventar datos ni normas.** Lo no verificado se conserva marcado (§15 lo consolida).
5. **Usar las correcciones del asesor legal:** retención **mínima 15 años** desde la última atención (Res. 839/2017 art. 3, ✅; no 20); **RIPS: Res. 948 del 14-may-2026** (deroga Res. 2275/2023, 558 y 1884 de 2024, ✅); **Decreto 1030/2007** (no Decreto 3770/2004 para lentes, ✅); **Res. DIAN 165/2023 compilada en Res. DIAN 227/2025** (✅; anexo técnico posterior a v1.9 ⚠️); **Res. 1888/2025** (RDA, ✅; cronograma por actor ⚠️); Res. 3100/2019 con Res. 544/2023 y 465/2025 (✅; vigencia tras Res. 1732/2026 ⚠️); Ley 2300/2023 art. 5 (mensajes comerciales, ✅); «Decreto 1070/2000» **no** se cita (no encontrado).
6. **Arquitectura de roles legales (informe legal §2):** la óptica es **responsable** del tratamiento y **custodio** de la HC; Orlando/OptiSaaS es **encargado**. Por eso: aislamiento estricto por tenant, telemetría sin datos personales, ningún uso de datos de pacientes para fines propios (analítica, IA, benchmarking) sin nueva decisión (Q-08).

## 2. Estado actual del repositorio (hechos observados el 2-oct-2026)
Fuentes: informe de producto §1 + lectura directa de la rama `cursor/ordenar-app-mock-e4a2` (`web/package.json`, `web/lib/*.ts`, `web/supabase_init.sql`, `PENDIENTES.md`) y una auditoría de licencias propia (§14.4).

| Aspecto | Hecho observado | Consecuencia para esta especificación |
|---|---|---|
| Stack | Next 15, React 19, next-auth `5.0.0-beta.31`, `@supabase/supabase-js`, Zustand, Recharts, Tailwind 4, JsBarcode, `bcryptjs` (dev). Sin backend propio; lógica en `app/api/{auth,facturacion,owner}` y en un store cliente (`lib/store.ts`, ~69 KB). **Sin framework de pruebas** (no hay script `test`). | Introducir capa servidor + pruebas desde F1 (PLT-02, PLT-09). |
| Datos | Todo mock; HC, pacientes y bitácoras de cumplimiento persisten en `localStorage`. | Bloqueante: PLT-02. |
| BD | `web/supabase_init.sql`: 22 tablas; `ENABLE ROW LEVEL SECURITY` solo en 7 (`empresas, sedes, usuarios, pacientes, citas, historias_clinicas, caja_sesiones`); `inventario`, `ordenes_trabajo`, `garantias`, `compras`, etc. **sin RLS**. Incluye semilla del owner con contraseña de prueba. | PLT-01 (RLS en todas las tablas con `tenant_id`, `FORCE`). |
| Roles | `owner`, `admin`, `asesor`, `optometra` (`lib/types.ts`). Sedes por `sedesAccess[]`. | Matriz §3; roles adicionales P1/P2. |
| Modelo | `Cita` contiene la HC embebida y datos de factura (`cufe`, `pdfUrl`); `Paciente.tipoDocumento` = `CC|CE|TI|PA` (falta **RC**); sin estado civil, acompañante, responsable, tipo de usuario (Res. 1995 art. 9); valores ópticos como `string`; dinero como `number`; `ProductoInventario.stock` único (sin sede) y `lote/vencimiento` a nivel de producto; `Sede.habilitacionSalud` es un `string`. | Rediseño de modelo (§17). |
| Facturación | Factus (producción de pago, sin precios públicos); CUFE simulados. | Puerto `FacturacionPort` (§11.1). |
| Pagos | Stripe (`stripePriceId`, `STRIPE_WEBHOOK_ENDPOINT`), simulado. | `PagosPlataformaPort` manual (§11.2). |
| Planes | `plans-config.ts`: $500.000 / $1.500.000 / $4.500.000 COP/mes; módulo `inventoryScraping`. | §12; retirar scraping (ADM-24). |
| Seguridad | Login con `Credentials`; modo mock con contraseñas de desarrollo; `AUTH_SECRET` de ejemplo; sin MFA; sin auditoría de lectura; bloqueo de HC a 24 h solo en UI. | SEG-01…SEG-04. |
| Licencias | Auditoría de los 459 paquetes del `package-lock.json` del repo (instalación `npm ci --ignore-scripts`, plataforma linux-x64; hecha por mí, `anexos/`): ver §14.4 — **hallazgos H-LIC-1…3**. | PLT-09 y Q-09. |
| Catálogos | `scripts/scrape-lentes.js` + `scraped-lentes.json` (origen/ToS sin revisar ⚠️). | ADM-24. |

## 3. Decisiones de arquitectura (ADR) vinculantes para la ejecución
| ADR | Decisión | Justificación / verificación |
|---|---|---|
| ADR-01 | **PostgreSQL estándar (≥ 16) accedido por `DATABASE_URL`**; Supabase hospedado deja de ser requisito. Supabase autoalojado queda como opción documentada, no dependencia. | PostgreSQL License («liberal, similar a BSD o MIT») ✅ leída en postgresql.org el 2-oct-2026. El hosting de Supabase tiene planes de pago y límites de capa gratuita ⚠️ no verificados. |
| ADR-02 | **Acceso a datos solo desde el servidor** (Route Handlers/Server Actions) con **Drizzle ORM (Apache-2.0)** + `pg` (MIT). Se elimina `@supabase/supabase-js` y las variables `NEXT_PUBLIC_SUPABASE_*`; el navegador nunca recibe credenciales de BD. | Reduce superficie de ataque; requisito L-02. Licencias ✅ (npm). |
| ADR-03 | **Multi-tenant en base compartida**: `tenant_id` (=`empresa_id`) en cada tabla; RLS con `FORCE ROW LEVEL SECURITY`; rol de BD de la aplicación **sin** `BYPASSRLS` ni superusuario; contexto por transacción (`SET LOCAL app.tenant_id / app.user_id / app.role / app.sedes`). | Informe legal §2 «punto crítico» (aislamiento estricto), B-07, L-02. |
| ADR-04 | **Doble capa de autorización**: CASL (`@casl/ability`, MIT) en la aplicación + RLS en la BD. La matriz §4 es la única fuente de verdad y se prueba tabla-dirigida. | CASL ✅ MIT (npm). |
| ADR-05 | **Auth.js v5 (`next-auth`, ISC)** con proveedor de credenciales propio sobre tabla `usuarios` (Argon2id, MFA). v5 sigue en **beta** (`5.0.0-beta.32` en npm el 2-oct-2026 ✅): si bloquea, alternativa **Better Auth (MIT ✅)** detrás de la misma interfaz `AuthPort`. | Evita acoplarse a Supabase Auth. |
| ADR-06 | **Registros clínicos inmutables** (append-only): una atención firmada no se edita ni se borra; correcciones solo por **adenda** referenciada. | Res. 1995/1999 art. 18; Ley 2015/2020 art. 8 par. 1 (A-06, A-07 ✅). |
| ADR-07 | **Dinero en enteros COP** (`bigint`); **IVA, retenciones y exenciones parametrizados por producto y fecha**, sin tarifas fijas en código. | G-09 ⚠️ (régimen de IVA de lentes/monturas/exámenes no verificado). |
| ADR-08 | **Colas y tareas en PostgreSQL con `pg-boss` (MIT ✅)**; **sin Redis**. `BullMQ` (MIT) exigiría Redis; Redis ≥ 8 es RSALv2/SSPLv1/AGPLv3 ✅ (LICENSE.txt leído hoy) y Redis ≤ 7.2 es BSD-3; **Valkey** es BSD-3-Clause ✅ (COPYING leído hoy) como alternativa si algún día hace falta. `pg-boss` requiere Node ≥ 22.12 ✅ (npm). | Rule 1 del dueño. |
| ADR-09 | **Node.js 22 LTS** como runtime (`.nvmrc`, `engines`). El repo hoy declara `@types/node ^20`. Licencia de Node.js ⚠️ no abierta en esta pasada. | Compatibilidad con ADR-08. |
| ADR-10 | **PDF con `@react-pdf/renderer` (MIT ✅)**; sellado = SHA-256 (`node:crypto`) del PDF + metadatos (autor, hora del servidor). **PDF/A no está garantizado** por la librería ⚠️ (no verificado): se documenta como limitación. | I-03/I-04. |
| ADR-11 | **Cifrado**: en tránsito TLS; anexos y respaldos con AES-256-GCM (`node:crypto`), clave de datos por tenant cifrada con clave maestra externa al repositorio (envelope encryption). Cifrado de volumen a cargo de la infraestructura (no es dependencia de código). | L-01, B-05, L-04. |
| ADR-12 | **Sin telemetría de terceros ni monitoreo de errores SaaS** (p. ej. analítica, reporte de fallos en la nube). Logs locales con `pino` (MIT ✅), **sin PII**. | D-05: no enviar datos personales a terceros sin contrato. |
| ADR-13 | **UI en es-CO**; nombres de tablas/columnas nuevas en español `snake_case` (coherente con `supabase_init.sql`). | Continuidad. |
| ADR-14 | **Puertos/adaptadores** para todo lo externo (§11). Los adaptadores de pago solo pueden ser opcionales. | Regla 3 del dueño. |
| ADR-15 | **El producto no hace apoyo diagnóstico**: las alertas de valores son de *plausibilidad de captura* (rangos), nunca sugieren diagnóstico ni tratamiento. | E-06: un software puede ser dispositivo médico (Decreto 4725/2005 art. 2 ✅); conclusión para OptiSaaS ⚠️ NO VERIFICADA (abogado/INVIMA). |

## 4. Roles y matriz de permisos rol × sede × recurso


### 4.1 Roles
| Rol (clave) | Quién es | Fase | Notas |
|---|---|---|---|
| `owner` | Orlando / equipo de plataforma | F1 | **Sin acceso a contenido de ningún tenant.** Ve metadatos (empresas, planes, uso agregado). |
| `soporte_plataforma` | Soporte técnico de OptiSaaS | F1 | Sin acceso a contenido clínico por defecto; acceso **«break-glass»** con justificación, límite de tiempo y aviso al tenant (L-03, B-04). |
| `admin` | Dueño/gerente de la óptica (una o varias sedes) | F1 | **No ve contenido clínico por defecto** (diagnóstico, anamnesis); sí ve agregados, cumplimiento y fórmula como dato de orden cuando gestiona garantías. Si el admin es además profesional, usa su rol profesional para lo clínico (decisión Q-10). |
| `asesor` | Asesor de ventas/caja | F1 | Ve **valores de la prescripción** (necesarios para fabricar/dispensar) pero **no** diagnóstico ni anamnesis (B-04). |
| `optometra` | Optómetra con tarjeta profesional vigente | F1 | Único (con `oftalmologo`) que puede firmar HC y prescribir (D. 1030 art. 16; Ley 372). |
| `oftalmologo` | Oftalmólogo (interconsulta o titular) | F4 | Mismo módulo clínico que `optometra`, con `especialidad=oftalmologia`. |
| `auxiliar_clinico` | Auxiliar de consultorio (pretest, AV preliminar) | F2 | Registra pruebas preliminares como **borrador**; no firma ni prescribe. ⚠️ Que un auxiliar registre en HC sin firma propia lo valida el abogado. |
| `tecnico_lab` | Técnico de taller/laboratorio de la sede | F2 | Ve órdenes de trabajo y los valores ópticos mínimos para producir; avanza estados. |
| `auditor` | Revisor externo/interno (solo lectura de bitácora y cumplimiento) | F3 | Sin contenido clínico. |
| Atributo `director_cientifico` | Optómetra/oftalmólogo designado por sede (D. 1030 arts. 7, 21) | F1 | No es rol: es un **atributo** de un profesional que habilita revisar posventa/calidad y recibir alertas de certificados. |

### 4.2 Alcance (scope) por sede
- Cada usuario tiene `usuarios_sedes(usuario_id, sede_id, rol)` (puede tener **distinto rol por sede**). Toda consulta lleva `tenant_id` y la **lista de sedes autorizadas**; la **sede activa** se elige en sesión y solo puede ser una autorizada (el código actual ya valida `sedesAccess` en el callback `jwt`; se conserva y se prueba).
- Notación en la matriz: **ˢ** = solo la sede activa · **ᵀ** = todas las sedes autorizadas del tenant · **ᵖ** = solo registros propios (creados por el usuario) · **ᴾ** = solo pacientes con cita/atención en su sede.

### 4.3 Acciones
`C` crear · `R` leer · `U` actualizar (solo mientras el registro no esté firmado/cerrado) · `F` firmar/cerrar · `A` anular **con nota** (nunca borrado físico en datos clínicos, fiscales o de auditoría) · `X` exportar/imprimir (siempre auditado) · `S` solicitar/aprobar · `—` sin acceso.

### 4.4 Matriz (fuente de verdad; pruebas R tabla-dirigida)
| Recurso | owner | soporte | admin | asesor | optometra | auxiliar | tecnico_lab | auditor |
|---|---|---|---|---|---|---|---|---|
| R1 Identificación y contacto del paciente | — | — (break-glass: solo R) | C R U ᵀ | C R U ˢ | R ᴾ · U datos clínicos-demográficos ˢ | C R U ˢ | — (solo nombre en orden) | — |
| R2 Autorizaciones y consentimientos de datos (C-03) | — | — | R X ᵀ | C R ˢ | C R ˢ | C R ˢ | — | R ᵀ (sin texto clínico) |
| R3 HC: atención (anamnesis, examen, diagnóstico, plan) | — | — (break-glass: R) | **— por defecto** (R solo si es profesional con rol clínico en la sede) | **—** | C R U F X ˢ (autor: solo el propio U mientras borrador) · R de otros profesionales ᴾ | C U (pruebas preliminares, borrador) ˢ | — | — |
| R4 Adendas de HC | — | — | — | — | C R F ˢ (adendas propias; de otros: R) | — | — | — |
| R5 Prescripción (valores ópticos, vigencia) | — | — | R ᵀ | R ˢ (solo lectura; no puede modificar: D. 1030 art. 19) | C R F X ˢ | — | R ˢ (mínimo necesario) | — |
| R6 Anexos/imágenes clínicas (OCT, topografía, consentimientos) | — | — | — | — | C R ˢ | C ˢ | — | — |
| R7 Agenda/citas (sin motivo clínico detallado) | — | — | C R U A ᵀ | C R U A ˢ | R U ˢ (propia) | R ˢ | — | — |
| R8 Cotización / orden de venta | — | — | R A ᵀ | C R U A ˢ | R ˢ (consulta de estado) | — | R ˢ | — |
| R9 POS y movimientos de venta | — | — | R X ᵀ | C R ˢ | — | — | — | R ᵀ |
| R10 Caja (apertura, arqueo, cierre) | — | — | R S ᵀ | C R ˢ ᵖ (su turno) | — | — | — | R ᵀ |
| R11 Factura electrónica y notas | — | — | R X S ᵀ | C R ˢ (emitir al vender) · nota crédito solo con S del admin | — | — | — | R ᵀ |
| R12 Orden de laboratorio/taller | — | — | R ᵀ | C R U ˢ | R U (QC, aprobación) ˢ | — | R U (estados) ˢ | R ᵀ |
| R13 Catálogo e inventario (stock, kardex) | — | — | C R U A ᵀ | R ˢ (ajuste solo con S) | R ˢ | — | R U (consumo) ˢ | R ᵀ |
| R14 Compras y proveedores | — | — | C R U A ᵀ | — | — | — | — | R ᵀ |
| R15 Garantías y posventa | — | — | R S ᵀ | C R U ˢ | R U (concepto técnico) ˢ · director científico: S | — | R ˢ | R ᵀ |
| R16 Convenios, promociones, comisiones (configuración) | — | — | C R U A ᵀ | R ˢ (convenios/promos) · R de sus propias comisiones | — | — | — | R ᵀ |
| R17 Cumplimiento sanitario (certificados, saneamiento, equipos, tecnovigilancia) | — | — | C R U ᵀ | R ˢ | C R (reporta eventos) ˢ | — | — | R ᵀ |
| R18 Usuarios, roles, sedes, parámetros | R (metadatos del tenant) | R (metadatos) | C R U ᵀ (no puede otorgarse roles superiores a los suyos) | R (propio perfil) | R (propio perfil) | R (propio) | R (propio) | — |
| R19 Bitácora de auditoría | R ᵀ (solo plataforma) | — | R X ᵀ (del tenant, sin contenido clínico) | — | R ᵖ (sus propias acciones) | — | — | R X ᵀ |
| R20 Habeas data / PQR | — | — | C R U S ᵀ | C R ˢ | C R ˢ | C R ˢ | — | R ᵀ |
| R21 Reportes y KPIs (agregados, sin PII) | R (agregados plataforma) | — | R X ᵀ | R ˢ (propios) | R ˢ (propios) | — | — | R ᵀ |
| R22 Exportación y respaldo (tenant completo) | — | — | S X ᵀ (con MFA reciente) | — | — | — | — | — |
| R23 Entrega de HC al paciente / copia | — | — | S ᵀ | — | C X ˢ | — | — | — |
| R24 Plataforma: tenants, planes, suscripciones, soporte | C R U A | R | R (su plan) | — | — | — | — | — |

**Reglas transversales de permisos**
1. **Mínimo privilegio y negación por defecto:** lo no listado está denegado. Un usuario sin sede activa autorizada no lee nada.
2. **Ventas/caja no ven diagnóstico** (B-04): la API de `R5` devuelve solo los campos del DTO «prescripción para dispensación», nunca `atencion.*`.
3. **El asesor no puede modificar prescripciones** (D. 1030 art. 19 lit. a; F-05) y las cifras de `R5` aparecen como solo-lectura en toda pantalla de ventas.
4. **Ninguna acción `A` borra físicamente**; el borrado físico solo ocurre en disposición final (SEG-10) con acta.
5. **Toda `X` y toda lectura de `R3/R4/R5/R6` queda en la bitácora** (SEG-03).
6. **Doble control:** anulaciones fiscales (nota crédito), ajustes de inventario > umbral configurable y cambios de rol exigen `S` de un segundo usuario con permiso o MFA reciente.
7. **Implementación:** `buildAbility(user)` en `lib/authz/ability.ts` (CASL: sujetos = recursos R1…R24; condiciones `{ tenantId, sedeId: { $in: user.sedesAutorizadas } }`) + políticas RLS equivalentes por tabla. La matriz se versiona en `lib/authz/matrix.ts` y **genera** los casos de prueba R (cada celda ⇒ un caso «permitido» y, para cada `—`, un caso «denegado»; además un caso «otra sede» y uno «otro tenant» por recurso).


---

# 5. Plataforma multi-tenant (rol de plataforma: owner/soporte)

Cubre la capa que hace posible vender el producto a muchas ópticas con aislamiento de datos, calidad y continuidad. El rol `owner` (Orlando) es un rol de **plataforma**: administra tenants, planes y soporte, **sin acceso al contenido** de los tenants (el `middleware.ts` actual deja al `owner` entrar a todas las secciones; debe corregirse, ver SEG-02 y PLT-05).

| ID | Funcionalidad | Prio | Fase | Dependencias |
|---|---|---|---|---|
| PLT-01 | Aislamiento multi-tenant con RLS probado | P0 | F1 | PLT-02 (capa servidor). |
| PLT-02 | Capa de datos servidor y salida de localStorage/Supabase cliente | P0 | F1 | PLT-09, PLT-10. |
| PLT-03 | Alta de tenant (onboarding) con contrato de encargo y verificación regulatoria | P0 | F1 | ADM-01, PLT-01. |
| PLT-04 | Planes, límites y suscripción sin pasarela de pago obligatoria | P1 | F3 | PLT-01, SEG-03. |
| PLT-05 | Panel de plataforma (owner) sin acceso a contenido | P1 | F3 | SEG-02, SEG-03. |
| PLT-06 | Residencia de datos e inventario de subencargados | P0 | F1 | PLT-03. |
| PLT-07 | Respaldos cifrados y restauración probada | P0 | F1 | PLT-02, SEG-12. |
| PLT-08 | Cierre/terminación del servicio y exportación completa del tenant | P1 | F3 | SEG-08, SEG-09, PLT-07. |
| PLT-09 | Canal de calidad: CI, pruebas, licencias y dependencias | P0 | F1 | — |
| PLT-10 | Datos sintéticos, entornos y bloqueo de datos reales | P0 | F1 | PLT-09. |
| PLT-11 | Parámetros por tenant: zona horaria, calendario colombiano, impuestos y retención | P0 | F1 | PLT-02. |
| PLT-12 | Sistema de diseño, UX y accesibilidad | P1 | F1 | — |

#### PLT-01 · Aislamiento multi-tenant con RLS probado
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** PLT-02 (capa servidor).

- **Descripción:** Cada fila de datos de negocio pertenece a un tenant (`tenant_id` = empresa). La base impide, aunque falle la aplicación, que un tenant lea o escriba datos de otro o de una sede no autorizada.
- **Reglas de negocio:**
  1. Toda tabla de negocio (incluye las 22 actuales y las nuevas) lleva `tenant_id uuid not null` y, cuando aplica, `sede_id`.
  2. `ENABLE` + `FORCE ROW LEVEL SECURITY` en todas; políticas `USING`/`WITH CHECK` por `tenant_id = current_setting('app.tenant_id')::uuid` y, en tablas por sede, `sede_id = ANY(string_to_array(current_setting('app.sedes'), ',')::uuid[])`.
  3. La aplicación se conecta con un rol (`optisaas_app`) **sin** `SUPERUSER`/`BYPASSRLS`; migraciones con otro rol (`optisaas_migrator`). Un rol `optisaas_audit_writer` solo inserta en bitácora.
  4. Helper único `withTenantTx(ctx, fn)` abre transacción, ejecuta `SET LOCAL app.tenant_id/app.user_id/app.role/app.sedes` y es la **única** vía para consultar; consultas fuera del helper fallan (el rol no ve filas sin contexto).
  5. Telemetría/analítica de plataforma solo sobre agregados sin datos personales (informe legal §2 punto crítico).
- **Campos de datos:** `tenants(id, razon_social, nit, estado, plan, …)`, columnas `tenant_id`/`sede_id` en toda tabla; rol de BD; función `app_ctx()` estable.
- **Estados / flujo:** Petición → autenticación → `withTenantTx` fija contexto → consulta → commit. Sin contexto ⇒ 0 filas.
- **Permisos:** Solo código servidor. Ningún rol de usuario toca la BD directamente.
- **Requisitos legales asociados:** Ley 1581/2012 art. 4 lit. g, 17 lit. d, 18 lit. b (seguridad); Ley 2015/2020 arts. 5-7, 12 (no compartir sin autorización) — B-07, L-01, L-02, B-04.
- **Criterios de aceptación verificables:**
  - AC-PLT-01-1: Dadas dos empresas A y B, una sesión de A que ejecuta `SELECT`/`UPDATE`/`DELETE` sobre cada tabla de negocio no afecta ni ve filas de B (0 filas, sin error de permisos que filtre existencia).
  - AC-PLT-01-2: Un script de verificación (`npm run db:check-rls`) falla en CI si existe una tabla con columna `tenant_id` sin RLS `FORCE` o sin política.
  - AC-PLT-01-3: Con el rol `optisaas_app` sin variables `app.*` establecidas, toda consulta devuelve 0 filas.
  - AC-PLT-01-4: Un usuario con sedes {S1} no lee ni escribe filas de S2 del mismo tenant en tablas por sede.
- **Pruebas requeridas:** R (matriz × tablas), I (PostgreSQL real vía contenedor de servicio), S (IDOR por `id` de otro tenant en cada endpoint).

#### PLT-02 · Capa de datos servidor y salida de localStorage/Supabase cliente
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** PLT-09, PLT-10.

- **Descripción:** Reemplaza el store cliente (`lib/store.ts`) y los datos mock por persistencia en PostgreSQL mediante Server Actions/Route Handlers con Drizzle; elimina `@supabase/supabase-js` del navegador y todo uso de `localStorage` para datos de pacientes, HC, bitácoras o ventas.
- **Reglas de negocio:**
  1. Migraciones versionadas (Drizzle Kit, MIT) en `web/db/migrations`; ningún DDL manual.
  2. Cada módulo migrado expone DTOs validados con Zod en el borde (entrada y salida); el cliente solo conserva estado de UI (filtros, sesión).
  3. Se conserva un **modo demo** (datos sintéticos, PLT-10) claramente rotulado, que **no** comparte código de persistencia con producción.
  4. Variables `NEXT_PUBLIC_SUPABASE_*` y `SUPABASE_SERVICE_ROLE_KEY` se eliminan; `.env.example` documenta `DATABASE_URL`, `APP_MASTER_KEY_FILE`, `AUTH_SECRET`.
  5. Migración por entidades en PRs pequeños (pacientes → citas → …); cada PR deja la app compilando.
- **Campos de datos:** Esquema §17; mappers `supabase-mappers.ts` se sustituyen por esquemas Drizzle/Zod.
- **Estados / flujo:** UI → Server Action → validación Zod → `withTenantTx` → Drizzle → respuesta DTO.
- **Permisos:** Según matriz §4.4 (comprobación CASL en cada acción).
- **Requisitos legales asociados:** Ley 1581 art. 17 lit. d, 18 lit. b; Res. 1995/1999 art. 16-18 — L-01, B-05; Ley 2015/2020 art. 13 (seguridad y continuidad).
- **Criterios de aceptación verificables:**
  - AC-PLT-02-1: `rg "localStorage" web/` no devuelve usos que persistan pacientes, HC, bitácoras de cumplimiento, ventas ni caja (solo preferencias de UI).
  - AC-PLT-02-2: `rg "supabase" web/ --glob '!*.md'` no devuelve dependencias en `package.json` ni importaciones en código cliente.
  - AC-PLT-02-3: Recargar el navegador o abrir otra sesión conserva los datos creados (persistidos en BD).
  - AC-PLT-02-4: `npm run build` y `npm run lint` pasan; el modo demo sigue accesible solo con `APP_MODE=demo`.
- **Pruebas requeridas:** I (cada acción contra BD real), E (crear paciente → recargar → persiste), P (esquemas Zod vs. tipos).

#### PLT-03 · Alta de tenant (onboarding) con contrato de encargo y verificación regulatoria
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** ADM-01, PLT-01.

- **Descripción:** Flujo guiado que crea la empresa, sus sedes, el primer administrador y bloquea los módulos clínicos hasta cumplir los requisitos regulatorios y contractuales del informe legal §4.1.
- **Reglas de negocio:**
  1. Pasos: (1) datos de la empresa (razón social, NIT, representante, contacto de PQR) → (2) tipificación de cada sede (ADM-01) → (3) **aceptación del contrato de encargo/transmisión de datos** (texto versionado, evidencia: usuario, fecha-hora, IP, hash del texto) → (4) declaración de que cuenta con autorización de sus titulares para cargar datos (D-06) → (5) política de tratamiento propia publicada (SEG-05) → (6) primer admin con MFA.
  2. El **módulo clínico (HC/prescripción) solo se activa** si la sede es `optica_con_consultorio`, `ips` o `profesional_independiente` **con código REPS cargado**; las sedes `optica_sin_consultorio` operan solo dispensación con prescripciones externas y director científico (E-01, E-02).
  3. Sin contrato aceptado el tenant queda en estado `onboarding` y **no puede cargar datos de pacientes**.
  4. El código del servicio de optometría en REPS **no se codifica**: es un campo libre validado por el cliente (E-05 ⚠️).
  5. Checklist de **RNBD** por tenant: ¿la óptica es sociedad con activos totales > 100.000 UVT (Circular Única SIC Título V cap. 2, ✅)? El valor de la UVT del año en curso **no se codifica** (⚠️ consultar DIAN); aunque no deba inscribir, **sí debe reportar incidentes** (C-09).
- **Campos de datos:** `tenants`, `sedes`, `contratos_encargo(tenant_id, version_texto, hash_texto, aceptado_por, aceptado_en, ip)`, `declaraciones_datos`.
- **Estados / flujo:** `onboarding → activo → suspendido → en_cierre → cerrado` (PLT-08).
- **Permisos:** Crea `owner`/`soporte_plataforma` (alta) y el `admin` del tenant completa los pasos 1-6.
- **Requisitos legales asociados:** Ley 1581 art. 18; D. 1377/2013 art. 25 (SIC lo cita como art. 2.2.2.25.5.2 D. 1074/2015; compilación ⚠️ para abogado); Res. 3100/2019 art. 4 mod.; D. 1030/2007 arts. 7, 10 — D-01, D-03, D-06, E-01, E-02, E-05, M-03. Circular Única SIC Título V cap. 2; Res. 1995 art. 13 (custodia por el prestador/contratante) — C-09, B-06.
- **Criterios de aceptación verificables:**
  - AC-PLT-03-1: Un tenant en `onboarding` recibe 403 al intentar crear un paciente.
  - AC-PLT-03-2: La aceptación del contrato se puede exportar con versión, hash y sello de tiempo.
  - AC-PLT-03-3: Una sede `optica_sin_consultorio` no muestra el menú de HC ni permite `POST /atenciones`.
  - AC-PLT-03-4: Sin código REPS en una sede con consultorio, el módulo clínico permanece inactivo y se explica el motivo.
- **Pruebas requeridas:** E (flujo completo), I (bloqueos por estado), R.

#### PLT-04 · Planes, límites y suscripción sin pasarela de pago obligatoria
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Plataforma · **Dependencias:** PLT-01, SEG-03.

- **Descripción:** Sustituye `plans-config.ts` (con `stripePriceId`) por planes configurables en BD, con límites de sedes/usuarios/profesionales y módulos, y un **registro manual de pagos** (transferencia/consignación conciliada por el owner). Stripe y pasarelas quedan como adaptadores opcionales (§11.2).
- **Reglas de negocio:**
  1. Planes y precios según §12 (editables por el owner, versionados, con vigencia).
  2. **Nunca se limita ni se borra información clínica por mora**: el estado `suspendido` pasa la cuenta a **solo lectura + exportación** (la óptica es la custodia; B-03).
  3. Los límites son de **capacidad** (sedes, usuarios activos, documentos electrónicos/mes si el proveedor de facturación los cobra) — no de historias clínicas por mes (el límite `maxHistoriasMes` actual se elimina: incentivaría a no registrar atenciones).
  4. Alertas de vencimiento a 7/3/0 días a admins; sin cortes sorpresivos.
  5. Se retira el módulo `inventoryScraping` (ADM-22).
- **Campos de datos:** `planes(id, clave, nombre, precio_cop, limites jsonb, modulos jsonb, vigente_desde)`, `suscripciones(tenant_id, plan_id, estado, proximo_cobro)`, `pagos_plataforma(id, tenant_id, monto_cop, medio, referencia, conciliado_por, fecha)`.
- **Estados / flujo:** `trial → activa → vencida(gracia) → suspendida(solo lectura) → cancelada(en_cierre)`.
- **Permisos:** `owner`: CRUD planes/pagos. `admin`: ver su plan y descargar comprobantes.
- **Requisitos legales asociados:** Res. 839/2017 arts. 6-9, 12 (custodia/cierre); Ley 1581 art. 18 lit. b — B-03, B-06. Precios: sin norma.
- **Criterios de aceptación verificables:**
  - AC-PLT-04-1: `rg stripe web/ -i` solo aparece en el adaptador opcional y en la documentación.
  - AC-PLT-04-2: Un tenant `suspendida` puede leer y exportar HC pero recibe 403 en cualquier escritura nueva.
  - AC-PLT-04-3: El owner registra un pago manual y el estado pasa a `activa` con auditoría.
  - AC-PLT-04-4: Superar el límite de sedes impide crear una sede nueva con mensaje claro y no afecta datos existentes.
- **Pruebas requeridas:** U (reglas de límites), I, E (registro de pago y suspensión).

#### PLT-05 · Panel de plataforma (owner) sin acceso a contenido
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Plataforma · **Dependencias:** SEG-02, SEG-03.

- **Descripción:** Consola de Orlando: empresas, estado de suscripción, uso agregado (nº de sedes, usuarios, documentos), salud del sistema, gestión de incidentes y de acceso de soporte «break-glass».
- **Reglas de negocio:**
  1. El owner **no** puede abrir pacientes, HC ni ventas de un tenant; solo metadatos y agregados anónimos.
  2. **Break-glass:** el soporte solicita acceso a un tenant con justificación; el admin del tenant recibe aviso (correo/in-app); el acceso expira (por defecto 60 min) y todo lo leído queda en la bitácora del tenant.
  3. Telemetría: solo contadores sin identificadores personales.
- **Campos de datos:** `accesos_soporte(id, tenant_id, solicitante, justificacion, inicio, fin, aprobado_por?)`, vistas agregadas.
- **Estados / flujo:** `solicitado → activo → expirado/revocado`.
- **Permisos:** `owner`, `soporte_plataforma`.
- **Requisitos legales asociados:** Ley 1581 art. 18 lit. j (acceso solo a quien deba tenerlo); Res. 1995 art. 14; L-03 — B-04, D-02, L-03.
- **Criterios de aceptación verificables:**
  - AC-PLT-05-1: Una sesión `owner` recibe 403 en cualquier endpoint de contenido (R1-R6).
  - AC-PLT-05-2: Un acceso break-glass sin justificación se rechaza; uno aprobado expira y la lectura posterior da 403.
  - AC-PLT-05-3: Cada lectura durante break-glass aparece en la bitácora del tenant con `actor=soporte`.
- **Pruebas requeridas:** R, I, E.

#### PLT-06 · Residencia de datos e inventario de subencargados
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** PLT-03.

- **Descripción:** Registro de cada proveedor/servicio que toca datos (hosting, BD, respaldos, correo, mensajería, DIAN/proveedor de facturación) con país/región, y bloqueo de configuraciones fuera de Colombia o de países con nivel adecuado según la SIC.
- **Reglas de negocio:**
  1. Al configurar un adaptador (§11) se exige declarar país y base jurídica (transmisión con contrato Art. 25 D. 1377 / transferencia Art. 26 Ley 1581).
  2. Lista de países adecuados editable (fuente: documento SIC; el listado ampliado ⚠️ NO VERIFICADO en texto oficial) — por defecto: Colombia + los verificados por el asesor legal.
  3. Documento exportable «Inventario de subencargados» para anexar al contrato (D-01).
- **Campos de datos:** `subencargados(id, tenant_id?, nombre, servicio, pais, region, contrato_ref, categoria_datos, activo)`.
- **Estados / flujo:** `propuesto → aprobado → activo → retirado`.
- **Permisos:** `admin` (del tenant, para sus adaptadores), `owner` (plataforma).
- **Requisitos legales asociados:** Ley 1581 art. 26; D. 1377/2013 art. 24-25; Circular Única SIC Título V cap. 3 — C-10, D-05.
- **Criterios de aceptación verificables:**
  - AC-PLT-06-1: Activar un adaptador sin país declarado está bloqueado.
  - AC-PLT-06-2: Activar uno con país fuera de la lista exige confirmación documentada y queda marcado «requiere revisión jurídica».
  - AC-PLT-06-3: El inventario exporta a PDF/CSV.
- **Pruebas requeridas:** U, I, E.

#### PLT-07 · Respaldos cifrados y restauración probada
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** PLT-02, SEG-12.

- **Descripción:** Respaldos automáticos de PostgreSQL y de anexos, cifrados con AES-256-GCM, copia fuera del servidor primario, y procedimiento de restauración probado periódicamente con evidencia.
- **Reglas de negocio:**
  1. Respaldo lógico diario (`pg_dump`, licencia PostgreSQL) + archivo continuo (WAL) opcional; anexos cifrados en disco.
  2. Regla 3-2-1 como objetivo: 3 copias, 2 medios, 1 fuera del proveedor principal; **destino en Colombia o país de la lista SIC** (PLT-06).
  3. RPO/RTO definidos y documentados (valores a fijar por Orlando: Q-07); **ningún valor se asume**.
  4. Prueba de restauración automática mensual en base temporal con verificación de integridad (conteos + hash de la cadena de auditoría) y registro del resultado.
  5. Las copias respetan la retención (SEG-09): no se destruyen antes de tiempo; la supresión certificada en copias se rige por ciclo de vida definido (L-05).
  6. Herramientas de infraestructura del SO (cron, rsync, etc.) quedan **fuera** de las dependencias de código pero se listan en `docs/infra/HERRAMIENTAS.md` para aprobación de Orlando (Q-09).
- **Campos de datos:** `respaldos(id, tipo, inicio, fin, tamano, hash_sha256, destino, cifrado, resultado)`, `pruebas_restauracion(id, respaldo_id, resultado, evidencia)`.
- **Estados / flujo:** `programado → ejecutado → verificado → expirado`.
- **Permisos:** `admin` ve estado; operación a cargo de infraestructura.
- **Requisitos legales asociados:** Res. 1995 arts. 16-18; Ley 2015/2020 art. 13 — L-04, B-05, L-05.
- **Criterios de aceptación verificables:**
  - AC-PLT-07-1: `npm run backup:run` en el entorno de prueba produce un archivo cifrado que no es legible sin la clave.
  - AC-PLT-07-2: `npm run backup:restore-test` restaura en una BD temporal y reporta OK con conteos coincidentes.
  - AC-PLT-07-3: Un respaldo con un byte alterado falla la verificación de autenticidad (GCM).
- **Pruebas requeridas:** I, S (manipulación del archivo), prueba de restauración en CI sobre datos sintéticos.

#### PLT-08 · Cierre/terminación del servicio y exportación completa del tenant
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Plataforma · **Dependencias:** SEG-08, SEG-09, PLT-07.

- **Descripción:** Exporta toda la información del tenant en formatos abiertos (PDF por HC + JSON estructurado; FHIR cuando aplique) para entregarla al responsable, al paciente o a la autoridad, y gestiona el cierre contractual sin perder la custodia legal.
- **Reglas de negocio:**
  1. La exportación incluye pacientes, HC, adendas, prescripciones, anexos, autorizaciones, ventas, facturas (XML + CUFE/CUDE), inventario y bitácora, con manifiesto y hash por archivo.
  2. El cierre pasa por `en_cierre` (solo lectura + exportación) y solo se elimina del sistema cuando el responsable confirma entrega y se cumplió la retención o se trasladó la custodia (Res. 839/2017 arts. 6-9).
  3. Se genera un acta de entrega con firma electrónica del responsable.
- **Campos de datos:** `exportaciones(id, tenant_id, alcance, solicitado_por, manifiesto jsonb, hash, estado)`.
- **Estados / flujo:** `solicitada → generando → lista → descargada → expirada`.
- **Permisos:** `admin` con MFA reciente (`R22`).
- **Requisitos legales asociados:** Res. 839/2017 arts. 6-9, 12; Res. 1995 art. 13; Ley 2015/2020 arts. 9-10 — B-03, B-06, A-09.
- **Criterios de aceptación verificables:**
  - AC-PLT-08-1: La exportación de un tenant de prueba contiene el 100 % de pacientes y HC (conteo coincide con la BD) y el manifiesto valida los hashes.
  - AC-PLT-08-2: Descargar la exportación exige MFA reciente y queda en bitácora.
  - AC-PLT-08-3: Un tenant `en_cierre` no puede eliminarse mientras existan HC dentro de retención.
- **Pruebas requeridas:** I, P (conteos), S.

#### PLT-09 · Canal de calidad: CI, pruebas, licencias y dependencias
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** —

- **Descripción:** Pipeline que impide fusionar código con licencias no permitidas, sin pruebas o sin tipado, y mantiene `THIRD_PARTY_LICENSES.md` generado.
- **Reglas de negocio:**
  1. Workflow de GitHub Actions: instalar, `lint`, `tsc --noEmit`, `test` (Vitest), `test:e2e` (Playwright), `build`, `db:check-rls`, `licenses:check`.
  2. `licenses:check` usa `license-checker-rseidelsohn` (BSD-3-Clause ✅) con allowlist: MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, MIT-0, BlueOak-1.0.0, CC0-1.0, Unlicense, Python-2.0, CC-BY-4.0; **excepciones nominales** documentadas en `licenses.exceptions.json` (node-forge → se elige BSD-3-Clause; `axe-core` MPL-2.0 solo devDependency de pruebas; el resto de excepciones solo con aprobación escrita de Orlando).
  3. Resolver los hallazgos H-LIC-1…3 (§14.4) o dejarlos como excepción aprobada (Q-09).
  4. Dependabot/`npm audit` informativo; no se publica el repositorio sin definir licencia del propio proyecto (hoy `UNLICENSED`, Q-14).
  5. GitHub Actions: las condiciones de uso gratuito ⚠️ no se verificaron; la CI debe poder ejecutarse localmente con los mismos scripts.
- **Campos de datos:** `THIRD_PARTY_LICENSES.md` (generado), `licenses.exceptions.json`.
- **Estados / flujo:** PR → CI → bloqueo si falla.
- **Permisos:** n/a.
- **Requisitos legales asociados:** Regla del dueño (licencias); Ley 1581 art. 17 lit. d (calidad de seguridad).
- **Criterios de aceptación verificables:**
  - AC-PLT-09-1: Añadir una dependencia GPL/LGPL/AGPL/BSL/SSPL a `package.json` hace fallar `licenses:check`.
  - AC-PLT-09-2: `npm run licenses:check` pasa en `main` con las excepciones listadas.
  - AC-PLT-09-3: Todo PR ejecuta lint + typecheck + pruebas + build.
- **Pruebas requeridas:** Verificación de la propia CI (PR de prueba con dependencia prohibida).

#### PLT-10 · Datos sintéticos, entornos y bloqueo de datos reales
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** PLT-09.

- **Descripción:** Generador de datos de prueba y salvaguardas para que ningún dato real llegue a desarrollo/pruebas, y para que las simulaciones nunca se confundan con documentos válidos.
- **Reglas de negocio:**
  1. `npm run seed:demo` crea 2 empresas, 3 sedes y usuarios de cada rol con **datos ficticios** (documentos con prefijo reservado, correos `@example.invalid`).
  2. `APP_ENV` ∈ `desarrollo|pruebas|demo|produccion`. En `produccion`: se rechaza arrancar si existe `dev-credentials`, si `AUTH_SECRET` es el de ejemplo, si algún adaptador está en modo `simulado` o si faltan claves; `dev-credentials.ts` y la semilla del owner se eliminan del repositorio.
  3. Cualquier documento generado en modo simulado lleva marca de agua/leyenda «SIMULACIÓN — SIN VALIDEZ FISCAL/CLÍNICA» (ver §13).
  4. Importación de datos de pacientes en entornos no productivos está deshabilitada.
- **Campos de datos:** `semillas/` (TS), variable de entorno.
- **Estados / flujo:** n/a.
- **Permisos:** n/a.
- **Requisitos legales asociados:** Ley 1581 art. 17 lit. d; L-01 («pruebas con datos sintéticos, nunca datos reales en dev/test»).
- **Criterios de aceptación verificables:**
  - AC-PLT-10-1: `APP_ENV=produccion` con `AUTH_SECRET` por defecto aborta el arranque con mensaje claro.
  - AC-PLT-10-2: `rg -n "owner123|dev-credentials" web/ supabase_init.sql` no devuelve resultados en la rama principal.
  - AC-PLT-10-3: `seed:demo` es idempotente y no usa documentos reales (validado contra patrón reservado).
- **Pruebas requeridas:** U (guardas de arranque), I (seed), E.

#### PLT-11 · Parámetros por tenant: zona horaria, calendario colombiano, impuestos y retención
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** PLT-02.

- **Descripción:** Tabla de parámetros versionados: zona horaria `America/Bogota`, festivos y horarios (para Ley 2300), IVA/exenciones por producto y fecha, años de retención (por defecto 15), vigencia de prescripción, cantidad máx. por prescripción.
- **Reglas de negocio:**
  1. Nada fiscal ni de plazos legales está «quemado» en código (`IVA_RATE` en `constants.ts` se reemplaza).
  2. Festivos de Colombia: tabla editable; **fuente oficial no verificada** ⚠️ (se pide al dueño que cargue/valide el calendario anual).
  3. Los cambios de parámetros son versionados con vigencia y quedan en bitácora.
  4. Valores por defecto: retención 15 años (✅ Res. 839/2017); IVA: **sin valor por defecto** hasta que el contador lo confirme (G-09 ⚠️).
- **Campos de datos:** `parametros(tenant_id, clave, valor jsonb, vigente_desde, vigente_hasta)`, `festivos(fecha, pais)`, `tarifas_impuesto(id, nombre, porcentaje_bp, excluido, exento, vigente_desde)`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin`.
- **Requisitos legales asociados:** Ley 2300/2023 arts. 1-5 (horarios); Res. 839/2017 art. 3; Res. DIAN 165/2023 — K-04, B-01, G-09 ⚠️.
- **Criterios de aceptación verificables:**
  - AC-PLT-11-1: Cambiar el IVA de una categoría no altera ventas ya cerradas (se guarda snapshot en la línea).
  - AC-PLT-11-2: Una fecha en domingo/festivo es rechazada por el programador de mensajes comerciales.
  - AC-PLT-11-3: No existe `0.19` ni `IVA_RATE` literal en código de dominio.
- **Pruebas requeridas:** U, I, P.

#### PLT-12 · Sistema de diseño, UX y accesibilidad
**Prioridad:** P1 · **Fase:** F1 · **Rol/área:** Plataforma · **Dependencias:** —

- **Descripción:** Lineamientos de UX transversales para las tres consolas: jerarquía clara, formularios largos usables (HC), estados vacío/carga/error, teclado completo, modo claro/oscuro, impresión limpia, uso en tableta en consultorio.
- **Reglas de negocio:**
  1. Meta de accesibilidad: **WCAG 2.1 AA como objetivo de producto** (norma colombiana de accesibilidad web ⚠️ no verificada; no se cita como obligación).
  2. Formularios con React Hook Form (MIT) + Zod (MIT); validación inmediata de rangos ópticos (esfera, cilindro en pasos de 0,25; eje 0–180; DP en mm; AV en notación configurable).
  3. Componentes sobre `@base-ui/react` (MIT) y Tailwind; ícono `lucide-react` (ISC).
  4. Todo texto de interfaz en es-CO; mensajes de error accionables; ningún dato clínico en título de pestaña, URL ni mensajes de log.
  5. Acciones destructivas y de firma exigen confirmación explícita con resumen.
  6. Rendimiento: lista de pacientes y agenda paginadas en servidor (TanStack Table/Query, MIT).
  7. **Metas de UX medibles (hipótesis propias, a validar con 3–5 usuarios reales de una óptica; no provienen de investigación de usuarios):** registrar paciente existente → agendar cita en ≤ 4 acciones; abrir la HC del paciente en atención en ≤ 2 clics desde la agenda; venta de mostrador con código de barras en ≤ 5 acciones; autoguardado de la HC cada ≤ 30 s; indicador de carga visible si una acción tarda > 400 ms; mensajes de error que dicen qué hacer.
- **Campos de datos:** n/a.
- **Estados / flujo:** n/a.
- **Permisos:** n/a.
- **Requisitos legales asociados:** Sin norma verificada (objetivo propio); principio de claridad de la información al consumidor Ley 1480 art. 23 (K-01).
- **Criterios de aceptación verificables:**
  - AC-PLT-12-1: Las pantallas principales de cada rol pasan `axe` sin violaciones «serious/critical» (prueba A).
  - AC-PLT-12-2: Todo el flujo «crear HC → firmar → generar fórmula» se completa solo con teclado (prueba E).
  - AC-PLT-12-3: En 360 px de ancho no hay desbordamiento horizontal en POS ni en HC.
  - AC-PLT-12-4: Una prueba E2E cuenta las acciones de los flujos con meta de UX y falla si superan la meta; el resultado queda en el PR.
  - AC-PLT-12-5: Existe `docs/UX_VALIDACION.md` con el protocolo de prueba con usuarios reales (lo ejecuta una persona, no el agente) y un registro de resultados vacío.
- **Pruebas requeridas:** A (axe en Playwright, MPL-2.0 solo pruebas), E (teclado), capturas visuales de referencia.


---

# 6. Seguridad y cumplimiento transversal

Funciones que no pertenecen a un solo rol pero sostienen el cumplimiento de Ley 1581/2012, Res. 1995/1999, Res. 839/2017, Ley 2015/2020 y Ley 527/1999. Son la base del **Gate A**.

| ID | Funcionalidad | Prio | Fase | Dependencias |
|---|---|---|---|---|
| SEG-01 | Autenticación fuerte: Argon2id, MFA, sesiones revocables | P0 | F1 | PLT-02, PLT-10. |
| SEG-02 | Autorización rol × sede × recurso (CASL + RLS) con pruebas tabla-dirigidas | P0 | F1 | PLT-01, SEG-01. |
| SEG-03 | Bitácora de auditoría append-only con hash encadenado (incluye lecturas) | P0 | F1 | PLT-01, SEG-01. |
| SEG-04 | Marco de inmutabilidad: estados, firma y adenda | P0 | F1 | SEG-01, SEG-03. |
| SEG-05 | Autorización de tratamiento de datos, política por tenant y separación de consentimientos | P0 | F1 | SEG-08, PLT-01, ASE-01. |
| SEG-06 | Menores de edad y representante legal | P0 | F1 | ASE-01. |
| SEG-07 | Módulo de Habeas Data y PQR del paciente | P0 | F1 | SEG-04, PLT-11. |
| SEG-08 | Firma electrónica y sellado de documentos (paciente y profesional) | P0 | F1 | SEG-01, SEG-04, SEG-12. |
| SEG-09 | Retención de 15 años, estados de archivo y bloqueo de eliminación | P0 | F1 | SEG-04, PLT-11. |
| SEG-10 | Disposición final asistida con acta | P1 | F3 | SEG-09, SEG-08. |
| SEG-11 | Registro de incidentes de seguridad y runbook (15 días hábiles) | P0 | F1 | SEG-03, PLT-11. |
| SEG-12 | Gestión de secretos y cifrado (envelope encryption) | P0 | F1 | PLT-02. |
| SEG-13 | Endurecimiento de la aplicación web | P0 | F1 | SEG-01. |
| SEG-14 | Acceso de terceros a la HC y consentimiento para compartir | P1 | F3 | SEG-08, SEG-03. |
| SEG-15 | Paquete documental de cumplimiento (plantillas para revisión jurídica) | P0 | F1 | PLT-03. |
| SEG-16 | Preferencias de contacto y reglas de envío (Ley 2300/2023) | P1 | F3 | SEG-05, PLT-11, §11.3. |

#### SEG-01 · Autenticación fuerte: Argon2id, MFA, sesiones revocables
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** PLT-02, PLT-10.

- **Descripción:** Reemplaza el login de credenciales mock por autenticación real sobre la tabla `usuarios`, con contraseñas Argon2id, MFA (TOTP y/o WebAuthn), bloqueo por intentos, expiración de sesión y revocación.
- **Reglas de negocio:**
  1. Hash **Argon2id** con `@node-rs/argon2` (MIT ✅) o `argon2` (MIT ✅); `bcryptjs` (BSD-3-Clause) solo para migrar hashes existentes si los hubiera.
  2. Contraseña mínima 12 caracteres, verificación contra lista de contraseñas comunes local; sin reutilización de las últimas 5.
  3. **MFA obligatoria** para `admin`, `optometra`, `oftalmologo` y roles de plataforma; opcional para `asesor`, `auxiliar_clinico`, `tecnico_lab` (configurable por tenant). TOTP con `otplib` (MIT ✅) y WebAuthn con `@simplewebauthn/server` (MIT ✅); códigos de recuperación de un solo uso.
  4. Bloqueo progresivo tras 5 intentos fallidos (15 min) y limitación de tasa por IP y por usuario; mensajes de error genéricos (sin enumeración de usuarios).
  5. Sesión: JWT corto (≤ 15 min) + sesión servidor revocable (`sesiones` con rotación); inactividad máx. configurable (por defecto 15 min en roles clínicos); cierre de sesión revoca.
  6. **MFA reciente (≤ 10 min)** requerida para: exportar, firmar, anular fiscalmente, cambiar roles, break-glass.
  7. Interfaz `AuthPort` para poder cambiar de Auth.js a Better Auth (ADR-05).
- **Campos de datos:** `usuarios(id, tenant_id, email, hash_password, mfa_totp_secret_cifrado, estado, ultimo_login, intentos_fallidos, bloqueado_hasta)`, `credenciales_webauthn`, `codigos_recuperacion`, `sesiones(id, usuario_id, creada, expira, revocada, ip, agente)`.
- **Estados / flujo:** `invitado → activo → bloqueado → desactivado`; sesión `activa → expirada|revocada`.
- **Permisos:** Cada usuario gestiona su MFA; `admin` restablece (con MFA reciente) y todo queda auditado.
- **Requisitos legales asociados:** Res. 1995 art. 18 (identificar al autor); Ley 1581 art. 4 lit. g, 18 lit. b; Ley 2015/2020 art. 13 — L-01, L-02, A-06.
- **Criterios de aceptación verificables:**
  - AC-SEG-01-1: Un usuario `optometra` sin MFA configurada no puede completar el login (se le obliga a enrolarla).
  - AC-SEG-01-2: Cinco contraseñas erróneas bloquean la cuenta 15 min y se registra el evento; la respuesta no distingue «usuario inexistente».
  - AC-SEG-01-3: Una sesión revocada deja de ser válida en ≤ 1 petición.
  - AC-SEG-01-4: Firmar una atención con MFA > 10 min exige reautenticación.
  - AC-SEG-01-5: No existen contraseñas en texto plano en repositorio, logs ni respuestas de API.
- **Pruebas requeridas:** U (hash, TOTP), I, S (fuerza bruta, enumeración, fijación de sesión), E.

#### SEG-02 · Autorización rol × sede × recurso (CASL + RLS) con pruebas tabla-dirigidas
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** PLT-01, SEG-01.

- **Descripción:** Implementa la matriz §4.4: habilidades CASL construidas desde rol, sedes autorizadas y atributos profesionales, y comprobación en cada Server Action/Route Handler; políticas RLS equivalentes.
- **Reglas de negocio:**
  1. `buildAbility(user)` es la única fuente; ningún `if (role === ...)` disperso en UI o API (la UI oculta, el servidor decide).
  2. Un profesional sin `tarjeta_profesional` vigente **no recibe** la habilidad `firmar`/`prescribir` (A-10, E-03).
  3. El `asesor` obtiene un **DTO reducido** de prescripción (sin diagnóstico, sin ID de HC clínica más allá del número requerido para verificar) — B-04.
  4. Cambio de sede activa: valida contra sedes autorizadas, registra evento y recarga el contexto.
  5. Denegaciones se registran (intentos de acceso no autorizado) con límite de ruido.
- **Campos de datos:** `roles_usuario(usuario_id, sede_id, rol)`, `permisos_extra` (excepciones aprobadas).
- **Estados / flujo:** n/a.
- **Permisos:** Ver §4.4.
- **Requisitos legales asociados:** Res. 1995 arts. 14, 18; D. 1030/2007 arts. 16-19; Ley 372/1997 — B-04, E-03, F-05, A-10.
- **Criterios de aceptación verificables:**
  - AC-SEG-02-1: El test generado desde `matrix.ts` ejecuta ≥ 1 caso por celda y todos pasan.
  - AC-SEG-02-2: Un `asesor` que llama `GET /api/atenciones/:id` recibe 403 y un `GET /api/prescripciones/:id` recibe el DTO reducido sin diagnóstico.
  - AC-SEG-02-3: Intentar editar una prescripción como `asesor` devuelve 403 y registra el intento.
  - AC-SEG-02-4: Cambiar a una sede no autorizada devuelve 403.
- **Pruebas requeridas:** R (generada), S (IDOR, escalada horizontal/vertical), U.

#### SEG-03 · Bitácora de auditoría append-only con hash encadenado (incluye lecturas)
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** PLT-01, SEG-01.

- **Descripción:** Registro inmutable de quién hizo qué, cuándo y desde dónde, incluidas **lecturas** de HC, exportaciones/impresiones, cambios de rol, accesos de soporte y firmas.
- **Reglas de negocio:**
  1. Tabla `auditoria` sin `UPDATE`/`DELETE` (privilegios revocados + trigger que lanza excepción); inserciones desde el rol `optisaas_audit_writer`.
  2. Cadena de hashes: `hash = SHA-256(hash_previo ‖ payload_canónico)` por tenant; un verificador `npm run audit:verify` recorre la cadena.
  3. Eventos mínimos: login/logout/MFA, lectura de R3-R6, creación/firma/adenda, exportación/impresión/descarga, cambios de permisos/rol, anulaciones, break-glass, cambios de configuración, jobs de retención.
  4. Contenido del evento: actor, rol, sede, recurso, id, acción, resultado, IP, agente, `request_id`; **sin copiar contenido clínico** (solo identificadores).
  5. Visor para `admin`/`auditor` con filtros y exportación CSV; alertas por patrones anómalos (muchas lecturas de HC distintas en poco tiempo — umbral configurable).
  6. Retención de la bitácora: al menos la de la HC a la que se refiere; **plazo definitivo por abogado** (L-03 ⚠️ plazo NO VERIFICADO).
- **Campos de datos:** `auditoria(id bigserial, tenant_id, ts timestamptz, actor_id, rol, sede_id, recurso, recurso_id, accion, resultado, ip, agente, request_id, hash_previo, hash)`.
- **Estados / flujo:** Solo inserción.
- **Permisos:** Matriz R19.
- **Requisitos legales asociados:** Res. 1995 art. 18 («quién, hora y fecha»); Ley 2015/2020 art. 8; D. 1377/2013 arts. 26-27 (responsabilidad demostrada) — L-03, A-06, C-11.
- **Criterios de aceptación verificables:**
  - AC-SEG-03-1: `UPDATE auditoria …` y `DELETE FROM auditoria` fallan para todos los roles de la aplicación.
  - AC-SEG-03-2: Abrir una HC genera exactamente un evento `lectura` con actor y sede; abrirla de nuevo genera otro.
  - AC-SEG-03-3: Alterar manualmente una fila (como superusuario en la prueba) hace que `audit:verify` informe la posición exacta rota.
  - AC-SEG-03-4: Ningún evento contiene diagnóstico, valores de fórmula ni texto libre clínico.
- **Pruebas requeridas:** I, S, P (cadena con 10 000 eventos), R.

#### SEG-04 · Marco de inmutabilidad: estados, firma y adenda
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** SEG-01, SEG-03.

- **Descripción:** Mecanismo común (usado por HC, prescripción, consentimientos, anexos y órdenes) para que un registro cerrado sea inalterable y las correcciones se hagan por adendas trazables.
- **Reglas de negocio:**
  1. Estados: `borrador` (editable por su autor; autoguardado) → `firmado` (inmutable). El «borrador» no es el registro oficial hasta que se firma; **interpretación** que debe confirmar el abogado (Q-17/Q-22): se evita así la ventana de edición de 24 h del código actual, que contradice el art. 18.
  2. Triggers de BD impiden `UPDATE`/`DELETE` de filas con `estado='firmado'`, incluso para el rol de la aplicación; el borrado de un `borrador` queda registrado.
  3. **Adenda:** nuevo registro vinculado (`adenda_de`) con motivo, autor, fecha-hora del servidor y referencia al dato corregido; el original permanece visible, nunca sobrescrito.
  4. Hora siempre del **servidor** (no editable); zona `America/Bogota` para presentación.
  5. Folios: numeración consecutiva por HC (`folio` único por paciente) — Res. 1995 art. 7.
  6. Versionado de documentos: cada versión de plantilla (consentimientos, formatos) es inmutable y referenciable.
- **Campos de datos:** Columnas comunes: `estado`, `firmado_por`, `firmado_en`, `hash_contenido`, `folio`, `adenda_de`, `motivo_adenda`.
- **Estados / flujo:** `borrador → firmado`; adenda: `borrador → firmada`.
- **Permisos:** Autor firma; nadie edita lo firmado (ni `admin` ni `owner`).
- **Requisitos legales asociados:** Res. 1995/1999 arts. 5, 7, 18; Ley 2015/2020 art. 8 par. 1 — A-02, A-06, A-07, I-04.
- **Criterios de aceptación verificables:**
  - AC-SEG-04-1: Tras firmar, `UPDATE historias… SET …` falla con error de BD (probado también con el rol de aplicación).
  - AC-SEG-04-2: Crear una adenda deja el original intacto, vincula `adenda_de` y la vista muestra ambos con autor y hora.
  - AC-SEG-04-3: El `hash_contenido` recalculado coincide con el almacenado; si se altera la fila (prueba con superusuario), el verificador lo detecta.
  - AC-SEG-04-4: No existe endpoint `DELETE` sobre registros firmados.
- **Pruebas requeridas:** I, P (propiedad: ninguna secuencia de operaciones modifica un firmado), S.

#### SEG-05 · Autorización de tratamiento de datos, política por tenant y separación de consentimientos
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** SEG-08, PLT-01, ASE-01.

- **Descripción:** Registro probatorio de la autorización de datos personales y sensibles (salud), con texto versionado, finalidades, evidencia y revocación; política de tratamiento publicable por cada óptica; y tres autorizaciones **separadas**.
- **Reglas de negocio:**
  1. Tres instrumentos independientes y nunca agrupados en una casilla: (1) **autorización de datos personales y sensibles**, (2) **consentimiento informado clínico** (OPT-04), (3) **contacto comercial** (opcional, **desmarcado** por defecto).
  2. Texto del instrumento 1 incluye: que **no está obligado** a autorizar datos sensibles, cuáles son, finalidad, derechos, responsable y canales (D. 1377/2013 art. 6). Casilla **no pre-marcada**.
  3. Cada aceptación guarda: titular (o representante), versión y hash del texto, finalidades aceptadas, medio, IP/dispositivo, fecha-hora, firma (SEG-08) y estado de revocación.
  4. Política de tratamiento por tenant con los campos de D. 1377 art. 13 (razón social, domicilio, correo, teléfono, finalidades, derechos, área de PQR, procedimiento, vigencia), URL pública configurable.
  5. Si el titular no autoriza: flujo alterno con datos mínimos; **la tensión entre HC obligatoria y no condicionar la atención a datos sensibles NO se resuelve en código** (C-02 ⚠️, Q-17); el sistema solo registra la negativa y permite continuar según la decisión del responsable.
  6. Textos jurídicos finales los entrega un abogado: el sistema trae **plantillas editables marcadas «borrador sin validación jurídica»**.
- **Campos de datos:** `textos_legales(id, tipo, version, contenido, hash, vigente_desde)`, `autorizaciones(id, tenant_id, paciente_id, texto_id, finalidades[], otorgada bool, representante_id?, medio, evidencia jsonb, firmada_en, revocada_en?)`, `politicas_tratamiento(tenant_id, …)`.
- **Estados / flujo:** `pendiente → otorgada → revocada`; o `negada` (registrada).
- **Permisos:** Recepción (asesor, auxiliar) captura; `admin` administra textos y consulta evidencia; `auditor` lee.
- **Requisitos legales asociados:** Ley 1581 arts. 5, 6, 9, 12, 17; D. 1377/2013 arts. 6, 12, 13; Res. 1995 art. 11 — C-01, C-02, C-03, C-05, I-05, M-02.
- **Criterios de aceptación verificables:**
  - AC-SEG-05-1: Registrar un paciente exige capturar la autorización (otorgada/negada) antes de abrir una atención clínica, salvo urgencia marcada (Ley 1581 art. 10, a validar por abogado).
  - AC-SEG-05-2: La casilla de contacto comercial está desmarcada por defecto y no bloquea el registro.
  - AC-SEG-05-3: Se puede exportar la evidencia de una autorización (texto exacto, hash, hora, medio).
  - AC-SEG-05-4: Cambiar el texto crea una nueva versión sin alterar autorizaciones pasadas.
  - AC-SEG-05-5: Revocar una autorización de contacto detiene todo envío comercial (SEG-16).
- **Pruebas requeridas:** U, I, E, A.

#### SEG-06 · Menores de edad y representante legal
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** ASE-01.

- **Descripción:** Gestión de pacientes menores de 18 años con representante legal identificado, autorización del representante y límites al contacto.
- **Reglas de negocio:**
  1. Edad calculada a partir de la fecha de nacimiento (no digitada); si < 18 ⇒ representante legal **obligatorio** (documento, parentesco, contacto).
  2. Tipos de documento: `RC` (< 7), `TI` (7-17), `CC`, `PA`, `CE`; regla de consecutivo para menores sin documento (cédula del padre/madre + consecutivo).
  3. Autorizaciones (SEG-05) y consentimientos clínicos (OPT-04) de menores los firma el representante; se registra además que se escuchó al menor «según su madurez» (campo informativo).
  4. **Nunca** comunicación comercial dirigida al menor; los mensajes van al representante y solo con su autorización de contacto.
  5. El alcance real del art. 7 Ley 1581 en contexto clínico y la sentencia C-748/2011 ⚠️ NO VERIFICADOS: validar con abogado (Q-17).
- **Campos de datos:** `pacientes.fecha_nacimiento`, `representantes(id, paciente_id, nombre, tipo_doc, num_doc, parentesco, contacto)`.
- **Estados / flujo:** n/a.
- **Permisos:** Recepción y profesionales.
- **Requisitos legales asociados:** Ley 1581 art. 7; D. 1377/2013 art. 12; Res. 1995 art. 6, 9; Ley 23/1981 art. 14-15 (aplicabilidad a optómetras ⚠️) — C-07, A-03, A-04, I-02.
- **Criterios de aceptación verificables:**
  - AC-SEG-06-1: No se puede guardar un paciente de 10 años sin representante.
  - AC-SEG-06-2: Un paciente que cumple 18 años deja de requerir representante pero conserva el histórico de quién firmó.
  - AC-SEG-06-3: Mensajes comerciales a un menor son rechazados por el motor de mensajería.
- **Pruebas requeridas:** U (edad en fecha límite), I, E.

#### SEG-07 · Módulo de Habeas Data y PQR del paciente
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** SEG-04, PLT-11.

- **Descripción:** Radicación y seguimiento de consultas, reclamos y solicitudes de los titulares (acceso, actualización, rectificación, supresión limitada, revocación, copia de HC) con control de plazos.
- **Reglas de negocio:**
  1. Plazos: **consulta 10 días hábiles**; **reclamo 15 días hábiles** prorrogables 8 (Ley 1581 arts. 14-15); semáforo calculado con el calendario de festivos (PLT-11).
  2. Dentro de **2 días hábiles** de recibido un reclamo completo se marca el dato con la leyenda **«reclamo en trámite»** (art. 15 num. 2; art. 18 lit. g).
  3. Rectificación = **adenda** (SEG-04), nunca sobrescritura. Supresión: se explica al titular que la HC no se suprime durante la retención (SEG-09).
  4. El encargado (OptiSaaS) ofrece API/UI para que la óptica solicite actualización con **SLA ≤ 5 días hábiles** (art. 18 lit. d).
  5. Canal de quejas en salud con respuesta escrita y trazabilidad (Ley 1751 art. 10 lit. l).
- **Campos de datos:** `solicitudes_titular(id, tenant_id, paciente_id?, tipo, canal, radicada_en, vence_en, estado, respuesta, respondida_en, adjuntos)`, `banderas_dato(recurso, recurso_id, tipo, desde, hasta)`.
- **Estados / flujo:** `radicada → en_tramite → respondida|prorrogada → cerrada`.
- **Permisos:** Matriz R20.
- **Requisitos legales asociados:** Ley 1581 arts. 8, 14, 15, 18; Ley 1751/2015 art. 10 lits. g, k, l — C-04, D-02, J-01.
- **Criterios de aceptación verificables:**
  - AC-SEG-07-1: Radicar un reclamo calcula `vence_en` = 15 días hábiles (excluye sábados, domingos y festivos cargados) y muestra el semáforo.
  - AC-SEG-07-2: A las 48 h hábiles sin marcar, aparece alerta; al marcar, el dato muestra «reclamo en trámite».
  - AC-SEG-07-3: Una rectificación genera adenda y deja el original visible.
  - AC-SEG-07-4: La respuesta queda archivada con fecha y quién respondió.
- **Pruebas requeridas:** U (cálculo de días hábiles con casos límite), I, E.

#### SEG-08 · Firma electrónica y sellado de documentos (paciente y profesional)
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** SEG-01, SEG-04, SEG-12.

- **Descripción:** Firma de consentimientos, autorizaciones, recibos y HC con evidencia técnica: trazo del paciente, verificación de identidad (OTP), sello de tiempo del servidor y hash del documento; documento final sellado e inalterable.
- **Reglas de negocio:**
  1. **Profesional:** usuario autenticado con MFA + `registro profesional` ⇒ el PDF lleva el sello «Firmado electrónicamente por … (RP …) el … hora».
  2. **Paciente/representante:** trazo con `signature_pad` (MIT ✅) + verificación opcional por OTP (correo o enlace por el canal elegido) + nombre y documento + IP/dispositivo; previo **acuerdo de uso de firma electrónica**.
  3. Sellado: SHA-256 del PDF generado; se guarda hash + metadatos; cualquier cambio invalida el sello. **Sellado de tiempo con TSA externa: opcional** y solo si su licencia/costo cumple la regla del dueño (⚠️ no evaluado).
  4. Firma digital con certificado de entidad acreditada: **no exigida** para HC (Ley 527/1999 art. 7 ✅ firma electrónica confiable y apropiada); validez de firma simple en consentimientos y Decreto 2364/2012 ⚠️ NO VERIFICADO (Q-22).
  5. PDF/A: no garantizado por la librería (ADR-10 ⚠️).
- **Campos de datos:** `firmas(id, tipo_firmante, firmante_id, documento_tipo, documento_id, hash_documento, trazo_png_cifrado, otp_verificado, ip, agente, firmado_en)`.
- **Estados / flujo:** `pendiente → firmado → sellado`.
- **Permisos:** Profesional firma; asesor/auxiliar recoge firma del paciente.
- **Requisitos legales asociados:** Ley 527/1999 arts. 6-9, 12; Res. 1995 arts. 5, 18; Ley 1751 art. 10 — I-03, I-04, A-06.
- **Criterios de aceptación verificables:**
  - AC-SEG-08-1: Un PDF sellado, modificado un byte, falla la verificación (`verify` devuelve `false`).
  - AC-SEG-08-2: Firmar sin MFA reciente o sin tarjeta profesional vigente se rechaza.
  - AC-SEG-08-3: La evidencia de firma del paciente (trazo, hora, IP, OTP) se exporta junto al documento.
  - AC-SEG-08-4: El PDF contiene nombre completo, registro profesional, fecha y hora (Res. 1995 art. 5).
- **Pruebas requeridas:** U (hash/verify), I, S, E.

#### SEG-09 · Retención de 15 años, estados de archivo y bloqueo de eliminación
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** SEG-04, PLT-11.

- **Descripción:** Control del ciclo de vida documental de la HC y sus anexos: retención mínima desde la última atención, archivo de gestión/central, y bloqueo de cualquier eliminación dentro del plazo.
- **Reglas de negocio:**
  1. `fecha_ultima_atencion` por paciente se actualiza al firmar cada atención. Retención por defecto **15 años** (5 gestión + 10 central) ✅; parametrizable al alza (duplicada o permanente por marca manual del responsable).
  2. Estado de archivo calculado: `gestion` (≤ 5 años desde última atención) → `central` (> 5 y ≤ 15) → `elegible_disposicion` (> 15, sin marcas).
  3. Ninguna operación (UI, API, SQL de aplicación) puede eliminar HC con retención vigente; trigger y revocación de privilegios.
  4. La **supresión por solicitud del titular** no aplica a HC dentro de retención: se responde con explicación (SEG-07).
  5. TRD (tablas de retención documental) por tipo documental: HC, prescripción, factura/documentos electrónicos, consentimientos, logs — con **plazos de facturas (art. 632 ET) y de logs ⚠️ NO VERIFICADOS** (defaults provisionales editables, marcados).
  6. Custodio: el tenant. Contrato lo dice (PLT-03).
  7. La política de custodia/retención aplica también a ópticas que **contratan** profesionales de la salud en sus sedes aunque no sean prestadores (Res. 839/2017 art. 12 ✅; Res. 1995 art. 13): el contrato SaaS lo declara y el módulo no se desactiva por tipo de sede (E-04).
- **Campos de datos:** `politica_retencion(tenant_id, tipo_documento, anios, base_normativa, verificado bool)`, `pacientes.fecha_ultima_atencion`, `marcas_retencion(paciente_id, tipo, motivo, por, en)`.
- **Estados / flujo:** `gestion → central → elegible_disposicion → (SEG-10) eliminada_con_acta`.
- **Permisos:** `admin` configura y consulta; nadie elimina.
- **Requisitos legales asociados:** Res. 839/2017 art. 3 (modifica Res. 1995 art. 15); Ley 594/2000 art. 25; D. 1030/2007 art. 6 — B-01, B-04, M-01, G-07 ⚠️. Res. 839/2017 art. 12 — E-04.
- **Criterios de aceptación verificables:**
  - AC-SEG-09-1: Para un paciente cuya última atención fue hace 14 años y 11 meses, intentar eliminar su HC falla con error auditado.
  - AC-SEG-09-2: El estado de archivo se calcula correctamente en los límites (5 años, 15 años) (prueba con fechas fijas).
  - AC-SEG-09-3: Una marca de retención duplicada impide marcar la HC como elegible a los 15 años.
  - AC-SEG-09-4: La política muestra en pantalla qué plazos están ✅ verificados y cuáles ⚠️ son provisionales.
- **Pruebas requeridas:** U (cálculo), I (triggers), P.

#### SEG-10 · Disposición final asistida con acta
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Transversal · **Dependencias:** SEG-09, SEG-08.

- **Descripción:** Flujo para eliminar series documentales vencidas cumpliendo el procedimiento de la Res. 839/2017: informe de elegibles, avisos, valoración secundaria, acta e inventario.
- **Reglas de negocio:**
  1. Eliminación **por series/subseries**, nunca documentos sueltos de una HC (art. 5 par. 2).
  2. Pasos: informe de HC elegibles → registro de **2 avisos en diario de amplia circulación** (8 días entre ellos; plazo de entrega al usuario hasta 2 meses más) → valoración de valor secundario (acta) → aprobación del responsable con MFA → eliminación → **acta de eliminación + inventario** exportables.
  3. Todo el flujo queda en bitácora; las copias de seguridad se depuran según ciclo de vida (L-05).
  4. Fuera de alcance del software: la publicación del aviso en prensa (el sistema solo registra la evidencia).
- **Campos de datos:** `disposiciones(id, tenant_id, serie, estado, avisos jsonb, acta_valoracion, aprobada_por, ejecutada_en, inventario jsonb)`.
- **Estados / flujo:** `propuesta → avisada → valorada → aprobada → ejecutada`.
- **Permisos:** `admin` con MFA reciente (R22).
- **Requisitos legales asociados:** Res. 839/2017 arts. 3-5 — B-02, L-05.
- **Criterios de aceptación verificables:**
  - AC-SEG-10-1: No se puede ejecutar sin los 2 avisos registrados con ≥ 8 días de diferencia.
  - AC-SEG-10-2: Se genera un acta PDF sellada con inventario.
  - AC-SEG-10-3: No hay opción de eliminar un solo documento de una HC.
- **Pruebas requeridas:** I, E.

#### SEG-11 · Registro de incidentes de seguridad y runbook (15 días hábiles)
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** SEG-03, PLT-11.

- **Descripción:** Procedimiento y módulo para registrar, escalar y reportar incidentes de seguridad de datos personales, con alerta del plazo ante la SIC y aviso inmediato a la óptica (responsable).
- **Reglas de negocio:**
  1. Plazo: **15 días hábiles** desde que se detecta y se pone en conocimiento del área encargada (Circular Única SIC Título V 2.1.f(ii), versión Res. SIC 56579/2025 ✅); aplica a responsables y **encargados**.
  2. Aviso a la óptica afectada **de inmediato** (objetivo contractual a fijar con abogado: p. ej. 24-72 h, Q-07).
  3. Campos: detección, alcance, tenants/datos afectados, causa, mitigación, notificaciones enviadas, cierre.
  4. Plantillas de notificación (a la óptica, a la SIC) en borrador para revisión jurídica; **el sistema no envía nada a la SIC**: solo prepara y recuerda.
- **Campos de datos:** `incidentes_seguridad(id, detectado_en, descripcion, tenants_afectados[], datos_afectados, severidad, estado, notif_responsable_en, reporte_sic_en, plazo_sic)`.
- **Estados / flujo:** `detectado → contenido → notificado_responsable → reportado_sic → cerrado`.
- **Permisos:** `owner`/`soporte_plataforma` (plataforma); `admin` ve los que afectan a su tenant.
- **Requisitos legales asociados:** Circular Única SIC Título V 2.1.f(ii); Ley 1581 art. 17 lit. n, 18 lit. k — D-04.
- **Criterios de aceptación verificables:**
  - AC-SEG-11-1: Crear un incidente calcula la fecha límite de 15 días hábiles y genera alertas a T-5, T-2 y T-0.
  - AC-SEG-11-2: Marcar tenants afectados dispara una notificación interna al admin de cada uno y queda en bitácora.
  - AC-SEG-11-3: Existe `docs/seguridad/RUNBOOK_INCIDENTES.md` con roles y pasos.
- **Pruebas requeridas:** U (plazos), I, E.

#### SEG-12 · Gestión de secretos y cifrado (envelope encryption)
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** PLT-02.

- **Descripción:** Cifrado de anexos, respaldos y campos sensibles (secretos MFA, credenciales de adaptadores) con claves por tenant y clave maestra fuera del repositorio.
- **Reglas de negocio:**
  1. AES-256-GCM con `node:crypto`; IV único por mensaje; autenticación del cifrado; claves de datos (DEK) por tenant cifradas con clave maestra (KEK) leída de archivo/variable de entorno fuera del repositorio.
  2. Rotación de KEK sin reescribir datos (re-envoltura de DEK); rotación de DEK con migración en segundo plano.
  3. Secretos de adaptadores (tokens de proveedor de facturación, credenciales OAuth RDA) cifrados en BD y nunca devueltos por API.
  4. El repositorio no contiene claves; `gitleaks`-equivalente en CI **solo si su licencia cumple la regla** (⚠️ no evaluada): alternativa, expresión regular propia en CI.
  5. Cifrado de volumen del servidor: responsabilidad de infraestructura (documentada, no dependencia).
- **Campos de datos:** `claves_datos(tenant_id, version, dek_cifrada, creada_en, activa)`.
- **Estados / flujo:** `activa → rotada → retirada`.
- **Permisos:** Plataforma.
- **Requisitos legales asociados:** Ley 1581 art. 17 lit. d, 18 lit. b; Res. 1995 arts. 16-18; Ley 2015 art. 13 — L-01, B-05, D-03.
- **Criterios de aceptación verificables:**
  - AC-SEG-12-1: Un anexo cifrado leído sin la clave correcta falla; con clave correcta devuelve el original (hash igual).
  - AC-SEG-12-2: Rotar la KEK no cambia los datos descifrados.
  - AC-SEG-12-3: Ningún endpoint devuelve secretos de adaptadores.
- **Pruebas requeridas:** U, I, S.

#### SEG-13 · Endurecimiento de la aplicación web
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** SEG-01.

- **Descripción:** Cabeceras de seguridad, CSP estricta, protección CSRF, límites de tasa, validación de entrada, subida segura de archivos y manejo de errores sin fuga de datos.
- **Reglas de negocio:**
  1. CSP sin `unsafe-inline` donde sea posible, `frame-ancestors 'none'`, HSTS, `Referrer-Policy`, `Permissions-Policy` (cámara solo en páginas de escaneo/AR) mediante cabeceras de Next (`headers()`); `helmet` (MIT ✅) solo si se añade un servidor Node separado.
  2. Cookies `HttpOnly`, `Secure`, `SameSite=Lax`; protección CSRF en acciones mutantes (token por sesión o verificación de `Origin`).
  3. Subidas: lista blanca de tipos MIME verificada por contenido (`file-type`, MIT ✅), tamaño máximo, nombre aleatorio, antivirus **opcional** (ClamAV es GPL ⇒ no se integra; se documenta como control de infraestructura externa).
  4. Errores: `request_id` visible, sin trazas ni datos en respuesta.
  5. Enlaces a PDFs/anexos firmados con expiración (HMAC) y nunca URLs públicas adivinables (L-02).
  6. Dependencias: `npm audit` informativo en CI; política de actualización mensual.
- **Campos de datos:** n/a.
- **Estados / flujo:** n/a.
- **Permisos:** n/a.
- **Requisitos legales asociados:** Ley 1581 art. 18 lit. b, j; Res. 1995 art. 18 — L-02, L-01.
- **Criterios de aceptación verificables:**
  - AC-SEG-13-1: Un escáner de cabeceras interno (prueba) confirma CSP, HSTS y demás en todas las rutas.
  - AC-SEG-13-2: Una petición mutante sin token/origen válido devuelve 403.
  - AC-SEG-13-3: Subir un `.html` renombrado a `.png` es rechazado.
  - AC-SEG-13-4: Un enlace de descarga expirado devuelve 410.
- **Pruebas requeridas:** S (OWASP: XSS, CSRF, IDOR, subida), U.

#### SEG-14 · Acceso de terceros a la HC y consentimiento para compartir
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Transversal · **Dependencias:** SEG-08, SEG-03.

- **Descripción:** Registro de solicitudes de entrega de HC a terceros (EPS, aseguradoras, autoridades judiciales/sanitarias, otras ópticas) con base legal o autorización del paciente, y compartición solo por solicitud.
- **Reglas de negocio:**
  1. No existe «compartir entre ópticas» por defecto; compartir exige autorización granular del titular o requerimiento de autoridad registrado.
  2. Cada entrega se hace con PDF sellado y enlace con expiración; queda en bitácora con base legal.
  3. Para autoridades: adjuntar el oficio; el sistema no decide la procedencia (validación humana del responsable).
  4. **Traslado de HC entre profesionales o sedes** (cambio de profesional tratante, apertura/cierre de sede): acta de traslado firmada con el listado de folios y anexos entregados; la reserva se mantiene (A-08; aplicabilidad de la Ley 23/1981 art. 34, 36 al optómetra: ⚠️ abogado).
- **Campos de datos:** `solicitudes_terceros(id, tenant_id, solicitante, tipo, base_legal, autorizacion_id?, oficio_adjunto, estado, entregada_en)`.
- **Estados / flujo:** `recibida → validada → entregada|rechazada`.
- **Permisos:** `admin` y profesional responsable.
- **Requisitos legales asociados:** Res. 1995 art. 14; Ley 2015/2020 arts. 5-7, 12; Ley 1751 art. 10 — B-07, B-04. Ley 23/1981 arts. 34, 36 (aplicabilidad ⚠️) — A-08.
- **Criterios de aceptación verificables:**
  - AC-SEG-14-1: Entregar HC a un tercero sin base legal o autorización registrada es imposible.
  - AC-SEG-14-2: El enlace de entrega expira en el plazo configurado y cada acceso queda en bitácora.
  - AC-SEG-14-3: Trasladar la HC de un paciente a otra sede del tenant genera acta con folios, hash y firma de quien entrega y de quien recibe.
- **Pruebas requeridas:** I, S, E.

#### SEG-15 · Paquete documental de cumplimiento (plantillas para revisión jurídica)
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Transversal · **Dependencias:** PLT-03.

- **Descripción:** Documentos del repositorio, en `docs/cumplimiento/`, que el abogado debe revisar antes de datos reales: contrato SaaS + anexo de encargo, anexo de seguridad, política de tratamiento (plantilla), aviso de privacidad, manual interno de consultas y reclamos, política de seguridad, análisis de riesgos anual, inventario de subencargados, runbook de incidentes.
- **Reglas de negocio:**
  1. Cada plantilla lleva el encabezado «BORRADOR — no es asesoría jurídica — pendiente de revisión por abogado».
  2. El anexo de encargo contiene al menos: alcances, actividades por cuenta del responsable, obligaciones del encargado (principios, seguridad, confidencialidad), categorías de datos (salud = sensibles, menores), subencargados y países, plazo de devolución/supresión (D-01).
  3. El «Análisis de riesgos» se alimenta con la lista de controles implementados (checklist automática de este repositorio).
  4. Ninguna cláusula promete certificaciones no obtenidas (ISO/IEC 27001 es solo referencia, L-06; Ley 1480 art. 30).
  5. Alcance documental de requisitos **sin software**: C-08 (sanciones SIC, solo justifica prioridades P0; Ley 1581 art. 23 ✅), C-12 (Ley 1266/2008 y Ley 2157/2021: **no se implementan reportes a centrales de riesgo**; ⚠️ texto no leído, Q-16), C-13 (revisar el contenido completo de la Circular Externa 002 de 7-oct-2025 de la SIC antes de firmar contratos de licenciamiento/instalación, ⚠️ solo se leyó el asunto, Q-29), K-05 (seguimiento normativo de la Circular Única: rutina trimestral registrada en `docs/cumplimiento/SEGUIMIENTO_NORMATIVO.md`), J-02 (Res. 13437/1991, derechos del paciente: cartel descargable en recepción, P2, ⚠️ texto no leído), H-06 (remite a A-06/A-07, cubierto por SEG-04).
- **Campos de datos:** Markdown/PDF.
- **Estados / flujo:** n/a.
- **Permisos:** `owner`.
- **Requisitos legales asociados:** Ley 1581 arts. 17-18; D. 1377/2013 arts. 13, 25-27; Circular Única SIC Título V — D-01, D-03, C-05, C-06, C-11, L-01, L-06, M-03. Alcance documental: C-08, C-12, C-13, K-05, J-02, H-06.
- **Criterios de aceptación verificables:**
  - AC-SEG-15-1: Existen los 9 documentos con el encabezado de borrador y una tabla «Pendiente de abogado».
  - AC-SEG-15-2: El checklist de controles se genera desde el código (qué controles P0 están implementados) y se incluye en el análisis de riesgos.
  - AC-SEG-15-3: Ninguna plantilla afirma una certificación (ISO/IEC 27001 u otra) que el producto no tenga (búsqueda automatizada de términos en CI).
- **Pruebas requeridas:** Revisión de contenido (checklist) y enlace roto en CI.

#### SEG-16 · Preferencias de contacto y reglas de envío (Ley 2300/2023)
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Transversal · **Dependencias:** SEG-05, PLT-11, §11.3.

- **Descripción:** Motor común de mensajería (recordatorios, avisos de entrega, campañas) que hace cumplir canales autorizados, ventana horaria, frecuencia y baja inmediata.
- **Reglas de negocio:**
  1. Preferencias por paciente: canal(es) autorizados, consentimiento comercial separado y desmarcado (SEG-05), baja inmediata («STOP»), lista de exclusión.
  2. **Ventana horaria forzada** para comunicaciones comerciales: L-V 7:00-19:00, sáb 8:00-15:00, nunca domingos ni festivos; **máximo 1 contacto al día y no por varios canales en la misma semana** (Ley 2300/2023 arts. 1-5 ✅).
  3. Recordatorios de cita/control y avisos «lentes listos»: ¿servicio o publicidad? **Calificación ⚠️ pendiente de abogado (Q-13)**; hasta entonces se aplican las mismas ventanas y se envían solo al canal que el paciente indicó para ese fin.
  4. Plantillas de publicidad con lista de verificación: sin promesas clínicas («cura», «elimina miopía»), sin comparaciones peyorativas (D. 1030 art. 24; resolución INVIMA de publicidad ⚠️ no localizada).
  5. Todos los envíos pasan por el puerto `MensajeriaPort` (§11.3).
- **Campos de datos:** `preferencias_contacto(paciente_id, canal, autorizado, finalidad, desde, hasta)`, `mensajes(id, tenant_id, paciente_id, canal, tipo, programado_para, enviado_en, estado)`, `exclusiones(contacto_hash)`.
- **Estados / flujo:** `programado → enviado → entregado|fallido`; `bloqueado_por_regla`.
- **Permisos:** Matriz R20/R7.
- **Requisitos legales asociados:** Ley 2300/2023 arts. 1-8; Ley 1581 art. 12; D. 1030/2007 art. 24; Ley 1480 art. 30 — K-04, F-10, K-02.
- **Criterios de aceptación verificables:**
  - AC-SEG-16-1: Un mensaje comercial programado para domingo se reprograma/rechaza con motivo registrado.
  - AC-SEG-16-2: El segundo mensaje comercial del mismo día al mismo paciente se bloquea.
  - AC-SEG-16-3: «STOP» desactiva el canal de inmediato.
  - AC-SEG-16-4: A un menor no se le programa mensaje comercial (SEG-06).
- **Pruebas requeridas:** U (reglas con tabla de casos), I, E.


---

# 7. Rol Administrador (dueño/gerente de la óptica)

El Administrador (propietario/gerente de una o varias sedes) configura la empresa, controla cumplimiento, inventario, compras, facturación electrónica y KPIs. **No accede a contenido clínico** por defecto.

| ID | Funcionalidad | Prio | Fase | Dependencias |
|---|---|---|---|---|
| ADM-01 | Empresa, sedes, tipo de establecimiento, certificados y director científico | P0 | F1 | PLT-02, SEG-02; decisiones Q-01, Q-19. |
| ADM-02 | Usuarios, roles por sede y perfil profesional | P0 | F1 | SEG-01, SEG-02. |
| ADM-03 | Impuestos, numeración y documentos fiscales por sede | P1 | F2 | PLT-11. |
| ADM-04 | Dashboard y KPIs por sede y consolidados (sin datos clínicos) | P1 | F3 | ASE-03, ASE-04. |
| ADM-05 | Catálogo de productos con taxonomía, banderas regulatorias y movimientos de stock | P0 | F2 | PLT-02, PLT-11. |
| ADM-06 | Traslados entre sedes, conteos físicos y kardex | P1 | F3 | ADM-05. |
| ADM-07 | Trazabilidad por lote, vencimiento y registro INVIMA; retiros (recall) | P1 | F3 | ADM-05, ASE-04. |
| ADM-08 | Compras, proveedores y órdenes de compra | P1 | F3 | ADM-05. |
| ADM-09 | Facturación electrónica DIAN a través de puerto intercambiable | P0 | F2 | ADM-03, PLT-11. |
| ADM-10 | Cumplimiento sanitario: saneamiento, residuos, equipos, conceptos y tecnovigilancia | P1 | F3 | ADM-01, SEG-04. |
| ADM-11 | Vista consolidada de garantías, devoluciones y calidad | P1 | F3 | ASE-10. |
| ADM-12 | Convenios (EPS/empresas), promociones y combos | P1 | F3 | ADM-05, ASE-03. |
| ADM-13 | Comisiones de asesores sin incentivar sustitución | P1 | F3 | ASE-03, ASE-10. |
| ADM-14 | Exportación contable (formato configurable para Siigo/World Office) | P1 | F4 | ADM-09; decisión Q-30. |
| ADM-15 | Importación masiva (Excel/CSV) con declaración responsable | P1 | F3 | SEG-05, ASE-01. |
| ADM-16 | Cumplimiento operativo: tablero de pendientes regulatorios | P1 | F3 | ADM-01, ADM-10, SEG-07, PLT-07. |
| ADM-17 | CRM, recalls y campañas segmentadas | P2 | F4 | SEG-16. |
| ADM-18 | Reportes programados, BI básico y API de lectura | P2 | F4 | SEG-02, SEG-03. |
| ADM-19 | Facturación a pagadores y generación de RIPS (Res. 948/2026) — condicionada | P1 | F5 | ADM-09, OPT-02, PLT-11; decisiones Q-02, Q-04. |
| ADM-20 | Booking en línea y tienda en línea (opcional) | P2 | F4 | ASE-02, SEG-05. |
| ADM-21 | Establecimientos de producción: taller y laboratorio como tenant/sede | P2 | F4 | ASE-08, ADM-01. |
| ADM-22 | Retiro del scraping de catálogos y carga de listas de proveedor | P1 | F2 | ADM-05. |

#### ADM-01 · Empresa, sedes, tipo de establecimiento, certificados y director científico
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Administrador · **Dependencias:** PLT-02, SEG-02; decisiones Q-01, Q-19.

- **Descripción:** Cada sede declara qué es (óptica con/sin consultorio, taller, laboratorio, IPS, profesional independiente), su certificado vigente, su código REPS cuando aplica y su director científico; el sistema avisa antes de los vencimientos.
- **Reglas de negocio:**
  1. Tipos de sede: `optica_con_consultorio`, `optica_sin_consultorio`, `taller_optico`, `laboratorio_oftalmico`, `laboratorio_lc_protesis`, `ips`, `profesional_independiente` (D. 1030 arts. 7-15 ✅; E-02).
  2. Certificados (D. 1030 art. 15 ✅): `dispensacion` (óptica sin consultorio), `adecuacion` (taller), `produccion` (laboratorios, INVIMA); **vigencia 5 años**; guardar número, entidad expedidora, fecha de expedición y vencimiento y adjuntar copia. Alertas a 90/60/30 días a `admin` y `director_cientifico`.
  3. Director científico: optómetra u oftalmólogo con título; **máximo 3 establecimientos** (art. 7 par. 2 ✅ y «en el mismo municipio» según el informe legal E-02): el sistema avisa si se excede.
  4. Sede con consultorio: código **REPS** y servicios habilitados (campo libre; **no se codifica un número de servicio**, E-05 ⚠️); fecha de última autoevaluación.
  5. Laboratorios/talleres: el módulo de ventas al público se desactiva (solo venta a ópticas/IPS: art. 20, F-11).
  6. Responsable de tecnovigilancia por sede (F-08).
- **Campos de datos:** `sedes(id, tenant_id, nombre, ciudad, direccion, tipo, reps_codigo?, reps_servicios[], director_cientifico_id, resp_tecnovigilancia_id, estado)`, `certificados_sede(id, sede_id, tipo, numero, entidad, expedido, vence, adjunto_id)`.
- **Estados / flujo:** Certificado: `vigente → por_vencer(90/60/30) → vencido`; sede vencida muestra bloqueo suave (banner) y alerta, y **no** bloquea la atención clínica (decisión a validar por Q-01).
- **Permisos:** `admin` (C/R/U ᵀ); `director_cientifico` recibe alertas; `auditor` R.
- **Requisitos legales asociados:** D. 1030/2007 arts. 7, 10, 11, 15, 20 ✅; Res. 3100/2019 art. 4 (mod. Res. 544/2023 y 465/2025) ✅ / vigencia tras Res. 1732/2026 ⚠️ — E-01, E-02, E-05, F-11.
- **Criterios de aceptación verificables:**
  - AC-ADM-01-1: Al crear una sede `optica_sin_consultorio` sin certificado de dispensación o sin director científico, el sistema la marca «incompleta» y muestra qué falta.
  - AC-ADM-01-2: Un certificado que vence en 29 días genera alerta de 30 días, y vencido genera alerta roja (prueba con reloj simulado).
  - AC-ADM-01-3: Asignar un cuarto establecimiento al mismo director produce advertencia bloqueante con override de `admin` auditado.
  - AC-ADM-01-4: Sede `laboratorio_oftalmico` no ofrece POS al público.
- **Pruebas requeridas:** U (fechas), I, E, R.

#### ADM-02 · Usuarios, roles por sede y perfil profesional
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Administrador · **Dependencias:** SEG-01, SEG-02.

- **Descripción:** Altas, bajas y cambios de usuarios; asignación de rol por sede; perfil profesional con tarjeta/registro obligatorio para quien firma o prescribe.
- **Reglas de negocio:**
  1. Invitación por correo con enlace de un solo uso; el `admin` no puede asignar roles superiores al suyo; no puede desactivarse a sí mismo si es el último admin.
  2. Perfil profesional (`optometra`, `oftalmologo`): tipo de profesional, **número de tarjeta/registro profesional**, entidad, fecha de verificación y **vigencia declarada**; sin registro cargado/vigente ⇒ no firma ni prescribe (A-10).
  3. Verificación del registro: **manual** (el admin confirma y adjunta copia); no se integra con registros oficiales (existencia de API ⚠️ NO VERIFICADA).
  4. Desactivar un usuario conserva su historial y firmas (nunca se borra).
  5. Cada cambio de rol/sede queda en bitácora y exige MFA reciente.
- **Campos de datos:** `usuarios`, `usuarios_sedes(usuario_id, sede_id, rol)`, `perfiles_profesionales(usuario_id, tipo, num_registro, entidad, verificado_por, verificado_en, vigente_hasta, firma_png_cifrada?)`.
- **Estados / flujo:** `invitado → activo → desactivado`.
- **Permisos:** Matriz R18.
- **Requisitos legales asociados:** Ley 372/1997 arts. 2-5, 8-9; Decreto 1340/1998 (texto ⚠️ no leído); D. 1030 art. 16 lit. a; Res. 1995 art. 5 — A-10, E-03, B-04.
- **Criterios de aceptación verificables:**
  - AC-ADM-02-1: Un `optometra` sin registro profesional no ve el botón «firmar»; la API devuelve 403.
  - AC-ADM-02-2: Un `admin` no puede crear otro `owner` ni escalarse permisos.
  - AC-ADM-02-3: Desactivar un usuario mantiene visibles sus firmas históricas.
  - AC-ADM-02-4: El registro y cambio de rol aparecen en la bitácora.
- **Pruebas requeridas:** R, I, S, E.

#### ADM-03 · Impuestos, numeración y documentos fiscales por sede
**Prioridad:** P1 · **Fase:** F2 · **Rol/área:** Administrador · **Dependencias:** PLT-11.

- **Descripción:** Configuración fiscal por tenant y sede: obligación de facturar, resolución/rango de numeración, prefijos, tarifas de impuesto por categoría y vigencia, ambientes (habilitación/producción).
- **Reglas de negocio:**
  1. Flag «obligado a facturar electrónicamente» por tenant con ayuda; **no se asume** que toda óptica es obligada (G-03: confirmar con contador, Q-03).
  2. Registrar: NIT, DV, régimen, resolución de numeración, prefijo, rango, vigencia, ambiente; **sin NIT/habilitación del tenant no se emite** (G-02).
  3. Tarifas: tabla parametrizable (`tarifas_impuesto`) por categoría de producto y fecha; **sin valores por defecto** (G-09 ⚠️).
  4. Retención en la fuente/ICA: fuera de alcance (contabilidad).
- **Campos de datos:** `config_fiscal(tenant_id, sede_id, obligado, nit, dv, resolucion, prefijo, desde, hasta, vence, ambiente, adaptador)`, `tarifas_impuesto`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin`.
- **Requisitos legales asociados:** Res. DIAN 165/2023 arts. 5, 7-8, 11 (compilada en Res. DIAN 227/2025) ✅; IVA ⚠️ — G-02, G-03, G-09.
- **Criterios de aceptación verificables:**
  - AC-ADM-03-1: Sin configuración fiscal completa, el botón «emitir factura» está deshabilitado con explicación.
  - AC-ADM-03-2: El consecutivo no supera el rango; al 90 % del rango se alerta.
  - AC-ADM-03-3: Cambiar la tarifa de una categoría no modifica ventas cerradas.
- **Pruebas requeridas:** U, I.

#### ADM-04 · Dashboard y KPIs por sede y consolidados (sin datos clínicos)
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ASE-03, ASE-04.

- **Descripción:** Tableros de ventas, ticket promedio, conversión examen→venta, entregas a tiempo, rotación de inventario, garantías, saldos pendientes, metas por sede y asesor.
- **Reglas de negocio:**
  1. Solo agregados; nunca diagnósticos ni valores de fórmula individuales (B-04).
  2. Filtros por sede (resuelve el pendiente «algunas pantallas no filtran por sede»), rango de fechas y asesor.
  3. Metas y presupuestos por sede; comparación contra periodo anterior.
  4. Exportación CSV auditada.
  5. Cálculos en SQL con índices; paginación; sin recalcular en el cliente.
- **Campos de datos:** Vistas materializadas `kpi_*`; `metas(sede_id, periodo, tipo, valor)`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin` ᵀ; `asesor`/`optometra` solo propios (R21).
- **Requisitos legales asociados:** Res. 1995 art. 14 (reserva); Ley 1581 art. 4 lit. d — B-04.
- **Criterios de aceptación verificables:**
  - AC-ADM-04-1: Cambiar la sede activa recalcula todos los KPIs con datos solo de esa sede (prueba comparando con consulta SQL independiente).
  - AC-ADM-04-2: Ningún endpoint de KPIs devuelve campos clínicos.
  - AC-ADM-04-3: Un `asesor` ve solo sus ventas.
- **Pruebas requeridas:** I (valores esperados), R, E.

#### ADM-05 · Catálogo de productos con taxonomía, banderas regulatorias y movimientos de stock
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Administrador · **Dependencias:** PLT-02, PLT-11.

- **Descripción:** Catálogo unificado de todos los productos del sector (ver §10.2) con atributos específicos por categoría, bandera regulatoria y stock por sede con movimientos (compra, venta, ajuste, devolución).
- **Reglas de negocio:**
  1. Cada producto tiene `clase_regulatoria`: `dispositivo_sobre_medida_d1030`, `dispositivo_medico_estandar_d4725`, `no_dispositivo_accesorio`, `por_clasificar` (**configurable**; la lista oficial de productos es la Res. 4396/2008 ⚠️ no leída) — F-01.
  2. Productos «venta bajo prescripción» (lentes oftálmicos, lentes de contacto) activan la regla de bloqueo (ASE-07).
  3. Atributos por categoría (§10.2): montura (marca, referencia, color, calibre-puente-varilla, material, género), lente (material, índice, diseño, tratamientos), LC (curva base, diámetro, poder, reemplazo, fabricante), líquido (registro INVIMA, lote, vencimiento), gafa de lectura (registro sanitario ⚠️ concepto INVIMA 2038222/2018), gafa de sol (categoría de filtro, protección UV declarada; norma ⚠️ NO VERIFICADA), accesorios.
  4. Código de barras Code 128 (JsBarcode, MIT) y/o EAN; etiquetas imprimibles.
  5. Stock por `(sede, producto, lote)` derivado de **movimientos inmutables** (`stock_movimientos`); nunca se edita un saldo directamente; los ajustes exigen motivo y, sobre umbral, aprobación (R13).
  6. Costos y precios en COP enteros; margen por categoría (`configuracion_margenes`).
  7. Alertas: stock mínimo; producto sin costo; margen atípico; vencimiento próximo (LC y soluciones).
  8. **Venta de producto vencido o sin registro** (cuando la categoría lo exige) bloqueada (F-09).
- **Campos de datos:** `productos(id, tenant_id, categoria, sku, nombre, marca, atributos jsonb, clase_regulatoria, venta_bajo_prescripcion, requiere_lote, requiere_registro_invima, registro_invima, impuesto_id, costo_cop, precio_cop, activo)`, `stock_movimientos(id, sede_id, producto_id, lote_id?, tipo, cantidad, costo_unit_cop, ref_tipo, ref_id, motivo, por, en)`, `lotes(id, producto_id, codigo, vence, registro_invima?, fabricante?, proveedor_id)`.
- **Estados / flujo:** Producto `borrador → activo → descontinuado`.
- **Permisos:** `admin` C/R/U; `asesor` R; `optometra` R.
- **Requisitos legales asociados:** D. 1030/2007 arts. 1, 18-19 ✅; D. 4725/2005 arts. 2, 5, 7, 10 ✅ (registro sanitario ⚠️); Ley 1480 art. 23 — F-01, F-04, F-09, K-01.
- **Criterios de aceptación verificables:**
  - AC-ADM-05-1: El saldo de un producto es siempre la suma de sus movimientos (prueba de propiedad con operaciones aleatorias).
  - AC-ADM-05-2: Un lente marcado «bajo prescripción» no puede añadirse a una venta sin prescripción (cubre ASE-07).
  - AC-ADM-05-3: Un producto con lote vencido no se puede vender y aparece en alerta.
  - AC-ADM-05-4: Existen productos de ejemplo de **todas** las categorías del §10.2 en el seed demo.
- **Pruebas requeridas:** U, I, P, E.

#### ADM-06 · Traslados entre sedes, conteos físicos y kardex
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ADM-05.

- **Descripción:** Operaciones de inventario multisede: traslados con recepción, conteos totales/parciales con diferencias, kardex por producto/lote, reservas.
- **Reglas de negocio:**
  1. Traslado: `solicitado → despachado (descuenta origen) → en_transito → recibido (suma destino) | rechazado`; diferencias en recepción generan ajuste con motivo.
  2. Conteo físico: congela referencia, captura por lector de código (cámara con `html5-qrcode` Apache-2.0 ✅ o `@zxing/library` Apache-2.0 ✅), compara y genera ajustes aprobados.
  3. Kardex exportable (CSV/PDF) con saldo inicial, entradas, salidas y saldo.
  4. Reservas de producto para un cliente con vencimiento.
- **Campos de datos:** `traslados(id, origen_sede_id, destino_sede_id, estado, …)`, `traslado_items`, `conteos`, `conteo_items`, `reservas`.
- **Estados / flujo:** Ver reglas.
- **Permisos:** `admin` ᵀ; `asesor` solicita (S) y recibe ˢ.
- **Requisitos legales asociados:** D. 1030/2007 art. 6 (registro de procesos y conservación) — F-06.
- **Criterios de aceptación verificables:**
  - AC-ADM-06-1: Un traslado despachado y recibido deja stock origen −n, destino +n y 2 movimientos enlazados.
  - AC-ADM-06-2: Un conteo con diferencia no cambia stock hasta aprobación; luego genera movimiento de ajuste.
  - AC-ADM-06-3: El kardex de un producto reproduce exactamente el saldo.
- **Pruebas requeridas:** I, P, E.

#### ADM-07 · Trazabilidad por lote, vencimiento y registro INVIMA; retiros (recall)
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ADM-05, ASE-04.

- **Descripción:** Control de lotes y vencimientos para lentes de contacto, soluciones y demás dispositivos con registro, y consulta inversa lote→ventas para alertas y retiros.
- **Reglas de negocio:**
  1. Para categorías que lo exigen: lote, vencimiento, registro sanitario/notificación, fabricante/importador, proveedor, factura de compra.
  2. Consulta inversa: dado un lote, listar pacientes/ventas afectadas (para contacto por el responsable, respetando SEG-16).
  3. FEFO (primero vence, primero sale) sugerido en la venta.
  4. Régimen de registro sanitario por clase y aplicabilidad de CCAA (Res. 4002/2007) a ópticas minoristas: **⚠️ NO VERIFICADO** — el sistema solo registra y alerta, no certifica cumplimiento.
- **Campos de datos:** `lotes`, `ventas_items.lote_id`, `alertas_invima(id, titulo, lote_afectado, descripcion, fecha)`.
- **Estados / flujo:** Lote `activo → por_vencer → vencido|retirado`.
- **Permisos:** `admin`; `asesor` R.
- **Requisitos legales asociados:** D. 4725/2005 arts. 5, 7, 10; D. 1030 arts. 25-26; Res. 4816/2008 — F-09, F-08.
- **Criterios de aceptación verificables:**
  - AC-ADM-07-1: Buscar un lote devuelve todas las ventas que lo contienen.
  - AC-ADM-07-2: Un lote retirado no es vendible y el stock se segrega.
  - AC-ADM-07-3: La venta sugiere el lote que vence primero.
- **Pruebas requeridas:** I, E.

#### ADM-08 · Compras, proveedores y órdenes de compra
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ADM-05.

- **Descripción:** Gestión de proveedores y compras con recepción que genera movimientos de stock y lotes; costos promedio.
- **Reglas de negocio:**
  1. Orden de compra → recepción (total/parcial) → factura del proveedor (número, fecha, valor).
  2. Al recibir: crear/actualizar lotes y registro INVIMA cuando la categoría lo requiere.
  3. Costo promedio ponderado por producto (política configurable); histórico de costos.
  4. **Documento soporte en adquisiciones a no obligados a facturar**: fuera del MVP (G-06 ⚠️: Decreto 358/2020, Ley 2155/2021 y art. 618 ET no leídos); se deja el campo `proveedor_no_obligado` y un adaptador futuro.
- **Campos de datos:** `proveedores`, `ordenes_compra`, `compras`, `compra_items`, `recepciones`.
- **Estados / flujo:** `borrador → emitida → parcial → recibida → cerrada | anulada`.
- **Permisos:** `admin`.
- **Requisitos legales asociados:** D. 1030 art. 6; Ley 1581 (datos de proveedores) — F-06; G-06 ⚠️.
- **Criterios de aceptación verificables:**
  - AC-ADM-08-1: Recibir 10 unidades suma 10 al stock de la sede de destino con movimiento y lote.
  - AC-ADM-08-2: El costo promedio se recalcula correctamente (casos de prueba con valores fijos).
  - AC-ADM-08-3: Una compra anulada revierte sus movimientos con contra-asiento.
- **Pruebas requeridas:** U, I, E.

#### ADM-09 · Facturación electrónica DIAN a través de puerto intercambiable
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Administrador · **Dependencias:** ADM-03, PLT-11.

- **Descripción:** Emisión de factura electrónica de venta, tiquete POS electrónico (documento equivalente) y notas crédito/débito por medio de `FacturacionPort`; el producto funciona con un adaptador gratuito/manual y admite proveedores externos pagados por el cliente.
- **Reglas de negocio:**
  1. Decisión de camino (G-01, Q-03): **no se codifica un único proveedor**. Adaptadores en §11.1: `simulado` (solo desarrollo/demo), `solucion_gratuita_dian_asistida` (genera paquete de datos para captura manual; **API ⚠️ no verificada**), `proveedor_http_generico` (Factus u otro, credenciales del propio cliente), `ubl21_propio` (F4+, P2).
  2. Se emite **al cerrar la venta** (no después) con adquirente identificado (nombre/razón social, tipo y número de documento; consumidor final si aplica) — G-02 ✅.
  3. **Nunca** se borra ni edita una factura: anulación/devolución/ajuste = **nota crédito/débito** con referencia a prefijo, número, **CUFE** y fecha del original, numeración propia y CUDE (G-04 ✅); afecta inventario y caja.
  4. **Minimización (G-08):** descripciones comerciales solamente («Lente oftálmico CR-39 antirreflejo», «Montura ref. X»); validador **bloquea** diagnóstico, graduación/fórmula, nº de HC u observaciones clínicas en líneas y notas.
  5. POS: documento equivalente electrónico (tiquete POS) en lugar de tiquete de papel; contingencia/caída de internet según norma (art. 37 de la Res. 165 ⚠️ no leído a fondo) — el sistema encola y reintenta, y marca el documento como «pendiente de transmisión».
  6. Conservación de XML firmado + CUFE/CUDE + representación gráfica: por defecto **≥ 5 años, provisional** (art. 632 ET ⚠️ NO VERIFICADO; Q-07), exportable (G-07).
  7. Modo `simulado` jamás activo en `APP_ENV=produccion` (PLT-10) y todo documento simulado lleva la leyenda «SIMULACIÓN — SIN VALIDEZ FISCAL»; `cufe` simulados se rotulan `SIM-…`.
  8. Documento soporte, nómina electrónica y RADIAN: fuera de alcance (G-06 ⚠️).
- **Campos de datos:** `documentos_electronicos(id, tenant_id, sede_id, venta_id, tipo[fev|pos|nc|nd], prefijo, numero, cufe, cude, estado[pendiente|transmitido|aceptado|rechazado|simulado], xml_cifrado_id, pdf_id, referencia_id?, respuesta_proveedor jsonb, creado_en)`.
- **Estados / flujo:** `borrador → pendiente_transmision → transmitido → aceptado | rechazado → (reintento|nota crédito)`.
- **Permisos:** `asesor` emite en venta (C); `admin` aprueba notas crédito (S) y exporta (X); lectura según R11.
- **Requisitos legales asociados:** Res. DIAN 165/2023 arts. 5, 11, 15-16, 23, 28, 36, 55-56, 64 (compilada en Res. DIAN 227/2025) ✅; art. 37 y anexo posterior a v1.9 ⚠️; Ley 527/1999 arts. 12-13; Ley 1581 art. 4 — G-01, G-02, G-04, G-05, G-07, G-08.
- **Criterios de aceptación verificables:**
  - AC-ADM-09-1: Con el adaptador simulado, una venta genera un documento con leyenda de simulación y estado `simulado`; con `APP_ENV=produccion` el arranque falla si ese adaptador está activo.
  - AC-ADM-09-2: No existe endpoint para editar o borrar un documento `aceptado`; la devolución crea nota crédito vinculada al CUFE original.
  - AC-ADM-09-3: Una línea con texto que contiene «miopía», «OD», «esfera» o un nº de HC es rechazada por el validador.
  - AC-ADM-09-4: Sustituir el adaptador `simulado` por un adaptador de prueba (contrato HTTP simulado) no requiere cambios en `ventas/*` (prueba de contrato del puerto).
  - AC-ADM-09-5: Una caída del proveedor deja el documento `pendiente_transmision` y se reintenta con backoff (pg-boss).
- **Pruebas requeridas:** U (validador, numeración), I (nota crédito), prueba de contrato del puerto (mismo test para todos los adaptadores), E.

#### ADM-10 · Cumplimiento sanitario: saneamiento, residuos, equipos, conceptos y tecnovigilancia
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ADM-01, SEG-04.

- **Descripción:** Migra a BD (append-only) los módulos de «Secretaría de Salud» existentes: lecturas ambientales, residuos, desinfección, equipos médicos con calibración, concepto sanitario, saneamiento, y suma tecnovigilancia con reloj de 72 h.
- **Reglas de negocio:**
  1. Registros con fecha/hora/autor del servidor, no editables (corrección por anotación nueva).
  2. Equipos: registro INVIMA, clasificación de riesgo, mantenimiento/calibración con alertas de vencimiento.
  3. **Tecnovigilancia** (D. 1030 arts. 25-26; Res. 4816/2008 ✅): evento/incidente adverso con dispositivo (paciente, dispositivo, lote, descripción, gravedad), clasificación serio/no serio; **serio ⇒ alerta de 72 h** para reporte a INVIMA; **no serios ⇒ consolidado trimestral** exportable. El sistema **no envía** a INVIMA: prepara el reporte.
  4. Responsable de tecnovigilancia designado por sede (ADM-01).
  5. Estas bitácoras son **requisitos de habilitación del consultorio** cuyo alcance exacto en el Manual de Habilitación ⚠️ no fue leído: el módulo es una ayuda, no una garantía de habilitación.
- **Campos de datos:** Tablas existentes (`equipos_medicos`, `lecturas_ambientales`, `registros_residuos`, `registros_desinfeccion`, `concepto_sanitario`, `saneamiento_logs`) + `eventos_adversos(id, sede_id, dispositivo, lote, gravedad, descripcion, reportado_invima_en, estado)`.
- **Estados / flujo:** Evento: `registrado → en_investigacion → reportado|cerrado_interno`.
- **Permisos:** `admin` C/R/U; `optometra` C (eventos); `asesor` R.
- **Requisitos legales asociados:** D. 1030 arts. 25-26; Res. 4816/2008 arts. 12-16 ✅; Res. 3100/2019 (⚠️ detalle de estándares) — F-08, F-06, E-01.
- **Criterios de aceptación verificables:**
  - AC-ADM-10-1: Un evento «serio» muestra cuenta regresiva de 72 h y alerta al responsable.
  - AC-ADM-10-2: El reporte trimestral exporta todos los eventos no serios del periodo.
  - AC-ADM-10-3: No es posible editar un registro de residuos ya guardado (solo anotación correctiva).
- **Pruebas requeridas:** I, U (reloj), E.

#### ADM-11 · Vista consolidada de garantías, devoluciones y calidad
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ASE-10.

- **Descripción:** Tablero administrativo de garantías/posventa por sede, costos asumidos (óptica vs. paciente), causas, laboratorio responsable y tiempos.
- **Reglas de negocio:**
  1. Indicadores: % de garantías sobre ventas, tiempo de resolución, costo por causa y laboratorio.
  2. Alertas de garantías por vencer.
  3. El director científico recibe los casos de calidad (D. 1030 art. 21).
- **Campos de datos:** Vistas sobre `garantias`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin`, director científico.
- **Requisitos legales asociados:** D. 1030 art. 21; Ley 1480/2011 arts. 7-8, 11 — F-07, K-06.
- **Criterios de aceptación verificables:**
  - AC-ADM-11-1: Los totales coinciden con la suma de garantías individuales.
  - AC-ADM-11-2: Filtra por sede y laboratorio.
- **Pruebas requeridas:** I, E.

#### ADM-12 · Convenios (EPS/empresas), promociones y combos
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ADM-05, ASE-03.

- **Descripción:** Tarifas especiales por convenio, promociones y combos (montura + lentes) con vigencia y reglas claras.
- **Reglas de negocio:**
  1. Convenio: cliente (empresa/EPS/caja de compensación), vigencia, tarifario o descuento por categoría, documentos requeridos.
  2. Promociones: tipo (porcentaje, monto fijo, combo, segunda unidad), vigencia, días/horas, categorías, tope de usos; **histórico de promociones publicadas** (Ley 1480 art. 30 ✅: publicidad engañosa).
  3. **Ninguna promoción puede inducir la sustitución del dispositivo prescrito** (D. 1030 art. 19 lit. d ✅): las reglas de combos solo aplican sobre ítems que cumplen la prescripción verificada (ASE-07).
  4. Facturación a EPS **con contrato**: requiere RIPS solo si aplica (Q-02/Q-04, ADM-19).
- **Campos de datos:** `convenios`, `convenio_tarifas`, `promociones`, `promocion_usos`.
- **Estados / flujo:** `borrador → vigente → vencida`.
- **Permisos:** `admin` C/R/U; `asesor` R.
- **Requisitos legales asociados:** Ley 1480 arts. 23, 30; D. 1030 art. 19, 24 — K-02, F-05, F-10, K-01.
- **Criterios de aceptación verificables:**
  - AC-ADM-12-1: Una promoción fuera de vigencia no se aplica en POS.
  - AC-ADM-12-2: Un combo no se aplica si los lentes no corresponden a la prescripción verificada.
  - AC-ADM-12-3: Se conserva el historial de versiones de cada promoción.
- **Pruebas requeridas:** U (reglas), I, E.

#### ADM-13 · Comisiones de asesores sin incentivar sustitución
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ASE-03, ASE-10.

- **Descripción:** Cálculo de comisiones por venta/meta con reglas simples y trazables, visibles al asesor.
- **Reglas de negocio:**
  1. Esquemas: porcentaje sobre venta neta, por categoría o por meta; se calculan sobre ventas **cerradas y entregadas**, y se revierten con devoluciones/notas crédito.
  2. **Prohibido** configurar comisión adicional ligada a sustituir lo prescrito (F-05): el motor rechaza reglas que premien «upsell» sobre un ítem distinto al de la prescripción.
  3. Cierre de periodo con acta; exportación.
- **Campos de datos:** `esquemas_comision`, `comisiones(id, asesor_id, venta_id, monto_cop, periodo, estado)`.
- **Estados / flujo:** `causada → liquidada → pagada | revertida`.
- **Permisos:** `admin` configura; `asesor` ve las propias (R16).
- **Requisitos legales asociados:** D. 1030 art. 19 lit. d — F-05.
- **Criterios de aceptación verificables:**
  - AC-ADM-13-1: Una devolución revierte la comisión proporcional.
  - AC-ADM-13-2: Crear una regla «bono por cambiar el lente prescrito» es rechazado con mensaje.
- **Pruebas requeridas:** U, I.

#### ADM-14 · Exportación contable (formato configurable para Siigo/World Office)
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Administrador · **Dependencias:** ADM-09; decisión Q-30.

- **Descripción:** Exportación de ventas, compras, caja e impuestos a archivos CSV/plano con plantilla de mapeo configurable por tenant.
- **Reglas de negocio:**
  1. **Los formatos de importación de Siigo/World Office ⚠️ no fueron verificados:** se entrega un exportador genérico con mapeo de columnas editable y plantillas «a validar con el contador», no un formato oficial.
  2. Incluye totales por tarifa, forma de pago y centro de costo (sede).
  3. Exportación auditada (X).
- **Campos de datos:** `plantillas_exportacion(tenant_id, destino, mapeo jsonb)`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin`.
- **Requisitos legales asociados:** Sin norma verificada específica; art. 632 ET (conservación) ⚠️.
- **Criterios de aceptación verificables:**
  - AC-ADM-14-1: Exportar un mes produce CSV cuyos totales coinciden con el reporte de ventas.
  - AC-ADM-14-2: Cambiar el mapeo modifica columnas sin cambiar datos.
- **Pruebas requeridas:** I, P.

#### ADM-15 · Importación masiva (Excel/CSV) con declaración responsable
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** SEG-05, ASE-01.

- **Descripción:** Carga de pacientes, productos y proveedores desde archivos, con plantillas, validación, vista previa y reporte de errores.
- **Reglas de negocio:**
  1. Librerías: `exceljs` (MIT ✅) o `read-excel-file` (MIT ✅) y `papaparse` (MIT ✅). **No** `xlsx` de npm (Apache-2.0 pero estancado en 0.18.5 y con avisos de seguridad conocidos: tratar como ⚠️ no recomendado).
  2. **Pacientes:** antes de importar datos de salud el responsable declara (checkbox + acta) que cuenta con la autorización de los titulares (D-06) — queda como evidencia.
  3. Modo «simulacro» (valida sin escribir) y modo «aplicar»; deduplicación por tipo+número de documento (A-03).
  4. Límites de tamaño y de filas; procesamiento en cola (pg-boss); reporte descargable de filas rechazadas.
  5. Nunca se importan HC clínicas como «firmadas» (migración de HC históricas = anexos PDF vinculados al paciente, con rótulo «migrada», decisión Q-01).
- **Campos de datos:** `importaciones(id, tenant_id, tipo, archivo_hash, estado, filas_ok, filas_error, declaracion_id)`.
- **Estados / flujo:** `cargada → validada → aplicada | fallida`.
- **Permisos:** `admin` (X).
- **Requisitos legales asociados:** Ley 1581 art. 17 lit. e-h; art. 12 — D-06, A-03.
- **Criterios de aceptación verificables:**
  - AC-ADM-15-1: Un archivo con 1000 filas y 20 inválidas importa 980 y descarga las 20 con motivo.
  - AC-ADM-15-2: Sin declaración responsable no se puede aplicar una importación de pacientes.
  - AC-ADM-15-3: Reimportar el mismo archivo no duplica pacientes.
- **Pruebas requeridas:** U, I, E.

#### ADM-16 · Cumplimiento operativo: tablero de pendientes regulatorios
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Administrador · **Dependencias:** ADM-01, ADM-10, SEG-07, PLT-07.

- **Descripción:** Tablero único para `admin`/director científico con todo lo vencido o por vencer: certificados, calibraciones, conceptos sanitarios, registros profesionales, consentimientos faltantes, reclamos Habeas Data, eventos de tecnovigilancia, respaldos, retención.
- **Reglas de negocio:**
  1. Semáforos y fechas; enlaces directos a la acción.
  2. No muestra contenido clínico; solo conteos e IDs.
  3. Exporta un «informe de cumplimiento» PDF sellado (evidencia para auditorías, responsabilidad demostrada C-11).
- **Campos de datos:** Vistas.
- **Estados / flujo:** n/a.
- **Permisos:** `admin`, `auditor`.
- **Requisitos legales asociados:** D. 1377/2013 arts. 26-27; D. 1030 arts. 15, 26 — C-11, E-02, F-08.
- **Criterios de aceptación verificables:**
  - AC-ADM-16-1: Cada fuente de alerta (≥ 8) aparece con conteo correcto en datos de prueba.
  - AC-ADM-16-2: El PDF se firma/sella (SEG-08).
- **Pruebas requeridas:** I, E.

#### ADM-17 · CRM, recalls y campañas segmentadas
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Administrador · **Dependencias:** SEG-16.

- **Descripción:** Segmentación de pacientes para recordatorios de control, cumpleaños y campañas, respetando consentimiento y reglas de envío.
- **Reglas de negocio:**
  1. Segmentos por última visita, tipo de producto, convenio; **sin usar diagnósticos** como criterio (reserva).
  2. Todo envío pasa por SEG-16; métricas de entrega sin datos clínicos.
- **Campos de datos:** `segmentos`, `campanas`.
- **Estados / flujo:** `borrador → programada → ejecutada`.
- **Permisos:** `admin`.
- **Requisitos legales asociados:** Ley 2300/2023; Ley 1581 arts. 4, 12; D. 1030 art. 24 — K-04, F-10.
- **Criterios de aceptación verificables:**
  - AC-ADM-17-1: Un segmento no puede definirse por diagnóstico.
  - AC-ADM-17-2: Pacientes sin autorización comercial se excluyen automáticamente.
- **Pruebas requeridas:** U, I.

#### ADM-18 · Reportes programados, BI básico y API de lectura
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Administrador · **Dependencias:** SEG-02, SEG-03.

- **Descripción:** Reportes configurables, programados por correo (sin datos clínicos) y API REST de solo lectura con claves por tenant.
- **Reglas de negocio:**
  1. Claves de API con alcance (recursos permitidos), expiración y auditoría; limitación de tasa.
  2. Sin endpoint con datos clínicos en la API pública inicial.
  3. Reportes con Recharts (MIT) y exportación CSV.
- **Campos de datos:** `api_claves(id, tenant_id, hash, alcance[], expira)`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin`.
- **Requisitos legales asociados:** Ley 1581 art. 18 lit. b; L-02.
- **Criterios de aceptación verificables:**
  - AC-ADM-18-1: Una clave sin alcance de `ventas` recibe 403 en ventas.
  - AC-ADM-18-2: Toda llamada queda en la bitácora.
- **Pruebas requeridas:** S, I.

#### ADM-19 · Facturación a pagadores y generación de RIPS (Res. 948/2026) — condicionada
**Prioridad:** P1 · **Fase:** F5 · **Rol/área:** Administrador · **Dependencias:** ADM-09, OPT-02, PLT-11; decisiones Q-02, Q-04.

- **Descripción:** Módulo opcional para sedes que facturan servicios de salud a EPS/ERP con contrato: generación del RIPS en JSON desde HC y facturación, validación con el mecanismo único del Ministerio, almacenamiento del CUV y control del plazo de radicación.
- **Reglas de negocio:**
  1. **Solo se activa si Q-02/Q-04 confirman que aplica** (venta particular no exige RIPS; alcance a ópticas con consultorio ⚠️ NO VERIFICADO). Es **P0 únicamente si el primer piloto factura a EPS** (informe legal H-01).
  2. Marco vigente: **Res. 948 del 14-may-2026** (deroga Res. 2275/2023, 558 y 1884 de 2024) ✅: RIPS como soporte de la FEV en salud; flujo FEV validada por DIAN → validación única del RIPS → **CUV** → radicación ante la ERP en **22 días hábiles**; reglas pasan de notificación a **rechazo** desde 1-jun-2026 y ajustes estructurales desde 1-jul-2026 ✅.
  3. Generador **versionado** (el anexo técnico cambia; spec: micrositio MinSalud/SISPRO, Res. 948 art. 10 ✅); suite de pruebas con el validador oficial **si es de uso gratuito** (⚠️ no verificado).
  4. Notas crédito/débito actualizan el RIPS; el soporte clínico va por RIPS, **no** por la factura (G-08).
  5. Catálogos (CUPS, CIE-10, tablas) se cargan de fuentes oficiales; **no inventar listas** (H-04).
- **Campos de datos:** `rips_envios(id, tenant_id, documento_id, version_anexo, json, estado, cuv, radicado_en, vence_radicacion)`.
- **Estados / flujo:** `borrador → validado (CUV) → radicado | rechazado → corregido`.
- **Permisos:** `admin`.
- **Requisitos legales asociados:** Res. 948 de 2026 arts. 2, 4, 6, 7, 8, 10, 15, 23 ✅; Res. 866/2021 ⚠️ catálogos — H-01, H-02, H-04.
- **Criterios de aceptación verificables:**
  - AC-ADM-19-1: Con la bandera «factura a pagadores» desactivada, el módulo no aparece.
  - AC-ADM-19-2: Para una factura de prueba se genera el JSON conforme al esquema de la versión configurada; la prueba falla si cambia la versión sin actualizar el generador.
  - AC-ADM-19-3: El plazo de 22 días hábiles se calcula y alerta.
- **Pruebas requeridas:** U (esquema), I, E; validador oficial ⚠️.

#### ADM-20 · Booking en línea y tienda en línea (opcional)
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Administrador · **Dependencias:** ASE-02, SEG-05.

- **Descripción:** Página pública de reserva de citas y, opcionalmente, catálogo/tienda con datos del proveedor, retracto y condiciones.
- **Reglas de negocio:**
  1. **Booking:** solo datos mínimos (sin motivo clínico); autorización de datos antes de confirmar; anti-abuso.
  2. **Tienda:** si se habilita (Q-12), debe mostrar razón social, NIT, dirección de notificación judicial, teléfono y correo (Ley 1480 art. 50 ✅), información de retracto y sus excepciones por producto (`retractable`) — lentes con fórmula y bienes personalizados suelen exceptuarse (art. 47 ✅); lentes de contacto y monturas estándar: **discutible ⚠️ (abogado, Q-12)**; pedido sobre medida exige prescripción antes de producir (F-04).
  3. Pagos en línea: **fuera** (sin pasarela; ver §11.2): pago contra entrega o transferencia.
  4. Registro de aceptación de T&C (art. 48).
- **Campos de datos:** `reservas_publicas`, `tienda_config`.
- **Estados / flujo:** Reserva `solicitada → confirmada`.
- **Permisos:** Público + `admin`.
- **Requisitos legales asociados:** Ley 1480/2011 arts. 46-51 (mod. Ley 2439/2024) ✅ — K-03, K-01.
- **Criterios de aceptación verificables:**
  - AC-ADM-20-1: Una reserva pública no revela disponibilidad de otros pacientes ni datos clínicos.
  - AC-ADM-20-2: La tienda no se publica si faltan los datos del art. 50.
- **Pruebas requeridas:** E, S (abuso, enumeración).

#### ADM-21 · Establecimientos de producción: taller y laboratorio como tenant/sede
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Administrador · **Dependencias:** ASE-08, ADM-01.

- **Descripción:** Soporte para quienes operan taller óptico o laboratorio oftálmico: recepción de pedidos de ópticas, producción, trazabilidad y entrega, sin venta al público.
- **Reglas de negocio:**
  1. Clientes solo de tipo óptica/IPS con certificado válido (D. 1030 art. 20 ✅).
  2. Bitácora de proceso por orden (recepción, producción, QC, despacho) con responsable y hora (art. 6).
  3. Catálogo de lentes producidos y capacidades (rangos de potencia) para validar pedidos.
- **Campos de datos:** `clientes_laboratorio`, `pedidos_laboratorio`.
- **Estados / flujo:** Igual a ASE-08 del lado proveedor.
- **Permisos:** `admin`, `tecnico_lab`.
- **Requisitos legales asociados:** D. 1030 arts. 6, 20 — F-11, F-06.
- **Criterios de aceptación verificables:**
  - AC-ADM-21-1: Un cliente persona natural no puede registrarse como comprador.
  - AC-ADM-21-2: Todo cambio de estado deja responsable y hora.
- **Pruebas requeridas:** I, E.

#### ADM-22 · Retiro del scraping de catálogos y carga de listas de proveedor
**Prioridad:** P1 · **Fase:** F2 · **Rol/área:** Administrador · **Dependencias:** ADM-05.

- **Descripción:** Elimina `scripts/scrape-lentes.js` y `scraped-lentes.json`/`lentes-catalog.ts` obtenidos por scraping (ToS sin revisar ⚠️) y los sustituye por catálogos cargados desde listas que el proveedor entrega al cliente.
- **Reglas de negocio:**
  1. Se retira el módulo `inventoryScraping` de los planes.
  2. Importación de listas de precios/catálogos del proveedor (Excel/CSV) con trazabilidad del origen (`fuente`, fecha, quién subió): en F2 se carga con un formulario/CSV simple y, cuando exista, con la importación masiva ADM-15 (F3).
  3. Si Orlando conserva datos del scraping, requiere autorización o licencia de la fuente (Q-23).
- **Campos de datos:** `catalogo_proveedor(id, proveedor_id, fuente, cargado_en, items…)`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin`.
- **Requisitos legales asociados:** Riesgo contractual/propiedad intelectual (sin norma verificada) — Ley 1480 art. 23 (información veraz).
- **Criterios de aceptación verificables:**
  - AC-ADM-22-1: `rg scrape web/ scripts/` no devuelve resultados.
  - AC-ADM-22-2: Cada producto importado conserva el origen de su dato.
- **Pruebas requeridas:** I.


---

# 8. Rol Asesor de Ventas (recepción, POS, caja, laboratorio, entrega)

El Asesor de Ventas atiende recepción, agenda, cotiza, vende, cobra, gestiona laboratorio, entrega y posventa. Ve los **valores de la prescripción** como dato de dispensación, nunca el diagnóstico. La **regla de oro** (D. 1030 arts. 18-19) gobierna su flujo.

| ID | Funcionalidad | Prio | Fase | Dependencias |
|---|---|---|---|---|
| ASE-01 | Recepción: registro y búsqueda de pacientes con identificación completa | P0 | F1 | PLT-02, SEG-02. |
| ASE-02 | Agenda de citas, confirmaciones y estados del paciente | P1 | F2 | ASE-01. |
| ASE-03 | Cotización → orden de venta → abonos → saldo | P0 | F2 | ADM-05, ASE-05. |
| ASE-04 | POS de vitrina con código de barras, pagos mixtos y tiquete | P0 | F2 | ADM-05, ASE-05. |
| ASE-05 | Caja: apertura, arqueo, cierre y diferencias | P0 | F2 | PLT-02. |
| ASE-06 | Emisión de factura/tiquete al cliente con adquirente identificado | P0 | F2 | ADM-09, ASE-04. |
| ASE-07 | Vínculo prescripción↔orden: verificación prescrito vs. dispensado y bloqueo | P0 | F2 | OPT-05, ASE-03. |
| ASE-08 | Orden de laboratorio/taller con estados, QC y bitácora de proceso | P0 | F2 | ASE-07, OPT-05. |
| ASE-09 | Entrega al paciente con confirmación y recibo de satisfacción | P0 | F2 | ASE-08, SEG-08. |
| ASE-10 | Garantías, cambios y devoluciones | P1 | F3 | ASE-09, ADM-09, OPT-05. |
| ASE-11 | Convenios y tarifas en la venta | P1 | F3 | ADM-12, ASE-03. |
| ASE-12 | Recordatorios y comunicación operativa con el paciente | P1 | F3 | SEG-16. |
| ASE-13 | Vista de comisiones propias | P2 | F3 | ADM-13. |
| ASE-14 | Reservas de producto y etiquetas de precio | P2 | F4 | ADM-06. |
| ASE-15 | Pedidos a laboratorios externos mediante adaptador | P2 | F4 | ASE-08. |
| ASE-16 | Alertas comerciales y de calidad de datos | P1 | F4 | ADM-05, ASE-08. |

#### ASE-01 · Recepción: registro y búsqueda de pacientes con identificación completa
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Asesor de Ventas · **Dependencias:** PLT-02, SEG-02.

- **Descripción:** Alta y búsqueda de pacientes con el contenido mínimo de identificación de la HC, número único de HC, detección de duplicados y captura de autorizaciones en el mismo flujo.
- **Reglas de negocio:**
  1. Campos de identificación (Res. 1995 art. 9 ✅): nombres y apellidos, estado civil, documento, fecha de nacimiento, edad (calculada), sexo, ocupación, dirección, teléfono, acompañante, responsable del usuario, aseguradora y tipo de vinculación (`particular|contributivo|subsidiado|especial|otro`).
  2. Tipos de documento `CC|TI|RC|PA|CE` (+ regla de consecutivo para menores sin documento) — A-03.
  3. **Un solo número de HC por paciente** (consecutivo por tenant, no reutilizable); búsqueda por documento, nombre, teléfono; detección de duplicados por tipo+número y similitud de nombre+fecha de nacimiento.
  4. La recepción (asesor/auxiliar) ve y edita **datos de identificación y contacto**, nunca clínicos (R1).
  5. Al registrar: captura de autorización de datos (SEG-05) y representante si es menor (SEG-06) antes de pasar a consulta.
  6. Datos sensibles de identificación (documento) enmascarados en listas (últimos 4 dígitos) y búsqueda exacta por hash HMAC para evitar exponerlos.
- **Campos de datos:** `pacientes(id, tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento, sexo, estado_civil, ocupacion, direccion, telefono, email?, acompanante, responsable, aseguradora, tipo_vinculacion, sede_alta_id, fecha_ultima_atencion, estado)`.
- **Estados / flujo:** `activo → inactivo → fusionado (duplicados, con rastro)`.
- **Permisos:** R1: `asesor`, `auxiliar`, `admin` C/R/U; `optometra` R ᴾ.
- **Requisitos legales asociados:** Res. 1995/1999 arts. 6, 9 ✅; Ley 1581 arts. 5-6, 12 — A-03, A-04, C-01.
- **Criterios de aceptación verificables:**
  - AC-ASE-01-1: No se guarda un paciente sin los campos obligatorios del art. 9 (los no aplicables se marcan «No aplica» explícito).
  - AC-ASE-01-2: Registrar el mismo tipo+número de documento dos veces advierte y ofrece abrir el existente.
  - AC-ASE-01-3: `num_hc` es único por tenant y no se reutiliza al fusionar duplicados.
  - AC-ASE-01-4: Un `asesor` no puede leer diagnósticos al abrir el paciente (prueba R).
- **Pruebas requeridas:** U, I, R, E, A.

#### ASE-02 · Agenda de citas, confirmaciones y estados del paciente
**Prioridad:** P1 · **Fase:** F2 · **Rol/área:** Asesor de Ventas · **Dependencias:** ASE-01.

- **Descripción:** Agenda por sede/profesional con calendario visual, confirmación, reprogramación, lista de espera y estados operativos (por llegar → en sala → en consulta → cotizando → pagado).
- **Reglas de negocio:**
  1. Calendario con `react-big-calendar` (MIT ✅; **no** FullCalendar por ser open core).
  2. Tipos de cita configurables (primera vez, control, adaptación LC, entrega de lentes, tamizaje) con duración propia.
  3. La agenda **no muestra motivo clínico**: solo tipo de cita y notas administrativas (R7).
  4. Estados: `por_llegar → confirmada → en_sala → en_consulta → cotizando → pagado | no_asistio | cancelada`; transiciones registradas con hora (insumo de KPIs).
  5. Recordatorios y confirmaciones vía `MensajeriaPort` (SEG-16); reprogramación crea nueva cita enlazada.
  6. Control de sobreventa y bloqueos por profesional; zona horaria `America/Bogota`.
- **Campos de datos:** `citas(id, tenant_id, sede_id, paciente_id, profesional_id, tipo, inicio, fin, estado, notas_admin, origen)`, `bloqueos_agenda`.
- **Estados / flujo:** Ver reglas.
- **Permisos:** R7.
- **Requisitos legales asociados:** Ley 1581 art. 4 lit. d (minimización); Res. 1995 art. 14 — B-04.
- **Criterios de aceptación verificables:**
  - AC-ASE-02-1: Dos citas del mismo profesional no pueden solaparse (restricción de BD con rango).
  - AC-ASE-02-2: La vista de agenda del asesor no devuelve campos clínicos.
  - AC-ASE-02-3: Cada cambio de estado registra hora y usuario.
- **Pruebas requeridas:** U, I (restricción de exclusión), E.

#### ASE-03 · Cotización → orden de venta → abonos → saldo
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Asesor de Ventas · **Dependencias:** ADM-05, ASE-05.

- **Descripción:** Flujo comercial central para productos sobre medida: cotizar, convertir en orden con prescripción verificada, recibir abonos y controlar saldo hasta la entrega.
- **Reglas de negocio:**
  1. Cotización con vigencia; puede incluir varios escenarios (distintos lentes/tratamientos) y conversión de uno a orden.
  2. Orden de venta: ítems, descuentos manuales con motivo (los convenios y promociones de ADM-12 se aplican cuando esa funcionalidad exista, F3), impuestos (snapshot), abono mínimo configurable, **saldo = total − abonos**; abonos en `EFECTIVO|TARJETA|TRANSFERENCIA|OTRO` con referencia (solo se **registra** el medio: no hay pasarela).
  3. Un ítem «bajo prescripción» exige prescripción vinculada y verificada (ASE-07).
  4. Anulación de orden: con nota; si hubo abonos, devolución o nota crédito según corresponda (G-04).
  5. Sin entrega con saldo > 0 salvo autorización del `admin` (S) auditada.
  6. Dinero en COP enteros; redondeo documentado y probado.
- **Campos de datos:** `cotizaciones`, `ordenes_venta(id, tenant_id, sede_id, paciente_id, estado, subtotal, descuento, impuestos, total, abonado, saldo, prescripcion_id?, convenio_id?, asesor_id)`, `orden_items`, `abonos(id, orden_id, monto_cop, medio, referencia, caja_sesion_id)`.
- **Estados / flujo:** `cotizada → ordenada → en_produccion → lista → entregada | anulada`.
- **Permisos:** R8: `asesor` C/R/U/A ˢ; `admin` R/A ᵀ.
- **Requisitos legales asociados:** Ley 1480 arts. 23, 30; D. 1030/2007 arts. 16-19; Res. DIAN 165/2023 art. 11 — F-03, F-04, K-01, G-02.
- **Criterios de aceptación verificables:**
  - AC-ASE-03-1: Una orden con total 1.190.000 y abonos 400.000 + 300.000 muestra saldo 490.000.
  - AC-ASE-03-2: Entregar con saldo > 0 pide autorización del `admin` con MFA y queda en bitácora.
  - AC-ASE-03-3: Anular una orden con abonos crea los movimientos/nota crédito correspondientes y no borra nada.
  - AC-ASE-03-4: Una orden con lentes oftálmicos no se puede confirmar sin prescripción verificada.
- **Pruebas requeridas:** U (cálculos, redondeo), I, E.

#### ASE-04 · POS de vitrina con código de barras, pagos mixtos y tiquete
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Asesor de Ventas · **Dependencias:** ADM-05, ASE-05.

- **Descripción:** Venta directa de monturas, accesorios, líquidos, gafas de lectura y de sol en mostrador, con lectura de códigos, descuentos, pagos mixtos e impresión de tiquete/PDF.
- **Reglas de negocio:**
  1. Lectura por lector USB (teclado emulado) o cámara (`html5-qrcode` Apache-2.0 ✅ / `@zxing/library` Apache-2.0 ✅); búsqueda por texto; atajos de teclado.
  2. Pagos mixtos (varias líneas de medio de pago); cambio calculado; el cierre de la venta la deja en `pagada`; **el paso `documentada` (emisión del documento fiscal por ADM-09) lo implementa ASE-06**, de modo que ASE-04 no depende de la facturación y no se entrega comprobante fiscal sin ese paso.
  3. Impresión térmica ESC/POS con `node-thermal-printer` (ISC ✅) **solo desde un servicio local de impresión opcional**; alternativa: PDF 80 mm con `@react-pdf/renderer`.
  4. Productos «bajo prescripción» **no** se pueden vender en POS rápido: se redirige al flujo de orden (ASE-03).
  5. Venta de ítems con lote: sugerencia FEFO y bloqueo de vencidos (ADM-05/07).
  6. Cada venta descuenta stock por movimiento y registra transacción de caja (ASE-05).
  7. Operación degradada: si falla el proveedor de facturación, la venta queda `pagada` con documento `pendiente_transmision` (ASE-06/ADM-09) y se reintenta; no se pierde la venta.
- **Campos de datos:** `ventas(id, …, caja_sesion_id)`, `venta_items(…, lote_id, impuesto_snapshot)`, `venta_pagos`.
- **Estados / flujo:** `abierta → pagada → documentada → entregada | anulada(nota)`.
- **Permisos:** R9: `asesor` C/R ˢ.
- **Requisitos legales asociados:** Res. DIAN 165/2023 arts. 5, 11, 15-16, 23 ✅; D. 1030 art. 18; D. 4725 — G-02, G-05, F-04, F-09.
- **Criterios de aceptación verificables:**
  - AC-ASE-04-1: Escanear un código existente agrega el ítem en < 300 ms (medido en prueba E con BD local).
  - AC-ASE-04-2: Pago mixto efectivo+tarjeta suma el total exacto y calcula el cambio.
  - AC-ASE-04-3: Intentar vender un lente oftálmico en POS rápido redirige a orden.
  - AC-ASE-04-4: La venta descuenta el stock y crea transacción de caja con una sola transacción de BD (atomicidad probada con fallo inyectado).
- **Pruebas requeridas:** U, I (atomicidad), E, A.

#### ASE-05 · Caja: apertura, arqueo, cierre y diferencias
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Asesor de Ventas · **Dependencias:** PLT-02.

- **Descripción:** Control de caja por sede y turno con base inicial, movimientos, egresos, arqueo por denominaciones y cierre con diferencia.
- **Reglas de negocio:**
  1. Una sola caja abierta por usuario/turno; ventas y abonos solo con caja abierta.
  2. Movimientos tipificados: base, ingreso por venta, ingreso por abono, egreso/gasto (con soporte), devolución; inmutables (corrección por contra-movimiento).
  3. Arqueo por denominaciones (billetes/monedas COP), vouchers y transferencias; **diferencia = declarado − esperado**; cierre con firma del cajero y aprobación del admin si |diferencia| > umbral.
  4. Reporte de cierre PDF sellado.
- **Campos de datos:** `caja_sesiones`, `caja_movimientos`, `arqueos`.
- **Estados / flujo:** `abierta → cerrada → aprobada`.
- **Permisos:** R10.
- **Requisitos legales asociados:** Res. DIAN 165/2023 (control de ingresos); Ley 1581 art. 4 — G-02.
- **Criterios de aceptación verificables:**
  - AC-ASE-05-1: No se puede vender con la caja cerrada.
  - AC-ASE-05-2: El cierre calcula esperado = base + ingresos efectivo − egresos y muestra la diferencia.
  - AC-ASE-05-3: Una diferencia sobre el umbral requiere aprobación del admin.
- **Pruebas requeridas:** U, I, E.

#### ASE-06 · Emisión de factura/tiquete al cliente con adquirente identificado
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Asesor de Ventas · **Dependencias:** ADM-09, ASE-04.

- **Descripción:** Interfaz de venta para capturar el adquirente (consumidor final o identificado) y emitir el documento a través de `FacturacionPort`.
- **Reglas de negocio:**
  1. Para el tiquete POS electrónico se exige identificar al adquirente cuando la norma lo requiere (Res. 165/2023: nombre e identificación ✅).
  2. Entrega al cliente por correo (si autorizó) o impresión; **no** se envía por canales no autorizados.
  3. Estados del documento visibles en la venta (pendiente, aceptado, rechazado, simulado).
  4. Las notas crédito se solicitan aquí y las aprueba `admin` (R11).
- **Campos de datos:** Usa `documentos_electronicos`.
- **Estados / flujo:** Ver ADM-09.
- **Permisos:** R11.
- **Requisitos legales asociados:** Res. DIAN 165/2023 arts. 5, 11, 36 ✅ — G-02, G-04, G-05.
- **Criterios de aceptación verificables:**
  - AC-ASE-06-1: Una venta sin adquirente válido no emite FEV (solo consumidor final cuando la norma lo permita).
  - AC-ASE-06-2: Rechazo del proveedor muestra motivo y permite corregir/reintentar.
  - AC-ASE-06-3: El estado `simulado` se distingue visualmente de `aceptado` y no permite imprimir sin la leyenda de simulación.
- **Pruebas requeridas:** E, I.

#### ASE-07 · Vínculo prescripción↔orden: verificación prescrito vs. dispensado y bloqueo
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Asesor de Ventas · **Dependencias:** OPT-05, ASE-03.

- **Descripción:** Regla de oro del dispensador: no se cierra la venta de un dispositivo bajo prescripción sin prescripción válida, y se compara lo prescrito con lo dispensado.
- **Reglas de negocio:**
  1. Prescripción válida = firmada, vigente (fecha < vigencia), de profesional con registro cargado, o prescripción **externa** cargada con copia, datos del prescriptor y verificación del dispensador (art. 18 ✅).
  2. Vista lado a lado **prescrito vs. dispensado** (esfera, cilindro, eje, adición, DP, material, tratamientos, tipo/diseño) con semáforo; diferencias exigen **justificación del profesional** (consulta al prescriptor) — art. 18 y 19.
  3. El asesor **no puede modificar** la prescripción (D. 1030 art. 19 lit. a ✅) ni «inducir a la compra de un dispositivo que reemplace al formulado» (lit. d): el sistema no ofrece upsell que sustituya.
  4. Checklist obligatorio al entregar: «información al usuario sobre uso, almacenamiento, cuidados y adherencia» entregada (art. 18 ✅).
  5. Prescripción con errores aparentes: acción «consultar al prescriptor» (mensaje interno) que bloquea hasta respuesta registrada.
  6. Toda verificación queda registrada: quién, hora, resultado, diferencias aprobadas.
- **Campos de datos:** `verificaciones_dispensacion(id, orden_id, prescripcion_id, resultado, diferencias jsonb, justificacion, profesional_id?, verificado_por, verificado_en, checklist_info_usuario)`, `prescripciones_externas(id, paciente_id, archivo_id, prescriptor, registro_prof, fecha, vigencia, verificado_por)`.
- **Estados / flujo:** `pendiente → verificada | con_diferencias → aprobada_por_profesional | rechazada`.
- **Permisos:** `asesor` C/R; `optometra` aprueba diferencias; `admin` R.
- **Requisitos legales asociados:** D. 1030/2007 arts. 16, 18, 19 ✅ — F-03, F-04, F-05, E-03.
- **Criterios de aceptación verificables:**
  - AC-ASE-07-1: Confirmar una orden con lentes oftálmicos sin prescripción válida devuelve error con el motivo (prueba con prescripción vencida, de usuario sin registro y ausente).
  - AC-ASE-07-2: Si el lente ordenado difiere del prescrito, la orden queda `con_diferencias` y no avanza sin aprobación del profesional.
  - AC-ASE-07-3: Un `asesor` no puede editar valores de la prescripción (API 403, UI solo lectura).
  - AC-ASE-07-4: No se puede marcar «entregada» sin checklist de información al usuario.
- **Pruebas requeridas:** U (reglas), I, R, E.

#### ASE-08 · Orden de laboratorio/taller con estados, QC y bitácora de proceso
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Asesor de Ventas · **Dependencias:** ASE-07, OPT-05.

- **Descripción:** Seguimiento de producción de lentes/gafas: envío a laboratorio o taller propio, recepción, control de calidad (óptometra y asesor), listo para entrega, con trazabilidad.
- **Reglas de negocio:**
  1. Orden de trabajo (OT) contiene: OD/OI (esfera, cilindro, eje, adición), DP (monocular/binocular), altura, montura (producto/lote), lente (material, diseño, tratamientos), laboratorio, fecha prometida, observaciones.
  2. Estados: `por_enviar → enviada_laboratorio → en_produccion → recibida → qc_optometra → qc_asesor → lista_entrega → entregada | reproceso | rechazada`; cada transición guarda usuario y hora (D. 1030 art. 6: registro de todas las acciones).
  3. QC: el optómetra verifica contra la fórmula (lensometría del lente recibido) y el asesor verifica estética/montura; rechazo ⇒ `reproceso` o garantía.
  4. Validaciones de plausibilidad de fabricación (P1): rango del lente vs. capacidad del laboratorio y compatibilidad montura-lente (diámetro, curva base) — **datos de capacidad editables**; ⚠️ la regla técnica no se inventa: solo se aplican límites que el laboratorio/proveedor declare.
  5. Fecha prometida y alerta de atraso; notificación a paciente vía SEG-16 cuando está listo.
- **Campos de datos:** `ordenes_trabajo(id, tenant_id, sede_id, orden_venta_id, prescripcion_id, laboratorio_id, estado, fecha_prometida, od jsonb, oi jsonb, dp, altura, lente jsonb, montura jsonb, …)`, `ot_eventos(id, ot_id, estado, usuario_id, hora, nota)`, `laboratorios(id, nombre, tipo[propio|externo], capacidades jsonb)`.
- **Estados / flujo:** Ver reglas.
- **Permisos:** R12: `asesor` C/R/U; `tecnico_lab` avanza; `optometra` QC.
- **Requisitos legales asociados:** D. 1030/2007 arts. 6, 16-21 ✅ — F-06, F-03, F-07.
- **Criterios de aceptación verificables:**
  - AC-ASE-08-1: Una OT no puede saltar de `por_enviar` a `entregada`; transiciones inválidas devuelven error.
  - AC-ASE-08-2: Cada transición queda en `ot_eventos` con usuario y hora de servidor.
  - AC-ASE-08-3: Una OT atrasada aparece en la alerta de la sede.
  - AC-ASE-08-4: El QC del optómetra requiere registrar la lensometría medida y compara con lo prescrito (informativo, no diagnóstico).
- **Pruebas requeridas:** U (máquina de estados), I, E.

#### ASE-09 · Entrega al paciente con confirmación y recibo de satisfacción
**Prioridad:** P0 · **Fase:** F2 · **Rol/área:** Asesor de Ventas · **Dependencias:** ASE-08, SEG-08.

- **Descripción:** Cierre del ciclo: entrega con verificación de identidad, control de saldo, firma del recibo y registro de adherencia/información entregada.
- **Reglas de negocio:**
  1. Verificar identidad del recibidor (paciente o autorizado) y saldo = 0 (o autorización).
  2. Checklist art. 18 (información al usuario) obligatorio (ASE-07).
  3. Recibo de satisfacción firmado electrónicamente (SEG-08) con comentarios; PDF sellado.
  4. Notificación opcional «lentes listos» antes de la entrega (SEG-16).
  5. Programar **próximo control** (cita sugerida) cuando el profesional lo indicó (OPT-19).
- **Campos de datos:** `entregas(id, orden_id, recibido_por, documento_recibidor, firma_id, checklist jsonb, entregada_en)`.
- **Estados / flujo:** `lista_entrega → entregada`.
- **Permisos:** `asesor` ˢ.
- **Requisitos legales asociados:** D. 1030 art. 18 ✅; Ley 1480 art. 23; Ley 527/1999 — F-04, I-03, K-01.
- **Criterios de aceptación verificables:**
  - AC-ASE-09-1: No se registra entrega sin firma/confirmación del recibidor.
  - AC-ASE-09-2: Tras la entrega se calcula la fecha de garantía legal/comercial y se muestra en el recibo.
  - AC-ASE-09-3: Entregar con el checklist de información al usuario incompleto está bloqueado.
- **Pruebas requeridas:** E, I.

#### ASE-10 · Garantías, cambios y devoluciones
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Asesor de Ventas · **Dependencias:** ASE-09, ADM-09, OPT-05.

- **Descripción:** Gestión de reclamaciones de posventa con concepto técnico del optómetra, resolución (reparación, cambio, devolución), costo asumido y trazabilidad con laboratorio.
- **Reglas de negocio:**
  1. Causas: adaptación de fórmula, defecto de montura, tratamiento, rotura, otro.
  2. Garantía legal (Ley 1480 arts. 7-8, 11 ✅): si no se indica término, **1 año** para productos nuevos (art. 8 ✅) — configurable por categoría; garantías comerciales aparte.
  3. Resolución `reparacion|cambio|devolucion_dinero|sin_garantia`; devolución de dinero genera **nota crédito** (ADM-09) y contra-movimiento de caja.
  4. Garantía por fórmula: el optómetra puede emitir **nueva prescripción** (queda enlazada, no sobrescribe).
  5. No confundir con retracto (ADM-20, K-03).
- **Campos de datos:** `garantias`, `garantia_eventos`.
- **Estados / flujo:** `bajo_evaluacion → aprobada | rechazada → resuelta`.
- **Permisos:** R15.
- **Requisitos legales asociados:** Ley 1480/2011 arts. 7, 8, 11 ✅; D. 1030 art. 21 — K-06, F-07.
- **Criterios de aceptación verificables:**
  - AC-ASE-10-1: Una devolución de dinero genera nota crédito vinculada y egreso de caja.
  - AC-ASE-10-2: La garantía por fórmula crea una nueva prescripción enlazada sin modificar la anterior.
  - AC-ASE-10-3: Se alerta cuando faltan 30 días para vencer la garantía.
- **Pruebas requeridas:** I, E.

#### ASE-11 · Convenios y tarifas en la venta
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Asesor de Ventas · **Dependencias:** ADM-12, ASE-03.

- **Descripción:** Aplicación de convenios (empresa/EPS/caja) y promociones durante cotización, orden y POS.
- **Reglas de negocio:**
  1. Selección de convenio valida vigencia, documentos requeridos y cobertura de categorías.
  2. Descuentos aplicados con snapshot; trazabilidad del convenio en la factura **sin datos clínicos**.
  3. Facturación a la entidad del convenio ≠ RIPS (solo si ADM-19 aplica).
- **Campos de datos:** `orden_convenios`.
- **Estados / flujo:** n/a.
- **Permisos:** `asesor` R/aplicar.
- **Requisitos legales asociados:** Ley 1480 art. 30; Res. DIAN 165 art. 11 — K-02, G-08.
- **Criterios de aceptación verificables:**
  - AC-ASE-11-1: Un convenio vencido no se puede aplicar.
  - AC-ASE-11-2: La línea de factura del descuento no incluye datos clínicos.
- **Pruebas requeridas:** U, I, E.

#### ASE-12 · Recordatorios y comunicación operativa con el paciente
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Asesor de Ventas · **Dependencias:** SEG-16.

- **Descripción:** Envío de confirmaciones de cita, avisos de lentes listos y recordatorios de control mediante `MensajeriaPort` y sus adaptadores.
- **Reglas de negocio:**
  1. Canales por adaptador (§11.3): enlace `wa.me` asistido (envío humano), correo SMTP, WhatsApp Cloud API **opcional** pagada por el cliente, impresión/PDF.
  2. Plantillas aprobadas por el tenant; variables sin datos clínicos (no incluir diagnóstico ni fórmula en mensajes).
  3. Cumple SEG-16 (ventanas, frecuencia, baja).
  4. Registro de mensajes y estado (sin contenido clínico).
- **Campos de datos:** `mensajes`, `plantillas_mensaje`.
- **Estados / flujo:** Ver SEG-16.
- **Permisos:** `asesor` ˢ.
- **Requisitos legales asociados:** Ley 2300/2023 arts. 1-5 ✅; Ley 1581 art. 12 — K-04.
- **Criterios de aceptación verificables:**
  - AC-ASE-12-1: El mensaje de «lentes listos» no contiene valores de fórmula.
  - AC-ASE-12-2: Con el adaptador `wa.me`, el sistema genera el enlace con texto y registra el envío cuando el asesor confirma.
- **Pruebas requeridas:** U, I, E.

#### ASE-13 · Vista de comisiones propias
**Prioridad:** P2 · **Fase:** F3 · **Rol/área:** Asesor de Ventas · **Dependencias:** ADM-13.

- **Descripción:** El asesor consulta sus ventas, metas y comisiones causadas/liquidadas.
- **Reglas de negocio:**
  1. Solo datos propios; sin ver comisiones ajenas.
  2. Reversas por devoluciones visibles.
- **Campos de datos:** Vista sobre `comisiones`.
- **Estados / flujo:** n/a.
- **Permisos:** `asesor` ᵖ.
- **Requisitos legales asociados:** D. 1030 art. 19 (ver ADM-13) — F-05.
- **Criterios de aceptación verificables:**
  - AC-ASE-13-1: Un asesor no accede a comisiones de otro (R).
  - AC-ASE-13-2: Una devolución posterior reduce la comisión visible del asesor.
- **Pruebas requeridas:** R, E.

#### ASE-14 · Reservas de producto y etiquetas de precio
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Asesor de Ventas · **Dependencias:** ADM-06.

- **Descripción:** Reservar monturas/productos para un cliente con vencimiento e imprimir etiquetas con código de barras y precio.
- **Reglas de negocio:**
  1. Reserva descuenta disponibilidad, no stock físico; vence automáticamente.
  2. Etiquetas con `bwip-js` (MIT ✅)/JsBarcode (MIT ✅) en PDF.
- **Campos de datos:** `reservas`.
- **Estados / flujo:** `activa → convertida | vencida`.
- **Permisos:** `asesor`.
- **Requisitos legales asociados:** Ley 1480 art. 23 (precio claro) — K-01.
- **Criterios de aceptación verificables:**
  - AC-ASE-14-1: Un producto reservado no aparece disponible para otro cliente.
  - AC-ASE-14-2: Etiquetas imprimibles en lote.
- **Pruebas requeridas:** I, E.

#### ASE-15 · Pedidos a laboratorios externos mediante adaptador
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Asesor de Ventas · **Dependencias:** ASE-08.

- **Descripción:** Interfaz `LaboratorioPort` para enviar órdenes a laboratorios por archivo/portal/API del laboratorio y recibir estados.
- **Reglas de negocio:**
  1. Sin integración propietaria obligatoria: adaptadores `manual` (PDF/Excel de pedido), `correo`, y `api_generica`.
  2. Integraciones con redes de laboratorios (p. ej. las mencionadas para EE. UU. en el informe: VisionWeb, Hoya SmartFlow) quedan **⚠️ no evaluadas** (licencias/acuerdos no verificados).
  3. Estados externos se mapean a los de ASE-08.
- **Campos de datos:** `laboratorio_adaptadores`.
- **Estados / flujo:** Ver ASE-08.
- **Permisos:** `admin` configura; `asesor` usa.
- **Requisitos legales asociados:** D. 1030 arts. 6, 20 — F-06, F-11.
- **Criterios de aceptación verificables:**
  - AC-ASE-15-1: Un adaptador manual genera el PDF/Excel de pedido con todos los campos de la OT.
  - AC-ASE-15-2: Un cambio de estado externo actualiza la OT con evento.
- **Pruebas requeridas:** I (contrato del puerto), E.

#### ASE-16 · Alertas comerciales y de calidad de datos
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Asesor de Ventas · **Dependencias:** ADM-05, ASE-08.

- **Descripción:** Alertas en pantalla de stock bajo, margen anómalo, producto sin costo, saldo pendiente al entregar, OT atrasadas, prescripción por vencer.
- **Reglas de negocio:**
  1. Reglas configurables por sede; severidad; descarte con motivo.
  2. No generan diagnóstico ni sugerencias clínicas (ADR-15).
- **Campos de datos:** `alertas(id, tenant_id, sede_id, tipo, severidad, payload, estado)`.
- **Estados / flujo:** `abierta → vista → resuelta`.
- **Permisos:** Por rol.
- **Requisitos legales asociados:** E-06 (no apoyo diagnóstico) — E-06.
- **Criterios de aceptación verificables:**
  - AC-ASE-16-1: Una venta con margen < umbral genera alerta.
  - AC-ASE-16-2: Ninguna alerta menciona diagnóstico.
- **Pruebas requeridas:** U, I.


---

# 9. Rol Optómetra (clínica y especialidades)

El Optómetra (y el oftalmólogo) registra la HC, firma, prescribe y atiende las especialidades. Es el único con capacidad de firmar y prescribir.

| ID | Funcionalidad | Prio | Fase | Dependencias |
|---|---|---|---|---|
| OPT-01 | Historia clínica de optometría: atención, examen, diagnóstico y firma | P0 | F1 | SEG-01…SEG-06, SEG-08, OPT-10, ASE-01. |
| OPT-02 | Adendas y correcciones de la HC con historial visible | P0 | F1 | OPT-01, SEG-04. |
| OPT-03 | Agenda clínica y flujo del paciente en consultorio | P1 | F2 | ASE-02, OPT-01. |
| OPT-04 | Consentimientos informados clínicos (plantillas versionadas y firma) | P0 | F1 | SEG-08, SEG-05, OPT-01. |
| OPT-05 | Prescripción (fórmula) con los 15 campos del art. 17 del Decreto 1030/2007, PDF y numeración | P0 | F1 | OPT-01, SEG-08, ADM-02, PLT-11. |
| OPT-06 | Entrega de la HC al paciente (copia gratuita, electrónica) | P0 | F1 | OPT-01, OPT-02, SEG-08. |
| OPT-07 | Adaptación de lentes de contacto (contactología) | P1 | F2 | OPT-01, OPT-04, OPT-05, ADM-05. |
| OPT-08 | Hand-off clínico → venta (recomendación al asesor) | P1 | F2 | OPT-01, ASE-03. |
| OPT-09 | Control de calidad del optómetra y concepto técnico de garantías | P1 | F2 | ASE-08. |
| OPT-10 | Catálogos clínicos oficiales (CIE-10, CUPS) y glosario de abreviaturas | P0 | F1 | PLT-02. |
| OPT-11 | Controles programados, próximo control y recalls clínicos | P1 | F3 | SEG-16, ASE-02. |
| OPT-12 | Historial y comparación con la fórmula anterior | P1 | F4 | OPT-01. |
| OPT-13 | Validaciones de plausibilidad de captura (no diagnósticas) | P2 | F4 | OPT-01. |
| OPT-14 | Adjuntos e imágenes clínicas (retinografía, topografía, OCT, PDF de equipos) | P1 | F4 | SEG-12, SEG-13, OPT-01. |
| OPT-15 | Plantillas de examen por tipo de consulta | P1 | F4 | OPT-01. |
| OPT-16 | Remisión, interconsulta y certificados en PDF | P1 | F4 | OPT-01, SEG-08. |
| OPT-17 | Baja visión: evaluación, ayudas y entrenamiento | P1 | F4 | OPT-01, OPT-05, OPT-15, ADM-05. |
| OPT-18 | Terapia visual, ortóptica y pleóptica: plan y sesiones | P1 | F4 | OPT-01, OPT-04, ADM-09. |
| OPT-19 | Optometría pediátrica | P1 | F4 | OPT-01, SEG-06, OPT-15. |
| OPT-20 | Tamizaje visual y brigadas (registro masivo simplificado) | P2 | F4 | OPT-01, SEG-05. |
| OPT-21 | Prótesis oculares: seguimiento y entrega | P2 | F4 | OPT-01, OPT-04, OPT-05. |
| OPT-22 | Oftalmología e interconsulta (rol oftalmólogo) | P2 | F4 | OPT-01, OPT-16. |
| OPT-23 | Resumen Digital de Atención (RDA/FHIR) e interoperabilidad (IHCE) — condicionado | P1 | F5 | OPT-01, OPT-10; decisión Q-05. |
| OPT-24 | Telemedicina / teleconsulta — fuera de alcance hasta verificar | P2 | F5 | — |

#### OPT-01 · Historia clínica de optometría: atención, examen, diagnóstico y firma
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Optómetra · **Dependencias:** SEG-01…SEG-06, SEG-08, OPT-10, ASE-01.

- **Descripción:** Registro de cada atención optométrica (primera vez o control) con todo el contenido clínico, guardado en BD con folio, autor y hora del servidor; borrador editable hasta la firma, inmutable después.
- **Reglas de negocio:**
  1. Estructura de la atención (secciones): **A** motivo y enfermedad actual · **B** antecedentes (oculares personales/familiares, sistémicos, medicamentos, alergias, uso previo de corrección y de LC, ocupación y hábitos visuales) · **C** agudeza visual sin/con corrección, lejos/cerca, OD/OI/AO, agujero estenopeico · **D** pruebas preliminares (reflejos pupilares, motilidad, cover test lejos/cerca, PPC, visión del color, estereopsis) · **E** lensometría, queratometría, retinoscopía/autorrefracción, refracción subjetiva, DP, adición · **F** salud ocular: PIO (valor + método), biomicroscopía, oftalmoscopía/fondo de ojo · **G** binocularidad (foria, vergencias, AC/A, flexibilidad; P1) · **H** diagnóstico CIE-10 (principal y secundarios) · **I** conducta/plan, recomendaciones, remisión, próximo control · **J** prescripción(es) (OPT-05).
  2. Valores ópticos **numéricos** (no cadenas): esfera/cilindro en pasos de 0,25; eje entero; adición; DP en mm. Los límites de captura (esfera ±30,00 D, cilindro ±10,00 D, eje 0–180°, adición 0,25–4,00 D, DP 40–80 mm binocular / 20–40 mm monocular) son **valores de validación de entrada propuestos por esta especificación, configurables, no normativos**: sirven para detectar errores de digitación, no para diagnosticar.
  3. Autoguardado como `borrador` con versión; **firma** (SEG-08) convierte en `firmado` con folio consecutivo, hash y sello; después, solo adendas (SEG-04).
  4. Cada firma exige MFA reciente y tarjeta profesional vigente (ADM-02).
  5. Texto libre limitado: sin siglas no estándar (glosario de abreviaturas permitidas configurable; el sistema resalta abreviaturas fuera de glosario como advertencia) — Res. 1995 art. 5.
  6. **La HC se abre solo si**: existe autorización de datos (SEG-05) o urgencia marcada, y el paciente tiene representante si es menor (SEG-06).
  7. Toda apertura/lectura se audita (SEG-03).
  8. El asesor y el admin **no** ven esta pantalla (R3).
  9. Reemplaza el «bloqueo a las 24 h» del código actual: no hay ventana de edición posterior a la firma.
- **Campos de datos:** `atenciones(id, tenant_id, sede_id, paciente_id, cita_id?, profesional_id, tipo[primera_vez|control|lc|pediatrica|baja_vision|terapia|tamizaje], estado[borrador|firmado], folio, fecha_atencion, contenido jsonb (secciones A–I), diagnosticos[], hash_contenido, firmado_en, version_borrador)` + `atencion_diagnosticos(atencion_id, cie10, descripcion, principal bool)`. Esquema Zod versionado (`schema_version`) para evolucionar plantillas.
- **Estados / flujo:** `borrador → firmado`; correcciones: adenda (OPT-02).
- **Permisos:** R3: `optometra`/`oftalmologo` C/R/U(propios, borrador)/F/X ˢ; `auxiliar_clinico` C/U sección D en borrador.
- **Requisitos legales asociados:** Res. 1995/1999 arts. 3-5, 7, 9, 18 ✅; Ley 2015/2020 art. 8 par. 1 ✅; Ley 372/1997 art. 4 ✅; Res. 866/2021 (catálogos ⚠️) — A-01, A-02, A-06, A-07, A-10, I-04.
- **Criterios de aceptación verificables:**
  - AC-OPT-01-1: Un optómetra con registro vigente crea una atención, la autoguarda, la firma y la ve con folio, hora de servidor y sello.
  - AC-OPT-01-2: Tras firmar, cualquier intento de modificar el contenido (UI, API, SQL de aplicación) falla.
  - AC-OPT-01-3: Valores fuera de límite de captura (p. ej. eje 200) son rechazados con mensaje; cambiar el límite es configuración, no código.
  - AC-OPT-01-4: El diagnóstico exige código CIE-10 del catálogo cargado (OPT-10); no se acepta texto libre como diagnóstico principal.
  - AC-OPT-01-5: Un `asesor` y un `admin` (sin rol clínico) reciben 403 al abrir la atención.
  - AC-OPT-01-6: Cada apertura genera evento de lectura en bitácora.
  - AC-OPT-01-7: Una atención de paciente menor sin representante no se puede iniciar.
- **Pruebas requeridas:** U (esquemas Zod, rangos), I (triggers de inmutabilidad), R, E (flujo completo con teclado), A.

#### OPT-02 · Adendas y correcciones de la HC con historial visible
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, SEG-04.

- **Descripción:** Interfaz y reglas para corregir o complementar una atención firmada sin alterarla.
- **Reglas de negocio:**
  1. Adenda = nuevo registro firmado que referencia la atención y el campo corregido, con motivo, autor, fecha y hora del servidor (Ley 2015/2020 art. 8 par. 1 ✅).
  2. El original se muestra con marca de «corregido por adenda #n» y las adendas se listan cronológicamente.
  3. Una adenda de otro profesional se permite como **nota complementaria** (no cambia el original).
  4. Rectificación solicitada por el titular (SEG-07) se hace por adenda.
- **Campos de datos:** `atencion_adendas(id, atencion_id, campo_ref, valor_anterior_ref, nuevo_valor, motivo, autor_id, firmado_en, hash)`.
- **Estados / flujo:** `borrador → firmada`.
- **Permisos:** R4.
- **Requisitos legales asociados:** Res. 1995 arts. 5, 18; Ley 2015/2020 art. 8 par. 1 — A-06, A-07, C-04.
- **Criterios de aceptación verificables:**
  - AC-OPT-02-1: Corregir un valor de refracción crea adenda y conserva el original visible.
  - AC-OPT-02-2: La vista de historial muestra quién, cuándo y por qué.
  - AC-OPT-02-3: La adenda aparece en la copia entregada al paciente (OPT-06).
- **Pruebas requeridas:** I, E, P.

#### OPT-03 · Agenda clínica y flujo del paciente en consultorio
**Prioridad:** P1 · **Fase:** F2 · **Rol/área:** Optómetra · **Dependencias:** ASE-02, OPT-01.

- **Descripción:** Vista del profesional con sus citas del día, estado del paciente (en sala, en consulta, cotizando) y acceso directo a abrir la atención.
- **Reglas de negocio:**
  1. Muestra solo nombre, hora, tipo de cita y notas administrativas; el motivo clínico se ve al abrir la atención.
  2. Botón «llamar paciente», «iniciar atención» (crea borrador), «finalizar → enviar a cotización» (dispara hand-off OPT-08).
  3. Indicadores: tiempos de espera y de consulta (agregados).
- **Campos de datos:** Usa `citas` y `atenciones`.
- **Estados / flujo:** Estados de ASE-02.
- **Permisos:** `optometra` ˢ propias.
- **Requisitos legales asociados:** B-04 (mínimo privilegio) — B-04.
- **Criterios de aceptación verificables:**
  - AC-OPT-03-1: Iniciar atención desde la agenda enlaza `cita_id` y cambia el estado a `en_consulta`.
  - AC-OPT-03-2: Un profesional no ve citas de otro profesional salvo permiso de la sede.
- **Pruebas requeridas:** E, R.

#### OPT-04 · Consentimientos informados clínicos (plantillas versionadas y firma)
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Optómetra · **Dependencias:** SEG-08, SEG-05, OPT-01.

- **Descripción:** Plantillas de consentimiento por procedimiento, definidas por la óptica/profesional, firmadas antes del procedimiento y archivadas como anexo de la HC.
- **Reglas de negocio:**
  1. Procedimientos típicos: examen con dilatación/cicloplejía, adaptación de lentes de contacto, tonometría, terapia visual, entrega de prótesis (los **textos los redacta/aprueba el profesional o su abogado**; el sistema trae borradores marcados).
  2. Menores: firma del representante (SEG-06).
  3. Versión de plantilla inmutable; la firma referencia versión y hash (SEG-08).
  4. Instrumento **separado** de la autorización de datos (I-05) y del contacto comercial.
  5. El paciente puede negar: se registra la negativa y se bloquea el procedimiento asociado.
- **Campos de datos:** `plantillas_consentimiento(id, tenant_id, procedimiento, version, texto, hash, vigente)`, `consentimientos(id, atencion_id, plantilla_id, paciente_id, firmante, firma_id, otorgado bool, firmado_en)`.
- **Estados / flujo:** `pendiente → firmado | negado`.
- **Permisos:** `optometra` solicita; asesor/auxiliar recoge firma; R2/R6.
- **Requisitos legales asociados:** Res. 1995 art. 11 ✅; Ley 1751/2015 art. 10 lit. d ✅; Ley 527/1999; Res. 1995 art. 11 (consentimiento como anexo versionado con hash) — I-01, I-05, I-03, A-05.
- **Criterios de aceptación verificables:**
  - AC-OPT-04-1: No se puede iniciar adaptación de LC sin consentimiento firmado de la plantilla vigente.
  - AC-OPT-04-2: Cambiar el texto crea nueva versión; consentimientos anteriores conservan su versión.
  - AC-OPT-04-3: El PDF del consentimiento queda anexo a la atención con hash y firma.
- **Pruebas requeridas:** I, E, A.

#### OPT-05 · Prescripción (fórmula) con los 15 campos del art. 17 del Decreto 1030/2007, PDF y numeración
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, SEG-08, ADM-02, PLT-11.

- **Descripción:** Documento de prescripción de dispositivos sobre medida generado desde la atención firmada: contenido completo, legible, sin siglas ni enmiendas, firmado, con número consecutivo y vigencia; impresión/PDF.
- **Reglas de negocio:**
  1. **Campos obligatorios (art. 17 ✅):** (a) prestador/profesional, dirección y teléfono/correo; (b) lugar y fecha; (c) paciente y documento; (d) **número de HC**; (e) tipo de usuario; (f) dispositivo prescrito; (g) agudeza visual; (h) forma de uso; (i) **distancia pupilar**; (j) filtro; (k) duración del tratamiento; (l) **cantidad total en números y letras**; (m) indicaciones; (n) **vigencia**; (o) nombre, firma y **registro profesional** del prescriptor. Los que no aplican se marcan «No aplica» explícito; el PDF no se genera con campos vacíos.
  2. Solo `optometra`/`oftalmologo` con registro vigente (art. 16 lit. a); la prescripción se emite **tras evaluación y registro del diagnóstico** en la HC y se vincula 1:1 a la atención (F-02).
  3. Prescripción **por escrito, en castellano, sin enmendaduras ni siglas** distintas de las de lex artis (art. 16): inmutable tras la firma; corrección = nueva prescripción que **reemplaza** (la anterior queda `sustituida`).
  4. **Vigencia:** el art. 17 exige indicarla; la norma verificada no fija un plazo → campo obligatorio con valor por defecto **definido por Orlando/abogado (Q-18)**; no se asume.
  5. Numeración consecutiva por tenant/sede (`RX-AAAA-nnnnnn`).
  6. Tipos: lentes oftálmicos, lentes de contacto (parámetros adicionales: curva base, diámetro, marca/material, régimen de reemplazo), baja visión/ayudas, prótesis ocular (solo especificación), terapia visual (plan, OPT-18).
  7. PDF con `@react-pdf/renderer`; sellado (SEG-08); accesible solo con enlace firmado.
  8. DTO reducido para dispensación (ASE-07) y para laboratorio (ASE-08).
- **Campos de datos:** `prescripciones(id, tenant_id, sede_id, atencion_id, paciente_id, numero, tipo, estado[borrador|firmada|sustituida|vencida], profesional_id, od jsonb, oi jsonb, dp_mm, add_od, add_oi, filtro, forma_uso, duracion, cantidad_num, cantidad_letras, indicaciones, vigencia_hasta, firmado_en, hash, sustituye_a?)`.
- **Estados / flujo:** `borrador → firmada → (sustituida | vencida)`.
- **Permisos:** R5: `optometra` C/R/F/X ˢ; `asesor`, `tecnico_lab`, `admin` R (DTO).
- **Requisitos legales asociados:** D. 1030/2007 arts. 16-19 ✅ (art. 17: 15 elementos); Res. 1995 art. 5; Ley 372/1997 — F-02, F-03, E-03, A-10.
- **Criterios de aceptación verificables:**
  - AC-OPT-05-1: Intentar firmar una prescripción sin alguno de los campos del art. 17 (prueba por cada campo) falla indicando cuál falta.
  - AC-OPT-05-2: La cantidad se guarda en número y en letras y coinciden (validación).
  - AC-OPT-05-3: Tras firmar, la prescripción es inmutable; la corrección crea una nueva y marca la anterior `sustituida`.
  - AC-OPT-05-4: El PDF contiene los 15 elementos, el nombre completo y registro del prescriptor, y su hash coincide con el almacenado.
  - AC-OPT-05-5: Un `asesor` no puede crearla ni modificarla (403).
  - AC-OPT-05-6: La prescripción incluye número de HC y vigencia; una vencida no es dispensable (ASE-07).
- **Pruebas requeridas:** U (validador por campo), I, R, E (PDF), P.

#### OPT-06 · Entrega de la HC al paciente (copia gratuita, electrónica)
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, OPT-02, SEG-08.

- **Descripción:** Generación de la copia completa de la HC (con adendas y anexos) en PDF sellado, entregada al paciente o representante sin costo y con registro.
- **Reglas de negocio:**
  1. Gratuita, completa y rápida por medio electrónico (Ley 2015/2020 art. 9 ✅); la HC electrónica se presume auténtica (art. 10).
  2. Entrega a: titular o representante (verificación de identidad). La entrega a terceros con autorización u orden se gestiona con SEG-14 (F3); mientras tanto, no se entrega a terceros desde el sistema.
  3. Incluye prescripciones, consentimientos y anexos; excluye notas internas no clínicas.
  4. Enlace con expiración; registro de entrega (quién, cuándo, medio) y auditoría.
- **Campos de datos:** `entregas_hc(id, paciente_id, solicitante, medio, archivo_id, entregada_en, entregada_por)`.
- **Estados / flujo:** `solicitada → generada → entregada`.
- **Permisos:** R23.
- **Requisitos legales asociados:** Ley 2015/2020 arts. 9-10 ✅; Res. 1995 art. 14; Ley 1751 art. 10 lit. g; Res. 839/2017 art. 12 (custodia) — A-09, J-01, B-06.
- **Criterios de aceptación verificables:**
  - AC-OPT-06-1: La copia de una HC con 3 atenciones y 1 adenda contiene todo en orden cronológico con sellos.
  - AC-OPT-06-2: El hash del PDF queda registrado y la entrega auditada.
  - AC-OPT-06-3: No se entrega a terceros sin base registrada.
- **Pruebas requeridas:** I, E.

#### OPT-07 · Adaptación de lentes de contacto (contactología)
**Prioridad:** P1 · **Fase:** F2 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, OPT-04, OPT-05, ADM-05.

- **Descripción:** Módulo de contactología: evaluación, lentes de prueba vs. definitivos, parámetros, controles, solución recomendada y seguimiento de complicaciones.
- **Reglas de negocio:**
  1. Prerrequisito: consentimiento firmado (OPT-04).
  2. Registro de lente de prueba (marca, material, curva base, diámetro, poder, DK/t si lo declara el fabricante), sobrerrefracción, centrado, movimiento, comodidad, AV con lente.
  3. Lente definitivo y prescripción de LC con campos adicionales (OPT-05); régimen de uso/reemplazo; solución recomendada (producto del catálogo con registro INVIMA y lote).
  4. Calendario de controles (24 h, 1 semana, 1 mes, … **configurable**; la periodicidad clínica la define el profesional, no el sistema) y registro de cada control.
  5. Registro de eventos adversos (ADM-10) desde la ficha.
  6. Entrenamiento de inserción/remoción/cuidado: checklist firmado.
  7. Tipos: blandos, RGP, tóricos, multifocales, terapéuticos, cosméticos (Ley 372 art. 4 c ✅).
- **Campos de datos:** `adaptaciones_lc(id, atencion_id, paciente_id, estado, tipo_lente, lentes_prueba jsonb, definitivo jsonb, controles jsonb[], solucion_producto_id?)`.
- **Estados / flujo:** `en_prueba → definitivo_ordenado → entregado → en_control → alta`.
- **Permisos:** `optometra`.
- **Requisitos legales asociados:** Ley 372/1997 art. 4 lit. c ✅; D. 1030 (LC sobre medida); D. 4725/2005 regla 15 (soluciones clase IIb ✅); Res. 4816/2008 — F-09, F-08, I-01.
- **Criterios de aceptación verificables:**
  - AC-OPT-07-1: No se puede registrar un lente definitivo sin al menos un lente de prueba o justificación.
  - AC-OPT-07-2: La solución recomendada es un producto con registro y lote vigentes.
  - AC-OPT-07-3: Los controles generan citas sugeridas (OPT-11).
- **Pruebas requeridas:** I, E.

#### OPT-08 · Hand-off clínico → venta (recomendación al asesor)
**Prioridad:** P1 · **Fase:** F2 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, ASE-03.

- **Descripción:** Al finalizar la atención, el profesional deja una recomendación estructurada de material, diseño, tipo de fabricación y síntomas relevantes **para la venta**, sin exponer el diagnóstico.
- **Reglas de negocio:**
  1. La recomendación (`RecomendacionClinica` del código actual) se separa de la HC: es un registro comercial-clínico mínimo visible al asesor.
  2. No contiene diagnóstico ni CIE-10; sí necesidades funcionales (ocupación visual, uso de pantalla, deportes) con autorización del paciente para compartirlas con ventas.
  3. La recomendación **no sustituye** la prescripción: el asesor no puede vender un dispositivo que sustituya al formulado (F-05).
- **Campos de datos:** `recomendaciones_venta(id, atencion_id, material, diseno, fabricacion, tratamientos[], notas_funcionales)`.
- **Estados / flujo:** `creada → usada_en_orden`.
- **Permisos:** Crea `optometra`; R `asesor`.
- **Requisitos legales asociados:** D. 1030 art. 19; Res. 1995 art. 14 — F-05, B-04.
- **Criterios de aceptación verificables:**
  - AC-OPT-08-1: La API del asesor no devuelve diagnóstico al leer la recomendación.
  - AC-OPT-08-2: Al crear la orden se precarga la recomendación y se enlaza.
- **Pruebas requeridas:** R, I, E.

#### OPT-09 · Control de calidad del optómetra y concepto técnico de garantías
**Prioridad:** P1 · **Fase:** F2 · **Rol/área:** Optómetra · **Dependencias:** ASE-08.

- **Descripción:** El optómetra verifica los lentes recibidos contra la prescripción (QC) y emite el concepto técnico en reclamaciones por adaptación.
- **Reglas de negocio:**
  1. QC: lensometría del lente recibido vs. prescripción; resultado aprobado/rechazado con observaciones.
  2. Concepto técnico en garantía (se enlaza con ASE-10 cuando esa funcionalidad exista, F3): sintomatología (checklist), repetición de examen opcional, nueva prescripción si procede (queda como nueva atención/prescripción).
  3. Sin sugerencia automática de causa clínica (ADR-15).
- **Campos de datos:** `qc_lentes(id, ot_id, profesional_id, medidas jsonb, aprobado, observaciones)`.
- **Estados / flujo:** `pendiente → aprobado | rechazado`.
- **Permisos:** `optometra`.
- **Requisitos legales asociados:** D. 1030 arts. 18, 21 — F-03, F-07.
- **Criterios de aceptación verificables:**
  - AC-OPT-09-1: Un QC rechazado devuelve la OT a `reproceso`.
  - AC-OPT-09-2: El concepto técnico queda enlazado a la garantía y a la OT.
- **Pruebas requeridas:** I, E.

#### OPT-10 · Catálogos clínicos oficiales (CIE-10, CUPS) y glosario de abreviaturas
**Prioridad:** P0 · **Fase:** F1 · **Rol/área:** Optómetra · **Dependencias:** PLT-02.

- **Descripción:** Carga de catálogos de diagnóstico y de procedimientos desde fuentes oficiales para evitar listas propias, con búsqueda por código y descripción.
- **Reglas de negocio:**
  1. CIE-10 y CUPS se cargan desde los archivos que publica el Ministerio de Salud/SISPRO; **no se inventan listas** (H-04). La **licencia/condiciones de uso de esos catálogos ⚠️ NO está verificada** (Q-23): el repositorio no los redistribuye hasta confirmarla — se incluye un script `catalogos:cargar` que los toma de un archivo local que el cliente descarga.
  2. Subconjunto frecuente en optometría (favoritos) configurable por tenant.
  3. Glosario de abreviaturas permitidas (lex artis) editable por tenant, con advertencia al usar otras (Res. 1995 art. 5).
  4. Catálogos versionados con fecha de vigencia.
- **Campos de datos:** `catalogo_cie10(codigo, descripcion, version)`, `catalogo_cups`, `glosario_abreviaturas`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin` carga; todos leen.
- **Requisitos legales asociados:** Res. 866/2021 (catálogos del Anexo Técnico ⚠️ no leído); Res. 1995 art. 5 — H-04, A-02.
- **Criterios de aceptación verificables:**
  - AC-OPT-10-1: Buscar «H52.1» devuelve el código y su descripción oficial cargada.
  - AC-OPT-10-2: El repositorio no contiene archivos de catálogo con licencia no verificada (comprobación en CI por lista de archivos).
  - AC-OPT-10-3: Una abreviatura fuera de glosario genera advertencia no bloqueante.
- **Pruebas requeridas:** U, I.

#### OPT-11 · Controles programados, próximo control y recalls clínicos
**Prioridad:** P1 · **Fase:** F3 · **Rol/área:** Optómetra · **Dependencias:** SEG-16, ASE-02.

- **Descripción:** Agenda automática de controles y recordatorios al paciente según lo que defina el profesional en el plan.
- **Reglas de negocio:**
  1. Fecha sugerida de próximo control definida por el profesional (no por el sistema).
  2. Lista de «controles vencidos» por sede.
  3. Recordatorios vía SEG-16; sin incluir información clínica.
- **Campos de datos:** `controles(id, atencion_id, paciente_id, fecha_sugerida, motivo_generico, estado)`.
- **Estados / flujo:** `programado → agendado → realizado | vencido`.
- **Permisos:** `optometra` define; `asesor` agenda.
- **Requisitos legales asociados:** Ley 2300/2023 (si se considera publicidad ⚠️) — K-04.
- **Criterios de aceptación verificables:**
  - AC-OPT-11-1: Un control con fecha pasada sin cita aparece en vencidos.
  - AC-OPT-11-2: El mensaje de recordatorio no contiene diagnóstico.
- **Pruebas requeridas:** U, I, E.

#### OPT-12 · Historial y comparación con la fórmula anterior
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01.

- **Descripción:** Línea de tiempo de refracciones, AV y PIO por paciente con comparación lado a lado y gráficos de evolución.
- **Reglas de negocio:**
  1. Solo lectura de atenciones firmadas; respeta R3.
  2. Gráficos de evolución (Recharts) de esfera/cilindro/PIO; sin interpretación automática.
- **Campos de datos:** Consultas sobre `atenciones`.
- **Estados / flujo:** n/a.
- **Permisos:** `optometra`.
- **Requisitos legales asociados:** Res. 1995 art. 3 (secuencialidad) — A-01.
- **Criterios de aceptación verificables:**
  - AC-OPT-12-1: Comparar dos atenciones resalta los campos que cambiaron.
  - AC-OPT-12-2: Cada visualización queda auditada.
- **Pruebas requeridas:** I, E.

#### OPT-13 · Validaciones de plausibilidad de captura (no diagnósticas)
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01.

- **Descripción:** Advertencias de coherencia al digitar: adición fuera de rango, diferencia OD/OI muy alta, eje sin cilindro, DP atípica, PIO fuera de rango fisiológico de captura.
- **Reglas de negocio:**
  1. **Solo plausibilidad de entrada** (posible error de digitación); no clasifica hallazgos ni sugiere diagnóstico/tratamiento (ADR-15, E-06).
  2. Umbrales configurables; el profesional puede ignorar la advertencia con un clic (queda registrado).
  3. Revisión previa de abogado/INVIMA si algún umbral se acerca a una clasificación clínica (Q-21).
- **Campos de datos:** `reglas_plausibilidad(tenant_id, campo, min, max, mensaje)`.
- **Estados / flujo:** n/a.
- **Permisos:** `optometra`.
- **Requisitos legales asociados:** D. 4725/2005 art. 2 ✅ (software como dispositivo médico) — E-06 ⚠️ conclusión.
- **Criterios de aceptación verificables:**
  - AC-OPT-13-1: Un eje de 270 es rechazado; una adición de 6,00 genera advertencia.
  - AC-OPT-13-2: Ningún mensaje contiene términos diagnósticos.
- **Pruebas requeridas:** U (tabla de casos), revisión de textos.

#### OPT-14 · Adjuntos e imágenes clínicas (retinografía, topografía, OCT, PDF de equipos)
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** SEG-12, SEG-13, OPT-01.

- **Descripción:** Subida y vinculación de resultados de equipos a la atención, con visor simple, hash de integridad y cifrado.
- **Reglas de negocio:**
  1. Tipos: JPG/PNG/PDF; DICOM **fuera** del MVP (visores Cornerstone3D MIT / OHIF MIT ✅ solo si se demuestra necesidad; no probados con imágenes de equipos de óptica ⚠️).
  2. Cifrado AES-256-GCM (SEG-12); hash SHA-256; verificación MIME por contenido (SEG-13).
  3. Miniaturas: **sin `sharp`** (arrastra binarios LGPL de libvips, ver H-LIC-1); se usa redimensionado en navegador (canvas) o `jimp` (MIT ✅).
  4. Los anexos son parte de la HC: no se eliminan (SEG-09); el paciente puede recibir copia (OPT-06).
- **Campos de datos:** `anexos(id, tenant_id, atencion_id, tipo, nombre, mime, tamano, hash, ruta_cifrada, equipo, subido_por)`.
- **Estados / flujo:** Inmutable tras vincular.
- **Permisos:** R6.
- **Requisitos legales asociados:** Res. 1995 art. 11 ✅ (anexos) — A-05, L-02.
- **Criterios de aceptación verificables:**
  - AC-OPT-14-1: Un anexo subido se descarga idéntico (hash) y su archivo en disco es ilegible sin clave.
  - AC-OPT-14-2: Se rechaza un ejecutable renombrado.
  - AC-OPT-14-3: El anexo aparece en la copia de HC.
- **Pruebas requeridas:** I, S, E.

#### OPT-15 · Plantillas de examen por tipo de consulta
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01.

- **Descripción:** Plantillas configurables que muestran las secciones relevantes según tipo (primera vez, control, LC, pediátrica, baja visión, terapia, tamizaje).
- **Reglas de negocio:**
  1. Plantillas versionadas (esquema Zod por tipo); una atención conserva la versión con la que se creó.
  2. El tenant puede ocultar secciones no usadas pero **no** eliminar campos obligatorios por norma (identificación, diagnóstico, prescripción).
- **Campos de datos:** `plantillas_examen(id, tenant_id, tipo, version, esquema jsonb)`.
- **Estados / flujo:** n/a.
- **Permisos:** `admin` configura; `optometra` usa.
- **Requisitos legales asociados:** Res. 1995 arts. 3-4 — A-01.
- **Criterios de aceptación verificables:**
  - AC-OPT-15-1: Una atención pediátrica muestra las secciones de OPT-19 y exige representante.
  - AC-OPT-15-2: Cambiar la plantilla no altera atenciones previas.
- **Pruebas requeridas:** U, I, E.

#### OPT-16 · Remisión, interconsulta y certificados en PDF
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, SEG-08.

- **Descripción:** Remisión a oftalmología u otras especialidades, y certificados/constancias optométricas firmados.
- **Reglas de negocio:**
  1. Remisión con motivo clínico mínimo necesario, datos del destinatario y firma; PDF sellado.
  2. Certificado: contenido restringido al hecho certificado (p. ej., que se realizó examen visual en tal fecha); no incluye más datos clínicos de los necesarios.
  3. Entrega al paciente (no a terceros sin base, SEG-14).
- **Campos de datos:** `remisiones(id, atencion_id, destinatario, motivo, urgencia)`, `certificados`.
- **Estados / flujo:** `borrador → firmado`.
- **Permisos:** `optometra`.
- **Requisitos legales asociados:** Ley 372/1997 (alcance del optómetra); Res. 1995 arts. 5, 14 — A-02, B-04.
- **Criterios de aceptación verificables:**
  - AC-OPT-16-1: La remisión firmada es inmutable y aparece en la HC.
  - AC-OPT-16-2: El certificado no incluye diagnóstico por defecto.
- **Pruebas requeridas:** I, E.

#### OPT-17 · Baja visión: evaluación, ayudas y entrenamiento
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, OPT-05, OPT-15, ADM-05.

- **Descripción:** HC especializada de baja visión: funcionalidad visual, ayudas ópticas y no ópticas probadas/entregadas, entrenamiento y seguimiento.
- **Reglas de negocio:**
  1. Campos: AV de lejos/cerca con diferentes tablas (tipo de tabla registrado), campo visual funcional, sensibilidad al contraste, deslumbramiento, necesidades de la persona (lectura, movilidad, tareas), ayudas probadas (telescópicos, lupas, filtros, CCTV, software) con resultado, ayuda prescrita/entregada (con prescripción OPT-05 tipo `baja_vision`), plan de entrenamiento y sesiones.
  2. Respaldo: Ley 372 art. 4 f) ✅ y Perfil de competencias del optómetra de MinSalud (5.4.3.1 y 5.4.5.1 ✅).
  3. Equipos y ayudas son dispositivos médicos: registro INVIMA/lote en catálogo (ADM-05).
  4. Remisión a rehabilitación/oftalmología (OPT-16).
- **Campos de datos:** `baja_vision(id, atencion_id, funcionalidad jsonb, ayudas_probadas jsonb[], ayuda_entregada jsonb, plan jsonb)`, `sesiones_entrenamiento`.
- **Estados / flujo:** `evaluacion → ayuda_entregada → entrenamiento → seguimiento → alta`.
- **Permisos:** `optometra`/`oftalmologo`.
- **Requisitos legales asociados:** Ley 372/1997 art. 4 lit. f ✅; D. 1030/2007 (óptica con consultorio) ✅; D. 4725 — A-01, F-01.
- **Criterios de aceptación verificables:**
  - AC-OPT-17-1: Una atención de baja visión usa su plantilla y se firma como cualquier atención.
  - AC-OPT-17-2: Registrar la entrega de una ayuda descuenta stock y genera prescripción tipo `baja_vision`.
  - AC-OPT-17-3: Las sesiones de entrenamiento se registran con fecha y progreso.
- **Pruebas requeridas:** I, E.

#### OPT-18 · Terapia visual, ortóptica y pleóptica: plan y sesiones
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, OPT-04, ADM-09.

- **Descripción:** Plan terapéutico por sesiones para visión binocular y ambliopía, con ejercicios, progreso y pruebas binoculares de control.
- **Reglas de negocio:**
  1. Plan: diagnóstico CIE-10 de referencia, objetivos, número de sesiones estimadas, ejercicios, frecuencia, terapias en casa.
  2. Sesión: fecha, duración, ejercicios, resultados (PPC, vergencias, flexibilidad, estereopsis), observaciones; cada sesión se **firma** (inmutable, correcciones por adenda).
  3. Consentimiento específico (OPT-04). Menores con representante (SEG-06).
  4. Respaldo: Perfil de competencias de MinSalud 5.4.3.3-5.4.3.4 ✅; D. 1030 (óptica con consultorio) ✅; Softop ofrece «ortóptica» ✅ (informe).
  5. Cuando se factura por sesión a particulares, el documento fiscal no contiene diagnóstico (G-08).
- **Campos de datos:** `planes_terapia(id, atencion_id, objetivos, sesiones_estimadas, ejercicios jsonb)`, `sesiones_terapia(id, plan_id, fecha, duracion_min, resultados jsonb, firmado_en)`.
- **Estados / flujo:** `plan_activo → en_curso → completado | suspendido`.
- **Permisos:** `optometra`; `auxiliar_clinico` registra bajo supervisión ⚠️ (Q-26).
- **Requisitos legales asociados:** D. 1030/2007 art. 2 ✅; Res. 1995 art. 5; Perfil Minsalud 2014 ✅ — A-02, G-08.
- **Criterios de aceptación verificables:**
  - AC-OPT-18-1: Se crea un plan de 12 sesiones, se firman 5 y el avance (5/12) se muestra.
  - AC-OPT-18-2: Una sesión firmada no se edita; se corrige por adenda.
  - AC-OPT-18-3: La facturación de sesiones usa descripción comercial («Sesión de terapia visual») sin diagnóstico.
- **Pruebas requeridas:** I, E.

#### OPT-19 · Optometría pediátrica
**Prioridad:** P1 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, SEG-06, OPT-15.

- **Descripción:** Plantilla y reglas para la atención de niños y adolescentes: acompañante/representante, desarrollo visual, cicloplejía, estereopsis, tamizaje escolar.
- **Reglas de negocio:**
  1. Representante legal obligatorio y consentimiento de representante; ausencia de comunicación comercial al menor (SEG-06).
  2. Campos específicos: antecedentes perinatales y de desarrollo, rendimiento escolar, uso de pantallas, AV con tablas apropiadas a la edad (tabla registrada), estereopsis, cicloplejía (medicamento/dosis **registrados por el profesional**; el sistema no sugiere dosis).
  3. Cálculo de edad en meses y años; curvas/rangos de referencia **no** se incluyen (⚠️ fuente no verificada).
  4. Respaldo: Perfil MinSalud destaca poblaciones pediátrica y geriátrica ✅.
- **Campos de datos:** Sección `pediatrica` en `atenciones.contenido`.
- **Estados / flujo:** Como OPT-01.
- **Permisos:** `optometra`.
- **Requisitos legales asociados:** Ley 1581 art. 7; D. 1377 art. 12 (⚠️ alcance); Res. 1995 art. 9 — C-07, A-04.
- **Criterios de aceptación verificables:**
  - AC-OPT-19-1: No se inicia atención pediátrica sin representante.
  - AC-OPT-19-2: El sistema no propone dosis de cicloplejía.
- **Pruebas requeridas:** I, E.

#### OPT-20 · Tamizaje visual y brigadas (registro masivo simplificado)
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, SEG-05.

- **Descripción:** Jornadas de salud visual en empresas, colegios o comunidades con registro rápido, resultado simple y remisiones.
- **Reglas de negocio:**
  1. Contrato/cliente de la jornada (empresa contratante); lista de participantes importada o registrada in situ.
  2. Formato abreviado: AV, prueba de color, resultado del tamizaje (pasa/refiere) y remisión; **sin sustituir** la HC si se realizó examen optométrico.
  3. Autorización de datos de cada participante (SEG-05) o del contratante según base legal que defina el abogado (Q-29).
  4. Modo offline limitado: **no** se implementa en el MVP (⚠️ riesgo de datos sensibles en el dispositivo); se registra en línea desde tableta.
- **Campos de datos:** `jornadas(id, cliente, fecha, lugar)`, `tamizajes(id, jornada_id, paciente_id, resultados jsonb, remision bool)`.
- **Estados / flujo:** `planificada → ejecutada → cerrada`.
- **Permisos:** `optometra`, `auxiliar_clinico`.
- **Requisitos legales asociados:** Ley 372/1997 art. 4 lits. g, h, j ✅; Ley 1581 — C-01, C-03.
- **Criterios de aceptación verificables:**
  - AC-OPT-20-1: Registrar 50 participantes con autorización en < 10 min (usabilidad, prueba E cronometrada).
  - AC-OPT-20-2: Un participante sin autorización no avanza.
- **Pruebas requeridas:** E, I.

#### OPT-21 · Prótesis oculares: seguimiento y entrega
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, OPT-04, OPT-05.

- **Descripción:** Registro de evaluación, diseño, adaptación, entrega y controles de prótesis oculares (la fabricación ocurre en un laboratorio autorizado).
- **Reglas de negocio:**
  1. Ficha: lateralidad, causa, medidas, laboratorio fabricante, fecha de encargo, entrega, controles y cuidados.
  2. Dispositivo sobre medida: prescripción (OPT-05) y trazabilidad (ADM-05/07).
  3. Respaldo: Ley 372 art. 4 d) ✅; D. 1030 ✅.
- **Campos de datos:** `protesis_oculares(id, atencion_id, lado, laboratorio_id, estado, controles jsonb)`.
- **Estados / flujo:** `encargada → entregada → en_control`.
- **Permisos:** `optometra`.
- **Requisitos legales asociados:** Ley 372/1997 art. 4 lit. d ✅; D. 1030/2007 — F-01, F-06.
- **Criterios de aceptación verificables:**
  - AC-OPT-21-1: El estado cambia con registro de usuario y hora.
  - AC-OPT-21-2: La entrega requiere consentimiento.
- **Pruebas requeridas:** I, E.

#### OPT-22 · Oftalmología e interconsulta (rol oftalmólogo)
**Prioridad:** P2 · **Fase:** F4 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, OPT-16.

- **Descripción:** Habilita al `oftalmologo` con el mismo módulo clínico y plantilla propia; interconsulta entre optómetra y oftalmólogo.
- **Reglas de negocio:**
  1. Puede prescribir (D. 1030 art. 16 ✅); registro profesional obligatorio.
  2. La plantilla de oftalmología **no se inventa en esta especificación**: se define con un oftalmólogo (Q-26); hasta entonces usa la plantilla base.
  3. Procedimientos invasivos/láser/cirugía están fuera del alcance del optómetra (Ley 372 art. 5 ✅) y de este producto.
- **Campos de datos:** `especialidad` en `perfiles_profesionales`.
- **Estados / flujo:** Como OPT-01.
- **Permisos:** `oftalmologo`.
- **Requisitos legales asociados:** D. 1030 art. 16 ✅; Ley 372 art. 5 ✅ — E-03, A-10.
- **Criterios de aceptación verificables:**
  - AC-OPT-22-1: Un `oftalmologo` con registro firma y prescribe; sin registro no.
  - AC-OPT-22-2: Una remisión del optómetra llega al oftalmólogo de la sede.
- **Pruebas requeridas:** R, I.

#### OPT-23 · Resumen Digital de Atención (RDA/FHIR) e interoperabilidad (IHCE) — condicionado
**Prioridad:** P1 · **Fase:** F5 · **Rol/área:** Optómetra · **Dependencias:** OPT-01, OPT-10; decisión Q-05.

- **Descripción:** Generación y envío del RDA de consulta externa al cerrar una atención, para prestadores obligados. Es **P0 condicional** (P0 si el tenant es actor obligado, P1 si no): se programa en F5 porque la aplicabilidad no está verificada; si Q-05 concluye que el piloto está obligado, esta funcionalidad pasa a ser requisito del Gate A.
- **Reglas de negocio:**
  1. **Condición:** solo si Q-05 confirma que el tenant es actor obligado (Res. 866/2021 art. 2 ⚠️ aplicabilidad y cronograma por actor NO VERIFICADOS). P0 solo para tenants que sean prestadores obligados.
  2. Marco: Res. 1888 del 15-sep-2025 (RDA, estándar HL7 FHIR; transición de 6 meses desde 15-oct-2025, ≈ abr-2026 ✅ cálculo propio) y Res. 1799/2026 que modificó arts. 2, 3 y 5 (⚠️ no leída); Ley 2015/2020 ✅.
  3. Mapeo HC → Bundle FHIR (documento) con tipos de `@medplum/fhirtypes` (Apache-2.0 ✅) o construcción manual con Zod; autenticación OAuth2 (client_id/secret por tenant, cifrados); adjuntos Base64; reintentos con pg-boss; acuse guardado.
  4. Catálogos de la Res. 866 (CIE-10, CUPS, documentos) del Anexo Técnico ⚠️ no leído.
  5. No usar `fhirpath.js` (licencia no estándar).
- **Campos de datos:** `rda_envios(id, atencion_id, bundle jsonb, estado, respuesta, enviado_en)`, `credenciales_ihce` (cifradas).
- **Estados / flujo:** `pendiente → enviado → aceptado | rechazado → reintento`.
- **Permisos:** `admin` configura; automático.
- **Requisitos legales asociados:** Ley 2015/2020 arts. 1, 3-8, 13 ✅; Res. 866/2021 arts. 1-2, 6, 10 ✅; Res. 1888/2025 arts. 1-7 ✅; manual IHCE ⚠️ — H-03, H-04, H-05.
- **Criterios de aceptación verificables:**
  - AC-OPT-23-1: Para una atención de prueba se genera un Bundle FHIR que valida contra el esquema/perfil cargado (si se dispone de uno oficial utilizable).
  - AC-OPT-23-2: Con la bandera «actor IHCE» desactivada, no se genera ni envía nada.
  - AC-OPT-23-3: Un rechazo del servicio queda con detalle y reintento.
- **Pruebas requeridas:** U (mapeo), I, E (contra simulador local).

#### OPT-24 · Telemedicina / teleconsulta — fuera de alcance hasta verificar
**Prioridad:** P2 · **Fase:** F5 · **Rol/área:** Optómetra · **Dependencias:** —

- **Descripción:** Registro de que **no se implementa** en esta versión: la Res. 3100/2019 menciona la modalidad de telemedicina pero su aplicación a optometría **no fue verificada**.
- **Reglas de negocio:**
  1. No se construye hasta que un consultor de habilitación confirme requisitos (Q-25).
  2. Se reserva el campo `modalidad` (`presencial|telemedicina`) en `atenciones` por compatibilidad futura, sin lógica asociada.
- **Campos de datos:** Campo `modalidad`.
- **Estados / flujo:** n/a.
- **Permisos:** n/a.
- **Requisitos legales asociados:** Res. 3100/2019 ⚠️ — E-01.
- **Criterios de aceptación verificables:**
  - AC-OPT-24-1: El campo `modalidad` existe, es `presencial` por defecto y no hay UI de telemedicina.
  - AC-OPT-24-2: Ninguna ruta ni menú menciona teleconsulta.
- **Pruebas requeridas:** I.

# 10. Cobertura de especialidades, formas de operar y productos del sector en Colombia

> Fuentes: informe de producto §2 (especialidades, productos, Decreto 1030/2007, Ley 372/1997, Perfil de competencias del optómetra de MinSalud 2014, competencia) e informe legal §3-F. Lo marcado ⚠️ no tiene norma verificada y **no se codifica como obligación**: el producto lo trata como categoría configurable con advertencia.

## 10.1 Especialidades y servicios → funcionalidades

| Especialidad / línea | Qué cubre el producto | Funcionalidades (ID) | Fase | Respaldo / verificación |
|---|---|---|---|---|
| **Optometría clínica** | HC completa, diagnóstico CIE-10, prescripción art. 17, adendas, historial | OPT-01, 02, 03, 05, 06, 10, 12, 13, 15 | F1-F2, F4 | Ley 372 art. 4 a), b), e); D. 1340/1998 (texto ⚠️); Res. 1995 ✅ |
| **Contactología** | Consentimiento, lentes de prueba/definitivos, parámetros, controles, solución recomendada con lote/registro, eventos adversos | OPT-04, OPT-07, OPT-05 (tipo LC), ADM-05, ADM-07, ADM-10 | F2-F3 | Ley 372 art. 4 c) ✅; D. 4725 regla 15 (soluciones IIb) ✅ |
| **Baja visión** | Funcionalidad visual, ayudas ópticas/no ópticas, entrenamiento, prescripción de ayudas | OPT-17 (+ OPT-05, ADM-05) | F4 | Ley 372 art. 4 f) ✅; Perfil MinSalud 5.4.3.1, 5.4.5.1 ✅ |
| **Terapia visual, ortóptica y pleóptica** | Plan terapéutico por sesiones firmadas, pruebas binoculares, progreso | OPT-18 (+ OPT-04) | F4 | Perfil MinSalud 5.4.3.3-5.4.3.4 ✅; D. 1030 art. 2 ✅ |
| **Optometría pediátrica** | Representante legal, plantilla pediátrica, estereopsis, cicloplejía registrada | OPT-19, SEG-06, OPT-15 | F1 (menores), F4 | Perfil MinSalud ✅; Ley 1581 art. 7 / D. 1377 art. 12 (alcance ⚠️) |
| **Salud visual ocupacional, tamizaje y brigadas** | Jornadas, registro masivo, remisión | OPT-20 | F4 | Ley 372 art. 4 g), h), j) ✅; Softop (HC tamizaje) ✅ |
| **Prótesis oculares** | Ficha, laboratorio, entrega y controles | OPT-21 (+ OPT-05, ADM-21) | F4 | Ley 372 art. 4 d) ✅; D. 1030 ✅ |
| **Oftalmología (interconsulta/titular)** | Rol `oftalmologo`, remisiones | OPT-22, OPT-16 | F4 | D. 1030 art. 16 ✅; plantilla propia ⚠️ (Q-26) |
| **Taller óptico** | Recepción, bisel/montaje, OT con estados, QC, bitácora de proceso, certificado de adecuación | ASE-08, ADM-01, ADM-21 | F1-F2, F4 | D. 1030 arts. 6, 15 ✅ |
| **Laboratorio oftálmico / de LC / de prótesis** | Producción para ópticas/IPS (no venta al público), certificado de producción | ADM-21, ADM-01, ASE-15 | F4 | D. 1030 art. 20 ✅ |
| **Venta de monturas** | Catálogo con atributos, código de barras, stock por sede, etiquetas | ADM-05, ADM-06, ASE-04, ASE-14 | F2-F4 | Retail ✅ (competencia) |
| **Lentes oftálmicos (sobre medida)** | Prescripción→orden→laboratorio→QC→entrega; verificación prescrito vs. dispensado | OPT-05, ASE-03, ASE-07, ASE-08, ASE-09, OPT-09 | F1-F2 | D. 1030 arts. 16-19 ✅ |
| **Lentes de contacto y líquidos** | Lote, vencimiento, registro INVIMA, FEFO, recall | ADM-05, ADM-07, OPT-07 | F2-F3 | D. 4725 ✅; plazos INVIMA ⚠️ |
| **Gafas de lectura listas** | Categoría propia con campo de registro sanitario | ADM-05, ASE-04 | F2 | Concepto INVIMA 2038222/2018 ✅ (clase I con registro; D. 1030 no aplica) |
| **Gafas de sol** | Categoría con filtro/UV declarados; con fórmula = lente oftálmico | ADM-05 | F2 | Norma técnica ⚠️ **NO VERIFICADA** (el sistema no afirma cumplimiento) |
| **Accesorios** (estuches, paños, cordones, kits) | SKU simple | ADM-05 | F2 | D. 1030 los menciona como «accesorios de salud visual» ✅ |
| **Productos de salud visual** (lágrimas artificiales, suplementos) | Categoría **bloqueada por defecto** hasta configurar registro y habilitación | ADM-05 | F2 | Norma por categoría ⚠️ **NO VERIFICADA** |
| **Convenios, empresas y EPS** | Tarifas, vigencia, facturación sin datos clínicos | ADM-12, ASE-11, ADM-19 (si aplica) | F3, F5 | Res. 948/2026 ✅ (RIPS); aplicabilidad ⚠️ |
| **Telemedicina** | **No implementado** | OPT-24 | — | Res. 3100 la menciona; aplicación ⚠️ |

## 10.2 Catálogo de productos del sector (taxonomía del catálogo ADM-05)
`clase_regulatoria` es configurable y su valor inicial es una **sugerencia** que el cliente/consultor confirma (la fuente oficial del listado es la Res. 4396/2008, ⚠️ no leída).

| # | Categoría | Subcategorías (Colombia) | Atributos clave | Clase sugerida | Bajo prescripción | Trazabilidad |
|---|---|---|---|---|---|---|
| 1 | Monturas oftálmicas | Metal, acetato, TR90/inyectadas, titanio, al aire/perforadas, infantiles, deportivas, de seguridad industrial | marca, referencia, color, calibre-puente-varilla, material, género, tamaño | `por_clasificar` (D. 1030: «monturas hechas a medida» ✅; estándar ⚠️) | No | SKU |
| 2 | Lentes oftálmicos | Monofocal, bifocal, progresivo, ocupacional; terminados/tallado/free-form | material (CR-39, policarbonato, Trivex, 1.60, 1.67, 1.74), diseño, fabricación, tratamientos (antirreflejo, fotocromático [Transitions Gen8/XTRActive/Sensity en el catálogo actual], filtro luz azul, endurecido, UV, polarizado, espejado), laboratorio | `dispositivo_sobre_medida_d1030` ✅ | **Sí** | OT, laboratorio |
| 3 | Lentes de contacto | Blandos (diarios/quincenales/mensuales/anuales), RGP, tóricos, multifocales, cosméticos, terapéuticos | curva base, diámetro, poder/cilindro/eje/adición, material, régimen de reemplazo, fabricante | `dispositivo_medico_estandar_d4725` o sobre medida (RGP a medida) | **Sí** | lote, vencimiento, registro INVIMA |
| 4 | Soluciones y líquidos para LC | Multipropósito, peróxido, enzimas, humectantes para LC | registro INVIMA, lote, vencimiento, volumen | `dispositivo_medico_estandar_d4725` — **clase IIb** (regla 15) ✅ | No | **lote, vencimiento, registro** |
| 5 | Gafas de lectura listas | Presbicia listas, con estuche | adición, montura, registro sanitario | `dispositivo_medico_estandar_d4725` clase I con registro (concepto INVIMA 2038222/2018) ✅ | No | registro |
| 6 | Gafas de sol | Sin fórmula; con fórmula (= lente oftálmico + montura) | categoría de filtro, protección UV declarada, polarizado | **⚠️ norma no verificada** → `por_clasificar` | Con fórmula: sí | SKU |
| 7 | Ayudas de baja visión | Lupas, telescópicos, filtros, CCTV, software | tipo, aumento, registro | `por_clasificar` | Sí (prescripción de ayuda) | registro, serie |
| 8 | Prótesis oculares | Prótesis a medida | lado, material, laboratorio | `dispositivo_sobre_medida_d1030` ✅ | **Sí** | laboratorio |
| 9 | Accesorios | Estuches, paños, cordones, spray, kits de reparación | SKU simple | `no_dispositivo_accesorio` | No | SKU |
| 10 | Productos de salud visual | Lágrimas artificiales, suplementos | registro, lote, vencimiento | **⚠️ norma por categoría no verificada** → bloqueada por defecto | No | lote, vencimiento |
| 11 | Servicios | Examen optométrico, adaptación LC, control, terapia visual, ajuste, reparación, bisel/montaje, soldadura | duración, profesional | n/a (sin stock) | n/a | n/a |
| 12 | Repuestos de taller | Plaquetas, tornillos, soldadura | SKU, costo | n/a | n/a | SKU |
| 13 | Activos de la sede (no se venden) | Equipos médicos (autorrefractómetro, lensómetro, tonómetro, lámpara de hendidura…) | serie, registro INVIMA, calibración | n/a | n/a | ADM-10 |

## 10.3 Tipos de establecimiento y módulos habilitados
| Tipo de sede | Módulos habilitados | Bloqueados |
|---|---|---|
| `optica_con_consultorio` (D. 1030) | Todos (clínico + venta + taller si lo tiene) | — (requiere REPS cargado para HC) |
| `optica_sin_consultorio` | Venta/dispensación con prescripciones **externas** verificadas, taller, inventario | HC propia y prescripción propia |
| `profesional_independiente` / `ips` | Clínico + venta | — |
| `taller_optico` | OT, inventario, compras | Venta al público |
| `laboratorio_oftalmico` / `laboratorio_lc_protesis` | Producción, pedidos de ópticas, trazabilidad | Venta al público (D. 1030 art. 20) |

## 10.4 Verificación de cobertura (resumen)
- 18 de 19 líneas de la tabla 10.1 tienen funcionalidad asignada; la que no (telemedicina) está **excluida a propósito** y registrada (OPT-24).
- Cubren productos: 13 categorías en 10.2; dos con norma no verificada (gafas de sol; productos de salud visual, que incluyen lágrimas artificiales y suplementos) quedan como categorías configurables y bloqueadas/advertidas, **no se inventa norma**.
- El script `_build/check_spec.py` (resultado en RUBRICA_99.md §2) verifica automáticamente que cada ID citado exista y que cada especialidad apunte a funcionalidades reales.


# 11. Puertos y adaptadores intercambiables (donde la regla «100 % gratuito» choca con la realidad)

**Principio:** el núcleo del producto solo conoce *interfaces* (puertos, TypeScript). Cada interfaz tiene un adaptador **por defecto sin costo** y adaptadores opcionales que el cliente final contrata y paga. Una **prueba de contrato** compartida (`ports/<puerto>/contract.test.ts`) debe pasar con todos los adaptadores. Los adaptadores viven en `web/src/adapters/<puerto>/<nombre>/` y se activan por tenant (PLT-06 exige declarar país/base jurídica). **No se afirma que exista una alternativa gratuita donde no se verificó.**

## 11.1 `FacturacionPort` (DIAN) — ADM-09
Operaciones: `emitirFactura`, `emitirTiquetePOS`, `emitirNotaCredito`, `emitirNotaDebito`, `consultarEstado`, `descargarXml/Pdf`, `capacidades()`.

| Adaptador | Costo | Verificación | Notas |
|---|---|---|---|
| `simulado` | Gratis | n/a | Solo `desarrollo/pruebas/demo`; leyenda «SIMULACIÓN — SIN VALIDEZ FISCAL»; **prohibido en producción** (PLT-10). |
| `solucion_gratuita_dian_asistida` | Gratis (la DIAN ofrece «solución gratuita» ✅ con set de pruebas y rangos de MUISCA) | **API ⚠️ no verificada** (parece módulo web); fechas de obligatoriedad del POS electrónico ⚠️ | Genera paquete de datos y guía para captura manual; sirve para baja facturación; el estado `aceptado` lo confirma una persona subiendo el CUFE. |
| `proveedor_http_generico` | **El cliente contrata y paga** el proveedor tecnológico (Factus, Siigo u otro). Factus: sandbox compartido gratis; producción por paquete de pago **sin precios públicos** ✅ (informe) | Contratos de API de cada proveedor ⚠️ no auditados | Credenciales por tenant cifradas; país del proveedor declarado (PLT-06). Cumple Res. 165 art. 55: proveedor tecnológico habilitado por la DIAN. |
| `ubl21_propio` (P2, F4+) | Sin licencia; costo de ingeniería **alto** | Libs: `xmlbuilder2` MIT ✅, `xml-crypto` MIT ✅, `fast-xml-parser` MIT ✅, `node-forge` (BSD-3-Clause **OR** GPL-2.0 → se elige BSD-3-Clause ✅). **Firma XAdES-EPES y cobertura de `xml-crypto` ⚠️ NO VERIFICADAS**. Única librería colombiana hallada (`org.coderic.ws.dian`, Apache-2.0) tiene 0 estrellas, es cliente SOAP en otro lenguaje y **no se evaluó** | Requiere que cada tenant se habilite ante la DIAN (set de pruebas) o que Orlando sea proveedor tecnológico (trámite propio): Q-03. |

**Opciones DIAN (informe legal G-01):** (1) integrar proveedor habilitado o solución gratuita *(recomendada para el MVP)*; (2) software propio habilitado por cada tenant; (3) Orlando como proveedor tecnológico (mayor carga). La elección es de Orlando con su contador: **Q-03**.

## 11.2 `PagosPlataformaPort` (cobro de la suscripción de OptiSaaS) — PLT-04
| Adaptador | Costo | Verificación |
|---|---|---|
| `manual_transferencia` (por defecto) | Gratis | Registro de pago y conciliación manual por el owner. |
| `stripe` (opcional, desactivado) | Comisión por transacción ✅ (informe) | Disponibilidad y tarifas en Colombia ⚠️ no verificadas. |
| Pasarelas colombianas | ⚠️ **No evaluadas** (no se afirma que sean gratuitas) | — |

**Pagos de los clientes de la óptica:** OptiSaaS **no procesa pagos**; registra el medio (efectivo, tarjeta con datáfono del cliente, transferencia). Sin tienda en línea con pasarela en el MVP.

## 11.3 `MensajeriaPort` (recordatorios, avisos, campañas) — SEG-16, ASE-12
| Adaptador | Costo | Verificación | Notas |
|---|---|---|---|
| `wa_me_asistido` (por defecto) | Gratis | Funcionamiento y términos de uso de enlaces de «clic para chatear» ⚠️ no verificados en este trabajo | El sistema arma el enlace con el texto; el envío lo confirma una persona; no hay API. |
| `smtp` | Costo del servidor SMTP (propio o del cliente) ⚠️ | `nodemailer` **MIT-0** ✅ (npm hoy; el informe lo dejó sin verificar) | Sin datos clínicos en el cuerpo. |
| `whatsapp_cloud_api` | **Meta cobra plantillas fuera de la ventana de 24 h** ✅ (informe); tarifas no reverificadas ⚠️; paga el cliente | Términos ⚠️ | Requiere plantillas aprobadas; subencargado en el exterior (PLT-06). |
| `kapso` | ⚠️ Licencia/costo no evaluados | Integración del equipo | Solo si Orlando lo aprueba. |
| `impresion_pdf` | Gratis | n/a | Carta/aviso imprimible. |
| SMS | ⚠️ No evaluado | — | — |

Todas las rutas aplican Ley 2300/2023 (SEG-16).

## 11.4 `AlmacenamientoPort` (anexos, PDFs)
`disco_cifrado` (por defecto, AES-256-GCM con claves por tenant) y `s3_compatible` (de propiedad del cliente). **MinIO queda excluido** por licencia AGPL (⚠️ verificar versión vigente antes de reconsiderar). La ruta nunca es pública (SEG-13).

## 11.5 `AuthPort` — SEG-01
Auth.js v5 (ISC) por defecto; Better Auth (MIT) como alternativa.

## 11.6 `SelloTiempoPort` — SEG-08
`servidor` (por defecto: hora del servidor + hash) y `tsa_externa` (opcional; ⚠️ licencia/costo/jurisdicción no evaluados).

## 11.7 `LaboratorioPort` — ASE-15
`manual` (PDF/Excel), `correo`, `api_generica`; integraciones con redes de laboratorios ⚠️ no evaluadas.

## 11.8 `RIPSPort` e `IHCEPort` — ADM-19, OPT-23 (F5, condicionados)
Adaptadores `simulador_local` (pruebas) y `mecanismo_oficial` (servicios del Ministerio ⚠️: condiciones de uso, gratuidad y credenciales no verificadas).

## 11.9 Hosting y base de datos (no es un puerto: es una decisión de despliegue)
- **BD:** PostgreSQL ≥ 16 estándar (**licencia PostgreSQL ✅**). Despliegue por `DATABASE_URL`; `docker-compose.yml` solo para desarrollo/pruebas.
- **Opciones:** (a) servidor propio del dueño; (b) VPS de un proveedor (Orlando tiene servicios de hosting de un proveedor conectados en su entorno de trabajo, pero **el costo, el contrato de encargo y la ubicación del centro de datos ⚠️ no se verificaron**); (c) Supabase autoalojado (Apache-2.0 ✅) — opcional, no requerido; (d) Supabase hospedado — **planes de pago y límites de capa gratuita ⚠️ no verificados**.
- **Inevitable:** cualquier hosting en nube tiene costo; la regla «sin pagos obligatorios» se interpreta como «sin licencias ni servicios SaaS de terceros obligatorios». **Decisión Q-06** (incluye residencia de datos en Colombia o país de la lista SIC, PLT-06).
- **Herramientas de infraestructura del SO** (cron, cifrado de disco, copia remota): no son dependencias de código, pero se listan para aprobación (Q-09).


# 12. Plan de planes y precios competitivo

## 12.1 Referencias de mercado (precios de lista públicos, consultados el 2-oct-2026 por el bot de producto; pueden cambiar; «cierres reales» ⚠️ desconocidos)
| Producto | Plan | Precio publicado (COP/mes) | Alcance |
|---|---|---|---|
| OptikaApp | Starter | $83.000 | 1 sede, 5 usuarios, **sin DIAN** |
| OptikaApp | Pro | $135.000 | 2 sedes, DIAN 400 docs/mes |
| OptikaApp | Business | $600.000 | 6 sedes |
| GouJana | — | desde $89.900 **por doctor** | HC, POS, DIAN, RIPS |
| Softop, Gesvision, Optysof, RevolutionEHR, Ocuco | — | **no publicado** ⚠️ | — |

*(La web de OptikaApp tiene una inconsistencia: su FAQ dice «desde $49.900».)* **Precios actuales de OptiSaaS** (`plans-config.ts`): Básico $500.000 · Premium $1.500.000 · Enterprise $4.500.000 → entre 3,7× y 6,0× el escalón comparable de OptikaApp ($500.000 vs. $135.000 y $83.000 para 1-2 sedes) y fuera de rango frente a GouJana.

## 12.2 Propuesta (hipótesis a validar con Orlando: Q-11)
Principios: precio de entrada para 1 sede alineado a ~$80–140 mil; **no cobrar por historia clínica**; la facturación electrónica se integra en todos los planes pero **el costo del proveedor tecnológico lo asume el cliente**; módulos avanzados por plan; sede adicional escalonada; prueba de 15 días (el valor ya existe en `DEFAULT_TRIAL_DAYS` ✅).

| Plan | Precio propuesto (COP/mes) | Sedes | Usuarios | Incluye | No incluye |
|---|---|---|---|---|---|
| **Esencial** | **$89.000** | 1 | hasta 5 (1-2 profesionales clínicos) | Pacientes, agenda, HC y prescripción (si la sede tiene consultorio), POS, caja, inventario de 1 sede, orden de laboratorio, garantías, adaptador de facturación (cualquier proveedor), cumplimiento básico (certificados, consentimientos, Habeas Data), exportación de HC | Multisede, convenios, comisiones, especialidades avanzadas, API |
| **Clínica** | **$149.000** | hasta 2 | hasta 12 | Todo Esencial + traslados y kardex, lotes/INVIMA, convenios y promociones, comisiones, mensajería con reglas Ley 2300, contactología completa, pediatría, baja visión, terapia visual, importación Excel, tablero de cumplimiento | API, exportación contable avanzada, auditor externo |
| **Cadena** | **$449.000** | hasta 6 | hasta 40 | Todo Clínica + KPIs consolidados y metas, exportación contable, BI/reportes programados, API de lectura, rol auditor, tamizaje/brigadas, prótesis, laboratorio/taller como sede | — |
| **Sede adicional (sobre Cadena)** | $59.000 por sede | +1 | +6 | — | — |
| **Prueba** | $0 por 15 días | 1 | 3 | Acceso a datos sintéticos/propios del cliente | — |

- **Pago anual:** equivalente a 10 meses por 12 (≈ 16,7 % de descuento) — hipótesis.
- **Comparación:** Esencial queda en el rango de Starter/GouJana e **incluye la integración DIAN que Starter no incluye** (diferenciador); Clínica compite con Pro; Cadena queda ≈ 25 % bajo Business ($449.000 vs. $600.000) con el mismo tope de 6 sedes.
- **Qué se retira de `plans-config.ts`:** `stripePriceId`, `maxHistoriasMes`, `inventoryScraping` (ADM-22); `maxSedes: 999` como «ilimitado» se sustituye por «sin tope contractual» o por tope explícito.
- **Reglas de continuidad (obligatorias):** mora ⇒ solo lectura + exportación (PLT-04); **nunca** borrado por impago; la custodia de la HC es del cliente.
- **Lo que NO se sabe:** costo real de servir (hosting, soporte, respaldos), tasa de conversión y disposición a pagar; por eso la propuesta **no es un dato de mercado ni una proyección financiera**. Revisar a los 90 días de piloto con costos reales.
- **Facturación de OptiSaaS a sus clientes:** también debe cumplir la facturación electrónica del propio Orlando (persona natural/S.A.S., Q-15) — fuera del alcance del software.


# 13. Qué queda en simulación y por qué

Regla: **ninguna simulación puede confundirse con un documento válido**. En `APP_ENV=produccion` el arranque falla si hay algún adaptador `simulado` activo; todo documento simulado lleva marca visible y prefijo `SIM-`.

| Componente | Estado hasta el cierre de la fase | Por qué | Guarda | Condición para dejar de simular |
|---|---|---|---|---|
| Factura electrónica / tiquete POS / notas (CUFE, CUDE) | **Simulado** (adaptador `simulado`) hasta elegir camino | Producción exige proveedor habilitado o habilitación propia; el repo apuntaba a un proveedor de pago | Leyenda + prefijo `SIM-`; bloqueo en producción | Decisión Q-03 + adaptador real + set de pruebas DIAN superado por el tenant |
| RIPS y CUV | **Simulado/ausente** (F5) | Aplicabilidad a ópticas ⚠️ y cronograma; Res. 948/2026 exige validación oficial | Módulo oculto salvo bandera | Q-02/Q-04 + generador validado |
| RDA/IHCE | **Ausente** (F5) | Aplicabilidad y cronograma por actor ⚠️ | Bandera de tenant | Q-05 |
| Pasarela de pago / Stripe | **Simulado** hasta PLT-04; luego pago manual | Comisión y regla del dueño | Adaptador opcional | Decisión Q-11 si se quiere pasarela |
| WhatsApp Cloud API | **No activo** por defecto | Costo de plantillas fuera de ventana de 24 h | Adaptador opcional | Cliente contrata y aprueba |
| Sellado de tiempo (TSA) | **No activo** | Posible costo/licencia ⚠️ | Sello del servidor + hash | Q-22 |
| Verificación del registro profesional | **Manual** | No se verificó API oficial ⚠️ | Campo «verificado por/ en» | Verificación de existencia de servicio oficial |
| Reporte a INVIMA / SIC / REPS | **El sistema prepara, no envía** | Envío exige credenciales y decisión humana | Plantillas y recordatorios | — |
| Pedidos a laboratorios externos | **Manual** por defecto | Integraciones propietarias ⚠️ | `LaboratorioPort` | Acuerdos por laboratorio |
| DICOM / visor avanzado | **Ausente** | No probado con equipos de óptica ⚠️ | Adjuntos JPG/PNG/PDF | Necesidad demostrada |
| AR (prueba virtual de monturas) | **Ausente** | Deseable; MediaPipe (Apache-2.0 ✅) y three.js (MIT ✅) disponibles | — | Decisión comercial |
| Telemedicina | **Ausente** | Aplicación a optometría ⚠️ | Campo `modalidad` | Q-25 |
| Documento soporte, nómina, PILA, contabilidad PUC | **Fuera de alcance** | Costoso competir; norma ⚠️ | — | — |
| Reportes a centrales de riesgo | **Fuera de alcance** | Ley 1266/2008 no verificada ⚠️ (C-12) | — | Q-16 |


# 14. Estrategia de pruebas, calidad y licencias

## 14.1 Herramientas (todas con licencia verificada hoy en npm)
| Uso | Herramienta | Licencia |
|---|---|---|
| Unitarias/integración | Vitest | MIT ✅ |
| E2E y accesibilidad | Playwright | Apache-2.0 ✅ |
| PostgreSQL de pruebas | Contenedor de servicio en CI / `@testcontainers/postgresql` | MIT ✅ (Docker/Podman como herramienta de entorno: licencia ⚠️ no verificada) |
| Accesibilidad | `axe-core` | **MPL-2.0** ⚠️ (excepción **solo pruebas**, aceptada por Orlando según el informe legal §5; no se distribuye). `@axe-core/playwright` también es MPL-2.0 y **no** está nombrado en esa excepción: confirmar (Q-09) |
| Validación | Zod | MIT ✅ |
| Datos sintéticos | generador propio (TypeScript) | — |
| Lint/tipos | ESLint (MIT ✅), TypeScript (Apache-2.0 ✅) | — |

## 14.2 Pirámide y reglas
1. **U** (rápidas, sin BD): reglas de negocio puras — cálculo de saldos, redondeo, días hábiles, validación de prescripción por campo, máquinas de estados, retención.
2. **I** contra **PostgreSQL real** (nunca mocks de BD): RLS, triggers de inmutabilidad, restricciones, transacciones atómicas, cadena de auditoría.
3. **R** (permisos): casos generados desde `lib/authz/matrix.ts`; incluyen «otra sede» y «otro tenant» por recurso.
4. **E** (Playwright): un flujo por rol y por puerta (gate): *recepción→HC→firma→prescripción→orden→laboratorio→entrega→factura simulada*.
5. **S** (seguridad): IDOR por `id`, escalada de privilegios, fuerza bruta, CSRF, subida de archivos, fuga de datos en respuestas/logs.
6. **A** (accesibilidad): axe en pantallas clave y navegación solo por teclado.
7. **P** (propiedades): saldo de stock = suma de movimientos; ninguna secuencia modifica un registro firmado; cadena de hashes.
8. **Contrato de puertos:** el mismo conjunto de pruebas se ejecuta contra cada adaptador (simulado y de prueba HTTP).
9. **Datos:** solo sintéticos; la CI falla si detecta patrones de documentos reales (lista de rangos reservados) en fixtures.

## 14.3 Definición de terminado (DoD) para cualquier PR
- `npm run lint`, `tsc --noEmit`, `npm test`, `npm run build`, `npm run licenses:check` y `npm run db:check-rls` pasan.
- Cobertura mínima de ramas en reglas de negocio nuevas ≥ 90 % (medida con Vitest; el reporte se adjunta al PR). No hay exigencia de cobertura global.
- Cada criterio de aceptación `AC-…` de la funcionalidad tiene al menos una prueba que lo nombra (`it('AC-OPT-05-1 …')`).
- Migraciones reversibles o con plan de rollback documentado.
- Sin secretos ni datos reales; sin `console.log` de datos personales.
- Documentación en `docs/` actualizada y `PENDIENTES.md` ajustado.
- Licencias: toda dependencia nueva figura en `THIRD_PARTY_LICENSES.md` con licencia exacta.

## 14.4 Auditoría de licencias del repositorio actual (hecha el 2-oct-2026)
Método: `npm ci --ignore-scripts` con el `package.json` y `package-lock.json` de la rama (459 paquetes, plataforma linux-x64) + `license-checker-rseidelsohn` (BSD-3-Clause ✅). Resultado completo en `anexos/auditoria_licencias_resumen.txt` y `.csv`.

| Licencia | Paquetes |
|---|---|
| MIT | 372 · ISC 30 · Apache-2.0 26 · BSD-2-Clause 7 · BlueOak-1.0.0 5 · BSD-3-Clause 4 · Python-2.0 1 · CC-BY-4.0 1 · CC0-1.0 1 · 0BSD 1 · MIT AND ISC 1 |
| **MPL-2.0** | **4** (`lightningcss` ×3 binarios de plataforma, `axe-core`) |
| **LGPL-3.0-or-later** | **2** (`@img/sharp-libvips-linux-x64`, `…-linuxmusl-x64`) |
| UNLICENSED | 1 (el propio proyecto `optisaas`) |

| Hallazgo | Detalle | Acción propuesta | Decisión |
|---|---|---|---|
| **H-LIC-1** (LGPL) | `next@15.5.15` incluye `sharp@0.34.5` (Apache-2.0) que arrastra **libvips (LGPL-3.0-or-later)** como binario. El informe de producto listó `sharp` como Apache-2.0 sin ver este binario. Violaría «nada GPL/AGPL» si se despliega con optimización de imágenes. | `images.unoptimized: true` y evitar que `sharp` se instale en producción (p. ej. `overrides` que lo sustituya por un paquete vacío, validado por `npm run build`), o aceptar el uso del binario LGPL sin modificar y enlazado dinámicamente (**requiere aprobación de Orlando**). **No usar `sharp` en código propio** (OPT-14). | Q-09 |
| **H-LIC-2** (MPL-2.0) | `lightningcss` (por Tailwind 4, build) y `axe-core` (transitivo de `eslint-config-next`→`eslint-plugin-jsx-a11y`, lint). MPL-2.0 es copyleft débil por archivo; son herramientas de build/lint no modificadas ni redistribuidas. La excepción aprobada por Orlando era solo `axe-core` **para pruebas**. | (a) Pedir a Orlando que amplíe la excepción a *herramientas de build/lint no redistribuidas* (`lightningcss`, `axe-core`), o (b) migrar a **Tailwind 3.4.x (MIT ✅; sus dependencias no incluyen lightningcss)** y reemplazar la regla a11y de lint. | Q-09 |
| **H-LIC-3** | El proyecto no declara licencia (`UNLICENSED`); `caniuse-lite` es CC-BY-4.0 (datos, atribución); `argparse` Python-2.0 (permisiva). | Decidir licencia propia del proyecto o mantenerlo privado; incluir atribuciones en `THIRD_PARTY_LICENSES.md`. | Q-14 |
| H-LIC-4 | `node-forge` (si se usa) es `BSD-3-Clause OR GPL-2.0`: se **elige BSD-3-Clause** y se documenta como excepción nominal. | Documentar en `licenses.exceptions.json`. | — |
| H-LIC-5 | `xlsx` en npm (Apache-2.0) está estancado en 0.18.5 con avisos de seguridad conocidos ⚠️; `redis` ≥ 8 y MinIO no cumplen la regla. | Usar `exceljs`/`read-excel-file` (MIT); `pg-boss` en vez de Redis. | — |
| H-LIC-6 | `next.config.ts` tiene `eslint.ignoreDuringBuilds: true` y `images.remotePatterns: picsum.photos`; `middleware.ts` deja al `owner` entrar a todas las secciones. | Quitar `ignoreDuringBuilds`; eliminar el dominio de placeholders; el `owner` no accede a contenido (SEG-02, PLT-05). | — |

## 14.5 Inventario de dependencias nuevas propuestas (licencia verificada hoy en npm)
| Paquete | Uso | Licencia | | Paquete | Uso | Licencia |
|---|---|---|---|---|---|---|
| `drizzle-orm` / `drizzle-kit` | ORM/migraciones | Apache-2.0 / MIT | | `pg` | Driver PostgreSQL | MIT |
| `pg-boss` | Colas en Postgres | MIT | | `zod` | Validación | MIT |
| `react-hook-form` / `@hookform/resolvers` | Formularios | MIT | | `@tanstack/react-table` / `react-query` | Tablas/datos | MIT |
| `@casl/ability` / `@casl/react` | Permisos | MIT | | `next-auth` (v5 beta) | Auth | ISC |
| `better-auth` (alternativa) | Auth | MIT | | `@node-rs/argon2` / `argon2` | Hash | MIT |
| `otplib` | TOTP | MIT | | `@simplewebauthn/server` | WebAuthn | MIT |
| `signature_pad` | Firma manuscrita | MIT | | `@react-pdf/renderer` | PDF | MIT |
| `react-big-calendar` | Agenda | MIT | | `jsbarcode` / `bwip-js` | Códigos | MIT / MIT |
| `html5-qrcode` / `@zxing/library` | Lector cámara | Apache-2.0 / Apache-2.0 | | `node-thermal-printer` | ESC/POS | ISC |
| `exceljs` / `read-excel-file` / `papaparse` | Importación | MIT | | `file-type` | MIME por contenido | MIT |
| `nodemailer` | SMTP | **MIT-0** | | `pino` | Logs | MIT |
| `jimp` | Miniaturas (opcional) | MIT | | `xmlbuilder2` / `xml-crypto` / `fast-xml-parser` | UBL (P2) | MIT |
| `node-forge` | Certificados (P2) | BSD-3-Clause (OR GPL-2.0) | | `@medplum/fhirtypes` | Tipos FHIR (F5) | Apache-2.0 |
| `vitest` / `@playwright/test` | Pruebas | MIT / Apache-2.0 | | `@testcontainers/postgresql` | BD de pruebas | MIT |
| `license-checker-rseidelsohn` | Auditoría | BSD-3-Clause | | `date-fns` (+`@date-fns/tz`) | Fechas | MIT |
| `libphonenumber-js` | Teléfonos | MIT | | `fflate` / `archiver` | ZIP exportación | MIT / MIT |

**Descartadas:** FullCalendar (open core con plugins de pago), `fhirpath.js` (licencia no estándar), BullMQ+Redis ≥ 8 (SSPL/AGPL), MinIO (AGPL ⚠️), `sharp` (binarios LGPL), ClamAV (GPL), `xlsx` de npm (estancado), cualquier SDK de analítica o monitoreo SaaS.

## 14.6 Modelo de amenazas resumido (STRIDE simplificado; no sustituye el análisis de riesgos formal de SEG-15 ni una prueba de penetración independiente, que **no** están incluidas)
| # | Amenaza | Activo | Control principal (ID) | Prueba |
|---|---|---|---|---|
| 1 | Un usuario de una óptica ve o escribe datos de otra (IDOR, consulta sin filtro) | Todos los datos | RLS `FORCE` + `withTenantTx` (PLT-01); CASL por sede (SEG-02) | R, S |
| 2 | Robo de credenciales o fuerza bruta | Cuentas | Argon2id, MFA, bloqueo, sesiones revocables (SEG-01) | S |
| 3 | Escalada de privilegios entre roles o sedes | HC, caja | Matriz CASL tabla-dirigida (SEG-02) | R |
| 4 | Alteración de una HC firmada (personal interno o SQL directo) | HC | Triggers de inmutabilidad + adendas (SEG-04) + hash encadenado (SEG-03) | I, P |
| 5 | Repudio («yo no firmé / no la leí») | HC, prescripción | Firma con MFA reciente (SEG-08) + auditoría de lectura (SEG-03) | I |
| 6 | Fuga por respaldos, logs o exportaciones | Datos de pacientes | Cifrado envelope (SEG-12), respaldos cifrados (PLT-07), sin datos personales en logs | I, S |
| 7 | Subida de archivo malicioso | Adjuntos | Validación por firma de archivo, tamaño, sin ejecución (SEG-13, OPT-14). ClamAV es GPL y se excluye: **limitación documentada** | S |
| 8 | XSS, CSRF, inyección | App web | CSP, Zod, consultas parametrizadas (SEG-13) | S |
| 9 | El personal de la plataforma lee contenido de clientes | HC | Sin acceso por defecto; acceso de emergencia temporal y auditado (PLT-05) | R |
| 10 | Caída del proveedor de facturación o abuso de la API | Venta, disponibilidad | Cola con reintentos y modo degradado (ADM-09), límite de tasa (SEG-13) | I |
| 11 | Pérdida de datos o ransomware | Todo | Respaldos con restauración probada (PLT-07); RPO/RTO a decidir (Q-07) | I |
| 12 | Dependencia comprometida o con licencia no permitida | Cadena de suministro | `npm ci --ignore-scripts`, lockfile, `check-licenses` (PLT-09) | CI |
| 13 | Datos reales en entornos de desarrollo | Pacientes | `APP_ENV`, bloqueo de arranque, fixtures sintéticas (PLT-10) | I |
| 14 | Entrega de HC a quien no es el titular | HC | Verificación de identidad y acta (OPT-06, SEG-14) | E |



# 15. Consolidado de lo NO VERIFICADO (se conserva la marca de los informes; ninguna de estas hipótesis se trata como cierta)

| # | Tema | Origen | Efecto en la especificación | Quién lo resuelve |
|---|---|---|---|---|
| NV-01 | Código/servicio de optometría en REPS y estándar aplicable a «óptica con consultorio» | Informes (E-05) | Campo libre; no se codifica | Consultor de habilitación (Q-20) |
| NV-02 | Estado de la Res. 3100/2019 tras Res. 1732/2026 (¿revocada por Res. 2080 del 8-sep-2026?) | Legal | Se cita 3100 con 544/2023 y 465/2025 | Micrositio oficial / consultor (Q-20) |
| NV-03 | Aplicabilidad de RIPS (Res. 948/2026) a ópticas con consultorio o a venta particular | Ambos | F5 condicionada | Abogado/consultor (Q-04) |
| NV-04 | Aplicabilidad y cronograma de IHCE/RDA (Res. 866/2021 art. 2, Res. 1888/2025, Res. 1799/2026 no leída) | Ambos | F5 condicionada | Consultor/Secretaría de Salud (Q-05) |
| NV-05 | Anexo técnico de FEV posterior a v1.9; art. 37 (contingencia); API de la solución gratuita DIAN; fechas del POS electrónico | Ambos | Adaptador asistido; contingencia por cola | Contador/DIAN (Q-03) |
| NV-06 | Plazo de conservación de facturas (art. 632 ET) y de logs de auditoría | Legal | Valores provisionales editables y rotulados | Abogado/contador (Q-07) |
| NV-07 | IVA/exclusiones de lentes, monturas, LC y exámenes | Legal | Tarifas parametrizables sin defecto | Contador (Q-31) |
| NV-08 | Decreto 2364/2012 (firma electrónica), validez de firma simple en consentimientos, TSA, PDF/A | Ambos | Firma electrónica simple + hash; TSA opcional | Abogado (Q-22) |
| NV-09 | Tensión HC obligatoria vs. no condicionar atención a datos sensibles (D. 1377 art. 6); alcance Ley 1581 art. 7 / C-748/2011 en contexto clínico | Legal | Flujo registra negativa; decisión humana | Abogado (Q-17) |
| NV-10 | Recordatorios clínicos frente a Ley 2300/2023 (¿servicio o publicidad?) | Legal | Se aplican las mismas ventanas | Abogado (Q-13) |
| NV-11 | Retracto en LC y monturas estándar; lentes con fórmula | Legal | Atributo `retractable` por producto; tienda opcional | Abogado (Q-12) |
| NV-12 | Registro sanitario por clase, CCAA (Res. 4002/2007) para ópticas minoristas; listado Res. 4396/2008; publicidad de dispositivos (resolución INVIMA) | Legal | Solo registra y alerta; clase configurable | Consultor INVIMA (Q-28) |
| NV-13 | Norma de gafas de sol, suplementos y «productos de salud visual», medicamentos oftálmicos | Producto | Categorías configurables/bloqueadas | Consultor regulatorio (Q-24) |
| NV-14 | Ley 23/1981 aplicada al optómetra (consentimiento, HC); Decreto 1340/1998 (texto); Res. 13437/1991 | Legal | Se aplican por Res. 1995 y Ley 372; sin citar el resto como obligación | Abogado (Q-27) |
| NV-15 | RNBD: umbral de cada cliente; Circular Externa 002/2025 SIC | Legal | Checklist por tenant | Abogado (Q-29) |
| NV-16 | Software como dispositivo médico (D. 4725 art. 2) | Legal | Sin apoyo diagnóstico (ADR-15) | Abogado/INVIMA (Q-21) |
| NV-17 | Telemedicina en optometría | Ambos | Excluida (OPT-24) | Consultor (Q-25) |
| NV-18 | Catálogos CIE-10/CUPS (licencia/uso) y catálogos de Res. 866 | Legal/Producto | No se redistribuyen; carga local | Abogado/MinSalud (Q-23) |
| NV-19 | Origen y términos del catálogo obtenido por scraping | Producto | Retiro (ADM-22) | Orlando (Q-23) |
| NV-20 | Límites de capa gratuita de Supabase; tarifas de WhatsApp Cloud API; alternativas de pasarela en Colombia | Producto | Adaptadores opcionales | Orlando (Q-06, Q-13) |
| NV-21 | Precios reales de Softop/Gesvision/Optysof/RevolutionEHR/Ocuco y cifras de clientes | Producto | Precios propuestos son hipótesis | Orlando (Q-11) |
| NV-22 | XAdES-EPES con `xml-crypto`; librerías colombianas de UBL | Producto | `ubl21_propio` P2 sin compromiso | Ingeniería/DIAN |
| NV-23 | Existencia de API oficial para verificar tarjeta profesional | Esta especificación | Verificación manual | Orlando |
| NV-24 | Fuente oficial del calendario de festivos | Esta especificación | Tabla editable | Orlando (Q-32) |
| NV-25 | Licencia de Node.js, Docker/Podman, GitHub Actions (condiciones gratuitas), herramientas de infraestructura del SO | Esta especificación | Se listan para aprobación | Orlando (Q-09) |
| NV-26 | Vigencia legal de las prescripciones (plazo) | Esta especificación (art. 17 n no fija plazo en lo leído) | Campo obligatorio sin valor por defecto | Abogado/profesional (Q-18) |
| NV-27 | Si auxiliares clínicos pueden registrar en HC sin firma propia | Esta especificación | Solo borrador de sección D | Abogado (Q-26) |
| NV-28 | Régimen de ISO/IEC 27001/27701 | Legal | Solo referencia | — |


# 16. Anexos

## 16.1 Checklist previo a datos reales (no es software: lo hacen Orlando, abogado y consultor)
Fuente: informe legal §4.1 y §7. Cada punto es condición del **Gate A** (§0.2). Estado inicial: todo **pendiente**.

| # | Requisito (antes de cargar datos reales de la primera óptica) | Responsable | Norma / ID | Pregunta |
|---|---|---|---|---|
| D1 | Modelo de roles y **contrato de encargo/transmisión de datos** firmado con cada óptica (Orlando = encargado; la óptica = responsable y custodio de la HC) + anexo de seguridad + subencargados y países | Abogado + Orlando | Ley 1581 art. 18; D. 1377/2013 art. 25 — D-01, D-03, M-03 | Q-15 |
| D2 | **Verificar la condición regulatoria** de la óptica piloto (sin consultorio / con consultorio / IPS / independiente; certificados, REPS, director científico) | Orlando + consultor | D. 1030/2007 arts. 7, 10; Res. 3100/2019 — E-01, E-02, E-05 | Q-01, Q-20 |
| D3 | **Residencia de datos** y contrato con el proveedor de hosting/respaldos (Colombia o país de la lista SIC) | Orlando | Ley 1581 art. 26; Título V cap. 3 — C-10, D-05 | Q-06 |
| D4 | **Textos legales**: política de tratamiento, autorización de datos sensibles (no pre-marcada), consentimientos informados, aviso de privacidad, manual interno | Abogado | D. 1377 arts. 6, 13; Ley 1581 — C-02, C-03, C-05, C-06, I-05 | Q-17 |
| D5 | **Camino de facturación electrónica** (proveedor habilitado / solución gratuita DIAN / software propio) y obligación de facturar | Orlando + contador | Res. DIAN 165/2023 arts. 28, 55-56 — G-01, G-03 | Q-03 |
| D6 | **Plan de incidentes** (runbook, responsable, aviso a la óptica, reporte SIC en 15 días hábiles) | Orlando | Título V 2.1.f(ii) — D-04 | Q-07 |
| D7 | Pruebas de **restauración de respaldo** documentadas y RPO/RTO definidos | Orlando + infraestructura | Res. 1995 art. 16-18; Ley 2015 art. 13 — L-04 | Q-07 |
| D8 | **Análisis de riesgos** y política de seguridad firmados | Orlando | Ley 1581 art. 17 lit. d — L-01 | — |
| D9 | Revisión de **aplicabilidad RIPS/IHCE** para el piloto | Consultor | Res. 948/2026; Res. 1888/2025 — H-01, H-05 | Q-04, Q-05 |
| D10 | Verificación del **RNBD** del cliente y de Orlando según activos | Abogado | Ley 1581 art. 25; Circular Única SIC — C-09 | Q-29 |

## 16.2 Cómo se generó el resto de este anexo
Los índices (16.3) y la matriz de trazabilidad legal (16.4) se **generan automáticamente** desde las fichas de funcionalidad (`_build/render.py`), de modo que no pueden quedar desfasados respecto al texto.


## 16.3 Índice de funcionalidades por fase y prioridad (generado)

| Fase | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| F1 Cumplimiento y datos reales | 30 | 1 | 0 | 31 |
| F2 Flujo clínico→venta | 9 | 7 | 0 | 16 |
| F3 Operación multisede | 0 | 20 | 1 | 21 |
| F4 Especialidades y diferenciales | 0 | 9 | 10 | 19 |
| F5 RIPS/IHCE (condicionada) | 0 | 2 | 1 | 3 |
| **Total** | **39** | **39** | **12** | **90** |

**F1 Cumplimiento y datos reales:** PLT-01(P0), PLT-02(P0), PLT-03(P0), PLT-06(P0), PLT-07(P0), PLT-09(P0), PLT-10(P0), PLT-11(P0), PLT-12(P1), SEG-01(P0), SEG-02(P0), SEG-03(P0), SEG-04(P0), SEG-05(P0), SEG-06(P0), SEG-07(P0), SEG-08(P0), SEG-09(P0), SEG-11(P0), SEG-12(P0), SEG-13(P0), SEG-15(P0), ADM-01(P0), ADM-02(P0), ASE-01(P0), OPT-01(P0), OPT-02(P0), OPT-04(P0), OPT-05(P0), OPT-06(P0), OPT-10(P0)

**F2 Flujo clínico→venta:** ADM-03(P1), ADM-05(P0), ADM-09(P0), ADM-22(P1), ASE-02(P1), ASE-03(P0), ASE-04(P0), ASE-05(P0), ASE-06(P0), ASE-07(P0), ASE-08(P0), ASE-09(P0), OPT-03(P1), OPT-07(P1), OPT-08(P1), OPT-09(P1)

**F3 Operación multisede:** PLT-04(P1), PLT-05(P1), PLT-08(P1), SEG-10(P1), SEG-14(P1), SEG-16(P1), ADM-04(P1), ADM-06(P1), ADM-07(P1), ADM-08(P1), ADM-10(P1), ADM-11(P1), ADM-12(P1), ADM-13(P1), ADM-15(P1), ADM-16(P1), ASE-10(P1), ASE-11(P1), ASE-12(P1), ASE-13(P2), OPT-11(P1)

**F4 Especialidades y diferenciales:** ADM-14(P1), ADM-17(P2), ADM-18(P2), ADM-20(P2), ADM-21(P2), ASE-14(P2), ASE-15(P2), ASE-16(P1), OPT-12(P1), OPT-13(P2), OPT-14(P1), OPT-15(P1), OPT-16(P1), OPT-17(P1), OPT-18(P1), OPT-19(P1), OPT-20(P2), OPT-21(P2), OPT-22(P2)

**F5 RIPS/IHCE (condicionada):** ADM-19(P1), OPT-23(P1), OPT-24(P2)

## 16.4 Matriz de trazabilidad: requisito legal → funcionalidad (generada)

| ID legal | Funcionalidades que lo implementan |
|---|---|
| A-01 | OPT-01, OPT-12, OPT-15, OPT-17 |
| A-02 | SEG-04, OPT-01, OPT-10, OPT-16, OPT-18 |
| A-03 | SEG-06, ADM-15, ASE-01 |
| A-04 | SEG-06, ASE-01, OPT-19 |
| A-05 | OPT-04, OPT-14 |
| A-06 | SEG-01, SEG-03, SEG-04, SEG-08, OPT-01, OPT-02 |
| A-07 | SEG-04, OPT-01, OPT-02 |
| A-08 | SEG-14 |
| A-09 | PLT-08, OPT-06 |
| A-10 | SEG-02, ADM-02, OPT-01, OPT-05, OPT-22 |
| B-01 | PLT-11, SEG-09 |
| B-02 | SEG-10 |
| B-03 | PLT-04, PLT-08 |
| B-04 | PLT-01, PLT-05, SEG-02, SEG-09, SEG-14, ADM-02, ADM-04, ASE-02, OPT-03, OPT-08, OPT-16 |
| B-05 | PLT-02, PLT-07, SEG-12 |
| B-06 | PLT-03, PLT-04, PLT-08, OPT-06 |
| B-07 | PLT-01, SEG-14 |
| C-01 | SEG-05, ASE-01, OPT-20 |
| C-02 | SEG-05 |
| C-03 | SEG-05, OPT-20 |
| C-04 | SEG-07, OPT-02 |
| C-05 | SEG-05, SEG-15 |
| C-06 | SEG-15 |
| C-07 | SEG-06, OPT-19 |
| C-08 | SEG-15 |
| C-09 | PLT-03 |
| C-10 | PLT-06 |
| C-11 | SEG-03, SEG-15, ADM-16 |
| C-12 | SEG-15 |
| C-13 | SEG-15 |
| D-01 | PLT-03, SEG-15 |
| D-02 | PLT-05, SEG-07 |
| D-03 | PLT-03, SEG-12, SEG-15 |
| D-04 | SEG-11 |
| D-05 | PLT-06 |
| D-06 | PLT-03, ADM-15 |
| E-01 | PLT-03, ADM-01, ADM-10, OPT-24 |
| E-02 | PLT-03, ADM-01, ADM-16 |
| E-03 | SEG-02, ADM-02, ASE-07, OPT-05, OPT-22 |
| E-04 | SEG-09 |
| E-05 | PLT-03, ADM-01 |
| E-06 | ASE-16, OPT-13 |
| F-01 | ADM-05, OPT-17, OPT-21 |
| F-02 | OPT-05 |
| F-03 | ASE-03, ASE-07, ASE-08, OPT-05, OPT-09 |
| F-04 | ADM-05, ASE-03, ASE-04, ASE-07, ASE-09 |
| F-05 | SEG-02, ADM-12, ADM-13, ASE-07, ASE-13, OPT-08 |
| F-06 | ADM-06, ADM-08, ADM-10, ADM-21, ASE-08, ASE-15, OPT-21 |
| F-07 | ADM-11, ASE-08, ASE-10, OPT-09 |
| F-08 | ADM-07, ADM-10, ADM-16, OPT-07 |
| F-09 | ADM-05, ADM-07, ASE-04, OPT-07 |
| F-10 | SEG-16, ADM-12, ADM-17 |
| F-11 | ADM-01, ADM-21, ASE-15 |
| G-01 | ADM-09 |
| G-02 | ADM-03, ADM-09, ASE-03, ASE-04, ASE-05, ASE-06 |
| G-03 | ADM-03 |
| G-04 | ADM-09, ASE-06 |
| G-05 | ADM-09, ASE-04, ASE-06 |
| G-06 | ADM-08 |
| G-07 | SEG-09, ADM-09 |
| G-08 | ADM-09, ASE-11, OPT-18 |
| G-09 | PLT-11, ADM-03 |
| H-01 | ADM-19 |
| H-02 | ADM-19 |
| H-03 | OPT-23 |
| H-04 | ADM-19, OPT-10, OPT-23 |
| H-05 | OPT-23 |
| H-06 | SEG-15 |
| I-01 | OPT-04, OPT-07 |
| I-02 | SEG-06 |
| I-03 | SEG-08, ASE-09, OPT-04 |
| I-04 | SEG-04, SEG-08, OPT-01 |
| I-05 | SEG-05, OPT-04 |
| J-01 | SEG-07, OPT-06 |
| J-02 | SEG-15 |
| K-01 | PLT-12, ADM-05, ADM-12, ADM-20, ASE-03, ASE-09, ASE-14 |
| K-02 | SEG-16, ADM-12, ASE-11 |
| K-03 | ADM-20 |
| K-04 | PLT-11, SEG-16, ADM-17, ASE-12, OPT-11 |
| K-05 | SEG-15 |
| K-06 | ADM-11, ASE-10 |
| L-01 | PLT-01, PLT-02, PLT-10, SEG-01, SEG-12, SEG-13, SEG-15 |
| L-02 | PLT-01, SEG-01, SEG-13, ADM-18, OPT-14 |
| L-03 | PLT-05, SEG-03 |
| L-04 | PLT-07 |
| L-05 | PLT-07, SEG-10 |
| L-06 | SEG-15 |
| M-01 | SEG-09 |
| M-02 | SEG-05 |
| M-03 | PLT-03, SEG-15 |


# 17. Modelo de datos propuesto (PostgreSQL, español `snake_case`)

Convenciones: `id uuid pk default gen_random_uuid()`; `tenant_id uuid not null` (+ índice y política RLS) en toda tabla de negocio; `creado_en/actualizado_en timestamptz`; dinero `bigint` en COP; claves foráneas con índice; **borrado lógico** solo donde se indique (clínico/fiscal/auditoría: nunca borrado).

## 17.1 Núcleo (tenancy, usuarios, sedes)
```sql
tenants(id, razon_social, nit, dv, estado[onboarding|activo|suspendido|en_cierre|cerrado], plan_id, politica_url, creado_en)
sedes(id, tenant_id, nombre, ciudad, direccion, tipo[…§10.3], reps_codigo, reps_servicios text[], director_cientifico_id, resp_tecnovigilancia_id, estado)
certificados_sede(id, tenant_id, sede_id, tipo[dispensacion|adecuacion|produccion|otro], numero, entidad, expedido date, vence date, adjunto_id)
usuarios(id, tenant_id, email unique per tenant, hash_password, mfa_*, estado, ...)
usuarios_sedes(usuario_id, sede_id, rol[admin|asesor|optometra|oftalmologo|auxiliar_clinico|tecnico_lab|auditor])
perfiles_profesionales(usuario_id, tipo, num_registro, entidad, verificado_por, verificado_en, vigente_hasta, especialidad, es_director_cientifico bool)
sesiones, credenciales_webauthn, codigos_recuperacion, accesos_soporte, contratos_encargo, declaraciones_datos, subencargados
planes, suscripciones, pagos_plataforma, parametros, festivos, tarifas_impuesto
```

## 17.2 Pacientes, consentimiento y derechos
```sql
pacientes(id, tenant_id, num_hc int unique per tenant, tipo_doc[CC|TI|RC|PA|CE], num_doc, num_doc_hash,
  nombres, apellidos, fecha_nacimiento, sexo, estado_civil, ocupacion, direccion, telefono, email,
  acompanante, responsable, aseguradora, tipo_vinculacion[particular|contributivo|subsidiado|especial|otro],
  sede_alta_id, fecha_ultima_atencion, estado[activo|inactivo|fusionado], fusionado_en_id)
representantes(id, tenant_id, paciente_id, nombre, tipo_doc, num_doc, parentesco, contacto)
textos_legales(id, tipo[datos_sensibles|politica|contacto_comercial|consentimiento_clinico], version, contenido, hash, vigente_desde)
autorizaciones(id, tenant_id, paciente_id, texto_id, finalidades text[], otorgada bool, firmante, firma_id, evidencia jsonb, firmada_en, revocada_en)
preferencias_contacto(paciente_id, canal, autorizado, finalidad, desde, hasta)
solicitudes_titular(id, tenant_id, paciente_id, tipo, canal, radicada_en, vence_en, estado, respuesta, respondida_en)
banderas_dato(recurso, recurso_id, tipo[reclamo_en_tramite|discusion_judicial], desde, hasta)
```

## 17.3 Clínico (todo inmutable tras firma; SEG-04)
```sql
atenciones(id, tenant_id, sede_id, paciente_id, cita_id, profesional_id, tipo, modalidad default 'presencial', estado[borrador|firmado],
  folio int, fecha_atencion timestamptz, contenido jsonb /*secciones A–I, schema_version*/, hash_contenido, firmado_en, UNIQUE(paciente_id, folio))
atencion_diagnosticos(atencion_id, cie10, descripcion, principal bool)
atencion_adendas(id, atencion_id, campo_ref, motivo, nuevo_valor jsonb, autor_id, estado, firmado_en, hash)
prescripciones(id, tenant_id, sede_id, atencion_id unique, paciente_id, numero, tipo, estado[borrador|firmada|sustituida|vencida],
  profesional_id, od jsonb, oi jsonb, dp_mm numeric, add_od numeric, add_oi numeric, filtro, forma_uso, duracion,
  cantidad_num int, cantidad_letras text, indicaciones, vigencia_hasta date, firmado_en, hash, sustituye_a_id)
prescripciones_externas(id, paciente_id, archivo_id, prescriptor, registro_prof, fecha, vigencia, verificado_por)
plantillas_consentimiento, consentimientos, firmas, anexos, remisiones, certificados
adaptaciones_lc, baja_vision, sesiones_entrenamiento, planes_terapia, sesiones_terapia, protesis_oculares, jornadas, tamizajes, controles
recomendaciones_venta(id, atencion_id, material, diseno, fabricacion, tratamientos text[], notas_funcionales)
catalogo_cie10, catalogo_cups, glosario_abreviaturas, plantillas_examen, reglas_plausibilidad
```
Triggers: `BEFORE UPDATE OR DELETE` en `atenciones`, `atencion_adendas`, `prescripciones`, `consentimientos`, `firmas`, `anexos` rechazan cambios cuando `estado='firmado'` (o equivalente); `BEFORE UPDATE OR DELETE` en `auditoria` rechaza siempre.

## 17.4 Comercial y operación
```sql
citas(id, tenant_id, sede_id, paciente_id, profesional_id, tipo, inicio, fin, estado, notas_admin, origen,
  EXCLUDE USING gist (profesional_id WITH = /*requiere extensión btree_gist, contrib de PostgreSQL*/ , tstzrange(inicio,fin) WITH &&) WHERE (estado NOT IN ('cancelada','no_asistio')))
productos(id, tenant_id, categoria, sku, nombre, marca, atributos jsonb, clase_regulatoria, venta_bajo_prescripcion, requiere_lote,
  requiere_registro_invima, registro_invima, impuesto_id, costo_cop, precio_cop, activo)
lotes(id, producto_id, codigo, vence, registro_invima, fabricante, proveedor_id)
stock_movimientos(id, tenant_id, sede_id, producto_id, lote_id, tipo, cantidad, costo_unit_cop, ref_tipo, ref_id, motivo, por, en)   -- saldo = SUM
traslados, traslado_items, conteos, conteo_items, reservas
proveedores, ordenes_compra, compras, compra_items, recepciones
cotizaciones, ordenes_venta(id, …, total, abonado, saldo, prescripcion_id, convenio_id, asesor_id, estado), orden_items, abonos
ventas, venta_items(…, lote_id, impuesto_snapshot jsonb), venta_pagos
caja_sesiones, caja_movimientos, arqueos
documentos_electronicos(id, tenant_id, sede_id, venta_id, tipo[fev|pos|nc|nd], prefijo, numero, cufe, cude, estado, xml_cifrado_id, pdf_id, referencia_id, respuesta_proveedor jsonb)
config_fiscal(tenant_id, sede_id, obligado, nit, dv, resolucion, prefijo, desde, hasta, vence, ambiente, adaptador)
laboratorios, ordenes_trabajo, ot_eventos, qc_lentes, verificaciones_dispensacion, entregas
garantias, garantia_eventos
convenios, convenio_tarifas, promociones, promocion_usos, esquemas_comision, comisiones
equipos_medicos, lecturas_ambientales, registros_residuos, registros_desinfeccion, concepto_sanitario, saneamiento_logs, eventos_adversos, alertas_invima
mensajes, plantillas_mensaje, exclusiones, segmentos, campanas
importaciones, exportaciones, respaldos, pruebas_restauracion, disposiciones, politica_retencion, marcas_retencion
solicitudes_terceros, entregas_hc, incidentes_seguridad, api_claves, metas, alertas
rips_envios, rda_envios, credenciales_ihce        -- F5
```

## 17.5 Auditoría (append-only)
```sql
auditoria(id bigserial pk, tenant_id, ts timestamptz default now(), actor_id, rol, sede_id, recurso, recurso_id, accion, resultado,
  ip inet, agente, request_id, hash_previo bytea, hash bytea)
-- REVOKE UPDATE, DELETE ... ; trigger que lanza excepción; INSERT solo desde optisaas_audit_writer
```

## 17.6 Migración desde el esquema actual (`supabase_init.sql`, 22 tablas)
| Hoy | Destino | Nota |
|---|---|---|
| `empresas` | `tenants` | Quitar `stripe_*`. |
| `sedes` | `sedes` | `habilitacion_salud` (string) → `tipo`, `reps_codigo`, `certificados_sede`. |
| `usuarios` | `usuarios` + `usuarios_sedes` + `perfiles_profesionales` | `registro_medico` → perfil. |
| `pacientes` | `pacientes` + `representantes` + `autorizaciones` | Añadir campos de Res. 1995 art. 9; tipo `RC`. |
| `citas` (con HC embebida y factura) | `citas` + `atenciones` + `documentos_electronicos` | Separar. |
| `historias_clinicas` | `atenciones` (+adendas) | `localStorage` no se migra (datos mock). |
| `inventario` | `productos` + `lotes` + `stock_movimientos` | Stock por sede y lote. |
| `ordenes_trabajo`, `garantias`, `promociones` | Mismas con estados ampliados y RLS | |
| `caja_sesiones`, `transacciones_caja` | `caja_sesiones`, `caja_movimientos`, `arqueos` | Inmutables. |
| `mensajes_logs` | `mensajes` | Sin contenido clínico. |
| `equipos_medicos`, `lecturas_ambientales`, `registros_*`, `concepto_sanitario`, `saneamiento_logs` | Igual, append-only con RLS | |
| `proveedores`, `compras`, `configuracion_margenes` | Igual + `compra_items` | |
