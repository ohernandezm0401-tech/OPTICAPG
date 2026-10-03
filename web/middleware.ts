import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Role-based route access map: each role can only access their own dashboard section
const ROLE_ALLOWED_PATHS: Record<string, string> = {
  owner: '/dashboard/owner',
  admin: '/dashboard/admin',
  asesor: '/dashboard/asesor',
  optometra: '/dashboard/optometra',
};

export default auth((req) => {
  const isAuth = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const pathname = req.nextUrl.pathname;

  if (isAuthPage) {
    if (isAuth && req.auth?.user?.role) {
      return NextResponse.redirect(new URL(`/dashboard/${req.auth.user.role}`, req.url));
    } else if (isAuth) {
      return NextResponse.redirect(new URL(`/dashboard/admin`, req.url)); // fallback
    }
    return null;
  }

  // Authentication check: redirect unauthenticated users to login
  if (!isAuth && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Authorization check: enforce role-based access to dashboard sections
  if (isAuth && pathname.startsWith('/dashboard/')) {
    const role = req.auth?.user?.role;
    if (role && role in ROLE_ALLOWED_PATHS) {
      const allowedPath = ROLE_ALLOWED_PATHS[role];
      // Owner can access all dashboard sections (super admin)
      if (role === 'owner') return null;
      // Other roles can only access their own section
      if (!pathname.startsWith(allowedPath)) {
        return NextResponse.redirect(new URL(allowedPath, req.url));
      }
    }
  }

  return null;
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
