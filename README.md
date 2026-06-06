# OptiSaaS v3.0 — Plataforma Modular Multi-Tenant para Gestión de Ópticas

Una solución SaaS empresarial avanzada y progresiva diseñada específicamente para el sector óptico. Esta plataforma facilita la gestión de múltiples empresas (empresas matrices), sedes (sucursales) y usuarios con permisos basados en roles específicos (Administrador, Asesor de Ventas y Optómetra), ofreciendo una interfaz de usuario premium, responsiva y con soporte nativo de modo oscuro.

---

## 🚀 Características Clave

### 🏢 Arquitectura Multi-Tenant & Multi-Sede
Estructura de datos robusta de tres niveles: **Empresa ➔ Sede (Sucursal) ➔ Usuario**.
* **Administración Global:** Los administradores pueden visualizar la analítica general, gestionar inventario global y supervisar todas las sedes.
* **Aislamiento de Datos por Sede:** Los asesores y optómetras operan bajo el contexto y los datos específicos de su sede asignada.
* **Cambio Dinámico:** Soporte para usuarios con acceso a múltiples sedes con actualización instantánea de datos y métricas en el header del sistema.

### 🔐 Autenticación y Control de Acceso
Seguridad moderna implementada con **NextAuth.js v5 (Auth.js)**:
* Acceso protegido por middleware en rutas de `/dashboard/*`.
* Redirección inteligente basada en el rol del usuario (`admin`, `asesor`, `optometra`).
* Seguridad basada en JSON Web Tokens (JWT) extendidos con metadatos contextuales (`empresaId`, `sedeId`, `role`).

### 📊 Paneles de Control Especializados por Rol

#### 1. Panel de Administración (Admin)
* **Agenda Global:** Gestión del flujo de citas para todas las sedes de la empresa.
* **Control Regulador (Dispensa INVIMA / Secretaría de Salud):** Monitoreo de cumplimiento normativo y habilitaciones de salud de las sucursales.
* **POS & Ventas:** Analítica en tiempo real de ingresos por sede, cumplimiento de metas comerciales y campañas promocionales activas.

#### 2. Panel de Asesor de Ventas (Asesor)
* **Punto de Venta (POS):** Facturación rápida y generación de documentos equivalentes.
* **Gestión de Entregas:** Seguimiento de estados de laboratorios y despachos de lentes y monturas.
* **Control de Caja:** Apertura, arqueo y cierres de caja diaria de la sede asignada.

#### 3. Panel Clínico (Optómetra)
* **Agenda Clínica:** Visualización de turnos y pacientes programados para el día.
* **Historia Clínica Completa:** Formularios especializados para refracción, salud ocular y adaptación de lentes de contacto.
* **Sugeridor de Fórmulas:** Ayuda automatizada basada en inventario y perfiles clínicos.

---

## 🛠️ Stack Tecnológico

* **Framework:** Next.js 15 (App Router, React 19)
* **Estilizado:** Tailwind CSS + CSS Variables (Design System centralizado en HSL)
* **Autenticación:** NextAuth.js v5 (Auth.js Beta)
* **Animaciones:** Framer Motion (transiciones suaves de páginas y micro-interacciones)
* **Base de Datos & Backend:** SQL Schema listo para PostgreSQL / Supabase
* **Gráficos:** Recharts para la visualización de analíticas y ventas
* **Lenguaje:** TypeScript para tipado estricto de punta a punta

---

## 📂 Estructura del Proyecto

El código fuente del desarrollo Next.js se encuentra en el directorio [`zip_extracted`](file:///d:/OPTICAS/zip_extracted/):

```text
d:/OPTICAS/zip_extracted/
├── app/
│   ├── globals.css                       # Tokens de diseño (Variables HSL)
│   ├── layout.tsx                        # Proveedores globales (Temas y Autenticación)
│   ├── page.tsx                          # Redirección raíz
│   ├── login/
│   │   └── page.tsx                      # Login screen premium con split layout
│   └── (dashboard)/
│       ├── layout.tsx                    # Shell del Dashboard (Sidebar + Header + Contenedor)
│       ├── page.tsx                      # Guardia de redirección de roles
│       ├── admin/                        # Rutas y vistas para el rol de Admin
│       ├── asesor/                       # Rutas y vistas para el rol de Asesor
│       └── optometra/                    # Rutas y vistas para el rol de Optómetra
├── components/
│   ├── layout/                           # Componentes estructurales (Sidebar, Header, Footer)
│   ├── shared/                           # UI reutilizable (Tablas, Cards, Ventas, Alertas)
│   └── providers/                        # SessionProvider y ThemeProvider
├── hooks/                                # Custom React hooks (use-mobile, use-session)
├── lib/
│   ├── auth.ts                           # Configuración y callbacks de NextAuth.js
│   ├── mock-data.ts                      # Datos mock detallados (pacientes, citas, sedes, facturas)
│   ├── types.ts                          # Interfaces y enums de TypeScript
│   └── utils.ts                          # Helpers utilitarios (Tailwind merge y CVA)
├── middleware.ts                         # Middleware de seguridad para rutas del Dashboard
└── supabase_init.sql                     # Script de inicialización de Base de Datos para Supabase/PostgreSQL
```

---

## 💻 Instalación y Configuración Local

### Prerrequisitos
* Node.js (v18 o superior recomendado)
* npm o yarn

### Pasos para iniciar el entorno de desarrollo

1. **Navegar al directorio del proyecto:**
   ```bash
   cd zip_extracted
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Crea un archivo `.env.local` tomando como base el archivo `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Configura las variables necesarias, incluyendo `NEXTAUTH_SECRET` para firmar las cookies de sesión de forma segura.

4. **Inicializar la Base de Datos (Opcional):**
   Si deseas utilizar una base de datos real en lugar de los datos simulados por defecto, ejecuta el script SQL [`supabase_init.sql`](file:///d:/OPTICAS/zip_extracted/supabase_init.sql) en tu instancia de Supabase o PostgreSQL.

5. **Correr el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

---

## 👥 Credenciales de Prueba (Entorno de Desarrollo)

Para facilitar las pruebas de flujo multi-tenant y multi-rol, puedes iniciar sesión utilizando las siguientes credenciales mock:

| Email | Contraseña | Empresa asignada | Rol |
| :--- | :--- | :--- | :--- |
| `admin@visiontotal.com` | `admin123` | Ópticas Visión Total | **Administrador** |
| `carlos@visiontotal.com` | `asesor123` | Ópticas Visión Total | **Asesor de Ventas** |
| `dra.vega@visiontotal.com` | `opto123` | Ópticas Visión Total | **Optómetra** |
| `admin@opticentro.com` | `admin123` | OptiCentro Express | **Administrador (Empresa 2)** |
