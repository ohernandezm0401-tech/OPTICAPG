import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getUsuarioByEmail } from './mock-data';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        let user: any = null;
        try {
          const { supabase } = await import('./supabase');
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          if (!authError && authData.user) {
            const { data: userProfile } = await supabase.from('usuarios').select('*').eq('id', authData.user.id).single();
            if (userProfile) {
              const { mapUsuarioFromDb } = await import('./supabase-mappers');
              user = mapUsuarioFromDb(userProfile);
            }
          } else {
            console.warn('Supabase Auth failed:', authError?.message);
          }
        } catch (err) {
          console.error('Error during Supabase Auth validation:', err);
        }

        
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.nombre,
            empresaId: user.empresaId,
            sedeId: user.sedesAccess && user.sedesAccess.length > 0 ? user.sedesAccess[0] : 'sede1',
            role: user.role
          };
        }
        return null;
      }
    })
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
      }
      
      // Handle sede switch
      if (trigger === "update" && session?.sedeId) {
        token.sedeId = session.sedeId;
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
    }
  }
});
