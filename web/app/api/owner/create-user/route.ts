// PLT-02 (T03) — Sin SDK propietario: la gestión real de usuarios contra
// PostgreSQL llega con T05 (autenticación) y ADM-02 (roles por sede).
// Mientras tanto responde en memoria para no romper el panel del owner.
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { evaluarPoliticaContrasena } from '@/lib/auth/politica-contrasena';
import { buildAbility } from '@/lib/authz/ability';
import { registrarDenegacionDeActor } from '@/lib/authz/intentos';
import { actorDesdeSesion } from '@/lib/authz/sesion';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Debe iniciar sesión.' }, { status: 401 });
    }
    const actor = actorDesdeSesion({
      id: session.user.id,
      role: session.user.role,
      empresaId: session.user.empresaId,
      sedeId: session.user.sedeId,
      sedesAccess: session.user.sedesAccess,
    });
    const permitido = buildAbility(actor).can('crear', { tipo: 'R24', plataforma: true });
    if (!permitido) {
      registrarDenegacionDeActor(actor, 'R24', 'crear');
      return NextResponse.json({ error: 'No tiene permiso para crear usuarios de plataforma.' }, { status: 403 });
    }

    // 2. Parsear el cuerpo de la petición
    const body = await request.json();
    const { email, password, nombre, role, empresaId } = body;

    if (!email || !password || !nombre || !role) {
      return NextResponse.json(
        { error: 'Todos los campos (email, contraseña, nombre, rol) son requeridos.' },
        { status: 400 }
      );
    }

    const politica = evaluarPoliticaContrasena(String(password));
    if (!politica.ok) {
      return NextResponse.json({ error: politica.mensaje }, { status: 400 });
    }

    // TODO(T05): persistir en la tabla `usuarios` de PostgreSQL.
    const mockId = `usr-${Date.now()}`;
    return NextResponse.json({
      success: true,
      user: {
        id: mockId,
        email,
        nombre,
        role,
        empresaId: role === 'owner' ? '' : empresaId,
        sedesAccess: ['sede1']
      }
    });

  } catch (error: unknown) {
    console.error('Error en api/owner/create-user.');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
