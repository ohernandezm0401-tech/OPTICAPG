-- =========================================================================
-- OPTISAAS - SUPABASE POSTGRESQL INITIALIZATION & SEED SCRIPT
-- =========================================================================
-- Ejecutar este script completo en el SQL Editor de Supabase.
-- =========================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- OPCIONAL: Para limpiar por completo la base de datos (tablas públicas y cuentas de autenticación) antes de sembrar, descomente las siguientes dos líneas:
-- TRUNCATE public.transacciones_caja, public.caja_sesiones, public.garantias, public.ordenes_trabajo, public.promociones, public.historias_clinicas, public.citas, public.pacientes, public.inventario, public.sedes, public.empresas, public.usuarios CASCADE;
-- DELETE FROM auth.users;

-- Eliminar tablas existentes para garantizar la recreación de columnas nuevas
DROP TABLE IF EXISTS public.transacciones_caja CASCADE;
DROP TABLE IF EXISTS public.caja_sesiones CASCADE;
DROP TABLE IF EXISTS public.garantias CASCADE;
DROP TABLE IF EXISTS public.ordenes_trabajo CASCADE;
DROP TABLE IF EXISTS public.promociones CASCADE;
DROP TABLE IF EXISTS public.historias_clinicas CASCADE;
DROP TABLE IF EXISTS public.citas CASCADE;
DROP TABLE IF EXISTS public.pacientes CASCADE;
DROP TABLE IF EXISTS public.inventario CASCADE;
DROP TABLE IF EXISTS public.sedes CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.proveedores CASCADE;
DROP TABLE IF EXISTS public.compras CASCADE;
DROP TABLE IF EXISTS public.configuracion_margenes CASCADE;
DROP TABLE IF EXISTS public.mensajes_logs CASCADE;
DROP TABLE IF EXISTS public.equipos_medicos CASCADE;
DROP TABLE IF EXISTS public.lecturas_ambientales CASCADE;
DROP TABLE IF EXISTS public.registros_residuos CASCADE;
DROP TABLE IF EXISTS public.registros_desinfeccion CASCADE;
DROP TABLE IF EXISTS public.concepto_sanitario CASCADE;
DROP TABLE IF EXISTS public.saneamiento_logs CASCADE;

-- =========================================================================
-- 1. CREACIÓN DE TABLAS DE LA BASE DE DATOS
-- =========================================================================

-- Tabla: empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    nit TEXT NOT NULL UNIQUE,
    logo TEXT,
    color_corporativo TEXT DEFAULT '#2563eb',
    plan TEXT NOT NULL CHECK (plan IN ('basico', 'premium', 'enterprise')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'unpaid', 'canceled', 'trialing')),
    next_billing_date DATE,
    custom_max_sedes INT,
    custom_max_usuarios INT,
    custom_modules_override JSONB,
    whatsapp_habilitado BOOLEAN DEFAULT TRUE,
    estado_cuenta TEXT NOT NULL DEFAULT 'onboarding' CHECK (estado_cuenta IN ('activo', 'suspendido', 'onboarding')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar que la columna whatsapp_habilitado existe si la tabla ya existía
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS whatsapp_habilitado BOOLEAN DEFAULT TRUE;

-- Tabla: sedes
CREATE TABLE IF NOT EXISTS public.sedes (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    direccion TEXT NOT NULL,
    habilitacion_salud TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar que la columna whatsapp_conectado existe si la tabla ya existía
ALTER TABLE public.sedes ADD COLUMN IF NOT EXISTS whatsapp_conectado BOOLEAN DEFAULT FALSE;

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY, -- Coincide con auth.users.id (UUID en texto)
    empresa_id TEXT, -- Puede ser NULL para administradores globales/owners
    sedes_access TEXT[] DEFAULT '{}',
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'asesor', 'optometra')),
    registro_medico TEXT,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    documento TEXT NOT NULL,
    tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'PA')),
    telefono TEXT NOT NULL,
    email TEXT,
    fecha_nacimiento DATE NOT NULL,
    eps TEXT,
    saldo_pendiente NUMERIC(12, 2) DEFAULT 0.00,
    fecha_ultima_visita TIMESTAMP WITH TIME ZONE,
    genero TEXT CHECK (genero IN ('M', 'F', 'Otro')),
    direccion TEXT,
    ocupacion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empresa_id, documento)
);

-- Tabla: citas
CREATE TABLE IF NOT EXISTS public.citas (
    id TEXT PRIMARY KEY,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    paciente_id TEXT REFERENCES public.pacientes(id) ON DELETE CASCADE,
    profesional_id TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    motivo_clinico TEXT NOT NULL,
    estado_comercial TEXT NOT NULL CHECK (estado_comercial IN ('por-llegar', 'en-sala', 'en-consulta', 'cotizando', 'pagado', 'no-asistio', 'confirmada')),
    prioridad TEXT NOT NULL CHECK (prioridad IN ('normal', 'alta', 'urgente')),
    notas_adicionales TEXT,
    recomendacion JSONB, -- Estructura de RecomendacionClinica
    factura_id TEXT,
    cufe TEXT,
    pdf_url TEXT,
    monto_cobrado NUMERIC(12,2),
    fecha_pago TIMESTAMP WITH TIME ZONE,
    metodo_pago TEXT,
    promocion_aplicada_id TEXT,
    descuento_aplicado NUMERIC(12,2),
    productos_vendidos JSONB, -- Lista de items POS vendidos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: historias_clinicas
CREATE TABLE IF NOT EXISTS public.historias_clinicas (
    paciente_id TEXT REFERENCES public.pacientes(id) ON DELETE CASCADE,
    cita_id TEXT PRIMARY KEY REFERENCES public.citas(id) ON DELETE CASCADE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    anamnesis JSONB NOT NULL,
    pruebas_preliminares JSONB,
    refraccion JSONB NOT NULL, -- Datos de subjetivo, lensometría, etc.
    salud_ocular JSONB NOT NULL,
    diagnostico_plan JSONB NOT NULL,
    recomendacion JSONB NOT NULL
);

-- Tabla: inventario
CREATE TABLE IF NOT EXISTS public.inventario (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    color TEXT,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 5,
    precio NUMERIC(12,2) NOT NULL,
    precio_compra NUMERIC(12,2),
    precio_venta NUMERIC(12,2),
    codigo_barras TEXT,
    codigo_invima TEXT,
    lote TEXT,
    vencimiento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: promociones
CREATE TABLE IF NOT EXISTS public.promociones (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('porcentaje', 'monto-fijo', 'combo', 'segunda-unidad')),
    valor NUMERIC(12,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    aplicable_a TEXT DEFAULT 'todos',
    veces_aplicada INT DEFAULT 0
);

-- Tabla: ordenes_trabajo
CREATE TABLE IF NOT EXISTS public.ordenes_trabajo (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE,
    paciente_id TEXT REFERENCES public.pacientes(id) ON DELETE CASCADE,
    cita_id TEXT REFERENCES public.citas(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo_lente TEXT NOT NULL,
    material TEXT NOT NULL,
    tratamientos TEXT[] DEFAULT '{}',
    formula JSONB NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('en-espera', 'laboratorio', 'revision-calidad', 'listo', 'entregado', 'garantia')),
    laboratorio_nombre TEXT,
    fecha_prometida DATE,
    abono NUMERIC(12,2) DEFAULT 0.00,
    total_contrato NUMERIC(12,2) NOT NULL,
    observaciones TEXT,
    auditoria_calidad JSONB -- Contiene aprobaciones del optometra y asesor
);

-- Tabla: garantias
CREATE TABLE IF NOT EXISTS public.garantias (
    id TEXT PRIMARY KEY,
    orden_id TEXT REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
    paciente_id TEXT REFERENCES public.pacientes(id) ON DELETE CASCADE,
    motivo TEXT NOT NULL,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado TEXT NOT NULL CHECK (estado IN ('abierta', 'aprobada', 'rechazada', 'procesada')),
    resolucion_tipo TEXT CHECK (resolucion_tipo IN ('repeticion-sin-costo', 'descuento-comercial', 'cambio-montura', 'ninguna')),
    resolucion_detalle TEXT,
    costo_optica NUMERIC(12,2) DEFAULT 0.00,
    costo_paciente NUMERIC(12,2) DEFAULT 0.00
);

-- Tabla: caja_sesiones
CREATE TABLE IF NOT EXISTS public.caja_sesiones (
    id TEXT PRIMARY KEY,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE,
    usuario_id TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    usuario_nombre TEXT NOT NULL,
    fecha_apertura TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    monto_apertura NUMERIC(12,2) NOT NULL,
    monto_cierre_calculado NUMERIC(12,2),
    monto_cierre_declarado NUMERIC(12,2),
    diferencia NUMERIC(12,2),
    estado TEXT NOT NULL CHECK (estado IN ('abierta', 'cerrada')),
    observaciones TEXT,
    desglose JSONB, -- Monedas, billetes, vouchers
    comunicaciones JSONB -- Resumen de mensajes WhatsApp enviados en el turno
);

-- Tabla: transacciones_caja
CREATE TABLE IF NOT EXISTS public.transacciones_caja (
    id TEXT PRIMARY KEY,
    sesion_id TEXT REFERENCES public.caja_sesiones(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso-venta', 'ingreso-abono', 'egreso-gasto', 'base')),
    monto NUMERIC(12,2) NOT NULL,
    metodo_pago TEXT NOT NULL, -- EFECTIVO, TARJETA, TRANSFERENCIA
    descripcion TEXT NOT NULL,
    referencia_id TEXT
);

-- Tabla: mensajes_logs
CREATE TABLE IF NOT EXISTS public.mensajes_logs (
    id TEXT PRIMARY KEY,
    sesion_id TEXT REFERENCES public.caja_sesiones(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('gafas', 'primer-contacto', 'confirmacion-cita', 'alerta-clinica', 'crm', 'chat')),
    paciente_nombre TEXT NOT NULL,
    paciente_telefono TEXT NOT NULL,
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mensaje_text TEXT NOT NULL,
    detalle_adicional TEXT,
    estado TEXT DEFAULT 'enviado'
);

-- Asegurar que la columna direccion existe para chat bidireccional
ALTER TABLE public.mensajes_logs ADD COLUMN IF NOT EXISTS direccion TEXT DEFAULT 'saliente';

-- Tabla: equipos_medicos
CREATE TABLE IF NOT EXISTS public.equipos_medicos (
    id TEXT PRIMARY KEY,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT,
    serial TEXT NOT NULL,
    fecha_adquisicion DATE,
    ultimo_mantenimiento DATE,
    proximo_mantenimiento DATE,
    estado TEXT CHECK (estado IN ('operativo', 'fuera-servicio', 'mantenimiento')),
    registro_sanitario TEXT,
    incidentes JSONB[] DEFAULT '{}'
);

-- Tabla: lecturas_ambientales
CREATE TABLE IF NOT EXISTS public.lecturas_ambientales (
    id TEXT PRIMARY KEY,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    temperatura NUMERIC(4,1) NOT NULL,
    humedad NUMERIC(4,1) NOT NULL,
    area TEXT NOT NULL, -- ej: Consultorio, Laboratorio
    registrado_por TEXT NOT NULL,
    alertas_disparadas TEXT[] DEFAULT '{}'
);

-- Tabla: registros_residuos
CREATE TABLE IF NOT EXISTS public.registros_residuos (
    id TEXT PRIMARY KEY,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo_residuo TEXT NOT NULL CHECK (tipo_residuo IN ('biosanitarios', 'cortopunzantes', 'quimicos', 'comunes')),
    peso_kg NUMERIC(6,2) NOT NULL,
    empresa_recolectora TEXT NOT NULL,
    manifiesto_id TEXT,
    operador_firma TEXT NOT NULL
);

-- Tabla: registros_desinfeccion
CREATE TABLE IF NOT EXISTS public.registros_desinfeccion (
    id TEXT PRIMARY KEY,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    area TEXT NOT NULL,
    desinfectante_usado TEXT NOT NULL,
    concentracion TEXT,
    responsable TEXT NOT NULL,
    firma_responsable TEXT
);

-- Tabla: concepto_sanitario
CREATE TABLE IF NOT EXISTS public.concepto_sanitario (
    id TEXT PRIMARY KEY,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE UNIQUE,
    fecha_inspeccion DATE NOT NULL,
    entidad_emisora TEXT NOT NULL,
    resultado TEXT NOT NULL CHECK (resultado IN ('favorable', 'favorable-con-requerimientos', 'desfavorable')),
    vencimiento DATE,
    observaciones TEXT
);

-- Tabla: saneamiento_logs
CREATE TABLE IF NOT EXISTS public.saneamiento_logs (
    id TEXT PRIMARY KEY,
    sede_id TEXT REFERENCES public.sedes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    actividad TEXT NOT NULL CHECK (actividad IN ('fumigacion', 'lavado-tanque', 'limpieza-trampa-grasas')),
    empresa_ejecutora TEXT NOT NULL,
    certificado_id TEXT,
    proxima_fecha DATE NOT NULL
);

-- Tabla: proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    nit TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion TEXT
);

-- Tabla: compras
CREATE TABLE IF NOT EXISTS public.compras (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    proveedor_id TEXT REFERENCES public.proveedores(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detalles JSONB NOT NULL, -- Lista de items comprados y costos
    total NUMERIC(12,2) NOT NULL,
    factura_soporte_id TEXT
);

-- Tabla: configuracion_margenes
CREATE TABLE IF NOT EXISTS public.configuracion_margenes (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    porcentaje_margen NUMERIC(5,2) NOT NULL,
    UNIQUE(empresa_id, categoria)
);

-- =========================================================================
-- 2. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- =========================================================================

-- Habilitar RLS en tablas críticas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historias_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas (Soporte multi-empresa usando JWT metadata para evitar recursión lenta)
DROP POLICY IF EXISTS "Usuarios ven su propia empresa" ON public.empresas;
DROP POLICY IF EXISTS "Acceso empresas" ON public.empresas;
CREATE POLICY "Acceso empresas" ON public.empresas
    FOR ALL TO authenticated USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'owner') OR
        (auth.jwt() -> 'user_metadata' ->> 'empresaId' = id)
    );

DROP POLICY IF EXISTS "Usuarios ven sedes de su empresa" ON public.sedes;
DROP POLICY IF EXISTS "Acceso sedes" ON public.sedes;
CREATE POLICY "Acceso sedes" ON public.sedes
    FOR ALL TO authenticated USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'owner') OR
        (auth.jwt() -> 'user_metadata' ->> 'empresaId' = empresa_id)
    );

DROP POLICY IF EXISTS "Usuarios ven pacientes de su empresa" ON public.pacientes;
DROP POLICY IF EXISTS "Acceso pacientes" ON public.pacientes;
CREATE POLICY "Acceso pacientes" ON public.pacientes
    FOR ALL TO authenticated USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'owner') OR
        (auth.jwt() -> 'user_metadata' ->> 'empresaId' = empresa_id)
    );

DROP POLICY IF EXISTS "Acceso perfiles usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Acceso total perfiles usuarios" ON public.usuarios;
CREATE POLICY "Acceso total perfiles usuarios" ON public.usuarios
    FOR ALL TO authenticated USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'owner') OR
        (auth.jwt() -> 'user_metadata' ->> 'empresaId' = empresa_id) OR
        (auth.uid()::text = id)
    );

DROP POLICY IF EXISTS "Acceso citas" ON public.citas;
CREATE POLICY "Acceso citas" ON public.citas
    FOR ALL TO authenticated USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'owner') OR
        EXISTS (
            SELECT 1 FROM public.sedes s 
            WHERE s.id = sede_id 
            AND s.empresa_id = auth.jwt() -> 'user_metadata' ->> 'empresaId'
        )
    );

DROP POLICY IF EXISTS "Acceso historias clinicas" ON public.historias_clinicas;
CREATE POLICY "Acceso historias clinicas" ON public.historias_clinicas
    FOR ALL TO authenticated USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'owner') OR
        EXISTS (
            SELECT 1 FROM public.pacientes p 
            WHERE p.id = paciente_id 
            AND p.empresa_id = auth.jwt() -> 'user_metadata' ->> 'empresaId'
        )
    );

DROP POLICY IF EXISTS "Acceso caja sesiones" ON public.caja_sesiones;
CREATE POLICY "Acceso caja sesiones" ON public.caja_sesiones
    FOR ALL TO authenticated USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'owner') OR
        EXISTS (
            SELECT 1 FROM public.sedes s 
            WHERE s.id = sede_id 
            AND s.empresa_id = auth.jwt() -> 'user_metadata' ->> 'empresaId'
        )
    );

-- =========================================================================
-- 3. TRIGGERS DE AUTOMATIZACIÓN DE AUTENTICACIÓN
-- =========================================================================

-- Trigger para crear perfil público cuando se registra en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nombre, role, empresa_id, sedes_access)
    VALUES (
        new.id::text,
        new.email,
        coalesce(new.raw_user_meta_data->>'nombre', 'Nuevo Colaborador'),
        coalesce(new.raw_user_meta_data->>'role', 'asesor'),
        coalesce(new.raw_user_meta_data->>'empresaId', 'emp1'),
        ARRAY['sede1']
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enlazar Trigger a auth.users (borrar si existe antes)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 4. REGISTRO DEL MASTER ACCOUNT (OWNER - ORLANDO)
-- =========================================================================

-- 4.1 Inserción en la tabla de Auth de Supabase (Clave: OrlandoOwner2026!)

-- Eliminar usuario preexistente si lo hubiera para evitar fallos de clave duplicada (por id o email)
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000' OR email = 'owner@optisaas.co';
DELETE FROM public.usuarios WHERE id = '00000000-0000-0000-0000-000000000000' OR email = 'owner@optisaas.co';

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, 
    email_change_token_new, recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000', -- UUID Estático para usr0
    'authenticated',
    'authenticated',
    'owner@optisaas.co',
    '$2b$10$QsqrLvkgW7lHyMiC6yRM..cr2/AoY.Y9DCj6YlWkD.Z8PhLPzW2P.', -- Contraseña cifrada en Blowfish (OrlandoOwner2026!)
    NOW(),

    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Orlando Platform Owner","role":"owner","empresaId":""}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 4.2 Inserción de perfil de usuario público correspondiente
INSERT INTO public.usuarios (id, email, nombre, role, empresa_id, sedes_access)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'owner@optisaas.co',
    'Orlando Platform Owner',
    'owner',
    '', -- Sin empresa porque gobierna la plataforma completa
    ARRAY['sede1', 'sede2', 'sede3']
) ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- 5. SEMILLA DE DATOS FICTICIOS (SEEDS)
-- =========================================================================

-- Inserción de Empresas ficticias
INSERT INTO public.empresas (id, nombre, nit, plan, stripe_customer_id, stripe_subscription_id, subscription_status, next_billing_date, estado_cuenta, whatsapp_habilitado)
VALUES 
('emp1', 'Ópticas Visión Total S.A.S', '900.123.456-7', 'enterprise', 'cus_R8h3n1a8_vt', 'sub_1Qenterprise_vt', 'active', '2026-06-15', 'activo', true)
ON CONFLICT (id) DO NOTHING;

-- Inserción de Sedes ficticias
INSERT INTO public.sedes (id, empresa_id, nombre, ciudad, direccion, habilitacion_salud, estado)
VALUES 
('sede1', 'emp1', 'Sucursal Norte', 'Bogotá', 'Calle 127 # 14-54', '11001-08234-01', 'activa')
ON CONFLICT (id) DO NOTHING;

-- Inserción de Productos de Inventario ficticios (Monturas, Lentes contacto, Insumos)
INSERT INTO public.inventario (id, empresa_id, categoria, marca, modelo, color, stock, min_stock, precio, precio_compra, precio_venta, codigo_barras)
VALUES
('inv1', 'emp1', 'Monturas', 'Ray-Ban', 'Clubmaster RB3016', 'Negro/Dorado', 15, 3, 450000.00, 200000.00, 450000.00, '8053672166677'),
('inv2', 'emp1', 'Monturas', 'Oakley', 'Holbrook OO9102', 'Negro Mate/Gris', 8, 2, 520000.00, 250000.00, 520000.00, '888392491953'),
('inv3', 'emp1', 'Lentes de Contacto', 'Acuvue', 'Oasys 2-Week', 'Transparente', 24, 5, 120000.00, 60000.00, 120000.00, '0733905148677'),
('inv4', 'emp1', 'Insumos', 'Opti-Free', 'PureMoist 300ml', 'Líquido', 30, 10, 450000.00, 22000.00, 45000.00, '300650359056')
ON CONFLICT (id) DO NOTHING;

