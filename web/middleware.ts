import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

import { authConfig } from '@/lib/auth/borde';

const { auth } = NextAuth(authConfig);

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

// SEG-02: el middleware solo redirige a login. La autorización de datos vive
// en el servidor (CASL). La ruta se reenvía para que el layout decida.
function continuar(req: { headers: Headers; nextUrl: { pathname: string } }) {
  const encabezados = new Headers(req.headers);
  encabezados.set('x-optisaas-ruta', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: encabezados } });
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
      return borrarCookies(continuar(req));
    }
  }

  if (isAuthPage) {
    if (autenticado && req.auth?.user?.role) {
      return NextResponse.redirect(new URL(`/dashboard/${req.auth.user.role}`, req.url));
    }
    if (autenticado) {
      return NextResponse.redirect(new URL('/dashboard/admin', req.url));
    }
    return continuar(req);
  }

  if (!autenticado && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return continuar(req);
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
