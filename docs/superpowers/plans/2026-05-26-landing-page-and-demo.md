# OptiSaaS Landing Page and Interactive Flow Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a high-converting, independent marketing landing page with an interactive operation flow tour (mini-mock screens) for OptiSaaS v3.0, showcasing end-to-end optics shop processes.

**Architecture:** A completely static, independent set of HTML, CSS, and JS files located at the project root. The interactive demo features an HTML browser/device mockup frame displaying custom, responsive, stylized sub-views that dynamically switch on step selection with micro-animations.

**Tech Stack:** HTML5, CSS3 (Vanilla, custom custom variables, glassmorphic styles), JavaScript (ES6 Vanilla).

---

## Proposed File Structure

*   `d:\OPTICAS\index.html` - Semantics, layout structures, and mock screen HTML layouts.
*   `d:\OPTICAS\landing.css` - Design system colors (HSL based), resets, typography (Outfit & Inter), glassmorphism, responsive grid layout, and layout styles.
*   `d:\OPTICAS\landing.js` - Tab switching logic, dynamic progress bar highlighting, light/dark mode toggling, and input simulation for the steps.

---

### Task 1: Foundation and Styling System

**Files:**
- Create: `d:\OPTICAS\landing.css`

- [ ] **Step 1: Set up HSL Design Tokens (Dark & Light) and Resets**
  Add the core layout resets, scroll behavior, custom typography (import Outfit and Inter from Google Fonts), and the central theme variables (cyan accents, slate backgrounds).
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');

  :root {
      --font-title: 'Outfit', sans-serif;
      --font-body: 'Inter', sans-serif;
      
      /* Light Mode Palette */
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f5f9;
      --border-color: #e2e8f0;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --accent-primary: #0284c7;
      --accent-secondary: #7c3aed;
      --accent-glow: rgba(2, 132, 199, 0.15);
      --card-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
      --glass-bg: rgba(255, 255, 255, 0.7);
      --glass-border: rgba(255, 255, 255, 0.6);
  }

  [data-theme="dark"] {
      /* Dark Mode Palette */
      --bg-primary: #0b0f19;
      --bg-secondary: #131a26;
      --bg-tertiary: #1b2436;
      --border-color: #263147;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-primary: #00d2ff;
      --accent-secondary: #8a2be2;
      --accent-glow: rgba(0, 210, 255, 0.25);
      --card-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      --glass-bg: rgba(19, 26, 38, 0.7);
      --glass-border: rgba(255, 255, 255, 0.05);
  }

  * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  }

  body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-body);
      line-height: 1.6;
      overflow-x: hidden;
  }
  ```

- [ ] **Step 2: Verify typography and colors loading**
  Inspect locally to confirm custom variables are defined and body styles apply.

---

### Task 2: Landing Skeleton, Header, and Hero Section

**Files:**
- Create: `d:\OPTICAS\index.html`
- Modify: `d:\OPTICAS\landing.css`

- [ ] **Step 1: Set up HTML boilerplate and Navbar**
  Create basic structure in `index.html` with a modern floating navbar containing the brand logo, link items, dark mode trigger, and Call to Action.
  ```html
  <!DOCTYPE html>
  <html lang="es" data-theme="dark">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OptiSaaS | Control total para tu Óptica moderna</title>
      <meta name="description" content="Gestiona historias clínicas, agenda, ventas, facturación y asegura el cumplimiento con la Secretaría de Salud e INVIMA.">
      <link rel="stylesheet" href="landing.css">
  </head>
  <body>
      <!-- Navigation -->
      <header class="navbar">
          <div class="nav-container">
              <a href="#" class="logo">
                  <span class="logo-icon">👁️</span>
                  <span class="logo-text">Opti<span>SaaS</span></span>
              </a>
              <nav class="nav-links">
                  <a href="#features">Características</a>
                  <a href="#demo">Flujo Operativo</a>
                  <a href="#compliance">Cumplimiento</a>
                  <a href="#pricing">Planes</a>
              </nav>
              <div class="nav-actions">
                  <button id="theme-toggle" class="theme-btn" aria-label="Cambiar Tema">🌙</button>
                  <a href="#contact" class="btn btn-primary">Solicitar Demo</a>
              </div>
          </div>
      </header>
  ```

- [ ] **Step 2: Add Hero Section to HTML**
  Insert the Hero header, tagline, CTAs, and a container for the visual demo.
  ```html
      <!-- Hero -->
      <section class="hero-section">
          <div class="hero-container">
              <span class="badge-new">✨ Versión 3.0 Enterprise ya disponible</span>
              <h1 class="hero-title">El control total de tu óptica, <span>de la cita a la entrega</span></h1>
              <p class="hero-subtitle">Gestiona historias clínicas especializadas, ventas POS, laboratorios y asegura el cumplimiento ante la Secretaría de Salud y el INVIMA en una sola solución multi-sede.</p>
              <div class="hero-ctas">
                  <a href="#demo" class="btn btn-accent">Ver Flujo en Acción 🚀</a>
                  <a href="#pricing" class="btn btn-secondary">Ver Planes</a>
              </div>
          </div>
      </section>
  ```

- [ ] **Step 3: Add CSS for Header & Hero**
  Create CSS layouts with flex, CSS grid, hover transitions, gradients for titles, and dark mode overrides.

---

### Task 3: Interactive Demo Frame & Layout Setup

**Files:**
- Modify: `d:\OPTICAS\index.html`
- Modify: `d:\OPTICAS\landing.css`
- Create: `d:\OPTICAS\landing.js`

- [ ] **Step 1: Create Demo Section & Laptop device container**
  Define the wrapper for the step-by-step tour, including the timeline of the 7 steps (Registration to Delivery) and the desktop device mockup.
  ```html
      <section id="demo" class="demo-section">
          <div class="section-header">
              <h2>Demo Operativo Interactivo</h2>
              <p>Sigue el flujo de trabajo completo que realiza tu óptica todos los días de manera integrada.</p>
          </div>
          <div class="steps-progress-container">
              <div class="steps-progress-bar">
                  <div class="step-node active" data-step="1">
                      <div class="step-number">1</div>
                      <div class="step-label">Registro</div>
                  </div>
                  <!-- Steps 2 to 7 go here -->
              </div>
          </div>
          <div class="device-mockup">
              <div class="device-header">
                  <div class="device-dots">
                      <span></span><span></span><span></span>
                  </div>
                  <div class="device-address-bar">https://app.optisaas.com/dashboard</div>
              </div>
              <div class="device-screen" id="demo-screen-content">
                  <!-- Simulated screen content loads here -->
              </div>
              <div class="device-controls">
                  <button id="prev-step" class="btn-ctrl" disabled>← Anterior</button>
                  <span id="step-indicator">Paso 1 de 7</span>
                  <button id="next-step" class="btn-ctrl">Siguiente →</button>
              </div>
          </div>
      </section>
  ```

- [ ] **Step 2: Add CSS for the Laptop Mockup and step items**
  Add styles for the glassmorphic address bar, browser shadow depth, and active step lines.

- [ ] **Step 3: Setup basic JavaScript controller**
  Create the structure in `landing.js` to manage the active step index (1-7), handle theme toggle, and load screens.

---

### Task 4: Implement Demo Screens 1 - 4

**Files:**
- Modify: `d:\OPTICAS\index.html`
- Modify: `d:\OPTICAS\landing.css`
- Modify: `d:\OPTICAS\landing.js`

- [ ] **Step 1: Code HTML templates for screens 1 (Registro) & 2 (Consulta)**
  Create UI components:
  - Screen 1: Calendar list of patients with badges like "Esperando", and quick registration form.
  - Screen 2: Optometrist EHR with fields for Sph, Cyl, Axis, Add for OD and OS, and refraction notes.
  Embed these directly as hidden template layouts inside `index.html` or script templates.

- [ ] **Step 2: Code HTML templates for screens 3 (Venta POS) & 4 (Facturación)**
  Create UI layouts:
  - Screen 3: Interactive product selection list showing frames ("Ray-Ban Aviator", "Oakley Sport"), lenses type ("Antirreflejo Blue"), and pricing calculator.
  - Screen 4: Invoice mockup showing Electronic Invoice details, subtotal, 19% IVA, dynamic balance due, and payment splits.

- [ ] **Step 3: Add specific CSS styles for UI layout blocks inside the screens**
  Include grid formulas, invoice cards, receipt summaries, and EHR fields.

---

### Task 5: Implement Demo Screens 5 - 7

**Files:**
- Modify: `d:\OPTICAS\index.html`
- Modify: `d:\OPTICAS\landing.css`
- Modify: `d:\OPTICAS\landing.js`

- [ ] **Step 1: Code HTML templates for screens 5 (Laboratorio) & 6 (Sec. Salud)**
  Create UI layouts:
  - Screen 5: Lab tracking Kanban cards showing "Recibido", "En Corte", "Biselado", "Montado", "Entrega".
  - Screen 6: Special Inspection Checklist displaying: Habilitación ID check, Equipment Calibration logs, Device traceability records, and Audit success score.

- [ ] **Step 2: Code HTML template for screen 7 (Entrega)**
  Create UI layout:
  - Screen 7: Satisfaction check-list, delivery details, and a canvas-styled signatures container for customer acceptance.

- [ ] **Step 3: Finalize screen rendering function in JavaScript**
  Update `landing.js` to switch display of the active template inside `#demo-screen-content` with a CSS opacity fade transition.

---

### Task 6: Bento Features, Pricing, and Footer Sections

**Files:**
- Modify: `d:\OPTICAS\index.html`
- Modify: `d:\OPTICAS\landing.css`

- [ ] **Step 1: Add Features Section (Bento Grid) in HTML & CSS**
  Implement the key cards layout showing control panels, analytics charts, encrypted patient data.

- [ ] **Step 2: Add Pricing Cards and Contact in HTML & CSS**
  Build three pricing cards: Emprendedor, Clínico, and Multi-Sede Enterprise. Style with shadows, card glow effects, and buttons. Add simple footer with copyright and email subscription input.

---

### Task 7: Theme Switcher & Animation Polish

**Files:**
- Modify: `d:\OPTICAS\landing.js`
- Modify: `d:\OPTICAS\landing.css`

- [ ] **Step 1: Implement Theme Switcher**
  Add state-saving logic to `localStorage` so client selection persists across page refresh, and toggle appropriate attributes on the root `<html>`.
  ```javascript
  const toggleBtn = document.getElementById('theme-toggle');
  
  toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      toggleBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
  });
  ```

- [ ] **Step 2: Add CSS micro-interactions and scroll behavior**
  Set up smooth scrolling, slide transitions on step nodes, active glows, and responsive media queries.

- [ ] **Step 3: Manual Verification and Testing**
  Confirm page is readable in light and dark modes, checks that the steps change correctly, transitions are smooth, and the layouts are fully responsive.
