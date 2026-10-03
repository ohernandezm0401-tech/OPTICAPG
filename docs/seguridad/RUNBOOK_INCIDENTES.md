# Runbook de incidentes de seguridad

Criterio AC-SEG-11-3. El texto de aviso es **BORRADOR – requiere revisión jurídica**.
OptiSaaS no envía nada a la SIC ni a terceros: prepara el borrador y recuerda el plazo.
No escriba datos personales de pacientes en la descripción, el alcance, la causa,
la contención ni el cierre. Solo categorías (credenciales, metadatos de cuenta).

## Roles

| Rol | Qué hace |
|---|---|
| Operación de plataforma (`owner_plataforma`, `soporte_plataforma`) | Registra el incidente, calcula el plazo, contiene, marca las ópticas afectadas y deja constancia de que un humano reportó a la SIC. Usa el rol de base `optisaas_incidente` (sin `BYPASSRLS`). |
| Admin de la óptica | Ve solo los incidentes de su tenant y la notificación interna. No ve otras ópticas. |
| Abogado | Revisa las plantillas antes de que alguien las use fuera del sistema. |
| Humano que reporta | Presenta el reporte a la SIC por el canal que indique el abogado. El sistema no lo transmite. |

## Plazos

- Reporte a la SIC: **15 días hábiles** desde el día de detección en `America/Bogota`.
  Fuente: Circular Única SIC Título V 2.1.f(ii), versión Res. SIC 56579/2025 (spec SEG-11).
  Vive en `parametros_incidente.plazo_sic_dias_habiles`.
- El calendario es el de T06. TODO(Q-32): si no hay festivos cargados, el cálculo
  excluye solo sábados y domingos y la pantalla lo avisa. No hay lista de festivos por defecto.
- Alertas internas al crear el incidente: T-5, T-2 y T-0 (días hábiles antes del límite).
- Aviso a la óptica: TODO(Q-07). El parámetro `plazo_aviso_incidente` del tenant
  no tiene valor. No se presenta un número de horas como obligación legal.

## Pasos

1. **Detectar.** Quien opera la plataforma abre Incidentes de seguridad y registra
   detección, alcance, datos afectados (categorías) y severidad operativa.
   El sistema calcula la fecha límite y crea las alertas T-5, T-2 y T-0.
2. **Contener.** Anote la contención sin nombres, documentos ni correos.
   El estado pasa a `contenido`.
3. **Avisar a la óptica.** Marque los tenants afectados. Cada admin activo recibe
   una notificación **dentro de la aplicación** (no hay correo real). La bitácora
   de T10 guarda, en el tenant afectado, recurso `incidente`, acción `crear`.
   El estado pasa a `notificado_responsable`. La plantilla queda rotulada
   BORRADOR – requiere revisión jurídica.
4. **Preparar el reporte a la SIC.** Copie la plantilla y entréguela al abogado.
   Un humano reporta fuera del sistema. Después registre la fecha en el incidente
   (`reportado_sic`). Eso no envía el texto.
5. **Cerrar.** Cuando la contención y el reporte quedaron hechos, pase a `cerrado`
   con una nota sin datos de pacientes.

## Datos y acceso

- `incidentes` y `alertas_incidente` son de plataforma. `optisaas_app` no las lee.
- `incidentes_tenants` y `notificaciones_internas` tienen `tenant_id`, RLS
  `ENABLE` + `FORCE` y política: el admin solo ve su óptica.
- La aplicación no usa un rol con `BYPASSRLS`.
