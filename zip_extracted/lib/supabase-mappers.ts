import {
  Empresa,
  Sede,
  Usuario,
  Paciente,
  Cita,
  HistoriaClinica,
  ProductoInventario,
  Promocion,
  OrdenTrabajo,
  Garantia,
  CajaSesion,
  TransaccionCaja
} from './types';

// Empresa
export function mapEmpresaFromDb(db: any): Empresa {
  return {
    id: db.id,
    nombre: db.nombre,
    nit: db.nit,
    logo: db.logo || undefined,
    colorCorporativo: db.color_corporativo || undefined,
    plan: db.plan,
    stripeCustomerId: db.stripe_customer_id || undefined,
    stripeSubscriptionId: db.stripe_subscription_id || undefined,
    subscriptionStatus: db.subscription_status || undefined,
    nextBillingDate: db.next_billing_date || undefined,
    customMaxSedes: db.custom_max_sedes || undefined,
    customMaxUsuarios: db.custom_max_usuarios || undefined,
    customModulesOverride: db.custom_modules_override || undefined,
    estadoCuenta: db.estado_cuenta || undefined,
    whatsappHabilitado: db.whatsapp_habilitado !== false
  };
}

export function mapEmpresaToDb(ts: Empresa): any {
  return {
    id: ts.id,
    nombre: ts.nombre,
    nit: ts.nit,
    logo: ts.logo || null,
    color_corporativo: ts.colorCorporativo || null,
    plan: ts.plan,
    stripe_customer_id: ts.stripeCustomerId || null,
    stripe_subscription_id: ts.stripeSubscriptionId || null,
    subscription_status: ts.subscriptionStatus || null,
    next_billing_date: ts.nextBillingDate || null,
    custom_max_sedes: ts.customMaxSedes || null,
    custom_max_usuarios: ts.customMaxUsuarios || null,
    custom_modules_override: ts.customModulesOverride || null,
    estado_cuenta: ts.estadoCuenta || null,
    whatsapp_habilitado: ts.whatsappHabilitado !== false
  };
}

// Sede
export function mapSedeFromDb(db: any): Sede {
  return {
    id: db.id,
    empresaId: db.empresa_id,
    nombre: db.nombre,
    ciudad: db.ciudad,
    direccion: db.direccion,
    habilitacionSalud: db.habilitacion_salud,
    estado: db.estado,
    whatsappConectado: db.whatsapp_conectado || false
  };
}

export function mapSedeToDb(ts: Sede): any {
  return {
    id: ts.id,
    empresa_id: ts.empresaId,
    nombre: ts.nombre,
    ciudad: ts.ciudad,
    direccion: ts.direccion,
    habilitacion_salud: ts.habilitacionSalud,
    estado: ts.estado,
    whatsapp_conectado: ts.whatsappConectado || false
  };
}

// Usuario
export function mapUsuarioFromDb(db: any): Usuario {
  return {
    id: db.id,
    empresaId: db.empresa_id || '',
    sedesAccess: db.sedes_access || [],
    nombre: db.nombre,
    email: db.email,
    role: db.role,
    registroMedico: db.registro_medico || undefined,
    avatar: db.avatar || undefined
  };
}

export function mapUsuarioToDb(ts: Usuario): any {
  return {
    id: ts.id,
    empresa_id: ts.empresaId || null,
    sedes_access: ts.sedesAccess,
    nombre: ts.nombre,
    email: ts.email,
    role: ts.role,
    registro_medico: ts.registroMedico || null,
    avatar: ts.avatar || null
  };
}

// Paciente
export function mapPacienteFromDb(db: any): Paciente {
  return {
    id: db.id,
    empresaId: db.empresa_id,
    nombre: db.nombre,
    apellido: db.apellido,
    documento: db.documento,
    tipoDocumento: db.tipo_documento,
    telefono: db.telefono,
    email: db.email || undefined,
    fechaNacimiento: db.fecha_nacimiento,
    eps: db.eps || undefined,
    saldoPendiente: Number(db.saldo_pendiente || 0),
    fechaUltimaVisita: db.fecha_ultima_visita || undefined,
    genero: db.genero || undefined,
    direccion: db.direccion || undefined,
    ocupacion: db.ocupacion || undefined
  };
}

export function mapPacienteToDb(ts: Paciente): any {
  return {
    id: ts.id,
    empresa_id: ts.empresaId,
    nombre: ts.nombre,
    apellido: ts.apellido,
    documento: ts.documento,
    tipo_documento: ts.tipoDocumento,
    telefono: ts.telefono,
    email: ts.email || null,
    fecha_nacimiento: ts.fechaNacimiento,
    eps: ts.eps || null,
    saldo_pendiente: ts.saldoPendiente,
    fecha_ultima_visita: ts.fechaUltimaVisita || null,
    genero: ts.genero || null,
    direccion: ts.direccion || null,
    ocupacion: ts.ocupacion || null
  };
}

// Cita
export function mapCitaFromDb(db: any, hcDb?: any): Cita {
  return {
    id: db.id,
    sedeId: db.sede_id,
    fechaHora: db.fecha_hora,
    pacienteId: db.paciente_id,
    profesionalId: db.profesional_id || undefined,
    motivoClinico: db.motivo_clinico,
    estadoComercial: db.estado_comercial,
    prioridad: db.prioridad,
    notasAdicionales: db.notes_adicionales || db.notas_adicionales || undefined,
    recomendacion: db.recomendacion || undefined,
    facturaId: db.factura_id || undefined,
    cufe: db.cufe || undefined,
    pdfUrl: db.pdf_url || undefined,
    montoCobrado: db.monto_cobrado ? Number(db.monto_cobrado) : undefined,
    fechaPago: db.fecha_pago || undefined,
    metodoPago: db.metodo_pago || undefined,
    promocionAplicadaId: db.promocion_aplicada_id || undefined,
    descuentoAplicado: db.descuento_aplicado ? Number(db.descuento_aplicado) : undefined,
    productosVendidos: db.productos_vendidos || undefined,
    historiaClinica: hcDb ? mapHistoriaClinicaFromDb(hcDb) : undefined
  };
}

export function mapCitaToDb(ts: Cita): any {
  return {
    id: ts.id,
    sede_id: ts.sedeId,
    fecha_hora: ts.fechaHora,
    paciente_id: ts.pacienteId,
    profesional_id: ts.profesionalId || null,
    motivo_clinico: ts.motivoClinico,
    estado_comercial: ts.estadoComercial,
    prioridad: ts.prioridad,
    notas_adicionales: ts.notasAdicionales || null,
    recomendacion: ts.recomendacion || null,
    factura_id: ts.facturaId || null,
    cufe: ts.cufe || null,
    pdf_url: ts.pdfUrl || null,
    monto_cobrado: ts.montoCobrado || null,
    fecha_pago: ts.fechaPago || null,
    metodo_pago: ts.metodoPago || null,
    promocion_aplicada_id: ts.promocionAplicadaId || null,
    descuento_aplicado: ts.descuentoAplicado || null,
    productos_vendidos: ts.productosVendidos || null
  };
}

// Historia Clinica
export function mapHistoriaClinicaFromDb(db: any): HistoriaClinica {
  return {
    pacienteId: db.paciente_id,
    citaId: db.cita_id,
    fechaRegistro: db.fecha_registro,
    anamnesis: db.anamnesis,
    pruebasPreliminares: db.pruebas_preliminares || undefined,
    refraccion: db.refraccion,
    saludOcular: db.salud_ocular,
    diagnosticoPlan: db.diagnostico_plan,
    recomendacion: db.recomendacion
  };
}

export function mapHistoriaClinicaToDb(ts: HistoriaClinica): any {
  return {
    paciente_id: ts.pacienteId,
    cita_id: ts.citaId,
    fecha_registro: ts.fechaRegistro,
    anamnesis: ts.anamnesis,
    pruebas_preliminares: ts.pruebasPreliminares || null,
    refraccion: ts.refraccion,
    salud_ocular: ts.saludOcular,
    diagnostico_plan: ts.diagnosticoPlan,
    recomendacion: ts.recomendacion
  };
}

// ProductoInventario
export function mapInventarioFromDb(db: any): ProductoInventario {
  return {
    id: db.id,
    categoria: db.categoria,
    marca: db.marca,
    modelo: db.modelo,
    color: db.color || '',
    stock: db.stock,
    minStock: db.min_stock,
    precio: Number(db.precio || db.precio_venta || 0),
    precioCompra: Number(db.precio_compra || 0),
    precioVenta: Number(db.precio_venta || db.precio || 0),
    codigoBarras: db.codigo_barras || db.id,
    codigoInvima: db.codigo_invima || undefined,
    lote: db.lote || undefined,
    vencimiento: db.vencimiento || undefined,
    proveedorId: db.proveedor_id || undefined
  };
}

export function mapInventarioToDb(ts: ProductoInventario, empresaId: string): any {
  return {
    id: ts.id,
    empresa_id: empresaId,
    categoria: ts.categoria,
    marca: ts.marca,
    modelo: ts.modelo,
    color: ts.color || null,
    stock: ts.stock,
    min_stock: ts.minStock,
    precio: ts.precio,
    precio_compra: ts.precioCompra,
    precio_venta: ts.precioVenta,
    codigo_barras: ts.codigoBarras,
    codigo_invima: ts.codigoInvima || null,
    lote: ts.lote || null,
    vencimiento: ts.vencimiento || null
  };
}

// Promocion
export function mapPromocionFromDb(db: any): Promocion {
  return {
    id: db.id,
    codigo: db.id, // compatibility
    nombre: db.nombre,
    descripcion: db.descripcion || '',
    tipo: db.tipo,
    valor: Number(db.valor),
    fechaInicio: db.fecha_inicio,
    fechaFin: db.fecha_fin,
    activa: db.activa,
    aplicableA: db.aplicable_a === 'todos' ? 'todo' : db.aplicable_a === 'monturas' ? 'monturas' : 'lentes',
    vecesAplicada: db.veces_applied || db.veces_aplicada || 0
  };
}

export function mapPromocionToDb(ts: Promocion, empresaId: string): any {
  return {
    id: ts.id,
    empresa_id: empresaId,
    nombre: ts.nombre,
    descripcion: ts.descripcion || null,
    tipo: ts.tipo,
    valor: ts.valor,
    fecha_inicio: ts.fechaInicio,
    fecha_fin: ts.fechaFin,
    activa: ts.activa,
    aplicable_a: ts.aplicableA === 'todo' ? 'todos' : ts.aplicableA,
    veces_aplicada: ts.vecesAplicada
  };
}

// OrdenTrabajo
export function mapOrdenFromDb(db: any): OrdenTrabajo {
  const formula = db.formula || {};
  const aud = db.auditoria_calidad || {};
  
  const hasOptometraApproved = !!aud.optometra?.aprobado;
  const hasAsesorApproved = !!aud.asesor?.aprobado;
  let computedEstado = db.estado;
  if (db.estado === 'revision-calidad') {
    if (hasAsesorApproved && !hasOptometraApproved) {
      computedEstado = 'calidad-asesor';
    } else if (hasOptometraApproved && !hasAsesorApproved) {
      computedEstado = 'calidad-optometra';
    } else if (hasAsesorApproved && hasOptometraApproved) {
      computedEstado = 'listo-entrega';
    } else {
      computedEstado = 'recibido-laboratorio';
    }
  } else if (db.estado === 'listo') {
    computedEstado = 'listo-entrega';
  } else if (db.estado === 'en-espera') {
    computedEstado = 'enviado-laboratorio';
  } else if (db.estado === 'laboratorio') {
    computedEstado = 'recibido-laboratorio';
  }

  return {
    id: db.id,
    citaId: db.cita_id || '',
    pacienteId: db.paciente_id || '',
    pacienteNombre: db.paciente_nombre || 'Paciente',
    fechaCreacion: db.fecha_creacion,
    receta: {
      od: formula.od || '',
      oi: formula.oi || '',
      adicion: formula.adicion,
      dp: formula.dp
    },
    lenteMaterial: db.material || '',
    lenteDiseno: db.tipo_lente || '',
    monturaDetalle: db.montura_detalle || '',
    estado: computedEstado,
    laboratorio: db.laboratorio_nombre || '',
    checkOptometra: aud.optometra ? {
      aprobado: aud.optometra.aprobado,
      fecha: aud.optometra.fecha,
      observaciones: aud.optometra.observaciones,
      profesionalId: aud.optometra.profesionalId
    } : undefined,
    checkAsesor: aud.asesor ? {
      aprobado: aud.asesor.aprobado,
      fecha: aud.asesor.fecha,
      observaciones: aud.asesor.observaciones,
      asesorId: aud.asesor.asesorId
    } : undefined,
    facturaEmitida: db.estado === 'entregado',
    abono: db.abono ? Number(db.abono) : 0,
    totalFinal: db.total_contrato ? Number(db.total_contrato) : 0,
    observaciones: db.observaciones || undefined
  };
}

export function mapOrdenToDb(ts: OrdenTrabajo, empresaId: string, sedeId: string): any {
  const aud: any = {};
  if (ts.checkOptometra) aud.optometra = ts.checkOptometra;
  if (ts.checkAsesor) aud.asesor = ts.checkAsesor;

  let dbEstado: string = ts.estado;
  if (ts.estado === 'calidad-optometra' || ts.estado === 'calidad-asesor') {
    dbEstado = 'revision-calidad';
  } else if (ts.estado === 'listo-entrega') {
    dbEstado = 'listo';
  } else if (ts.estado === 'enviado-laboratorio') {
    dbEstado = 'en-espera';
  } else if (ts.estado === 'recibido-laboratorio') {
    dbEstado = 'laboratorio';
  }

  return {
    id: ts.id,
    empresa_id: empresaId,
    sede_id: sedeId,
    paciente_id: ts.pacienteId,
    cita_id: ts.citaId || null,
    fecha_creacion: ts.fechaCreacion,
    tipo_lente: ts.lenteDiseno,
    material: ts.lenteMaterial,
    formula: {
      od: ts.receta.od,
      oi: ts.receta.oi,
      adicion: ts.receta.adicion,
      dp: ts.receta.dp
    },
    estado: dbEstado,
    laboratorio_nombre: ts.laboratorio,
    abono: ts.abono || 0,
    total_contrato: ts.totalFinal || 0,
    observaciones: ts.observaciones || null,
    auditoria_calidad: aud
  };
}

// Garantia
export function mapGarantiaFromDb(db: any): Garantia {
  return {
    id: db.id,
    empresaId: db.empresa_id || '',
    sedeId: db.sede_id || '',
    pacienteId: db.paciente_id || '',
    pacienteNombre: db.paciente_nombre || 'Paciente',
    ordenTrabajoId: db.orden_id || undefined,
    productoNombre: db.producto_nombre || 'Producto',
    tipoGarantia: db.motivo?.includes('adaptacion') ? 'adaptacion-receta' : 'defecto-montura',
    fechaReclamacion: db.fecha_solicitud,
    motivoDetalle: db.motivo,
    estado: db.estado,
    resolucionTipo: db.resolucion_tipo || undefined,
    resolucionDetalle: db.resolucion_detalle || undefined,
    costoOptica: Number(db.costo_optica || 0),
    costoPaciente: Number(db.costo_paciente || 0),
    fechaResolucion: db.fecha_resolucion || undefined
  };
}

export function mapGarantiaToDb(ts: Garantia): any {
  return {
    id: ts.id,
    orden_id: ts.ordenTrabajoId || null,
    paciente_id: ts.pacienteId,
    motivo: ts.motivoDetalle,
    fecha_solicitud: ts.fechaReclamacion,
    estado: ts.estado,
    resolucion_tipo: ts.resolucionTipo || null,
    resolucion_detalle: ts.resolucionDetalle || null,
    costo_optica: ts.costoOptica,
    costo_paciente: ts.costoPaciente,
    fecha_resolucion: ts.fechaResolucion || null
  };
}

// CajaSesion
export function mapCajaSesionFromDb(db: any, dbTxs: any[] = []): CajaSesion {
  return {
    id: db.id,
    usuarioId: db.usuario_id || '',
    usuarioNombre: db.usuario_nombre,
    sedeId: db.sede_id,
    fechaApertura: db.fecha_apertura,
    fechaCierre: db.fecha_cierre || undefined,
    montoApertura: Number(db.monto_apertura),
    montoCierreDeclarado: db.monto_cierre_declarado ? Number(db.monto_cierre_declarado) : undefined,
    montoCierreCalculado: db.monto_cierre_calculado ? Number(db.monto_cierre_calculado) : undefined,
    diferencia: db.diferencia ? Number(db.diferencia) : undefined,
    estado: db.estado,
    observaciones: db.observaciones || undefined,
    desglose: db.desglose || undefined,
    comunicaciones: db.comunicaciones || undefined,
    transacciones: dbTxs.map(mapTransaccionFromDb)
  };
}

export function mapCajaSesionToDb(ts: CajaSesion): any {
  return {
    id: ts.id,
    sede_id: ts.sedeId,
    usuario_id: ts.usuarioId || null,
    usuario_nombre: ts.usuarioNombre,
    fecha_apertura: ts.fechaApertura,
    fecha_cierre: ts.fechaCierre || null,
    monto_apertura: ts.montoApertura,
    monto_cierre_calculado: ts.montoCierreCalculado || null,
    monto_cierre_declarado: ts.montoCierreDeclarado || null,
    diferencia: ts.diferencia || null,
    estado: ts.estado,
    observaciones: ts.observaciones || null,
    desglose: ts.desglose || null,
    comunicaciones: ts.comunicaciones || null
  };
}

// TransaccionCaja
export function mapTransaccionFromDb(db: any): TransaccionCaja {
  return {
    id: db.id,
    fecha: db.fecha || new Date().toISOString(),
    tipo: db.tipo,
    monto: Number(db.monto),
    metodoPago: db.metodo_pago,
    referenciaId: db.referencia_id || undefined,
    descripcion: db.descripcion
  };
}

export function mapTransaccionToDb(ts: TransaccionCaja, sesionId: string): any {
  return {
    id: ts.id,
    sesion_id: sesionId,
    fecha: ts.fecha,
    tipo: ts.tipo,
    monto: ts.monto,
    metodo_pago: ts.metodoPago,
    descripcion: ts.descripcion,
    referencia_id: ts.referenciaId || null
  };
}
