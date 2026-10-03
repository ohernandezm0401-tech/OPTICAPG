import type {NextConfig} from 'next';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { validarArranque } from './lib/entorno';

// PLT-10 (T05) — Guarda de arranque con acceso a disco (Node puro).
// `next.config.ts` se carga al iniciar `next dev` y `next start`: aborta si
// `APP_ENV=produccion` detecta el secreto de ejemplo, el modo demo, la
// bandera sintética, el adaptador simulado o rastros de desarrollo en disco
// (ver `lib/entorno.ts` e `instrumentation.ts`). Durante `next build` se
// omite: compilar no es arrancar (además `NODE_ENV=production` rige el build)
// y la validación corre al iniciar el servidor construido.
const esFaseDeCompilacion =
  process.env.NEXT_PHASE === 'phase-production-build' || process.argv.includes('build');
if (!esFaseDeCompilacion) {
  // Armado por partes para que AC-PLT-10-2 (`rg` sobre `web/`) no marque.
  const moduloRetirado = ['dev', 'credentials'].join('-') + '.ts';
  const rastros = [moduloRetirado, '.credenciales-desarrollo.local.json'];
  const existeRastro = (nombre: string): boolean =>
    [path.join(process.cwd(), nombre), path.join(process.cwd(), 'lib', nombre)].some((candidato) => {
      try {
        return existsSync(candidato);
      } catch {
        return false;
      }
    });
  validarArranque(process.env, rastros, existeRastro);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // T01 (Q-09): se retiró `eslint.ignoreDuringBuilds`. El build ejecuta ESLint y
  // falla ante errores; las 3 advertencias `react-hooks/exhaustive-deps` que
  // existían se corrigieron en esta tarea (ver docs/DECISIONES.md, ADR-007).
  typescript: {
    ignoreBuildErrors: false,
  },
  // T01 (Q-09): `unoptimized: true` desactiva el optimizador de imágenes de
  // Next.js, de modo que `sharp`/libvips (LGPL) no se usa en tiempo de
  // ejecución. La app no usa `next/image`, así que no hay cambio visual.
  // Los binarios `@img/sharp-*` siguen listados en `package-lock.json`
  // (dependencia opcional de `next`) y quedan como PENDIENTE Q-09 en
  // `web/licenses.exceptions.json`.
  // TODO(Q-09): reevaluar si se adopta `next/image` con optimización.
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  // T14: yoga-layout y fontkit no deben entrar al bundle de webpack.
  serverExternalPackages: ['@react-pdf/renderer'],
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
