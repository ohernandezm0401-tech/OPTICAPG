# OptiSaaS v3.0 — Arquitectura Progresiva, Multi-Tenant y Sostenible

Transformar OptiSaaS de un prototipo monolítico en una plataforma **multi-empresa, multi-sede** con autenticación real, arquitectura modular y diseño visual premium.

## Decisiones Confirmadas

| Pregunta | Respuesta |
|----------|-----------|
| ¿API Gemini? | ❌ No. Datos mock puros |
| ¿Multi-sede? | ✅ Sí. Modelo **Empresa → Sede → Usuario** |
| ¿Autenticación? | ✅ Real. NextAuth.js v5 con credentials |

---

## Modelo de Datos Multi-Tenant

```
┌─────────────────────────────────────┐
│           EMPRESA (Company)          │
│  id, nombre, nit, logo, plan        │
│  ej: "Ópticas Visión Total S.A.S"   │
├─────────────────────────────────────┤
│         SEDE (Branch/Location)       │
│  id, empresaId, nombre, ciudad,     │
│  direccion, habilitacionSalud,      │
│  estado                             │
│  ej: "Sucursal Norte - Bogotá"      │
├─────────────────────────────────────┤
│         USUARIO (User)              │
│  id, empresaId, sedeId, nombre,     │
│  email, role, registroMedico?       │
│  ej: "Dr. Andrés Vega" (admin)      │
└─────────────────────────────────────┘
```

**Relaciones:**
- 1 Empresa tiene N Sedes
- 1 Sede tiene N Usuarios
- 1 Usuario pertenece a 1 Empresa y puede acceder a N Sedes (según permisos)
- El Admin puede ver todas las sedes de su empresa
- El Asesor/Optómetra ve solo su sede asignada

---

## Autenticación: NextAuth.js v5 (Auth.js)

> [!IMPORTANT]
> Usaremos **NextAuth.js v5** (el nuevo `Auth.js`) con `CredentialsProvider`. Esto es 100% auto-hospedado, sin dependencia de terceros. Se configura con datos mock inicialmente pero la interfaz está lista para conectar a cualquier DB real (Postgres, Supabase, Firebase, etc.).

**Flujo de autenticación:**
1. **Login Page** → `/login` — email + password, diseño premium con branding OptiSaaS
2. **Session** → JWT con `{ userId, empresaId, sedeId, role }` embebido
3. **Middleware** → Protege todas las rutas `/dashboard/*` — redirige a `/login` si no hay sesión
4. **Role Guard** → Componente que verifica `role` para cada sección

**Usuarios mock para desarrollo:**

| Email | Password | Empresa | Sede | Rol |
|-------|----------|---------|------|-----|
| admin@visiontotal.com | admin123 | Ópticas Visión Total | Norte - Bogotá | admin |
| carlos@visiontotal.com | asesor123 | Ópticas Visión Total | Norte - Bogotá | asesor |
| dra.vega@visiontotal.com | opto123 | Ópticas Visión Total | Norte - Bogotá | optometra |
| admin@opticentro.com | admin123 | OptiCentro Express | Centro - Medellín | admin |

---

## Proposed Changes

### Fase 1: Infraestructura Base (Cimientos)

---

#### 1.1 Design System — Tokens CSS

##### [MODIFY] [globals.css](file:///d:/OPTICAS/zip_extracted/app/globals.css)

Sistema completo de design tokens con soporte dark mode. Variables HSL para toda la paleta, tipografía, espaciado, sombras, y transiciones. El archivo pasa de 2 líneas a ~120 líneas de tokens CSS.

---

#### 1.2 Tipos TypeScript — Data Layer Multi-Tenant

##### [NEW] lib/types.ts

Tipos para todo el modelo de datos:
- `Empresa`, `Sede`, `Usuario`, `Role`
- `Paciente`, `Cita`, `Orden`, `Alerta`
- `StatusType`, `NavItem`, `SessionUser`
- Tipos de sesión extendidos para NextAuth

---

#### 1.3 Datos Mock

##### [NEW] lib/mock-data.ts

Base de datos simulada con:
- 2 empresas, 3 sedes, 4 usuarios
- Citas, pacientes, alertas, órdenes por sede
- Funciones helper: `getEmpresaById()`, `getSedesByEmpresa()`, `getCitasBySede()`, etc.
- Diseñado para ser reemplazado 1:1 por llamadas a DB real

---

#### 1.4 Configuración de Navegación

##### [NEW] lib/navigation.ts

Mapa de navegación por rol con iconos, labels, y hrefs:
```typescript
export const NAV_CONFIG: Record<Role, NavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard General', href: '/dashboard/admin' },
    { icon: Calendar, label: 'Agenda Global', href: '/dashboard/admin/agenda' },
    // ...
  ],
  asesor: [...],
  optometra: [...]
};
```

---

### Fase 2: Autenticación

---

#### 2.1 NextAuth.js v5

##### [NEW] lib/auth.ts

Configuración central de NextAuth con:
- `CredentialsProvider` con validación contra mock-data
- Session callback que inyecta `empresaId`, `sedeId`, `role`
- JWT strategy (no DB sessions necesarias aún)

##### [NEW] app/api/auth/[...nextauth]/route.ts

Route handler de NextAuth.

##### [NEW] middleware.ts

Middleware de Next.js que:
- Protege todas las rutas bajo `/dashboard/*`
- Redirige a `/login` si no hay sesión
- Permite acceso libre a `/login` y assets estáticos

---

#### 2.2 Login Page

##### [NEW] app/login/page.tsx

Página de login con:
- Diseño premium full-screen con split layout (branding izquierda, form derecha)
- Glassmorphism card para el formulario
- Animaciones de entrada con Motion
- Validación en tiempo real
- Error states con feedback visual
- Logo y branding OptiSaaS
- Versión dark mode

---

#### 2.3 Auth Provider

##### [NEW] components/providers/auth-provider.tsx

SessionProvider de NextAuth envolviendo toda la app.

##### [NEW] components/providers/theme-provider.tsx

ThemeProvider de next-themes para dark/light mode.

##### [MODIFY] [layout.tsx](file:///d:/OPTICAS/zip_extracted/app/layout.tsx)

Envolver `children` con AuthProvider + ThemeProvider.

---

### Fase 3: Layout Dashboard Modular

---

#### 3.1 Shell del Dashboard

##### [NEW] app/(dashboard)/layout.tsx

Layout compartido para todas las rutas de dashboard:
- Grid `sidebar | main content`
- Carga la sesión del usuario
- Pasa datos de empresa/sede al sidebar y header
- Responsive: sidebar colapsable en móvil

---

#### 3.2 Sidebar

##### [NEW] components/layout/sidebar.tsx

Sidebar modular:
- Logo de empresa (dinámico)
- Navegación por rol (de `navigation.ts`)
- Indicador de página activa con animación slide
- Selector de sede (si el usuario tiene acceso a múltiples)
- Info del usuario en footer del sidebar
- Colapsable a iconos con transición suave
- Dark mode automático

---

#### 3.3 Header

##### [NEW] components/layout/header.tsx

Header con:
- Nombre de sede actual + badges de estado (Habilitación, INVIMA)
- Toggle dark/light mode (icono sol/luna con rotate animation)
- Botón de acción principal ("Nuevo Paciente" / "Nueva Atención")
- Avatar del usuario con dropdown (perfil, cambiar sede, cerrar sesión)
- Glassmorphism backdrop

---

#### 3.4 Footer

##### [NEW] components/layout/footer.tsx

Footer con estado del sistema, facturación, habilitación.

---

### Fase 4: Componentes Compartidos Reutilizables

---

##### [NEW] components/shared/status-badge.tsx
Badge con variantes via CVA: `vigente`, `pendiente`, `urgente`, `lista`, `confirmado`, etc. Soporte dark mode.

##### [NEW] components/shared/stat-card.tsx
Tarjeta de estadística con número grande, label, trend (↑12%), y animación de contador al entrar.

##### [NEW] components/shared/alert-card.tsx
Alerta con borde lateral coloreado por tipo (warning/danger/info), icono, y contenido.

##### [NEW] components/shared/progress-bar.tsx
Barra de progreso con animación de fill, porcentaje, y label.

##### [NEW] components/shared/data-table.tsx
Tabla genérica tipada con headers, rows, hover effect, y responsive scroll.

##### [NEW] components/shared/card-container.tsx
Wrapper de card con sombra, hover lift effect, y header con título.

##### [NEW] components/shared/page-header.tsx
Header de página con título, subtítulo, y breadcrumbs.

---

### Fase 5: Páginas por Rol

---

#### 5.1 Admin Dashboard

##### [NEW] app/(dashboard)/admin/page.tsx
Orquestador que compone: AgendaGlobal + DispensaINVIMA + CumplimientoPanel + PromocionesPanel + VentasPOS + AlertasRegulatorias

##### [NEW] components/admin/agenda-global.tsx
##### [NEW] components/admin/dispensa-invima.tsx
##### [NEW] components/admin/cumplimiento-panel.tsx
##### [NEW] components/admin/promociones-panel.tsx

---

#### 5.2 Asesor Dashboard

##### [NEW] app/(dashboard)/asesor/page.tsx
Orquestador que compone: PacientesTabla + EntregasPanel + CajaPanel + VentasPOS + AlertasComerciales

##### [NEW] components/asesor/pacientes-tabla.tsx
##### [NEW] components/asesor/entregas-panel.tsx
##### [NEW] components/asesor/caja-panel.tsx

---

#### 5.3 Optómetra Dashboard

##### [NEW] app/(dashboard)/optometra/page.tsx
Orquestador que compone: AgendaClinica + SugerenciaPanel + EstadisticasClinicas + AlertasClinicas

##### [NEW] components/optometra/agenda-clinica.tsx
##### [NEW] components/optometra/sugerencia-panel.tsx

---

### Fase 6: Componentes Ventas y Alertas (Compartidos entre roles)

##### [NEW] components/shared/ventas-panel.tsx
Panel de ventas reutilizado por Admin y Asesor con datos contextualizados por sede.

##### [NEW] components/shared/alertas-panel.tsx
Panel de alertas configurable por tipo (regulatorias, clínicas, comerciales).

---

### Fase 7: Polish y Animaciones

- **Page transitions**: Fade + slide-up via Motion `AnimatePresence`
- **Staggered cards**: Cascade entrance con delay incremental
- **Hover effects**: Cards con lift + shadow-lg
- **Sidebar nav**: Active indicator slide animation
- **Progress bars**: Fill animation on mount
- **Dark mode toggle**: Rotate + scale animation
- **Login**: Gradient background animation + card entrance

---

## Estructura Final de Archivos

```
d:\OPTICAS\zip_extracted\
├── app/
│   ├── globals.css                         # Design tokens
│   ├── layout.tsx                          # Root + Providers
│   ├── page.tsx                            # Redirect → /dashboard o /login
│   ├── login/
│   │   └── page.tsx                        # Login premium
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts                # Auth API
│   └── (dashboard)/
│       ├── layout.tsx                      # Dashboard shell
│       ├── page.tsx                        # Redirect → /dashboard/[role]
│       ├── admin/
│       │   └── page.tsx
│       ├── asesor/
│       │   └── page.tsx
│       └── optometra/
│           └── page.tsx
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── footer.tsx
│   ├── shared/
│   │   ├── status-badge.tsx
│   │   ├── stat-card.tsx
│   │   ├── alert-card.tsx
│   │   ├── progress-bar.tsx
│   │   ├── data-table.tsx
│   │   ├── card-container.tsx
│   │   ├── page-header.tsx
│   │   ├── ventas-panel.tsx
│   │   └── alertas-panel.tsx
│   ├── admin/
│   │   ├── agenda-global.tsx
│   │   ├── dispensa-invima.tsx
│   │   ├── cumplimiento-panel.tsx
│   │   └── promociones-panel.tsx
│   ├── asesor/
│   │   ├── pacientes-tabla.tsx
│   │   ├── entregas-panel.tsx
│   │   └── caja-panel.tsx
│   ├── optometra/
│   │   ├── agenda-clinica.tsx
│   │   └── sugerencia-panel.tsx
│   └── providers/
│       ├── auth-provider.tsx
│       └── theme-provider.tsx
├── hooks/
│   ├── use-mobile.ts
│   └── use-session-user.ts
├── lib/
│   ├── utils.ts
│   ├── types.ts
│   ├── auth.ts
│   ├── mock-data.ts
│   └── navigation.ts
├── middleware.ts
└── ... (configs existentes)
```

**Total: ~35 archivos** (vs 1 monolito actual)

---

## Dependencia Nueva Requerida

```bash
npm install next-auth@beta
```

> [!NOTE]
> Solo 1 dependencia nueva. Todo lo demás (`motion`, `next-themes`, `cva`, `lucide-react`, `recharts`) ya está instalado. `next-auth@beta` es la v5 que funciona nativamente con Next.js 15 App Router.

---

## Verification Plan

### Automated
```bash
npm run build          # TypeScript compila sin errores
npm run lint           # ESLint passes
```

### Browser Testing
1. Abrir `/login` → ver página premium con formulario
2. Login como `admin@visiontotal.com` → redirige a `/dashboard/admin`
3. Login como `carlos@visiontotal.com` → redirige a `/dashboard/asesor`
4. Login como `dra.vega@visiontotal.com` → redirige a `/dashboard/optometra`
5. Verificar toggle dark mode funciona
6. Verificar sidebar muestra navegación correcta por rol
7. Verificar datos de empresa/sede en header
8. Logout → redirige a `/login`
9. Acceder `/dashboard/admin` sin sesión → redirige a `/login`
10. Login como `admin@opticentro.com` → ver datos de empresa diferente

---

## Resumen del Impacto

| Métrica | v2.4 (Actual) | v3.0 (Propuesta) |
|---------|---------------|-------------------|
| Archivos | 1 componente | ~35 archivos modulares |
| Líneas/archivo (max) | 497 | ~80-120 |
| Multi-empresa | ❌ | ✅ |
| Multi-sede | ❌ | ✅ |
| Autenticación | ❌ selector fake | ✅ NextAuth.js real |
| Dark mode | ❌ | ✅ |
| Animaciones | ❌ | ✅ (Motion) |
| TypeScript types | ❌ | ✅ Completos |
| Routing | ❌ | ✅ App Router |
| Componentes reutilizables | 0% | ~70% |
| Sostenibilidad | ⚠️ Frágil | ✅ Enterprise-ready |
