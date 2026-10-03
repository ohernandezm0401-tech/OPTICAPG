# Reglas del agente (OptiSaaS)

Fuente: bloque «Reglas fijas» de `docs/spec/FASES_CURSOR.md` (§1, v1.0 del 2 de octubre de 2026, hora Colombia).
Este archivo es la copia canónica dentro del repo. Cada prompt de tarea repite el mismo bloque;
ante cualquier diferencia, vale lo escrito en `docs/spec/FASES_CURSOR.md` y `docs/spec/PREGUNTAS_ABIERTAS.md`.

```text
REGLAS FIJAS (valen para esta tarea; texto completo en docs/AGENTE_REGLAS.md)
1. Una tarea = un PR pequeño en la rama feat/<ID>-<slug>. No toques nada fuera del alcance ni amplíes funcionalidades. Modelo: Muse Spark 1.3, esfuerzo medio.
2. Licencias: solo dependencias MIT, Apache-2.0, BSD-2/3-Clause o ISC (indica la licencia exacta en THIRD_PARTY_LICENSES.md y en la descripción del PR; verifícala en el registro npm antes de instalar). Prohibido GPL/AGPL/LGPL, MPL, open core, BSL, SSPL (p. ej. Redis >= 8, MinIO, ClamAV, FullCalendar con plugins de pago). Sin servicios de pago obligatorios: todo lo externo (facturación DIAN, pagos, WhatsApp, hosting) va detrás de un puerto/adaptador intercambiable.
3. Datos: nunca datos reales de pacientes; solo sintéticos. Sin secretos en el repo. No desactives RLS ni uses un rol con BYPASSRLS. Dinero en COP enteros; fechas en UTC y presentación America/Bogota; UI en español de Colombia; tablas y campos en español snake_case.
4. No inventes normas, cifras, tarifas ni catálogos. Si falta un dato legal, deja el campo configurable sin valor por defecto y marca TODO(Q-nn). Todo texto legal que generes se rotula "BORRADOR – requiere revisión jurídica".
5. Terminado = lint, tsc --noEmit, pruebas (incluidas las de abajo), node scripts/check-licenses.mjs y build en verde; THIRD_PARTY_LICENSES.md y docs actualizados; la descripción del PR lista cada criterio de aceptación y su prueba.
6. Si algo es ambiguo o depende de una decisión abierta: aplica el valor por defecto indicado en docs/spec/PREGUNTAS_ABIERTAS.md, anótalo en el PR y sigue; no bloquees ni improvises.
```

Notas de aplicación (no cambian las reglas):

- «Rama `feat/<ID>-<slug>`» es el nombre lógico de la tarea. Por política del agente en la nube,
  las ramas se crean como `cursor/feat-<ID>-<slug>-b7f3` sobre la rama base de trabajo.
- «Modelo: Muse Spark 1.3, esfuerzo medio» es el valor de la spec. La tarea T00 de este repo
  se ejecutó con Modelo: Automático, según el prompt de la tarea; quedó registrado en `docs/DECISIONES.md`.
