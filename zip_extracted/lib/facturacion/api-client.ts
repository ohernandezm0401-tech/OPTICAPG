export interface FactusItem {
  codigo: string;
  nombre: string;
  cantidad: number;
  precio: number;
  tasa_impuesto: string; // Ej: "19.00"
}

export interface FactusCustomer {
  identificacion: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  tipo_documento: string; // Ej: "CC"
}

export interface FactusPayload {
  cliente: FactusCustomer;
  items: FactusItem[];
  metodo_pago: string; // Ej: "EFECTIVO", "TARJETA"
  notas?: string;
}

export interface FactusResponse {
  success: boolean;
  cufe?: string;
  pdf_url?: string;
  error?: string;
}

/**
 * Cliente API simulado para integración con Proveedor Tecnológico (ej. Factus).
 * Esta función estructura el JSON como lo pediría Factus, y simula el POST.
 */
export async function emitirFacturaElectronica(payload: FactusPayload): Promise<FactusResponse> {
  console.log('[Facturación DIAN] Payload preparado para enviar al proveedor:', JSON.stringify(payload, null, 2));

  // TODO: Reemplazar con fetch() real usando el API Key de Factus (Sandbox/Producción)
  /*
  const response = await fetch('https://api-sandbox.factus.com.co/v1/facturas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FACTUS_API_TOKEN}`
    },
    body: JSON.stringify({ ...payload, tipo_documento: 'FACTURA_ELECTRONICA' })
  });
  const data = await response.json();
  */

  // Simulación de delay de red (2 segundos)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulamos una respuesta exitosa del Proveedor y la DIAN
  const mockCufe = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return {
    success: true,
    cufe: mockCufe,
    pdf_url: `https://factus.com.co/facturas/mock-pdf-${Date.now()}.pdf`,
  };
}
