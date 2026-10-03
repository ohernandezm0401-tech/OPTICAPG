import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { obtenerAuthPort } from './auth/authjs';
import { authConfig } from './auth/borde';
import { permiteCuentasLocales } from './auth/cuentas-locales';
import { cargarCredencialesDesarrollo } from './credenciales-desarrollo';
import { esProduccion } from './entorno';
import { getUsuarioByEmail } from './mock-data';
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
    devLocal: true as const,
  };
}

// Cuentas sintéticas locales (`npm run seed:dev`). Solo `desarrollo` / `demo`
// con modo demo. En `pruebas` y `produccion` no se consultan.
function authenticateDevUser(email: string, password: string): Usuario | null {
  if (esProduccion() || !permiteCuentasLocales()) return null;
  const cuentas = cargarCredencialesDesarrollo();
  const expected = cuentas[email];
  if (!expected || !passwordsMatch(password, expected)) return null;
  return getUsuarioByEmail(email) ?? null;
}

class PendienteSegundoFactor extends CredentialsSignin {
  constructor(codigo: string) {
    super();
    this.code = codigo;
  }
}

function direccionIp(request: Request): string | null {
  const encabezado = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '';
  const primera = encabezado.split(',')[0]?.trim();
  return primera || null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        pase: { label: 'Pase', type: 'text' },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email || '').trim().toLowerCase();
        const password = String(credentials?.password || '');
        const pase = String(credentials?.pase || '');
        const puerto = obtenerAuthPort();

        try {
          if (pase) {
            const sesion = await puerto.canjearPase(pase);
            if (!sesion) return null;
            return {
              id: sesion.usuarioId,
              email: sesion.correo,
              name: sesion.correo,
              empresaId: sesion.tenantId,
              sedeId: sesion.sedeId,
              role: sesion.rol,
              sedesAccess: sesion.sedes,
              sesionId: sesion.id,
              devLocal: false,
            };
          }

          if (!email || !password) return null;
          const resultado = await puerto.iniciarSesion({
            correo: email,
            contrasena: password,
            direccionIp: direccionIp(request),
            agente: request.headers.get('user-agent'),
          });
          if (resultado.pendiente && resultado.ticket) {
            const marca = resultado.passkey ? '1' : '0';
            throw new PendienteSegundoFactor(`${resultado.pendiente}:${resultado.ticket}:${marca}`);
          }
          if (resultado.ok && resultado.sesion) {
            const sesion = resultado.sesion;
            return {
              id: sesion.usuarioId,
              email: sesion.correo,
              name: sesion.correo,
              empresaId: sesion.tenantId,
              sedeId: sesion.sedeId,
              role: sesion.rol,
              sedesAccess: sesion.sedes,
              sesionId: sesion.id,
              devLocal: false,
            };
          }
          if (resultado.continuarConCuentasLocales) {
            const mockUser = authenticateDevUser(email, password);
            if (mockUser) return toAuthUser(mockUser);
          }
          return null;
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          // Sin el objeto de error: puede incluir parámetros de la consulta.
          console.error('No se pudo consultar la autenticación.');
          const mockUser = authenticateDevUser(email, password);
          return mockUser ? toAuthUser(mockUser) : null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      if (token.devLocal === true) return token;
      if (typeof token.sesionId !== 'string' || token.sesionId.length === 0) return token;
      try {
        const vigente = await obtenerAuthPort().sesionVigente(token.sesionId);
        if (!vigente) {
          token.sesionId = undefined;
          token.role = undefined;
          token.empresaId = undefined;
          token.sedeId = undefined;
          token.sub = undefined;
        }
      } catch {
        console.error('No se pudo comprobar la sesión.');
        token.sesionId = undefined;
        token.role = undefined;
      }
      return token;
    },
  },
  events: {
    async signOut(message) {
      if (!('token' in message)) return;
      const sesionId = message.token?.sesionId;
      if (typeof sesionId !== 'string') return;
      try {
        await obtenerAuthPort().revocarSesion(sesionId);
      } catch {
        console.error('No se pudo revocar la sesión.');
      }
    },
  },
});
