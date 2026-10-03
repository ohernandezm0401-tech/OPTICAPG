import type {NextConfig} from 'next';

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
