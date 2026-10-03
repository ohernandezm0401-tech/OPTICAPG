# RUBRICA_99 — autoevaluación de la especificación de OptiSaaS (0–100)

**Versión:** 1.0 · **Fecha:** 2 de octubre de 2026 (hora Colombia, UTC-5) · Evalúa `ESPECIFICACION_OPTISAAS.md` (la spec), `FASES_CURSOR.md` y `PREGUNTAS_ABIERTAS.md`.

> **Resultado en una línea:** **82 / 100** en total. **No se llega a 99, y inflarlo sería deshonesto.** De los 100 puntos, **17 dependen de verificaciones o decisiones que no se pueden hacer desde un documento** (abogado, consultor de habilitación, contador, usuarios reales, prueba de penetración, decisión de licencias de Orlando). Sobre lo que sí controla la especificación, el puntaje es **77,5 / 83 (93 %)**. Es una **autoevaluación hecha por quien redactó la spec**, sin revisión independiente; conviene que otra persona repita el cálculo.

## 1. Cómo se calcula
- Siete criterios con peso (suman 100). Cada criterio se divide en subcriterios con puntos máximos y una etiqueta:
  - **[C] controlable**: depende de lo que está escrito; se puede corregir editando la spec.
  - **[E] externo**: depende de algo que ningún documento puede dar (verificación jurídica, usuarios reales, ejecución de código, decisión del dueño). Se puntúa por lo que sí hay, y la diferencia se declara como techo.
- Cada puntaje cita su evidencia (IDs de la spec y salida de `_build/check_spec.py`, guardada en `anexos/check_spec_salida.txt`).

## 2. Evidencia automática (corrida del 2-oct-2026)
`python3 _build/check_spec.py` → **0 problemas**, 4 avisos:
- 90 funcionalidades (39 P0, 39 P1, 12 P2), **277 criterios de aceptación**, todas con los 13 campos, ≥ 2 criterios (P0 ≥ 3).
- **90/90 requisitos legales** (IDs A-01…M-03 del informe legal) con al menos una funcionalidad.
- Todas las referencias entre funcionalidades existen; **sin ciclos de dependencia**; ninguna funcionalidad de una fase depende de otra de una fase posterior.
- 77 tareas en `FASES_CURSOR.md`: cada funcionalidad (salvo OPT-24, excluida a propósito) tiene tarea; las dependencias entre tareas son coherentes con las de las funcionalidades.
- Todas las Q-nn citadas están definidas en `PREGUNTAS_ABIERTAS.md` (Q-01…Q-32).
- **Los 4 avisos son deliberados** y se aceptan: requisitos legales P0 *condicionales* (H-01, H-03, H-05: solo si el cliente es prestador obligado; K-03: solo si hay venta en línea en el MVP) que se programan en F5/F4 porque su aplicabilidad no está verificada. Compensación: si Q-05 o Q-02 resultan afirmativas, OPT-23 / ADM-19 pasan a ser requisito de los Gates A/B (spec §0.2).

## 3. Puntaje final (v1)
| Criterio | Peso | Obtenido |
|---|---|---|
| 1. Funcionalidad | 25 | **23** |
| 2. Cobertura de especialidades y productos de Colombia | 15 | **12,5** |
| 3. Cumplimiento legal | 20 | **16** |
| 4. Seguridad | 15 | **11,5** |
| 5. UX | 8 | **5** |
| 6. Pruebas | 10 | **9** |
| 7. Licencias | 7 | **5** |
| **Total** | **100** | **82** |
| Solo subcriterios [C] | 83 | **77,5 (93 %)** |
| Solo subcriterios [E] | 17 | **4,5** |

### 3.1 Funcionalidad (25) → 23
| Sub | Máx | Obt. | Tipo | Evidencia y deducción |
|---|---|---|---|---|
| 1.1 Funciones por rol y transversales frente a los informes | 8 | 7,5 | C | 90 fichas (PLT 12, SEG 16, ADM 22, ASE 16, OPT 24). Imprescindibles e importantes del informe de producto cubiertos; los «deseables» están como P2 (CRM, BI/API, booking, pedidos a laboratorio) salvo AR de monturas, que queda solo anotado en §13 (−0,5). |
| 1.2 Fichas completas y accionables | 6 | 5,5 | C | 13 campos, 277 criterios con ID, pruebas y dependencias por ficha. −0,5: nunca se han ejecutado contra código real y algunos umbrales (p. ej. < 300 ms) son hipótesis de diseño. |
| 1.3 Flujos, estados y datos | 5 | 4,5 | C | Estados por ficha y modelo en §17 a nivel de tabla/campos y RLS; −0,5: **no hay DDL completo ni diagrama entidad-relación**. |
| 1.4 Fases, dependencias y ejecutabilidad | 6 | 5,5 | C | Fases F1–F5 con gates; 77 tareas pequeñas; sin ciclos (verificado). −0,5: el tamaño de cada tarea es estimación; no se ha lanzado ninguna en Cursor ni medido consumo. |

### 3.2 Cobertura de especialidades y productos (15) → 12,5
| Sub | Máx | Obt. | Tipo | Evidencia y deducción |
|---|---|---|---|---|
| 2.1 Especialidades (optometría clínica, contactología, baja visión, terapia visual/ortóptica/pleóptica, pediatría, tamizaje/brigadas, prótesis oculares, oftalmología, taller, laboratorio) | 5 | 5 | C | Tabla §10.1: 18 de 19 líneas con funcionalidades; telemedicina excluida **a propósito** (OPT-24, Q-25). |
| 2.2 Productos del sector (monturas, lentes oftálmicos, LC y líquidos, gafas de lectura y de sol, accesorios, productos de salud visual) | 4 | 3,5 | C | 13 categorías con atributos y banderas (§10.2). −0,5: no se detallan atributos de nicho (p. ej. lentes deportivos, filtros especiales) más allá de la categoría. |
| 2.3 Formas de operar (óptica con/sin consultorio, taller, laboratorio, cadena, brigadas, convenios) | 3 | 3 | C | §10.3 y ADM-01/21. |
| 2.4 Fundamento regulatorio verificado de los productos sin norma confirmada | 3 | 1 | **E** | **Gafas de sol, suplementos y «productos de salud visual» sin norma verificada** (NV-13, Q-24); registro sanitario/CCAA (NV-12, Q-28); plantilla de oftalmología sin definir (Q-26). La spec no afirma nada sobre ellos. |

### 3.3 Cumplimiento legal (20) → 16
| Sub | Máx | Obt. | Tipo | Evidencia y deducción |
|---|---|---|---|---|
| 3.1 Trazabilidad requisito → funcionalidad | 6 | 6 | C | Matriz generada §16.4: **90/90**; los requisitos que no son software (C-08, C-12, H-06…) quedan justificados en SEG-15. |
| 3.2 Correcciones del asesor legal aplicadas y coherentes | 4 | 4 | C | Retención 15 años (Res. 839/2017), RIPS Res. 948/2026, D. 1030/2007 arts. 16-19, Res. DIAN 165/2023 = 227/2025, Res. 1888/2025; sin plazo de 24 h ni 20 años. |
| 3.3 Honestidad de las marcas «no verificado» | 3 | 3 | C | 28 NV en §15; la spec no convierte ninguna hipótesis en obligación. |
| 3.4 Normas efectivamente verificadas en texto oficial | 7 | 3 | **E** | Quedan **28 puntos sin verificar** (§15), entre ellos: aplicabilidad de RIPS e IHCE a ópticas, estado de la Res. 3100, Dec. 2364/2012, IVA, vigencia de la prescripción (NV-26), Ley 1266, texto completo de la Circular 002/2025, Dec. 1340/1998. Solo un abogado/consultor puede cerrarlos. **Todo texto legal que genere el software es borrador.** |

### 3.4 Seguridad (15) → 11,5
| Sub | Máx | Obt. | Tipo | Evidencia y deducción |
|---|---|---|---|---|
| 4.1 Controles técnicos (autenticación, RLS, autorización, cifrado, auditoría, inmutabilidad, endurecimiento, respaldos, incidentes) | 8 | 7,5 | C | PLT-01, SEG-01…04, 08, 09, 11…13, PLT-07. −0,5: PDF/A y sello de tiempo no garantizados (Q-22); ClamAV excluido por licencia → sin antivirus (limitación documentada). |
| 4.2 Modelo de amenazas y pruebas de seguridad | 3 | 2,5 | C | §14.6 (14 amenazas → control → prueba) y pruebas S por ficha. −0,5: es un STRIDE simplificado, no un análisis formal. |
| 4.3 Privacidad por diseño (minimización, consentimiento, retención, menores, residencia) | 2 | 1,5 | C | SEG-05/06/07/09, PLT-06. −0,5: la residencia real depende de la decisión de hosting (Q-06). |
| 4.4 Análisis de riesgos formal y prueba de penetración independiente | 2 | 0 | **E** | No existen y no se pueden producir desde este documento (SEG-15 deja la plantilla del análisis; la prueba de penetración no está incluida). |

### 3.5 UX (8) → 5
| Sub | Máx | Obt. | Tipo | Evidencia y deducción |
|---|---|---|---|---|
| 5.1 Flujos por rol, estados y atajos | 3 | 2,5 | C | Flujos E2E por rol y gate (§14.2); POS con teclado/códigos; agenda y sala de espera. −0,5: **sin wireframes**. |
| 5.2 Accesibilidad e idioma | 2 | 1,5 | C | PLT-12: WCAG 2.1 AA como *objetivo* (la norma colombiana de accesibilidad web no está verificada), es-CO, teclado completo. −0,5: contraste y lector de pantalla solo declarados. |
| 5.3 Metas de UX medibles | 1 | 1 | C | PLT-12 (AC-PLT-12-4/5): metas de acciones/tiempos, marcadas como hipótesis. |
| 5.4 Validación con usuarios reales de ópticas | 2 | 0 | **E** | No se hizo; el protocolo queda en `docs/UX_VALIDACION.md` (AC-PLT-12-5) para que lo ejecute una persona. |

### 3.6 Pruebas (10) → 9
| Sub | Máx | Obt. | Tipo | Evidencia y deducción |
|---|---|---|---|---|
| 6.1 Estrategia, pirámide y definición de terminado | 4 | 4 | C | §14.1–14.3: PostgreSQL real, RLS tabla-dirigida, contrato de puertos, cobertura de ramas ≥ 90 % en reglas nuevas. |
| 6.2 Pruebas y criterios por funcionalidad, trazables | 3 | 3 | C | 277 criterios con ID y prueba exigida por ficha y por tarea. |
| 6.3 Verificación automatizada del propio documento | 2 | 2 | C | `_build/check_spec.py` (sección 2). |
| 6.4 Pruebas ejecutadas contra código real | 1 | 0 | **E** | El código aún no existe; ningún criterio se ha probado. |

### 3.7 Licencias (7) → 5
| Sub | Máx | Obt. | Tipo | Evidencia y deducción |
|---|---|---|---|---|
| 7.1 Auditoría del árbol actual | 3 | 3 | C | `npm ci --ignore-scripts` sobre el lockfile (459 paquetes) + `license-checker`; resultados en `anexos/`. |
| 7.2 Licencia exacta verificada de lo nuevo | 2 | 1,5 | C | §14.5 (verificadas hoy en el registro npm / archivos LICENSE). −0,5: Node.js, Docker/Podman, GitHub Actions y herramientas de SO sin verificar (NV-25). |
| 7.3 Hallazgos resueltos | 2 | 0,5 | **E** (decisión de Orlando) | **H-LIC-1: LGPL-3.0-or-later** (`@img/sharp-libvips`, vía `next`→`sharp`, ×2). **H-LIC-2: MPL-2.0** (`lightningcss` ×3 vía Tailwind 4; `axe-core` ×1). El `package.json` es `UNLICENSED`. Hay propuesta (T01: Tailwind 3.4.17, excluir `sharp`) pero **no está probada ni decidida (Q-09, Q-14)**. |

## 4. De v0 a v1: huecos encontrados y corregidos
Estimación retrospectiva del puntaje de la primera versión (antes de corregir): **≈ 68 / 100**. Los hallazgos salieron del script de verificación y de la revisión cruzada; todos están corregidos en v1:

| # | Hueco en v0 | Corrección |
|---|---|---|
| 1 | 9 requisitos legales sin funcionalidad (A-08, C-08, C-09, C-12, C-13, E-04, H-06, J-02, K-05) | Añadidos a SEG-14, PLT-03, SEG-09, SEG-15; ahora 90/90 |
| 2 | Dependencias de F1 hacia F2/F3 (SEG-07/09/11, OPT-05 → PLT-11; OPT-06 → SEG-14; ASE-03 → ADM-12; OPT-09 → ASE-10; ADM-22 → ADM-15) | PLT-11 pasó a F1/P0; las demás se volvieron «enlace posterior» sin dependencia dura |
| 3 | 7 ciclos de dependencia (PLT-01↔PLT-02↔SEG-02, PLT-03↔SEG-05, ADM-03↔ADM-09↔ASE-04, ASE-03↔ASE-07) | Orden de construcción explícito; el POS ya no emite factura (lo hace ASE-06) |
| 4 | SEG-05/SEG-06/ASE-01 se bloqueaban entre sí | ASE-01 → SEG-06 → SEG-05 (el consentimiento sigue al paciente) |
| 5 | ASE-13 y OPT-24 con 1 criterio; ASE-06, ASE-09, SEG-15 (P0) con 2 | Criterios añadidos |
| 6 | La intro no explicaba por qué OPT-05 está en F1 (el informe la ponía en F2) | Desviación documentada en §0.2 |
| 7 | Sin modelo de amenazas | §14.6 |
| 8 | Sin metas de UX medibles | PLT-12 ampliada |
| 9 | Sin script de verificación ni lista de preguntas con numeración consistente | `check_spec.py`, `PREGUNTAS_ABIERTAS.md` (Q-27 añadida para Ley 23/1981 y Dec. 1340/1998) |
| 10 | Excepción de `axe-core` (MPL-2.0) mal alcanzada: cubre solo `axe-core`, no `@axe-core/playwright` | §14.1 y Q-09 lo distinguen |
| 11 | Orden de tareas con prerrequisitos invertidos (firma antes que consentimiento; garantías antes que comisiones) | Reordenadas y verificadas por el script |
| 12 | Texto con carácter dañado y referencia a una sección inexistente (16.5) | Corregidos |

## 5. Qué impide llegar a 99 (y por qué no se corrige aquí)
Puntos que faltan: **18** (100 − 82). De ellos, **12,5 son techos externos** y **5,5 son mejoras controlables pendientes**.

**Techos externos (12,5 puntos; no se pueden «escribir»):**
| Techo | Puntos perdidos | Qué lo desbloquea |
|---|---|---|
| Normas sin verificar (28 NV) | 4 (legal 3.4) + 2 (cobertura 2.4) | Abogado y consultor de habilitación (Q-01, Q-04, Q-05, Q-17, Q-18, Q-20, Q-22, Q-24, Q-27…Q-29); contador (Q-03, Q-31) |
| Licencias: LGPL (`sharp-libvips`) y MPL-2.0 (`lightningcss`) | 1,5 | Decisión de Orlando (Q-09) y una prueba de que Tailwind 3.4 / sin `sharp` no rompe el build (T01) |
| Sin validación con usuarios reales | 2 | Ejecutar `docs/UX_VALIDACION.md` con 3–5 usuarios |
| Sin análisis de riesgos formal ni prueba de penetración | 2 | Consultor de seguridad |
| Sin código probado | 1 | Ejecutar las tareas (T00…) y las pruebas |

**Mejoras controlables pendientes (5,5 puntos, 0,5 cada una; coinciden con las deducciones de §3):** (1) especificar AR de monturas (1.1); (2) validar los umbrales de los criterios contra código real (1.2: solo posible al ejecutar); (3) DDL completo y diagrama entidad-relación (1.3); (4) medir tokens por tarea tras las tres primeras (1.4); (5) atributos de nicho de productos (2.2); (6) PDF/A, sello de tiempo y alternativa de antivirus con licencia permisiva (4.1; depende de Q-22); (7) análisis de amenazas formal (4.2); (8) residencia de datos concreta (4.3; depende de Q-06); (9) wireframes de las pantallas P0 (5.1); (10) pruebas de contraste y lector de pantalla (5.2); (11) verificar licencia de Node.js, Docker/Podman y GitHub Actions (7.2; depende de Q-09). Varias de ellas dependen de una decisión o de código, por lo que **no todas se pueden cerrar solo escribiendo**.

**Conclusión:** el puntaje defendible de la especificación hoy es **82/100 (93 % de lo controlable)**. Para decir «99» haría falta que un abogado y un consultor cierren las 28 hipótesis, que Orlando decida Q-09, y que exista código y usuarios reales; no se debe afirmar antes.

## 6. Cómo repetir la evaluación
1. `cd /workspace/optisaas_spec/_build && python3 render.py && python3 render_fases.py && python3 check_spec.py` (debe terminar con «PROBLEMAS TOTALES: 0»).
2. Volver a puntuar los subcriterios [C] con la evidencia de las tablas de §3.
3. Los subcriterios [E] solo suben con evidencia externa: dictamen jurídico, resultados de usuarios, informe de pruebas de penetración, ejecución de la CI.
