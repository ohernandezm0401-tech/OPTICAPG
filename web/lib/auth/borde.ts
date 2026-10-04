// SEG-01 (T07) — Configuración de Auth.js compatible con el middleware.
// No importa PostgreSQL ni Argon2: el middleware solo decodifica el JWT.
// La vigencia en base la comprueba `GET /api/auth/vigencia` (Node).
// Auth.js v5 sigue en beta: `next-auth@5.0.0-beta.31` (ISC).
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { MINUTOS_JWT } from './bloqueo';

const MINUTO = 60;

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: MINUTOS_JWT * MINUTO,
    // Reemite el JWT durante la sesión sin cambiar el id de servidor.
    updateAge: 5 * MINUTO,
  },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      // El inicio real está en `lib/auth.ts` (Node). Aquí no se autentica.
      authorize: async () => null,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.empresaId = user.empresaId;
        token.sedeId = user.sedeId;
        token.role = user.role;
        token.sedesAccess = user.sedesAccess ?? [];
        token.rolesPorSede = user.rolesPorSede ?? {};
        token.sesionId = user.sesionId;
        token.devLocal = user.devLocal === true;
        token.sub = user.id;
      }
      if (trigger === 'update' && typeof session?.sedeId === 'string') {
        const allowed = Array.isArray(token.sedesAccess) ? token.sedesAccess : [];
        if (allowed.includes(session.sedeId)) {
          token.sedeId = session.sedeId;
          const mapa = token.rolesPorSede;
          const sedePedida = session.sedeId;
          if (mapa && typeof mapa === 'object' && typeof sedePedida === 'string') {
            const rol = (mapa as Record<string, unknown>)[sedePedida];
            if (typeof rol === 'string') token.role = rol;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.sub as string) ?? '';
        session.user.empresaId = (token.empresaId as string) ?? '';
        session.user.sedeId = (token.sedeId as string) ?? '';
        session.user.role = (token.role as string) ?? '';
        session.user.sedesAccess = Array.isArray(token.sedesAccess) ? token.sedesAccess : [];
        session.user.sesionId = typeof token.sesionId === 'string' ? token.sesionId : undefined;
        session.user.devLocal = token.devLocal === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
