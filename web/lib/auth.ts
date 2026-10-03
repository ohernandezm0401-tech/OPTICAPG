import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { cargarCredencialesDesarrollo } from './credenciales-desarrollo';
import { getUsuarioByEmail } from './mock-data';
import { esProduccion } from './entorno';
import { esModoDemo } from './modo';
import type { Usuario } from './types';

function passwordsMatch(provided: string, expected: string) {
  const left = new TextEncoder().encode(provided);
  const right = new TextEncoder().encode(expected);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] || 0) ^ (right[index] || 0);
  }
  return diff === 0;
}

function toAuthUser(user: Usuario) {
  return {
    id: user.id,
    email: user.email,
    name: user.nombre,
    empresaId: user.empresaId,
    sedeId: user.sedesAccess[0] || '',
    role: user.role,
    sedesAccess: user.sedesAccess,
  };
}

// PLT-10 (T05) — Las cuentas de demostración son sintéticas y locales: las
// genera `npm run seed:dev` en un archivo no versionado (ver
// `lib/credenciales-desarrollo.ts`). Nunca existen en producción: el arranque
// con `APP_ENV=produccion` las rechaza (ver `lib/entorno.ts`).
function authenticateDevUser(email: string, password: string): Usuario | null {
  if (esProduccion()) return null;
  const cuentas = cargarCredencialesDesarrollo();
  const expected = cuentas[email];
  if (!expected || !passwordsMatch(password, expected)) return null;
  return getUsuarioByEmail(email) ?? null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || '').trim().toLowerCase();
        const password = String(credentials?.password || '');
        if (!email || !password) return null;

        // T05 autentica contra la tabla `usuarios` de PostgreSQL. Mientras
        // tanto, las cuentas de demostración solo existen con
        // `APP_MODE=demo` (AC-PLT-02-4; ver `lib/modo.ts`) y jamás en
        // producción (AC-PLT-10-1; ver `lib/entorno.ts`).
        if (!esModoDemo()) return null;

        const mockUser = authenticateDevUser(email, password);
        return mockUser ? toAuthUser(mockUser) : null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.empresaId = user.empresaId;
        token.sedeId = user.sedeId;
        token.role = user.role;
        token.sedesAccess = user.sedesAccess || [];
      }

      if (trigger === 'update' && typeof session?.sedeId === 'string') {
        const allowed = Array.isArray(token.sedesAccess) ? token.sedesAccess : [];
        if (allowed.includes(session.sedeId)) {
          token.sedeId = session.sedeId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.empresaId = token.empresaId as string;
        session.user.sedeId = token.sedeId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
