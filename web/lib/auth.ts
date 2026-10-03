import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DEV_ONLY_CREDENTIALS } from './dev-credentials';
import { getUsuarioByEmail } from './mock-data';
import type { Usuario } from './types';

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return false;
  if (url.includes('placeholder') || url.includes('tu-proyecto')) return false;
  if (key.includes('placeholder') || key.includes('tu-anon') || key.includes('tu_anon')) return false;
  return true;
}

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

function authenticateDevUser(email: string, password: string): Usuario | null {
  const expected = DEV_ONLY_CREDENTIALS[email];
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

        if (isSupabaseConfigured()) {
          try {
            const { supabase } = await import('./supabase');
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (!authError && authData.user) {
              const { data: userProfile } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', authData.user.id)
                .single();
              if (userProfile) {
                const { mapUsuarioFromDb } = await import('./supabase-mappers');
                return toAuthUser(mapUsuarioFromDb(userProfile));
              }
            } else if (authError) {
              console.warn('Supabase Auth failed:', authError.message);
            }
          } catch (err) {
            console.error('Error during Supabase Auth validation:', err);
          }
          return null;
        }

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
