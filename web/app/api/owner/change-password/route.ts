// PLT-02 (T03) — Sin SDK propietario: el cambio real de contraseña contra
// PostgreSQL (hash Argon2id) llega con T05 (SEG-01). Mientras tanto responde
// en memoria para no romper el panel del owner.
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { evaluarPoliticaContrasena } from '@/lib/auth/politica-contrasena';

export async function POST(request: Request) {
  try {
    // 1. Verificar sesión del usuario actual
    const session = await auth();
    if (!session || session.user?.role !== 'owner') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el Platform Owner puede realizar esta acción.' },
        { status: 401 }
      );
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
