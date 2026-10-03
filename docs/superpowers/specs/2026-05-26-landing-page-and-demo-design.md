# Especificación de Diseño: Landing Page Independiente y Demo Visual de OptiSaaS v3.0

Esta especificación detalla el diseño, la estructura y el comportamiento de la landing page independiente de OptiSaaS v3.0 y su demo operativo simulado en HTML, CSS y JavaScript vainilla.

## 1. Objetivos del Proyecto

*   **Atraer Clientes**: Presentar OptiSaaS como la solución definitiva y moderna para la gestión de ópticas.
*   **Demostrar Flujo de Operación**: Crear un demo visual interactivo (carrusel de pasos) que simule las pantallas clave del software, guiando al usuario por todo el flujo de trabajo de la óptica de principio a fin.
*   **Destacar Cumplimiento Regulatorio**: Visibilizar el control de habilitación para la Secretaría de Salud y la trazabilidad de dispositivos médicos (INVIMA).
*   **Asegurar Independencia**: La landing y el demo deben funcionar sin backend, de manera auto-contenida (archivos `index.html`, `landing.css`, `landing.js`) y con soporte responsive y Dark/Light mode.

---

## 2. Arquitectura de Archivos Propuesta

La landing vive en `landing/`, aparte de la app de Next.js en `web/`, para poder desplegarla sola:

*   `landing/index.html`: Estructura semántica de la landing y maquetas de la aplicación.
*   `landing/landing.css`: Estilos visuales premium, variables CSS, Dark/Light mode y animaciones.
*   `landing/landing.js`: Control del carrusel interactivo, simulación de datos y toggle de tema.

---

## 3. Detalle de Secciones de la Landing Page

### 3.1. Navegación (Header)
*   **Logo**: OptiSaaS con isotipo geométrico moderno.
*   **Enlaces**: Características, Flujo Operativo, Cumplimiento, Precios.
*   **Acciones**: Botón de cambio de tema (Sol/Luna) y botón CTA "Agendar Demo".

### 3.2. Hero Section
*   **Titular**: "El control total de tu óptica, de la cita a la entrega."
*   **Subtitular**: "Gestiona historias clínicas, ventas, laboratorios y asegura el cumplimiento con la Secretaría de Salud en una sola plataforma multi-sede."
*   **Acciones**: Botón principal "Ver Flujo en Acción" (hace scroll al demo) y secundario "Ver Planes".
*   **Estética**: Fondo con gradiente y efecto de brillo radial interactivo.

### 3.3. Demo de Operación (El Tour Interactivo)
Un contenedor que imita un navegador web o laptop.
*   **Barra de Pasos**: 7 botones numerados con labels descriptivos.
*   **Área de Pantalla**: Renderiza la maqueta HTML/CSS correspondiente al paso activo.
*   **Controles**: Botones "Anterior" y "Siguiente" para avanzar paso a paso.

#### Detalles de las 7 Maquetas del Demo (Simuladas con HTML/CSS real):
1.  **Paso 1: Registro**: Interfaz de recepción. Muestra un calendario con citas del día y un formulario para registrar un nuevo paciente.
2.  **Paso 2: Consulta**: Panel clínico del Optómetra. Muestra la historia clínica digital, incluyendo campos de refracción (esfera, cilindro, eje, adición) para Ojo Derecho (OD) y Ojo Izquierdo (OI).
3.  **Paso 3: Venta (POS)**: Panel comercial. Simula la selección de una montura (ej: "Ray-Ban Classic") y lentes formulados, mostrando el cálculo total de venta.
4.  **Paso 4: Facturación**: Detalle de cobro. Visualización de factura simulada, control de abonos (ej: 50% anticipo, 50% contra entrega) y métodos de pago (Efectivo, Tarjeta, Transferencia).
5.  **Paso 5: Laboratorio**: Tablero Kanban que simula el estado de fabricación de los lentes: "Recibido", "En Biselado", "Montaje", "Control de Calidad".
6.  **Paso 6: Secretaría de Salud (Cumplimiento)**: Panel especial de auditoría e inspección. Simula el registro de actas de apertura de cajas de dispositivos, hojas de vida de equipos ópticos y control de vencimiento de reactivos/insumos.
7.  **Paso 7: Entrega**: Pantalla de despacho final. Muestra el check-list de entrega, captura de firma de conformidad digital y registro de satisfacción del paciente.

### 3.4. Características Principales (Bento Grid)
*   **Control Multi-Sede**: Panel consolidado para dueños de múltiples ópticas.
*   **Seguridad**: Encriptación de historias clínicas.
*   **Alertas**: Notificaciones de citas y alertas de inventario.

### 3.5. Sección de Precios
*   **Plan Emprendedor**: Para 1 sede individual y 1 especialista.
*   **Plan Clínico**: Enfocado en consultorios de optometría e historias clínicas.
*   **Plan Multi-Sede Enterprise**: Para cadenas de ópticas con facturación centralizada y múltiples laboratorios.

---

## 4. Diseño Visual y Estilos (landing.css)

*   **Tipografía**: Uso de "Outfit" (Google Fonts) para títulos (moderno y tecnológico) e "Inter" para textos de lectura.
*   **Colores**:
    *   *Modo Oscuro (Por defecto)*: Fondo `#0b0f19` (azul oscuro profundo), tarjetas `#161b26` (gris-azul vidrio), acentos en `#00d2ff` (cyan eléctrico) y `#8a2be2` (morado neon).
    *   *Modo Claro*: Fondo `#f8fafc` (blanco slate), tarjetas `#ffffff` (blanco puro), bordes suaves y sombras elegantes, acentos en `#0284c7` y `#7c3aed`.
*   **Animaciones**: Transiciones de 0.3s en todos los botones y elementos interactivos. Animación de cambio de diapositiva (`fade-in-up`) en el frame del demo al avanzar pasos.

---

## 5. Plan de Verificación

*   **Visual**: Abrir en Google Chrome, Microsoft Edge y navegadores móviles. Verificar que el diseño se adapte a pantallas pequeñas (Mobile Responsive).
*   **Interacción**:
    *   Dar click a cada uno de los 7 pasos en el demo y verificar que cambie la pantalla mostrada.
    *   Probar botones "Siguiente" y "Anterior".
    *   Alternar el botón de Modo Oscuro/Claro y validar la consistencia en el contraste.
