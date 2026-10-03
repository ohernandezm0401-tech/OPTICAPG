// PLT-02 (T03) — Sin SDK propietario: el cambio real de contraseña contra
// PostgreSQL (hash Argon2id) llega con T05 (SEG-01). Mientras tanto responde
// en memoria para no romper el panel del owner.
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // TODO(T05): actualizar `hash_password` en la tabla `usuarios`.
    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente (demo en memoria).'
    });

  } catch (error: unknown) {
    console.error('Error en api/owner/change-password:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
