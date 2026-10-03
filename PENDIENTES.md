# Pendientes antes de producción

La aplicación corre con datos ficticios. Esto es lo que hay que cerrar antes de guardar historias clínicas, fórmulas o cualquier dato de pacientes.

## Secretos y acceso

- Generar un `AUTH_SECRET` nuevo (`openssl rand -base64 32`) y no reutilizar el valor de `.env.example`. Con `APP_ENV=produccion` el arranque aborta si sigue el valor de ejemplo (ver `docs/ENTORNOS.md`).
- Las semillas de desarrollo se retiraron del repo (T05): `web/supabase_init.sql` ya no trae cuentas ni datos ficticios. Para desarrollo use `npm run seed:demo` (datos sintéticos idempotentes) y `npm run seed:dev` (cuentas locales con contraseñas aleatorias).
- Crear los usuarios en Supabase Auth. Con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` definidas, el login deja de aceptar las cuentas de demostración.
- Guardar `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor. No usar la clave de servicio en el navegador ni en scripts versionados.
- El aviso de credenciales de `/login` solo se muestra con `npm run dev` y ya no incluye contraseñas (T05: las genera `npm run seed:dev` fuera del repo).

## Datos clínicos

- Activar Row Level Security en todas las tablas con datos de pacientes, historias, fórmulas y facturas, y probar que una sede no lee la de otra empresa.
- Dejar de persistir historias, pacientes y bitácoras en `localStorage`. Hoy varios módulos de cumplimiento se guardan en el navegador.
- Cifrar copias de seguridad y definir retención, acceso y borrado según la Ley 1581 de 2012 (habeas data) y la normativa de historia clínica (Resolución 1995 de 1999 y habilitación, Resolución 3100 de 2019).
- Registrar consentimiento (SEG-05) y la historia clínica real (OPT-01). T14 deja la firma electrónica sobre un documento de ejemplo sintético. TODO(Q-22): el PDF no es PDF/A y no hay TSA; el sello es el hash SHA-256 y la hora del servidor.
- No tratar los CUFE, RIPS ni los conceptos de Secretaría de Salud de la demo como documentos válidos. La facturación DIAN y el reporte RIPS están simulados.
- Firmar un acuerdo de tratamiento de datos con quien aloje la base (Supabase u otro PostgreSQL) y restringir el acceso del equipo a producción.
- Revisar los endpoints `/api/owner/*` y `/api/facturacion` con una sesión real: hoy el modo mock responde sin escribir en una base.

## Producto que sigue en demo

- Los paneles de admin, asesor y optómetra ya están en `web/app/dashboard`. Parte de la UI sigue armada dentro de la página en lugar de los componentes sueltos que proponía `docs/implementation_plan.md`.
- El cambio de sede actualiza la sesión y los tableros principales. Algunas pantallas internas todavía no filtran cada lista por la sede activa.
- No hay pasarela de pago real. Los botones de Stripe son una simulación.
- `npm run build` de producción no muestra las contraseñas de prueba en el login. Las cuentas de demostración se retiraron del código en T05 (`npm run seed:dev`).
