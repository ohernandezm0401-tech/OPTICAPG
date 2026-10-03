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
    const { email, password, nombre, role, empresaId } = body;

    if (!email || !password || !nombre || !role) {
      return NextResponse.json(
        { error: 'Todos los campos (email, contraseña, nombre, rol) son requeridos.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // 3. Inicializar cliente Supabase Admin con el Service Role Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Si Supabase no está configurado, simulamos de forma transparente
    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder-url') || supabaseServiceKey.includes('placeholder-key')) {
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
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 4. Crear el usuario en Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, role, empresaId }
    });

    if (error) {
      console.error('Error al crear usuario en Supabase Auth:', error);
      return NextResponse.json(
        { error: `Error de Supabase Auth: ${error.message}` },
        { status: 500 }
      );
    }

    // 5. Retornar el usuario creado con su UUID correspondiente
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        nombre,
        role,
        empresaId: role === 'owner' ? '' : empresaId,
        sedesAccess: ['sede1']
      }
    });

  } catch (error: any) {
    console.error('Error en api/owner/create-user:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
