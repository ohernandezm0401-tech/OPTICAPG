import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

import { authConfig } from '@/lib/auth/borde';

const { auth } = NextAuth(authConfig);

const ROLE_ALLOWED_PATHS: Record<string, string> = {
  owner: '/dashboard/owner',
  admin: '/dashboard/admin',
  asesor: '/dashboard/asesor',
  optometra: '/dashboard/optometra',
};

const COOKIES_SESION = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
];

function borrarCookies(respuesta: NextResponse) {
  for (const nombre of COOKIES_SESION) {
    respuesta.cookies.set(nombre, '', { path: '/', maxAge: 0 });
  }
  return respuesta;
}

// La vigencia vive en Node (PostgreSQL). El middleware no importa el driver:
// pregunta al route handler, que no vuelve a entrar al middleware (`api` está
// fuera del matcher). Si la sesión fue revocada, la siguiente petición falla.
async function sesionVigenteEnServidor(req: { url: string; headers: Headers }): Promise<boolean> {
  try {
    const url = new URL('/api/auth/vigencia', req.url);
    const respuesta = await fetch(url, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login');
  let autenticado = !!req.auth;

  if (autenticado && (isAuthPage || pathname.startsWith('/dashboard'))) {
    const vigente = await sesionVigenteEnServidor(req);
    if (!vigente) {
      autenticado = false;
      if (pathname.startsWith('/dashboard')) {
        return borrarCookies(NextResponse.redirect(new URL('/login', req.url)));
      }
      return borrarCookies(NextResponse.next());
    }
  }

  if (isAuthPage) {
    if (autenticado && req.auth?.user?.role) {
      return NextResponse.redirect(new URL(`/dashboard/${req.auth.user.role}`, req.url));
    }
    if (autenticado) {
      return NextResponse.redirect(new URL('/dashboard/admin', req.url));
    }
    return null;
  }

  if (!autenticado && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (autenticado && pathname.startsWith('/dashboard/')) {
    const role = req.auth?.user?.role;
    if (role && role in ROLE_ALLOWED_PATHS) {
      const allowedPath = ROLE_ALLOWED_PATHS[role];
      if (role === 'owner') return null;
      if (!pathname.startsWith(allowedPath)) {
        return NextResponse.redirect(new URL(allowedPath, req.url));
      }
    }
  }

  return null;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
