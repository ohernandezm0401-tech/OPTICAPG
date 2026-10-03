// PLT-02 (T03) — Sin SDK propietario: el cambio real de contraseña contra
// PostgreSQL (hash Argon2id) llega con T05 (SEG-01). Mientras tanto responde
// en memoria para no romper el panel del owner.
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
    const permitido = buildAbility(actor).can('actualizar', { tipo: 'R24', plataforma: true });
    if (!permitido) {
      registrarDenegacionDeActor(actor, 'R24', 'actualizar');
      return NextResponse.json({ error: 'No tiene permiso para cambiar esta contraseña.' }, { status: 403 });
    }

    // 2. Parsear el cuerpo de la petición
    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'Identificador de usuario y nueva contraseña son requeridos.' },
        { status: 400 }
      );
    }

    const politica = evaluarPoliticaContrasena(String(newPassword));
    if (!politica.ok) {
      return NextResponse.json({ error: politica.mensaje }, { status: 400 });
    }

    // TODO(T05): actualizar `hash_password` en la tabla `usuarios`.
    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente (demo en memoria).'
    });

  } catch (error: unknown) {
    console.error('Error al actualizar la clave de acceso.');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
