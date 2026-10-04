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

function politicaContenido(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
  ].join('; ');
}

function conPolitica(respuesta: NextResponse, politica: string): NextResponse {
  respuesta.headers.set('Content-Security-Policy', politica);
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
function continuar(
  req: { headers: Headers; nextUrl: { pathname: string } },
  politica: string,
  nonce: string,
) {
  const encabezados = new Headers(req.headers);
  encabezados.set('x-optisaas-ruta', req.nextUrl.pathname);
  encabezados.set('x-nonce', nonce);
  encabezados.set('Content-Security-Policy', politica);
  return conPolitica(NextResponse.next({ request: { headers: encabezados } }), politica);
}

export default auth(async (req) => {
  const nonce = btoa(crypto.randomUUID());
  const politica = politicaContenido(nonce);
  const pathname = req.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login');
  let autenticado = !!req.auth;

  if (autenticado && (isAuthPage || pathname.startsWith('/dashboard'))) {
    const vigente = await sesionVigenteEnServidor(req);
    if (!vigente) {
      autenticado = false;
      if (pathname.startsWith('/dashboard')) {
        return conPolitica(borrarCookies(NextResponse.redirect(new URL('/login', req.url))), politica);
      }
      return borrarCookies(continuar(req, politica, nonce));
    }
  }

  if (isAuthPage) {
    if (autenticado && req.auth?.user?.role) {
      return conPolitica(
        NextResponse.redirect(new URL(`/dashboard/${req.auth.user.role}`, req.url)),
        politica,
      );
    }
    if (autenticado) {
      return conPolitica(NextResponse.redirect(new URL('/dashboard/admin', req.url)), politica);
    }
    return continuar(req, politica, nonce);
  }

  if (!autenticado && pathname.startsWith('/dashboard')) {
    return conPolitica(NextResponse.redirect(new URL('/login', req.url)), politica);
  }

  return continuar(req, politica, nonce);
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
