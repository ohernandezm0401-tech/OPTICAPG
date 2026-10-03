# Respaldos cifrados y restauración probada (PLT-07)

Runbook operativo de T28. No fija plazos ni los presenta como obligación.
La asociación normativa que ya trae la ficha PLT-07 (Res. 1995 arts. 16-18 y
Ley 2015/2020 art. 13) no se reinterpreta aquí.
BORRADOR – requiere revisión jurídica.

## Qué hace

`npm run backup:run` (desde `web/`) genera un volcado lógico con `pg_dump` y
lo cifra con AES-256-GCM reutilizando `web/lib/cifrado/aes.mjs` (T11,
`node:crypto`). El archivo queda en el destino configurado. El script
comprueba que el sobre abre con la misma clave y que el SHA-256 del plano
coincide antes de darlo por `verificado`.

`npm run backup:restore-test` repite el respaldo, restaura en una base
temporal vacía y compara conteos de las tablas `public` y el hash de la
cadena de `auditoria`. Si coinciden, imprime `resultado=OK`. Después
elimina esa base. Solo corre con `APP_ENV=desarrollo`, `pruebas` o `demo`.

Los anexos clínicos ya están cifrados dentro de la base (T11). El volcado
los incluye. No hay un segundo almacén de archivos en esta tarea.

## Qué no hace

- No asigna RPO ni RTO. TODO(Q-07): `parametros_continuidad.rpo` y `.rto`
  nacen en null, con rótulo `provisional`. El script los imprime vacíos
  mientras sigan nulos. No hay un número de horas, minutos ni días.
- No borra respaldos viejos ni pasa el estado a `expirado`. La retención de
  las copias sigue la de las historias (SEG-09); la supresión certificada
  en copias no está implementada.
- No archiva WAL. El archivado continuo queda en infraestructura.
- No restaura encima de la base primaria.
- No incluye un SDK ni un servicio de pago para almacenamiento compatible
  con S3. Eso es un puerto (`destinoCompatibleS3` en
  `web/lib/respaldo/destino.mjs`): sin adaptador inyectado, la operación
  se rechaza.

## Credencial de administración

La aplicación sigue con `optisaas_app`, sin superusuario y sin salto de
RLS. El respaldo no usa esa URL.

`DATABASE_URL_RESPALDO` es una credencial distinta, de administración de la
base. En producción es obligatoria: el script no reutiliza `DATABASE_URL`.
Hace falta porque un volcado sujeto a las políticas de fila omitiría los
datos clínicos. Esa credencial no se versiona, no se escribe en los
registros y no se concede a `optisaas_app`.

En desarrollo y en CI puede ser la misma URL de administración del
PostgreSQL de pruebas (`DATABASE_URL_TEST`, usuario `postgres` del compose
o del servicio de GitHub Actions). El rol `optisaas_respaldo` (NOLOGIN, lo
crea la migración `0027`) es el límite de las tablas de metadatos
(`respaldos`, `pruebas_restauracion`, `parametros_continuidad`). Esas
tablas no tienen `tenant_id` porque el volcado es de toda la base, y nacen
con RLS `ENABLE` + `FORCE`. `optisaas_app` solo tiene `SELECT` y no tiene
política, así que ve cero filas.

## Clave de respaldo

`BACKUP_KEY` es una clave de 32 bytes en base64, distinta del archivo
cifrado. No va en el repositorio, ni en `.env` versionado, ni en los logs.

Generarla:

```bash
openssl rand -base64 32
```

Custodia, separada de los respaldos:

1. Guardar el valor en el almacén de secretos del operador o en un archivo
   fuera del repositorio y fuera del disco donde caen los `.enc`.
2. Entregarlo al proceso solo como variable de entorno.
3. No copiarlo al lado del respaldo, ni al ticket, ni al registro del job.
4. Quien tenga la clave y el archivo lee datos clínicos. Por eso la clave
   y las copias no viajan juntas.

Si se rota la clave, los archivos ya cifrados siguen exigiendo la anterior.
Esas claves viejas también quedan fuera del repositorio. Esta tarea no
reencripta copias anteriores. No hay plazo de conservación de la clave
mientras Q-07 siga abierta.

El detector `npm run secretos:buscar` marca una asignación `BACKUP_KEY=`
con valor en un archivo versionado.

## Destino

| `BACKUP_DESTINO` | Comportamiento |
|---|---|
| `disco` (valor si se omite) | Directorio de `BACKUP_DIR`. Si se omite, el temporal del sistema, fuera del repo. El archivo queda en modo `0600`. |
| `compatible-s3` o `s3` | Puerto. Falla hasta que infraestructura inyecte `putObject` y `getObject`. |

El objetivo 3-2-1 de la ficha (tres copias, dos medios, una fuera del
proveedor principal, destino en Colombia o país de la lista SIC) depende
de Q-06. El valor por defecto aplicado es disco local intercambiable, sin
SDK propietario. El operador elige el directorio o el adaptador; el código
no asume un proveedor.

## Volcado en claro

El script crea el SQL en un directorio de trabajo `0700`, con el archivo en
modo `0600`. Después de cifrar lo sobrescribe y lo borra, también si el
cifrado falla. No imprime el SQL, la clave ni la URL. El registro y la
tabla `respaldos` guardan id, tamaño, hash SHA-256 del archivo cifrado,
destino y resultado.

## Cómo correrlo

Desde `web/`, con el cliente PostgreSQL 16 en `PATH` (`pg_dump` y `psql`,
licencia PostgreSQL; ver `docs/infra/HERRAMIENTAS.md`):

```bash
export APP_ENV=pruebas
export DATABASE_URL_RESPALDO="$DATABASE_URL_TEST"
export BACKUP_KEY="$(openssl rand -base64 32)"
export BACKUP_DIR=/var/respaldos/optisaas   # fuera del repositorio
npm run backup:run
npm run backup:restore-test
```

`backup:restore-test` imprime `resultado=OK` y `coinciden=true` cuando los
conteos y el hash de la cadena de auditoría coinciden. La base
`optisaas_restauracion_<hex>` no debe quedar creada.

Para recuperar un archivo a un SQL en claro, en una máquina controlada:

```bash
node scripts/respaldo.mjs descifrar /ruta/respaldo.enc /ruta/volcado.sql
```

La salida queda en modo `0600`. Bórrela cuando termine la restauración
manual. Restaurar encima de la base primaria no es un comando de este
módulo: el operador crea una base vacía y usa `psql` con la credencial de
administración.

## Integridad

El sobre es el de T11 (`OPT1`, AES-256-GCM). Alterar un byte o usar otra
clave hace fallar la etiqueta. `backup:run` también vuelve a abrir el
sobre y compara el hash del plano antes de publicar el archivo.

## Programa

La ficha pide un respaldo lógico diario. El cron del sistema no es
dependencia de código (Q-09) y no se versiona una programación con un RPO
numérico. Cuando Q-07 tenga valor, el operador escribe el cron; hasta
entonces el campo sigue vacío.
