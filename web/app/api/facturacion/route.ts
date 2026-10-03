import { NextResponse } from 'next/server';
import { emitirFacturaElectronica, FactusPayload } from '@/lib/facturacion/api-client';

export async function POST(request: Request) {
  try {
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
