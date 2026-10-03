# Herramientas de infraestructura (Q-09)

Lista para la decisión de Orlando. No son dependencias npm. El código no
las descarga ni las enlaza.

| Herramienta | Uso en T28 | Licencia | Estado |
|---|---|---|---|
| `pg_dump` y `psql` (cliente PostgreSQL 16) | Volcado y prueba de restauración (PLT-07) | PostgreSQL License | Usadas por `web/scripts/respaldo.mjs`. En CI el workflow instala `postgresql-client`. |
| cron, rsync | Programación y copia fuera del servidor | Las del sistema operativo | No adoptadas. TODO(Q-09). El runbook no fija una frecuencia numérica (TODO(Q-07)). |

PostgreSQL License se leyó en la ficha de la spec (ADR-01) como licencia
permisiva. Este archivo no añade otra interpretación.
