import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Force IPv4 first DNS lookup to prevent ENOTFOUND on Windows
if (typeof window === 'undefined') {
  try {
    const dns = require('dns');
    if (dns && typeof dns.setDefaultResultOrder === 'function') {
      dns.setDefaultResultOrder('ipv4first');
    }
  } catch (e) {
    // Ignore
  }
}

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

    // 3. Verificar si el ID de usuario tiene formato UUID (necesario para Supabase Auth)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      // Simular éxito para usuarios semilla locales que no están en Supabase Auth
      return NextResponse.json({
        success: true,
        message: 'Contraseña actualizada exitosamente (Simulado para usuario local/semilla).'
      });
    }

    // 4. Inicializar cliente Supabase Admin con el Service Role Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder-url') || supabaseServiceKey.includes('placeholder-key')) {
      // Simular éxito si Supabase no está configurado del todo
      return NextResponse.json({
        success: true,
        message: 'Contraseña actualizada exitosamente (Simulado: Supabase no configurado).'
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 5. Actualizar la contraseña en Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('Error al actualizar contraseña en Supabase Auth:', error);
      return NextResponse.json(
        { error: `Error de Supabase Auth: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente.'
    });

  } catch (error: any) {
    console.error('Error en api/owner/change-password:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
