# Pendientes antes de producción

La aplicación corre con datos ficticios. Esto es lo que hay que cerrar antes de guardar historias clínicas, fórmulas o cualquier dato de pacientes.

## Secretos y acceso

- Generar un `AUTH_SECRET` nuevo (`openssl rand -base64 32`) y no reutilizar el valor de `.env.example`.
- Borrar el bloque de semilla del owner en `web/supabase_init.sql` antes de ejecutar el script en una base real. La contraseña `owner123` es solo de desarrollo.
- Crear los usuarios en Supabase Auth. Con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` definidas, el login deja de aceptar las cuentas mock.
- Guardar `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor. No usar la clave de servicio en el navegador ni en scripts versionados.
- Quitar el aviso de credenciales: ya está oculto fuera de `npm run dev`, pero el archivo `web/lib/dev-credentials.ts` no debe desplegarse en un build que apunte a datos reales. Conviene eliminarlo o dejarlo detrás de un flag que en producción sea imposible de activar.

## Datos clínicos

- Activar Row Level Security en todas las tablas con datos de pacientes, historias, fórmulas y facturas, y probar que una sede no lee la de otra empresa.
- Dejar de persistir historias, pacientes y bitácoras en `localStorage`. Hoy varios módulos de cumplimiento se guardan en el navegador.
- Cifrar copias de seguridad y definir retención, acceso y borrado según la Ley 1581 de 2012 (habeas data) y la normativa de historia clínica (Resolución 1995 de 1999 y habilitación, Resolución 3100 de 2019).
- Registrar consentimiento, auditoría de lectura y escritura, y el bloqueo de la historia pasadas 24 horas. La interfaz lo menciona; la base todavía no lo impone.
- No tratar los CUFE, RIPS ni los conceptos de Secretaría de Salud de la demo como documentos válidos. La facturación DIAN y el reporte RIPS están simulados.
- Firmar un acuerdo de tratamiento de datos con quien aloje la base (Supabase u otro PostgreSQL) y restringir el acceso del equipo a producción.
- Revisar los endpoints `/api/owner/*` y `/api/facturacion` con una sesión real: hoy el modo mock responde sin escribir en una base.

## Producto que sigue en demo

- Los paneles de admin, asesor y optómetra ya están en `web/app/dashboard`. Parte de la UI sigue armada dentro de la página en lugar de los componentes sueltos que proponía `docs/implementation_plan.md`.
- El cambio de sede actualiza la sesión y los tableros principales. Algunas pantallas internas todavía no filtran cada lista por la sede activa.
- No hay pasarela de pago real. Los botones de Stripe son una simulación.
- `npm run build` de producción no muestra las contraseñas de prueba en el login. Siguen existiendo en el código de desarrollo hasta que se retire `dev-credentials.ts`.
