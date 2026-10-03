# Decisiones (ADR)

Registro de decisiones de arquitectura y alcance. Formato: ID · fecha (America/Bogota) ·
contexto · decisión · consecuencias. Las preguntas abiertas se citan como Q-nn según
`docs/spec/PREGUNTAS_ABIERTAS.md`. Ninguna entrada inventa normas, cifras ni catálogos;
lo no decidido queda como TODO(Q-nn).

| ID | Fecha | Contexto | Decisión | Consecuencias |
|---|---|---|---|---|
| ADR-001 | 2026-10-03 | T00 exige solo documentación y prohíbe cambiar código o dependencias. | Alcance del PR limitado a: `docs/AGENTE_REGLAS.md`, `docs/spec/` (4 archivos), `THIRD_PARTY_LICENSES.md` y `docs/DECISIONES.md`. Sin cambios en `web/` ni en `package.json`/`package-lock.json`. | El PR no cierra funcionalidad de producto; solo deja la base documental (PLT-09 documental). |
| ADR-002 | 2026-10-03 | AC-PLT-09-1/2/3 hablan de CI y `licenses:check`, pero T00 es solo documentación (nota del prompt: dejarlos documentados como cubiertos por T01 y T02). | AC-PLT-09-1 (fallo ante dependencia prohibida) y AC-PLT-09-2 (`licenses:check` en verde con excepciones) se cubren en T01 (`scripts/check-licenses.mjs` + auditoría Q-09); AC-PLT-09-3 (lint + typecheck + pruebas + build en todo PR) se cubre en T02 (workflow CI). En T00 no se crea código que los verifique. | La prueba requerida PLT-09 («verificación de la propia CI con PR de dependencia prohibida») queda para T01/T02; este PR no la ejecuta. |
| ADR-003 | 2026-10-03 | La regla 6 pide aplicar el valor por defecto de `PREGUNTAS_ABIERTAS.md` ante ambigüedad. | En T00 no hubo ambigüedad que afectara código (no hay código). Valores por defecto aplicados: ninguno. Decisiones abiertas que tocan PLT-09 (Q-09 excepciones de licencia, Q-14 licencia propia) quedan registradas como TODO(Q-09) y TODO(Q-14) para T01. | T01 debe aplicar el valor por defecto de Q-09 (opción 1 estricta: intentar Tailwind 3.4.17 y excluir `sharp`; CI en advertencia hasta decisión de Orlando). |
| ADR-004 | 2026-10-03 | `THIRD_PARTY_LICENSES.md` debe indicar la licencia exacta verificada en el registro npm (regla 2). | Tabla de dependencias directas de `web/package.json` con licencia verificada el 2026-10-03 vía `npm view <paquete>@<versión> license`. Todas las directas son permisivas (MIT/ISC/Apache-2.0/BSD-3-Clause). El árbol transitivo y `licenses.exceptions.json` quedan para T01. | Ninguna dependencia nueva en T00, por lo que no hubo que aprobar ni rechazar licencias. |
| ADR-005 | 2026-10-03 | La spec pide rama `feat/<ID>-<slug>`; la política del agente en la nube exige ramas `cursor/<nombre>-b7f3` y PR contra la rama base de trabajo. | Rama de trabajo: `cursor/feat-t00-reglas-spec-b7f3` (equivale a `feat/T00-reglas-spec`), base: `cursor/ordenar-app-mock-e4a2`. La tarea se ejecutó con Modelo: Automático según el prompt recibido (la spec dice Muse Spark 1.3, esfuerzo medio; ver nota en `docs/AGENTE_REGLAS.md`). | Trazabilidad tarea↔rama↔PR conservada sin violar la política de ramas. |
| ADR-006 | 2026-10-03 | Copia de la spec a `docs/spec/`. | Copias byte a byte de los adjuntos `uploads/` a `docs/spec/ESPECIFICACION_OPTISAAS.md`, `docs/spec/RUBRICA_99.md`, `docs/spec/FASES_CURSOR.md`, `docs/spec/PREGUNTAS_ABIERTAS.md` (versión 1.0 del 2 de octubre de 2026). Sin ediciones. | La app y los agentes leen la spec desde `docs/spec/`; cualquier corrección futura a la spec va en otro PR. |

## TODO abiertos (no bloquean T00)

- TODO(Q-09): decisión de Orlando sobre excepciones MPL-2.0/LGPL y viabilidad de la opción
  estricta (T01). Hasta entonces, sin excepciones registradas.
- TODO(Q-14): licencia propia del proyecto (`web/package.json` sigue `private: true` sin campo
  `license`; no publicar el repo).
