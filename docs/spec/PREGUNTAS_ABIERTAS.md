# PREGUNTAS ABIERTAS — decisiones que solo Orlando, un abogado, un contador o un consultor pueden tomar

**Versión:** 1.0 · **Fecha:** 2 de octubre de 2026 (hora Colombia, UTC-5) · Complementa `ESPECIFICACION_OPTISAAS.md` (en adelante «la spec»).

> **Aviso.** Nada de este documento es asesoría jurídica, contable ni regulatoria. Las «recomendaciones por defecto» son lo que la spec asume **mientras no haya decisión**; son hipótesis de trabajo para que el agente de código no se bloquee, **no** conclusiones. Todo lo marcado ⚠️ NO VERIFICADO proviene de los informes de origen (`informe-optica.md` y `REQUISITOS_LEGALES_OPTISAAS.md`) y se conserva tal cual. Nada se ha enviado a ningún tercero.

**Cómo usar este documento:** las preguntas están numeradas `Q-01…Q-32` y la spec, las fases de Cursor y la rúbrica las citan por ese número. «Bloquea» indica la puerta (Gate A–E, ver spec §0.2) o la tarea (`T..` de `FASES_CURSOR.md`) que no debe cerrarse sin la decisión. «Por defecto» es lo que se implementa si nadie decide.

---

## 0. Las 10 decisiones más importantes (en orden de urgencia)

| # | Pregunta | Quién | Por qué es urgente |
|---|---|---|---|
| 1 | **Q-09** Excepciones de licencia (MPL-2.0 en `lightningcss`/`axe-core`; LGPL en `sharp-libvips`) | Orlando | La auditoría del `package-lock.json` actual encontró **6 paquetes** (4 MPL-2.0, 2 LGPL-3.0-or-later) que violan la regla «solo MIT/Apache/BSD/ISC». Es lo primero que toca la tarea T01. |
| 2 | **Q-01** Cliente piloto y tipo de establecimiento | Orlando (+ consultor de habilitación) | De esto depende si la historia clínica (HC) puede usarse con datos reales y qué certificados se exigen. Bloquea Gate A. |
| 3 | **Q-06** Hosting, residencia de datos y costo | Orlando (+ abogado para transferencias) | La regla «sin pagos» choca con alojar una base de datos en producción. Hay que decidir proveedor y país antes de datos reales. Bloquea Gate A. |
| 4 | **Q-17** Base legal de la HC frente a un paciente que no autoriza; menores | Abogado | Tensión Res. 1995/Ley 2015 vs. D. 1377 art. 6: el software **no puede resolverla**. Bloquea Gate A. |
| 5 | **Q-03** Camino de facturación electrónica y obligación de facturar | Contador (+ Orlando) | Define qué adaptador se construye primero. Bloquea Gate B. |
| 6 | **Q-08** ¿OptiSaaS usará datos de pacientes para fines propios? | Orlando + abogado | Cambia el rol legal de encargado a responsable. La spec asume **No**. |
| 7 | **Q-04 / Q-05** Aplicabilidad de RIPS (Res. 948/2026) e IHCE/RDA | Consultor de habilitación / Secretaría de Salud | Pueden mover F5 a Gate A/B. No invertir antes de confirmar. |
| 8 | **Q-11** Precios de los planes | Orlando | La spec propone $89.000/$149.000/$449.000 COP/mes como hipótesis. Bloquea la tarea de planes (PLT-04). |
| 9 | **Q-14** Licencia del propio proyecto | Orlando | El `package.json` dice `UNLICENSED`. No publicar el repo sin decidir. |
| 10 | **Q-15** Persona natural vs. S.A.S. y contrato con las ópticas | Orlando + abogado | Define responsabilidad, RNBD y firma del contrato de encargo. |

---

## 1. Índice

| ID | Tema | Decide | Bloquea |
|---|---|---|---|
| Q-01 | Piloto, tipo de establecimiento, HC históricas, sede con certificado vencido | Orlando + consultor | Gate A (ADM-01, PLT-03) |
| Q-02 | ¿El piloto factura a EPS/pagadores? | Orlando | Gate B (ADM-19) |
| Q-03 | Camino de facturación electrónica y obligación de facturar | Contador + Orlando | Gate B (ADM-09) |
| Q-04 | Aplicabilidad de RIPS (Res. 948/2026) | Consultor/abogado | Gate E (ADM-19) |
| Q-05 | Aplicabilidad y cronograma de IHCE/RDA | Consultor/Secretaría de Salud | Gate A si aplica (OPT-23) |
| Q-06 | Hosting, residencia de datos y costo | Orlando (+ abogado) | Gate A (PLT-06, PLT-07) |
| Q-07 | RPO/RTO, retención de logs y facturas, plazo de aviso en incidentes | Orlando + abogado/contador | Gate A (PLT-07, SEG-09, SEG-11) |
| Q-08 | Uso de datos de pacientes para fines propios | Orlando + abogado | Gate A (contrato) |
| Q-09 | Excepciones de licencia | Orlando | T01 (PLT-09) |
| Q-10 | Acceso del administrador a lo clínico; admin que es profesional | Orlando + abogado | Gate A (SEG-02) |
| Q-11 | Precios | Orlando | Gate C (PLT-04) |
| Q-12 | Tienda en línea y retracto | Abogado + Orlando | F4 (ADM-20) |
| Q-13 | Mensajería/WhatsApp y recordatorios frente a Ley 2300 | Abogado + Orlando | F3 (SEG-16, ASE-12) |
| Q-14 | Licencia propia del proyecto | Orlando | Publicar el repo |
| Q-15 | Persona natural vs. S.A.S. y contrato | Orlando + abogado | Gate A (PLT-03, SEG-15) |
| Q-16 | Crédito y centrales de riesgo | Orlando (+ abogado) | Nada (fuera de alcance) |
| Q-17 | Base legal de la HC, borrador vs. registro, menores | Abogado | Gate A (SEG-05, SEG-06, SEG-04) |
| Q-18 | Vigencia y cantidad por defecto de la prescripción | Profesional + abogado | Gate A (OPT-05) |
| Q-19 | Responsable de tecnovigilancia y director científico por tenant | Orlando + cada óptica | Gate A (ADM-01) |
| Q-20 | Estado de la Res. 3100 y código REPS | Consultor de habilitación | Gate A si el piloto es prestador |
| Q-21 | Software como dispositivo médico | Abogado/INVIMA | F4 (OPT-13) |
| Q-22 | Firma electrónica, sello de tiempo, PDF/A | Abogado | Gate A (SEG-08) |
| Q-23 | Catálogos (scraping, CIE-10, CUPS): licencias | Orlando + abogado | F1 (OPT-10), F2 (ADM-22) |
| Q-24 | Gafas de sol y productos de salud visual | Consultor regulatorio | F2 (ADM-05) |
| Q-25 | Telemedicina | Consultor de habilitación | OPT-24 |
| Q-26 | Auxiliares en HC; plantilla de oftalmología | Abogado + oftalmólogo | F4 (OPT-22, OPT-01) |
| Q-27 | Ley 23/1981, Dec. 1340/1998, Res. 13437/1991 aplicadas al optómetra | Abogado | Gate A (SEG-14, SEG-15) |
| Q-28 | INVIMA: registro sanitario y CCAA | Consultor INVIMA | F3 (ADM-07) |
| Q-29 | RNBD, Circular 002/2025 y base legal de brigadas | Abogado | F3/F4 (SEG-15, OPT-20) |
| Q-30 | Formatos de exportación Siigo/World Office | Contador | F4 (ADM-14) |
| Q-31 | IVA de lentes, monturas, LC y exámenes | Contador | Gate B (ADM-03, ASE-03) |
| Q-32 | Fuente oficial de festivos | Orlando | Gate A (PLT-11) |

---

## 2. Detalle

Cada ficha: **Contexto** · **Decide** · **Opciones** · **Por defecto** (lo que la spec asume) · **Si no se decide** · **Bloquea**.

### Q-01 — Piloto, tipo de establecimiento, HC históricas, sede con certificado vencido
- **Contexto:** El módulo de HC solo tiene sentido legal si el cliente puede registrar HC (óptica con consultorio, IPS, profesional independiente). La Res. 1995/1999 y la Res. 839/2017 se aplican a prestadores; una óptica sin consultorio custodia prescripciones y registros (D. 1030/2007 art. 6 ✅) pero no es prestadora ⚠️. Además: ¿se migran HC en papel o de otro software? ¿qué pasa si el certificado de una sede está vencido? (ADM-01).
- **Decide:** Orlando (primer cliente) con un consultor de habilitación (Q-20).
- **Opciones:** (a) piloto = óptica con consultorio; (b) piloto = óptica sin consultorio (HC deshabilitada, solo venta y prescripción recibida); (c) piloto = consultorio de optometría independiente.
- **Por defecto:** el tipo de establecimiento es un atributo por sede que activa/desactiva módulos (spec §10.3); sede vencida = banner y alerta, **sin bloquear la atención clínica**; HC históricas = anexos PDF rotulados «migrada», nunca «firmadas».
- **Si no se decide:** Gate A no se puede firmar; se sigue con datos sintéticos.
- **Bloquea:** Gate A (ADM-01, PLT-03, OPT-01).

### Q-02 — ¿El piloto factura a EPS o pagadores con contrato?
- **Contexto:** Activa RIPS/CUV y plazos de radicación (Res. 948/2026 ⚠️ aplicabilidad no confirmada, Q-04). Si solo hay venta particular, no aplica.
- **Decide:** Orlando.
- **Por defecto:** **solo venta particular**; los convenios (ADM-12) son descuentos, no facturación a pagadores.
- **Si no se decide:** ADM-19 permanece en F5.
- **Bloquea:** Gate B si la respuesta es sí (ADM-19 pasa a requisito).

### Q-03 — Camino de facturación electrónica y obligación de facturar
- **Contexto:** Res. DIAN 165/2023 (factura y tiquete POS electrónicos ✅). No está verificado: el anexo técnico posterior a v1.9, la contingencia (art. 37), la existencia de **API** en la solución gratuita de la DIAN y las fechas de obligatoriedad del POS electrónico (NV-05). La regla del dueño excluye servicios de pago obligatorios.
- **Decide:** contador del cliente / DIAN + Orlando.
- **Opciones (spec §11.1):** (A) `simulado` (solo desarrollo); (B) solución gratuita de la DIAN con **flujo asistido** (el sistema prepara los datos y el usuario factura en la herramienta de la DIAN; **sin** integración automática si no hay API ⚠️); (C) proveedor tecnológico HTTP genérico (p. ej. Factus u otro, **pagado por el cliente final**, precios no públicos ⚠️); (D) UBL 2.1 + firma propia (`xml-crypto` MIT, `xmlbuilder2` MIT; esfuerzo alto, XAdES-EPES sin verificar, P2).
- **Por defecto:** A en desarrollo; B como primera salida real; C como adaptador listo; D no se promete.
- **Si no se decide:** el sistema opera con documento interno rotulado «NO ES FACTURA ELECTRÓNICA».
- **Bloquea:** Gate B (ADM-09, ASE-06).

### Q-04 — Aplicabilidad de RIPS (Res. 948/2026)
- **Contexto:** ⚠️ NO VERIFICADO si aplica a ópticas con consultorio o a venta particular. La spec cita la Res. 948/2026 según la corrección del asesor legal (en lugar de la Res. 2275/2023).
- **Decide:** consultor de habilitación / abogado.
- **Por defecto:** no se construye hasta la confirmación; F5 queda diseñada (`RIPSPort`).
- **Bloquea:** Gate E.

### Q-05 — Aplicabilidad y cronograma de IHCE/RDA
- **Contexto:** Res. 866/2021 art. 2, Res. 1888/2025 (RDA/FHIR ✅ leídas por los informes), Res. 1799/2026 no leída (NV-04). ¿Una óptica con consultorio debe enviar RDA de consulta externa? ¿desde cuándo?
- **Decide:** consultor / Secretaría de Salud (micrositio www.minsalud.gov.co/IHCE).
- **Por defecto:** no obligada; F5 condicionada; los datos de la HC se estructuran con CIE-10/CUPS para que el RDA sea posible después (OPT-10).
- **Si no se decide:** riesgo de incumplimiento no detectado; se anota en el tablero ADM-16.
- **Bloquea:** Gate A **si** el piloto resulta obligado (OPT-23 sube a requisito).

### Q-06 — Hosting, residencia de datos y costo
- **Contexto:** Producción exige alojar PostgreSQL y la app; el hosting tiene costo. La spec interpreta la regla como «sin licencias ni servicios SaaS de terceros obligatorios para el software» y lo separa del costo de infraestructura (spec §11.9). Supabase hospedado tiene planes de pago y los límites de la capa gratuita **no están verificados** (NV-20). Transferencia/transmisión internacional: Ley 1581 art. 26, D. 1377 art. 24, Circular Única SIC Título V cap. 3 ✅.
- **Decide:** Orlando; abogado revisa cláusulas de transferencia/subencargados.
- **Opciones:** (a) VPS propio con PostgreSQL + Valkey/pg-boss (software libre, costo de servidor); (b) Supabase autoalojado (Apache-2.0) en VPS; (c) Supabase hospedado (de pago; no recomendado como único camino); (d) servidor en Colombia o país en la lista SIC.
- **Por defecto:** PostgreSQL estándar + Drizzle (sin SDK propietario), de modo que cualquier opción sea intercambiable; destino en Colombia o país adecuado ⚠️.
- **Bloquea:** Gate A (PLT-06, PLT-07).

### Q-07 — RPO/RTO, retención de logs y facturas, plazo de aviso en incidentes
- **Contexto:** El informe legal no verificó el plazo del art. 632 ET ni un plazo legal único para logs (NV-06). El aviso a la óptica afectada «de inmediato» (D-04) se concreta en el contrato (¿24–72 h?). El reporte a la SIC es en 15 días hábiles (Circular Única ✅).
- **Decide:** Orlando (valores de RPO/RTO) + abogado/contador (plazos).
- **Por defecto:** valores **editables y rotulados «provisional»**; ningún valor se presenta como obligación legal.
- **Bloquea:** Gate A (PLT-07, SEG-09, SEG-11).

### Q-08 — Uso de datos de pacientes para fines propios
- **Contexto:** Analítica, mejora de producto, IA o benchmarking con datos de pacientes convertiría a OptiSaaS en **responsable** para esa finalidad (Ley 1581 art. 17).
- **Decide:** Orlando + abogado.
- **Por defecto:** **No.** Solo telemetría sin datos personales; sin telemetría de terceros (ADR-14).
- **Bloquea:** Gate A (el contrato de encargo lo declara).

### Q-09 — Excepciones de licencia
- **Contexto (auditoría hecha el 2-oct-2026, spec §14.4):** 459 paquetes. **MPL-2.0 ×4** (`lightningcss` ×3 vía Tailwind 4; `axe-core` vía `eslint-config-next`→`jsx-a11y`); **LGPL-3.0-or-later ×2** (binarios `@img/sharp-libvips` vía `next`→`sharp@0.34.5`); `caniuse-lite` CC-BY-4.0 (datos); el proyecto es `UNLICENSED`. También quedan por decidir: Node.js, Docker/Podman, GitHub Actions (términos gratuitos) y herramientas de infraestructura del SO (NV-25).
- **Ya aceptado antes (según el informe legal §5, «memoria compartida de Ingeniería»; no pude verificar esa memoria por mi cuenta):** `axe-core` (MPL-2.0) **solo para pruebas de accesibilidad**, sin entregarlo ni publicarlo con el producto. **No** cubre expresamente `@axe-core/playwright` (también MPL-2.0, ⚠️ por confirmar), `lightningcss` (se ejecuta en la compilación) ni `sharp-libvips` (LGPL, binario que se distribuye con la app).
- **Decide:** Orlando.
- **Opciones:** (1) **Estricto:** bajar a Tailwind 3.4.17 (MIT, sin lightningcss ✅) y excluir `sharp`/libvips (p. ej. `images.unoptimized` y `npm ci --omit=optional`; **la viabilidad de excluir `sharp` sin romper el build está por verificar en T01**); `axe-core` viene de `eslint-config-next` (herramienta de desarrollo, no se distribuye con la app) y se reemplaza o se acepta según la opción 2; (2) **Excepción acotada:** permitir MPL-2.0/LGPL solo como **herramientas de desarrollo o binarios sin modificar ni enlazar a código propio**, documentadas en `THIRD_PARTY_LICENSES.md` (la lectura de si esto cumple la regla del dueño es suya; no es una conclusión legal); (3) cambiar de framework (descartado por costo, no recomendado).
- **Por defecto:** opción (1) para lo que se pueda (T01 intenta Tailwind 3.4 y `unoptimized`); `axe-core` solo en CI de accesibilidad y no distribuido; el resto queda «pendiente de decisión» y **el CI marca advertencia, no falla**, hasta que Orlando responda.
- **Bloquea:** T01 y el cierre honesto de «licencias» en la rúbrica (límite explícito, ver `RUBRICA_99.md`).

### Q-10 — Acceso del administrador a lo clínico; admin que es profesional
- **Contexto:** El código actual deja al `owner` entrar a todas las secciones (`middleware.ts`). La HC es dato sensible; el principio de mínimo privilegio exige que el administrador administrativo no lea HC.
- **Decide:** Orlando + abogado.
- **Por defecto:** `admin` **no** lee HC; si es optómetra, usa un segundo rol profesional con firma y registro; el `owner` de plataforma **no** ve contenido de ningún tenant (PLT-05).
- **Bloquea:** Gate A (SEG-02).

### Q-11 — Precios de los planes
- **Contexto:** Los precios actuales (`plans-config.ts`: $500.000 / $1.500.000 / $4.500.000 COP/mes) están muy por encima del mercado visible: OptikaApp $83.000, $135.000 y $600.000; GouJana desde $89.900 por doctor (precios de lista consultados el 2-oct-2026; cierres reales ⚠️ desconocidos). Los precios de Softop/Gesvision/Optysof/RevolutionEHR/Ocuco **no se verificaron** (NV-21).
- **Decide:** Orlando.
- **Por defecto (hipótesis):** Esencial $89.000 (1 sede, 5 usuarios) · Clínica $149.000 (2 sedes, 12 usuarios) · Cadena $449.000 (6 sedes, 40 usuarios) · sede adicional $59.000 · prueba de 15 días · anual = 10 meses por 12 · mora ⇒ solo lectura + exportación.
- **Bloquea:** Gate C (PLT-04).

### Q-12 — Tienda en línea y retracto
- **Contexto:** Retracto (Ley 1480/2011 art. 47 ✅): bienes personalizados suelen exceptuarse; lentes de contacto y monturas estándar: discutible ⚠️. La tienda exige datos del proveedor, información y prescripción antes de producir.
- **Decide:** abogado + Orlando.
- **Por defecto:** la tienda no se habilita; atributo `retractable` por producto ya existe.
- **Bloquea:** ADM-20 (F4).

### Q-13 — Mensajería/WhatsApp y recordatorios frente a la Ley 2300/2023
- **Contexto:** ¿Un recordatorio de cita/control o «lentes listos» es servicio o publicidad? ⚠️. WhatsApp Cloud API cobra plantillas fuera de la ventana de 24 h (⚠️ tarifas sin verificar).
- **Decide:** abogado + Orlando.
- **Por defecto:** `wa.me` asistido (el usuario envía), SMTP; mismas ventanas horarias que publicidad hasta calificar; sin envíos automáticos masivos.
- **Bloquea:** F3 (SEG-16, ASE-12).

### Q-14 — Licencia del propio proyecto
- **Decide:** Orlando. **Opciones:** mantener privado (`UNLICENSED`/propietario) o licencia permisiva (MIT/Apache-2.0) o con copyleft (descartado por la regla del dueño para dependencias, pero la licencia propia es otra cosa).
- **Por defecto:** privado; no publicar el repo. Mantener `THIRD_PARTY_LICENSES.md` actualizado.
- **Bloquea:** publicar el repositorio.

### Q-15 — Persona natural vs. S.A.S. y contrato con las ópticas
- **Contexto:** Afecta responsabilidad contractual, el RNBD (umbral de activos aplica a sociedades, C-09) y la facturación propia de Orlando (fuera del software).
- **Decide:** Orlando + abogado.
- **Por defecto:** el contrato de encargo (SEG-15) tiene campos para ambos casos; límites de responsabilidad y seguros ⚠️ los define el abogado.
- **Bloquea:** Gate A (PLT-03).

### Q-16 — Crédito y centrales de riesgo
- **Contexto:** Ley 1266/2008 y Ley 2157/2021 (texto ⚠️ no leído, C-12).
- **Por defecto:** **fuera de alcance:** los abonos y saldos no se reportan a centrales de riesgo.
- **Bloquea:** nada.

### Q-17 — Base legal de la HC, borrador vs. registro, menores
- **Contexto:** Tensión entre la obligación de registrar la HC (Res. 1995/1999, Ley 2015/2020) y la regla de no condicionar la actividad a suministrar datos sensibles (D. 1377/2013 art. 6) cuando el paciente **no autoriza**; excepción de urgencia (Ley 1581 art. 10 lit. c). Menores: alcance real del art. 7 de la Ley 1581 y sentencia C-748/2011 ⚠️. Además: la spec trata el «borrador» como no oficial hasta firmar (evita la ventana de edición de 24 h del código actual, que **no está en las normas leídas**); esa **interpretación** debe confirmarla el abogado.
- **Decide:** abogado.
- **Por defecto:** el sistema registra la negativa y permite continuar con datos mínimos; **no** resuelve la tensión en código; textos de autorización marcados «borrador para revisión».
- **Bloquea:** Gate A (SEG-04, SEG-05, SEG-06).

### Q-18 — Vigencia y cantidad por defecto de la prescripción
- **Contexto:** El art. 17 del D. 1030/2007 exige indicar vigencia y cantidad (en números y letras) pero **la norma leída no fija un plazo** (NV-26).
- **Decide:** profesional (director científico) + abogado.
- **Por defecto:** campo obligatorio **sin valor por defecto**; el optómetra lo escribe cada vez.
- **Bloquea:** Gate A (OPT-05).

### Q-19 — Responsable de tecnovigilancia y director científico por tenant
- **Decide:** Orlando con cada óptica. **Por defecto:** campos obligatorios en el perfil de la sede (ADM-01); sin ellos la sede muestra alerta (no bloquea atención clínica).
- **Bloquea:** Gate A (ADM-01), ADM-10.

### Q-20 — Estado de la Res. 3100 y código REPS
- **Contexto:** Res. 3100/2019 con Res. 544/2023 y 465/2025 leídas (art. 4); según fuentes secundarias podría estar revocada por la Res. 1732/2026 y/o la Res. 2080 del 8-sep-2026 ⚠️ (NV-01, NV-02). Código/servicio de optometría en REPS ⚠️.
- **Decide:** consultor de habilitación (micrositio oficial).
- **Por defecto:** se cita la 3100 con sus modificaciones; código REPS = campo libre.
- **Bloquea:** Gate A si el piloto es prestador.

### Q-21 — Software como dispositivo médico
- **Contexto:** D. 4725/2005 art. 2 ⚠️ si el software con funciones de apoyo diagnóstico se clasificaría como dispositivo médico.
- **Por defecto:** **sin apoyo diagnóstico** (ADR-15). Las validaciones de OPT-13 son de captura (rangos, incoherencias) y no sugieren diagnóstico.
- **Bloquea:** OPT-13 y cualquier función clínica «inteligente».

### Q-22 — Firma electrónica, sello de tiempo, PDF/A
- **Contexto:** Ley 527/1999 art. 7 ✅; Decreto 2364/2012 ⚠️ (texto no leído). PDF/A no garantizado por `@react-pdf/renderer`.
- **Decide:** abogado.
- **Por defecto:** firma electrónica simple + hash SHA-256 y sellado propio; `SelloTiempoPort` opcional (TSA de terceros, de pago, no obligatorio).
- **Bloquea:** Gate A (SEG-08).

### Q-23 — Catálogos: scraping, CIE-10, CUPS
- **Contexto:** `scripts/scrape-lentes.js` extrae un catálogo de un tercero con términos de uso **sin revisar** (NV-19). La licencia/uso de CIE-10 y CUPS y de los catálogos de la Res. 866 ⚠️ no está verificada (NV-18).
- **Decide:** Orlando + abogado.
- **Por defecto:** el scraping se retira (ADM-22); los catálogos clínicos **no se redistribuyen en el repo**: se cargan localmente desde la fuente oficial.
- **Bloquea:** OPT-10 (F1), ADM-22 (F2).

### Q-24 — Gafas de sol y productos de salud visual
- **Contexto:** No se pudo verificar la norma aplicable a gafas de sol, suplementos, lágrimas artificiales ni medicamentos oftálmicos (NV-13).
- **Por defecto:** categorías configurables con advertencia; sin afirmar clase ni registro.
- **Bloquea:** el cierre de «cobertura de productos» al 100 % (ver rúbrica).

### Q-25 — Telemedicina
- **Contexto:** Aplicación a optometría **no verificada** (NV-17).
- **Por defecto:** excluida; campo `modalidad` reservado (OPT-24).

### Q-26 — Auxiliares en HC; plantilla de oftalmología
- **Contexto:** ¿Un auxiliar clínico puede registrar en la HC sin firma propia? (NV-27). La plantilla de oftalmología no se inventa: se define con un oftalmólogo.
- **Por defecto:** el auxiliar solo escribe en borrador de la sección de antecedentes/datos, el profesional firma; oftalmología usa la plantilla base.
- **Bloquea:** F4 (OPT-22).

### Q-27 — Ley 23/1981, Decreto 1340/1998 y Res. 13437/1991 aplicadas al optómetra
- **Contexto:** Ley 23/1981 (arts. 14-15, 34-38 ✅ en el informe legal); su aplicación al optómetra, el texto del Decreto 1340/1998 y la Res. 13437/1991 ⚠️ no verificados (NV-14).
- **Por defecto:** se aplican las normas verificadas (Res. 1995, Ley 372/1997) y las otras se citan como «aplicabilidad por confirmar»; el cartel de derechos del paciente es P2.
- **Bloquea:** SEG-14 (acta de traslado), SEG-15.

### Q-28 — INVIMA: registro sanitario y CCAA
- **Contexto:** Registro sanitario por clase, CCAA (Res. 4002/2007) para ópticas minoristas, listado Res. 4396/2008 y publicidad de dispositivos ⚠️ (NV-12).
- **Por defecto:** el catálogo guarda registro/clase y alerta; no certifica.
- **Bloquea:** ADM-07 (F3).

### Q-29 — RNBD, Circular 002/2025 y base legal de brigadas
- **Contexto:** RNBD aplica por umbral de activos (Circular Única SIC Título V cap. 2 ✅; el valor de la UVT del año no se codifica ⚠️). Circular Externa 002 de 7-oct-2025 de la SIC: solo se leyó el asunto. Brigadas/tamizaje: base legal de la autorización (del contratante o del participante).
- **Decide:** abogado. **Por defecto:** checklist por tenant; autorización por participante.
- **Bloquea:** SEG-15 (F1, documental), OPT-20 (F4).

### Q-30 — Formatos Siigo/World Office
- **Contexto:** Formatos reales de importación no verificados; la spec ofrece exportación CSV configurable.
- **Decide:** contador. **Por defecto:** CSV genérico con mapeo editable. **Bloquea:** ADM-14.

### Q-31 — IVA de lentes, monturas, LC y exámenes
- **Contexto:** IVA/exclusiones ⚠️ (NV-07).
- **Decide:** contador. **Por defecto:** tarifa **parametrizable sin valor por defecto** por producto/servicio. **Bloquea:** Gate B (ADM-03, ASE-03).

### Q-32 — Fuente oficial de festivos
- **Contexto:** Los plazos en días hábiles (15 días hábiles de la SIC, términos de Habeas Data) requieren calendario colombiano; la fuente oficial no está verificada (NV-24).
- **Decide:** Orlando. **Por defecto:** tabla editable por año; el agente no incluye festivos inventados, solo los carga desde un CSV que el humano provee. **Bloquea:** Gate A (PLT-11).

---

## 3. Puntos para abogado, consultor y contador (agrupados)

- **Abogado:** Q-08, Q-10, Q-12, Q-13, Q-15, Q-17, Q-18, Q-22, Q-23, Q-27, Q-29; además compilación del art. 25 del D. 1377 (el normograma DIAN lo marca no compilado; la SIC lo cita como art. 2.2.2.25.5.2 del D. 1074/2015) y límites de responsabilidad/seguros.
- **Consultor de habilitación en salud / Secretaría de Salud:** Q-01, Q-04, Q-05, Q-20, Q-25.
- **Contador / asesor tributario:** Q-03, Q-07 (facturas, art. 632 ET), Q-30, Q-31.
- **INVIMA / consultor de dispositivos:** Q-21, Q-24, Q-28.
- **Orlando:** Q-02, Q-06, Q-09, Q-11, Q-14, Q-16, Q-19, Q-32.

*Los textos legales generados por el software (consentimientos, políticas, contratos) se entregan como **borrador para revisión de abogado**; ninguno se debe usar con pacientes reales sin esa revisión.*
