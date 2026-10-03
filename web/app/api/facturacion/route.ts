import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { emitirFacturaElectronica, FactusPayload } from '@/lib/facturacion/api-client';
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
    const permitido = buildAbility(actor).can('crear', {
      tipo: 'R11',
      tenantId: actor.tenantId,
      sedeId: actor.sedeActiva,
      autorId: actor.id,
    });
    if (!permitido) {
      registrarDenegacionDeActor(actor, 'R11', 'crear');
      return NextResponse.json({ error: 'No tiene permiso para emitir esta factura.' }, { status: 403 });
    }

    const body = await request.json();

    // Validaciones básicas
    if (!body.cliente || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Datos de facturación incompletos. Se requiere cliente e items.' },
        { status: 400 }
      );
    }

    const payload: FactusPayload = {
      cliente: body.cliente,
      items: body.items,
      metodo_pago: body.metodo_pago || 'EFECTIVO',
      notas: body.notas || 'Venta desde OptiSaaS',
    };

    // Llamada a nuestro cliente API del proveedor tecnológico (ej. Factus)
    const result = await emitirFacturaElectronica(payload);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error desconocido al facturar.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Factura Electrónica generada exitosamente ante la DIAN',
      data: {
        cufe: result.cufe,
        pdfUrl: result.pdf_url,
      }
    });

  } catch (error) {
    console.error('Error procesando facturación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la factura.' },
      { status: 500 }
    );
  }
}
