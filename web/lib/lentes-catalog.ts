import { ProductoInventario } from './types';

const CATALOGO_RAW: any[] = [
  // ==========================================
  // === 1. ESSILOR (Líder Mundial) ===
  // ==========================================
  
  // -- Monofocales Básicos (Crizal Easy Pro) --
  {
    id: 'LEN-ESS-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Easy Pro CR-39',
    color: 'Transparente',
    stock: 20,
    minStock: 5,
    precio: 140000,
    codigoInvima: 'INVIMA 2020DM-0021183',
    lote: 'L-ESS-2601',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Easy Pro Policarbonato',
    color: 'Transparente',
    stock: 25,
    minStock: 5,
    precio: 190000,
    codigoInvima: 'INVIMA 2020DM-0021183',
    lote: 'L-ESS-2602',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-003',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Easy Pro Alto Índice 1.60',
    color: 'Transparente',
    stock: 12,
    minStock: 3,
    precio: 290000,
    codigoInvima: 'INVIMA 2020DM-0021183',
    lote: 'L-ESS-2603',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-004',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Easy Pro Alto Índice 1.67',
    color: 'Transparente',
    stock: 10,
    minStock: 3,
    precio: 360000,
    codigoInvima: 'INVIMA 2020DM-0021183',
    lote: 'L-ESS-2604',
    vencimiento: '2031-12-31'
  },

  // -- Monofocales Antirreflejo Avanzado (Crizal Sapphire HR) --
  {
    id: 'LEN-ESS-005',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Sapphire HR CR-39',
    color: 'Transparente',
    stock: 15,
    minStock: 4,
    precio: 220000,
    codigoInvima: 'INVIMA 2021DM-0022452',
    lote: 'L-ESS-2605',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-006',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Sapphire HR Policarbonato',
    color: 'Transparente',
    stock: 30,
    minStock: 5,
    precio: 280000,
    codigoInvima: 'INVIMA 2021DM-0022452',
    lote: 'L-ESS-2606',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-007',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Sapphire HR Trivex',
    color: 'Transparente (Seguridad)',
    stock: 12,
    minStock: 3,
    precio: 340000,
    codigoInvima: 'INVIMA 2021DM-0022452',
    lote: 'L-ESS-2607',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-008',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Sapphire HR Alto Índice 1.60',
    color: 'Transparente',
    stock: 15,
    minStock: 3,
    precio: 380000,
    codigoInvima: 'INVIMA 2021DM-0022452',
    lote: 'L-ESS-2608',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-009',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Sapphire HR Alto Índice 1.67',
    color: 'Transparente',
    stock: 15,
    minStock: 3,
    precio: 480000,
    codigoInvima: 'INVIMA 2021DM-0022452',
    lote: 'L-ESS-2609',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-010',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Sapphire HR Alto Índice 1.74',
    color: 'Transparente (Súper Delgado)',
    stock: 8,
    minStock: 2,
    precio: 650000,
    codigoInvima: 'INVIMA 2021DM-0022452',
    lote: 'L-ESS-2610',
    vencimiento: '2031-12-31'
  },

  // -- Monofocales Alta Resistencia (Crizal Rock) --
  {
    id: 'LEN-ESS-011',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Rock Policarbonato',
    color: 'Transparente',
    stock: 25,
    minStock: 5,
    precio: 290000,
    codigoInvima: 'INVIMA 2022DM-0025210',
    lote: 'L-ESS-2611',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-012',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Rock Alto Índice 1.60',
    color: 'Transparente',
    stock: 12,
    minStock: 3,
    precio: 390000,
    codigoInvima: 'INVIMA 2022DM-0025210',
    lote: 'L-ESS-2612',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-013',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Crizal Rock Alto Índice 1.67',
    color: 'Transparente',
    stock: 12,
    minStock: 3,
    precio: 490000,
    codigoInvima: 'INVIMA 2022DM-0025210',
    lote: 'L-ESS-2613',
    vencimiento: '2031-12-31'
  },

  // -- Monofocales Anti-fatiga / Digitales (Eyezen) --
  {
    id: 'LEN-ESS-014',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Eyezen Start Crizal Easy Pro Policarbonato',
    color: 'Transparente (Filtro Azul)',
    stock: 15,
    minStock: 4,
    precio: 320000,
    codigoInvima: 'INVIMA 2022DM-0024951',
    lote: 'L-ESS-2614',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-015',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Eyezen Start Crizal Sapphire HR Poly',
    color: 'Transparente (Filtro Azul)',
    stock: 15,
    minStock: 4,
    precio: 390000,
    codigoInvima: 'INVIMA 2022DM-0024951',
    lote: 'L-ESS-2615',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-016',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Eyezen Start Crizal Rock Alto Índice 1.60',
    color: 'Transparente (Filtro Azul)',
    stock: 10,
    minStock: 3,
    precio: 490000,
    codigoInvima: 'INVIMA 2022DM-0024951',
    lote: 'L-ESS-2616',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-017',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Eyezen Focus Crizal Sapphire HR Poly (Pre-Presbicia)',
    color: 'Transparente (Filtro Azul)',
    stock: 12,
    minStock: 3,
    precio: 460000,
    codigoInvima: 'INVIMA 2022DM-0024951',
    lote: 'L-ESS-2617',
    vencimiento: '2031-12-31'
  },

  // -- Progresivos Varilux (Gama Alta) --
  {
    id: 'LEN-ESS-018',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Varilux Liberty 3.0 Crizal Easy Pro Policarbonato',
    color: 'Transparente',
    stock: 10,
    minStock: 2,
    precio: 650000,
    codigoInvima: 'INVIMA 2019DM-0019483',
    lote: 'L-ESS-2618',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-019',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Varilux Comfort Max Crizal Sapphire HR Poly',
    color: 'Transparente',
    stock: 8,
    minStock: 2,
    precio: 950000,
    codigoInvima: 'INVIMA 2019DM-0019483',
    lote: 'L-ESS-2619',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-020',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Varilux Comfort Max Crizal Sapphire HR 1.60',
    color: 'Transparente',
    stock: 8,
    minStock: 2,
    precio: 1080000,
    codigoInvima: 'INVIMA 2019DM-0019483',
    lote: 'L-ESS-2620',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-021',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Varilux Physio 3.0 Crizal Rock Policarbonato',
    color: 'Transparente',
    stock: 6,
    minStock: 2,
    precio: 1250000,
    codigoInvima: 'INVIMA 2019DM-0019483',
    lote: 'L-ESS-2621',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-022',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Varilux Physio 3.0 Crizal Sapphire HR 1.67',
    color: 'Transparente',
    stock: 5,
    minStock: 2,
    precio: 1450000,
    codigoInvima: 'INVIMA 2019DM-0019483',
    lote: 'L-ESS-2622',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-023',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Varilux XR Series Crizal Sapphire HR Poly (Gama Premium)',
    color: 'Transparente',
    stock: 4,
    minStock: 1,
    precio: 1850000,
    codigoInvima: 'INVIMA 2023DM-0027581',
    lote: 'L-ESS-2623',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-024',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Varilux XR Series Crizal Sapphire HR 1.67',
    color: 'Transparente',
    stock: 4,
    minStock: 1,
    precio: 2050000,
    codigoInvima: 'INVIMA 2023DM-0027581',
    lote: 'L-ESS-2624',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ESS-025',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Varilux XR Series Crizal Sapphire HR 1.74',
    color: 'Transparente (El progresivo más avanzado)',
    stock: 3,
    minStock: 1,
    precio: 2350000,
    codigoInvima: 'INVIMA 2023DM-0027581',
    lote: 'L-ESS-2625',
    vencimiento: '2031-12-31'
  },

  // -- Control de Miopía Infantil --
  {
    id: 'LEN-ESS-026',
    categoria: 'Lentes Oftálmicos',
    marca: 'Essilor',
    modelo: 'Monofocal Stellest Crizal Kids Poly (Miopía infantil)',
    color: 'Transparente',
    stock: 20,
    minStock: 4,
    precio: 780000,
    codigoInvima: 'INVIMA 2022DM-0025124',
    lote: 'L-ESS-2626',
    vencimiento: '2031-12-31'
  },

  // ==========================================
  // === 2. ZEISS (Precisión Alemana) ===
  // ==========================================
  
  // -- Monofocales SmartLife (Diseño Digital Optimizado) --
  {
    id: 'LEN-ZEI-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Monofocal SmartLife LotuTec Policarbonato',
    color: 'Transparente',
    stock: 20,
    minStock: 4,
    precio: 360000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2601',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Monofocal SmartLife DuraVision Platinum Poly',
    color: 'Transparente',
    stock: 25,
    minStock: 5,
    precio: 460000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2602',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-003',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Monofocal SmartLife DuraVision Platinum Trivex',
    color: 'Transparente (Seguridad extrema)',
    stock: 12,
    minStock: 3,
    precio: 520000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2603',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-004',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Monofocal SmartLife DuraVision BlueProtect 1.60',
    color: 'Transparente (Filtro Azul)',
    stock: 15,
    minStock: 3,
    precio: 580000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2604',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-005',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Monofocal SmartLife DuraVision Platinum 1.67',
    color: 'Transparente',
    stock: 10,
    minStock: 3,
    precio: 680000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2605',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-006',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Monofocal SmartLife DuraVision Platinum 1.74',
    color: 'Transparente (Extra Fino)',
    stock: 6,
    minStock: 2,
    precio: 850000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2606',
    vencimiento: '2031-12-31'
  },

  // -- Monofocales Básicos / Esféricos --
  {
    id: 'LEN-ZEI-007',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Monofocal Estándar LotuTec CR-39',
    color: 'Transparente',
    stock: 20,
    minStock: 5,
    precio: 130000,
    codigoInvima: 'INVIMA 2020DM-0020942',
    lote: 'L-ZEI-2607',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-008',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Monofocal Estándar LotuTec Policarbonato',
    color: 'Transparente',
    stock: 25,
    minStock: 5,
    precio: 180000,
    codigoInvima: 'INVIMA 2020DM-0020942',
    lote: 'L-ZEI-2608',
    vencimiento: '2031-12-31'
  },

  // -- Progresivos Zeiss Light 3D (Gama Media) --
  {
    id: 'LEN-ZEI-009',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Progresivo Light 3D LotuTec Policarbonato',
    color: 'Transparente',
    stock: 10,
    minStock: 2,
    precio: 590000,
    codigoInvima: 'INVIMA 2019DM-0019920',
    lote: 'L-ZEI-2609',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-010',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Progresivo Light 3D DuraVision Silver Poly',
    color: 'Transparente',
    stock: 10,
    minStock: 2,
    precio: 720000,
    codigoInvima: 'INVIMA 2019DM-0019920',
    lote: 'L-ZEI-2610',
    vencimiento: '2031-12-31'
  },

  // -- Progresivos SmartLife (Gama Premium) --
  {
    id: 'LEN-ZEI-011',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Progresivo SmartLife Pure DuraVision Platinum Poly',
    color: 'Transparente',
    stock: 8,
    minStock: 2,
    precio: 990000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2611',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-012',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Progresivo SmartLife Plus DuraVision Platinum Poly',
    color: 'Transparente',
    stock: 6,
    minStock: 2,
    precio: 1250000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2612',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-013',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Progresivo SmartLife Superb DuraVision Platinum Poly',
    color: 'Transparente',
    stock: 5,
    minStock: 1,
    precio: 1550000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2613',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-ZEI-014',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'Progresivo SmartLife Individual DuraVision Platinum 1.67',
    color: 'Transparente (Personalización al 100%)',
    stock: 4,
    minStock: 1,
    precio: 2050000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-ZEI-2614',
    vencimiento: '2031-12-31'
  },

  // -- Freno de Miopía Infantil --
  {
    id: 'LEN-ZEI-015',
    categoria: 'Lentes Oftálmicos',
    marca: 'Zeiss',
    modelo: 'MyoCare Poly DuraVision Kids (Freno miopía)',
    color: 'Transparente',
    stock: 12,
    minStock: 3,
    precio: 820000,
    codigoInvima: 'INVIMA 2023DM-0028114',
    lote: 'L-ZEI-2615',
    vencimiento: '2031-12-31'
  },

  // ==========================================
  // === 3. HOYA (Tecnología Japonesa) ===
  // ==========================================
  
  // -- Monofocales Hilux (Esféricos) --
  {
    id: 'LEN-HOY-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal Hilux CR-39 Hi-Vision Easy',
    color: 'Transparente',
    stock: 20,
    minStock: 4,
    precio: 120000,
    codigoInvima: 'INVIMA 2017DM-0016482',
    lote: 'L-HOY-2601',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-HOY-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal Hilux Poly Hi-Vision Easy',
    color: 'Transparente',
    stock: 25,
    minStock: 4,
    precio: 170000,
    codigoInvima: 'INVIMA 2019DM-0020194',
    lote: 'L-HOY-2602',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-HOY-003',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal Hilux Poly Hi-Vision LongLife',
    color: 'Transparente (Súper hidrofóbico)',
    stock: 18,
    minStock: 3,
    precio: 260000,
    codigoInvima: 'INVIMA 2019DM-0020194',
    lote: 'L-HOY-2603',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-HOY-004',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal Hilux Poly Hi-Vision BlueControl',
    color: 'Transparente (Filtro Azul)',
    stock: 15,
    minStock: 3,
    precio: 320000,
    codigoInvima: 'INVIMA 2019DM-0020194',
    lote: 'L-HOY-2604',
    vencimiento: '2031-12-31'
  },

  // -- Monofocales Nulux (Asféricos / Free Form) --
  {
    id: 'LEN-HOY-005',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal Asférico Nulux Poly Hi-Vision LongLife',
    color: 'Transparente',
    stock: 12,
    minStock: 3,
    precio: 360000,
    codigoInvima: 'INVIMA 2020DM-0021304',
    lote: 'L-HOY-2605',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-HOY-006',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal Asférico Nulux 1.60 Hi-Vision LongLife',
    color: 'Transparente',
    stock: 10,
    minStock: 2,
    precio: 420000,
    codigoInvima: 'INVIMA 2020DM-0021304',
    lote: 'L-HOY-2606',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-HOY-007',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal Asférico Nulux 1.67 Hi-Vision LongLife',
    color: 'Transparente',
    stock: 10,
    minStock: 2,
    precio: 520000,
    codigoInvima: 'INVIMA 2020DM-0021304',
    lote: 'L-HOY-2607',
    vencimiento: '2031-12-31'
  },

  // -- Monofocales Antifatiga (Nulux Active) --
  {
    id: 'LEN-HOY-008',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal Nulux Active Poly Hi-Vision BlueControl',
    color: 'Transparente (Filtro Azul)',
    stock: 12,
    minStock: 3,
    precio: 380000,
    codigoInvima: 'INVIMA 2021DM-0022984',
    lote: 'L-HOY-2608',
    vencimiento: '2031-12-31'
  },

  // -- Progresivos Hoya (Amplitude & Balansis) --
  {
    id: 'LEN-HOY-009',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Progresivo Amplitude Plus Poly Hi-Vision Easy',
    color: 'Transparente',
    stock: 10,
    minStock: 2,
    precio: 580000,
    codigoInvima: 'INVIMA 2019DM-0020194',
    lote: 'L-HOY-2609',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-HOY-010',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Progresivo Balansis Poly Hi-Vision LongLife',
    color: 'Transparente',
    stock: 8,
    minStock: 2,
    precio: 980000,
    codigoInvima: 'INVIMA 2020DM-0021304',
    lote: 'L-HOY-2610',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-HOY-011',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Progresivo Balansis Poly Hi-Vision BlueControl',
    color: 'Transparente (Filtro Azul)',
    stock: 8,
    minStock: 2,
    precio: 1050000,
    codigoInvima: 'INVIMA 2020DM-0021304',
    lote: 'L-HOY-2611',
    vencimiento: '2031-12-31'
  },

  // -- Progresivo Alta Gama MySelf --
  {
    id: 'LEN-HOY-012',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Progresivo MySelf Poly Hi-Vision LongLife',
    color: 'Transparente (Gama Premium)',
    stock: 5,
    minStock: 1,
    precio: 1750000,
    codigoInvima: 'INVIMA 2022DM-0026194',
    lote: 'L-HOY-2612',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-HOY-013',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Progresivo MySelf 1.67 Hi-Vision LongLife',
    color: 'Transparente',
    stock: 4,
    minStock: 1,
    precio: 2100000,
    codigoInvima: 'INVIMA 2022DM-0026194',
    lote: 'L-HOY-2613',
    vencimiento: '2031-12-31'
  },

  // -- Freno de Miopía Infantil --
  {
    id: 'LEN-HOY-014',
    categoria: 'Lentes Oftálmicos',
    marca: 'Hoya',
    modelo: 'Monofocal MiYOSMART Poly (Tratamiento Freno Miopía)',
    color: 'Transparente',
    stock: 15,
    minStock: 3,
    precio: 890000,
    codigoInvima: 'INVIMA 2023DM-0028190',
    lote: 'L-HOY-2614',
    vencimiento: '2031-12-31'
  },

  // ==========================================
  // === 4. SHAMIR (Innovación Israelí) ===
  // ==========================================
  
  // -- Monofocales Glacier --
  {
    id: 'LEN-SHA-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Monofocal Altius HMC CR-39',
    color: 'Transparente',
    stock: 20,
    minStock: 5,
    precio: 110000,
    codigoInvima: 'INVIMA 2018DM-0017992',
    lote: 'L-SHA-2601',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Monofocal Glacier Plus UV Policarbonato',
    color: 'Transparente',
    stock: 25,
    minStock: 5,
    precio: 240000,
    codigoInvima: 'INVIMA 2020DM-0021590',
    lote: 'L-SHA-2602',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-003',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Monofocal Glacier Plus UV Trivex',
    color: 'Transparente',
    stock: 10,
    minStock: 3,
    precio: 310000,
    codigoInvima: 'INVIMA 2020DM-0021590',
    lote: 'L-SHA-2603',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-004',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Monofocal Glacier Blue Shield Poly',
    color: 'Transparente (Filtro Azul)',
    stock: 18,
    minStock: 3,
    precio: 330000,
    codigoInvima: 'INVIMA 2021DM-0023401',
    lote: 'L-SHA-2604',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-005',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Monofocal Glacier Expression Poly (Antirreflejo Estética)',
    color: 'Transparente',
    stock: 15,
    minStock: 3,
    precio: 350000,
    codigoInvima: 'INVIMA 2021DM-0023401',
    lote: 'L-SHA-2605',
    vencimiento: '2031-12-31'
  },

  // -- Progresivos Shamir (Genesis & Spectrum) --
  {
    id: 'LEN-SHA-006',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Progresivo Genesis Glacier Plus Poly',
    color: 'Transparente',
    stock: 12,
    minStock: 2,
    precio: 520000,
    codigoInvima: 'INVIMA 2020DM-0021590',
    lote: 'L-SHA-2606',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-007',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Progresivo Spectrum V Glacier Plus Poly',
    color: 'Transparente (Diseño Corredor Dinámico)',
    stock: 8,
    minStock: 2,
    precio: 820000,
    codigoInvima: 'INVIMA 2020DM-0021590',
    lote: 'L-SHA-2607',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-008',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Progresivo Spectrum V Glacier Plus 1.60',
    color: 'Transparente',
    stock: 8,
    minStock: 2,
    precio: 920000,
    codigoInvima: 'INVIMA 2020DM-0021590',
    lote: 'L-SHA-2608',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-009',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Progresivo Autograph InTouch Poly Glacier Plus (Portátiles)',
    color: 'Transparente',
    stock: 6,
    minStock: 2,
    precio: 980000,
    codigoInvima: 'INVIMA 2021DM-0023401',
    lote: 'L-SHA-2609',
    vencimiento: '2031-12-31'
  },

  // -- Progresivo Premium Inteligencia Artificial (Autograph Intelligence) --
  {
    id: 'LEN-SHA-010',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Progresivo Autograph Intelligence Poly Glacier Premium',
    color: 'Transparente',
    stock: 5,
    minStock: 1,
    precio: 1550000,
    codigoInvima: 'INVIMA 2022DM-0026941',
    lote: 'L-SHA-2610',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-011',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Progresivo Autograph Intelligence 1.67 Glacier Premium',
    color: 'Transparente',
    stock: 4,
    minStock: 1,
    precio: 1850000,
    codigoInvima: 'INVIMA 2022DM-0026941',
    lote: 'L-SHA-2611',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-012',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Progresivo Autograph Intelligence 1.74 Glacier Premium',
    color: 'Transparente (El más delgado de Shamir)',
    stock: 3,
    minStock: 1,
    precio: 2150000,
    codigoInvima: 'INVIMA 2022DM-0026941',
    lote: 'L-SHA-2612',
    vencimiento: '2031-12-31'
  },

  // -- Ocupacionales (Trabajo en Oficina/Computador) --
  {
    id: 'LEN-SHA-013',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Ocupacional WorkSpace Poly Glacier Plus (Cerca/Intermedio/Lejos)',
    color: 'Transparente',
    stock: 10,
    minStock: 2,
    precio: 490000,
    codigoInvima: 'INVIMA 2020DM-0021590',
    lote: 'L-SHA-2613',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-SHA-014',
    categoria: 'Lentes Oftálmicos',
    marca: 'Shamir',
    modelo: 'Ocupacional Computer Poly Glacier Plus (Cerca/Intermedio)',
    color: 'Transparente',
    stock: 12,
    minStock: 2,
    precio: 450000,
    codigoInvima: 'INVIMA 2020DM-0021590',
    lote: 'L-SHA-2614',
    vencimiento: '2031-12-31'
  },

  // ==========================================
  // === 5. TRANSITIONS (Fotocromáticos Líderes) ===
  // ==========================================
  
  // -- Transitions Signature Gen 8 (Cambio rápido) --
  {
    id: 'LEN-TRA-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Monofocal Transitions Gen 8 Gris CR-39 Crizal Easy',
    color: 'Gris Fotocromático',
    stock: 15,
    minStock: 3,
    precio: 340000,
    codigoInvima: 'INVIMA 2020DM-0021943',
    lote: 'L-TRA-2601',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Monofocal Transitions Gen 8 Gris Poly Crizal Sapphire HR',
    color: 'Gris Fotocromático',
    stock: 20,
    minStock: 4,
    precio: 490000,
    codigoInvima: 'INVIMA 2020DM-0021943',
    lote: 'L-TRA-2602',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-003',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Monofocal Transitions Gen 8 Café Poly Crizal Sapphire HR',
    color: 'Marrón Fotocromático',
    stock: 15,
    minStock: 3,
    precio: 490000,
    codigoInvima: 'INVIMA 2020DM-0021943',
    lote: 'L-TRA-2603',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-004',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Monofocal Transitions Gen 8 Verde Poly Crizal Sapphire HR',
    color: 'Verde Esmeralda Fotocromático',
    stock: 12,
    minStock: 3,
    precio: 490000,
    codigoInvima: 'INVIMA 2020DM-0021943',
    lote: 'L-TRA-2604',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-005',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Monofocal Transitions Gen 8 Gris Alto Índice 1.60 Crizal Sapphire',
    color: 'Gris Fotocromático',
    stock: 10,
    minStock: 2,
    precio: 590000,
    codigoInvima: 'INVIMA 2020DM-0021943',
    lote: 'L-TRA-2605',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-006',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Monofocal Transitions Gen 8 Gris Alto Índice 1.67 Crizal Sapphire',
    color: 'Gris Fotocromático',
    stock: 10,
    minStock: 2,
    precio: 690000,
    codigoInvima: 'INVIMA 2020DM-0021943',
    lote: 'L-TRA-2606',
    vencimiento: '2031-12-31'
  },

  // -- Transitions XTRActive (Extra Oscuros en exteriores y actúan en el auto) --
  {
    id: 'LEN-TRA-007',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Monofocal Transitions XTRActive Gris Poly Crizal Sapphire HR',
    color: 'Gris Extra Oscuro',
    stock: 12,
    minStock: 2,
    precio: 580000,
    codigoInvima: 'INVIMA 2021DM-0023481',
    lote: 'L-TRA-2607',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-008',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Monofocal Transitions XTRActive New Generation 1.60 Crizal Sapphire',
    color: 'Gris Extra Oscuro',
    stock: 8,
    minStock: 2,
    precio: 680000,
    codigoInvima: 'INVIMA 2021DM-0023481',
    lote: 'L-TRA-2608',
    vencimiento: '2031-12-31'
  },

  // -- Progresivos fotocromáticos integrados --
  {
    id: 'LEN-TRA-009',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Varilux Comfort Max Transitions Gen 8 Poly Crizal Sapphire',
    color: 'Gris Fotocromático',
    stock: 6,
    minStock: 1,
    precio: 1380000,
    codigoInvima: 'INVIMA 2020DM-0021943',
    lote: 'L-TRA-2609',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-010',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Zeiss SmartLife Plus Transitions Gen 8 Poly DuraVision Platinum',
    color: 'Gris Fotocromático',
    stock: 5,
    minStock: 1,
    precio: 1620000,
    codigoInvima: 'INVIMA 2021DM-0023190',
    lote: 'L-TRA-2610',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-011',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Hoya Balansis Sensity Poly Hi-Vision LongLife (Fotocromático Hoya)',
    color: 'Gris Fotocromático Sensity',
    stock: 5,
    minStock: 1,
    precio: 1280000,
    codigoInvima: 'INVIMA 2020DM-0021304',
    lote: 'L-TRA-2611',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-TRA-012',
    categoria: 'Lentes Oftálmicos',
    marca: 'Transitions',
    modelo: 'Shamir Spectrum V Transitions Gen 8 Poly Glacier Plus',
    color: 'Gris Fotocromático',
    stock: 6,
    minStock: 1,
    precio: 1120000,
    codigoInvima: 'INVIMA 2020DM-0021590',
    lote: 'L-TRA-2612',
    vencimiento: '2031-12-31'
  },

  // ==========================================
  // === 6. KODAK LENS (Línea de Essilor) ===
  // ==========================================
  {
    id: 'LEN-KOD-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Kodak',
    modelo: 'Monofocal Kodak Clean\'N\'Clever CR-39',
    color: 'Transparente',
    stock: 20,
    minStock: 5,
    precio: 950000,
    codigoInvima: 'INVIMA 2018DM-0018243',
    lote: 'L-KOD-2601',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-KOD-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Kodak',
    modelo: 'Monofocal Kodak Clean\'N\'Clever Policarbonato',
    color: 'Transparente',
    stock: 25,
    minStock: 5,
    precio: 150000,
    codigoInvima: 'INVIMA 2018DM-0018243',
    lote: 'L-KOD-2602',
    vencimiento: '2031-12-31'
  },
  {
    id: 'LEN-KOD-003',
    categoria: 'Lentes Oftálmicos',
    marca: 'Kodak',
    modelo: 'Progresivo Kodak Unique Poly Clean\'N\'Clever',
    color: 'Transparente (Gama Económica)',
    stock: 12,
    minStock: 2,
    precio: 480000,
    codigoInvima: 'INVIMA 2019DM-0019401',
    lote: 'L-KOD-2603',
    vencimiento: '2031-12-31'
  },

  // ==========================================
  // === 7. MEGALENS DIGITAL LAB (Locales) ===
  // ==========================================
  {
    id: 'LEN-MEG-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Megalens',
    modelo: 'Megalens Digital Mono HD Policarbonato',
    color: 'Transparente',
    stock: 18,
    minStock: 5,
    precio: 180000,
    codigoInvima: 'INVIMA 2022DM-0025983',
    lote: 'L-MEG-2601',
    vencimiento: '2032-06-30'
  },
  {
    id: 'LEN-MEG-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Megalens',
    modelo: 'Megalens Digital Mono HD Alto Índice 1.67',
    color: 'Transparente',
    stock: 10,
    minStock: 3,
    precio: 340000,
    codigoInvima: 'INVIMA 2022DM-0025983',
    lote: 'L-MEG-2602',
    vencimiento: '2032-06-30'
  },
  {
    id: 'LEN-MEG-003',
    categoria: 'Lentes Oftálmicos',
    marca: 'Megalens',
    modelo: 'Megalens Infinity HD Progresivo Policarbonato',
    color: 'Transparente',
    stock: 8,
    minStock: 2,
    precio: 560000,
    codigoInvima: 'INVIMA 2023DM-0027110',
    lote: 'L-MEG-2603',
    vencimiento: '2032-06-30'
  },
  {
    id: 'LEN-MEG-004',
    categoria: 'Lentes Oftálmicos',
    marca: 'Megalens',
    modelo: 'Megalens Office Relax Ocupacional Poly',
    color: 'Transparente',
    stock: 12,
    minStock: 3,
    precio: 380000,
    codigoInvima: 'INVIMA 2023DM-0027110',
    lote: 'L-MEG-2604',
    vencimiento: '2032-06-30'
  },

  // ==========================================
  // === 8. LAB ÓPTICO ALIENS S.A.S. (Locales) ===
  // ==========================================
  {
    id: 'LEN-ALI-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Aliens',
    modelo: 'Aliens Digital Space CR-39',
    color: 'Transparente',
    stock: 15,
    minStock: 4,
    precio: 120000,
    codigoInvima: 'INVIMA 2021DM-0023405',
    lote: 'L-ALI-2601',
    vencimiento: '2032-03-31'
  },
  {
    id: 'LEN-ALI-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Aliens',
    modelo: 'Aliens Digital Space Policarbonato',
    color: 'Transparente',
    stock: 22,
    minStock: 5,
    precio: 165000,
    codigoInvima: 'INVIMA 2021DM-0023405',
    lote: 'L-ALI-2602',
    vencimiento: '2032-03-31'
  },
  {
    id: 'LEN-ALI-003',
    categoria: 'Lentes Oftálmicos',
    marca: 'Aliens',
    modelo: 'Aliens Invader Progresivo FreeForm Policarbonato',
    color: 'Transparente',
    stock: 10,
    minStock: 2,
    precio: 490000,
    codigoInvima: 'INVIMA 2022DM-0024881',
    lote: 'L-ALI-2603',
    vencimiento: '2032-03-31'
  },
  {
    id: 'LEN-ALI-004',
    categoria: 'Lentes Oftálmicos',
    marca: 'Aliens',
    modelo: 'Aliens Invader Progresivo FreeForm Alto Índice 1.67',
    color: 'Transparente',
    stock: 6,
    minStock: 2,
    precio: 680000,
    codigoInvima: 'INVIMA 2022DM-0024881',
    lote: 'L-ALI-2604',
    vencimiento: '2032-03-31'
  },

  // ==========================================
  // === 9. AUSTRAL LENS COLOMBIA (Locales) ===
  // ==========================================
  {
    id: 'LEN-AUS-001',
    categoria: 'Lentes Oftálmicos',
    marca: 'Austral',
    modelo: 'Austral Sport Active Poly',
    color: 'Gris Polarizado (Envolvente)',
    stock: 8,
    minStock: 2,
    precio: 380000,
    codigoInvima: 'INVIMA 2020DM-0022091',
    lote: 'L-AUS-2601',
    vencimiento: '2032-01-31'
  },
  {
    id: 'LEN-AUS-002',
    categoria: 'Lentes Oftálmicos',
    marca: 'Austral',
    modelo: 'Austral Office Relax Poly',
    color: 'Transparente (Filtro Azul)',
    stock: 12,
    minStock: 3,
    precio: 290000,
    codigoInvima: 'INVIMA 2020DM-0022091',
    lote: 'L-AUS-2602',
    vencimiento: '2032-01-31'
  },

  // ==========================================
  // === 10. LENTES DE CONTACTO (Globales) ===
  // ==========================================
  {
    id: 'LDC-ALC-001',
    categoria: 'Lentes de Contacto',
    marca: 'Alcon',
    modelo: 'Precision1 (Caja x30)',
    color: 'Transparente',
    stock: 30,
    minStock: 10,
    precio: 160000,
    codigoInvima: 'INVIMA 2019DM-0020112',
    lote: 'L-LDC-ALC01',
    vencimiento: '2030-05-31'
  },
  {
    id: 'LDC-ALC-002',
    categoria: 'Lentes de Contacto',
    marca: 'Alcon',
    modelo: 'Dailies Total1 (Caja x30)',
    color: 'Transparente',
    stock: 20,
    minStock: 5,
    precio: 240000,
    codigoInvima: 'INVIMA 2018DM-0019284',
    lote: 'L-LDC-ALC02',
    vencimiento: '2030-04-30'
  },
  {
    id: 'LDC-ALC-003',
    categoria: 'Lentes de Contacto',
    marca: 'Alcon',
    modelo: 'Air Optix HydraGlyde Multifocal (Caja x6)',
    color: 'Transparente',
    stock: 15,
    minStock: 5,
    precio: 280000,
    codigoInvima: 'INVIMA 2019DM-0020583',
    lote: 'L-LDC-ALC03',
    vencimiento: '2030-06-30'
  },
  {
    id: 'LDC-COP-001',
    categoria: 'Lentes de Contacto',
    marca: 'CooperVision',
    modelo: 'Biofinity Esférico (Caja x6)',
    color: 'Transparente',
    stock: 40,
    minStock: 15,
    precio: 190000,
    codigoInvima: 'INVIMA 2020DM-0021594',
    lote: 'L-LDC-COP01',
    vencimiento: '2030-10-31'
  },
  {
    id: 'LDC-COP-002',
    categoria: 'Lentes de Contacto',
    marca: 'CooperVision',
    modelo: 'Biofinity Toric Astigmatismo (Caja x6)',
    color: 'Transparente',
    stock: 25,
    minStock: 10,
    precio: 230000,
    codigoInvima: 'INVIMA 2020DM-0021594',
    lote: 'L-LDC-COP02',
    vencimiento: '2030-10-31'
  },
  {
    id: 'LDC-COP-003',
    categoria: 'Lentes de Contacto',
    marca: 'CooperVision',
    modelo: 'Clariti 1-Day (Caja x30)',
    color: 'Transparente',
    stock: 20,
    minStock: 5,
    precio: 145000,
    codigoInvima: 'INVIMA 2021DM-0022419',
    lote: 'L-LDC-COP03',
    vencimiento: '2030-12-31'
  },
  {
    id: 'LDC-BUL-001',
    categoria: 'Lentes de Contacto',
    marca: 'Bausch & Lomb',
    modelo: 'Ultra Esférico (Caja x6)',
    color: 'Transparente',
    stock: 30,
    minStock: 10,
    precio: 185000,
    codigoInvima: 'INVIMA 2017DM-0016928',
    lote: 'L-LDC-BUL01',
    vencimiento: '2030-08-31'
  },
  {
    id: 'LDC-BUL-002',
    categoria: 'Lentes de Contacto',
    marca: 'Bausch & Lomb',
    modelo: 'Biotrue ONEday (Caja x30)',
    color: 'Transparente',
    stock: 25,
    minStock: 5,
    precio: 155000,
    codigoInvima: 'INVIMA 2018DM-0018491',
    lote: 'L-LDC-BUL02',
    vencimiento: '2030-09-30'
  }
];

export const LENTES_COMERCIALES_CATALOGO: ProductoInventario[] = CATALOGO_RAW.map(item => {
  let proveedorId = 'PROV-001'; // Default: Co-Opticas S.A.S
  
  const marcaLower = item.marca.toLowerCase();
  if (marcaLower.includes('essilor') || marcaLower.includes('transitions') || marcaLower.includes('kodak')) {
    proveedorId = 'PROV-003'; // Servioptica S.A.S.
  } else if (marcaLower.includes('zeiss')) {
    proveedorId = 'PROV-004'; // Zeiss Colombia
  } else if (marcaLower.includes('hoya')) {
    proveedorId = 'PROV-005'; // Optecom S.A.S.
  } else if (marcaLower.includes('aliens')) {
    proveedorId = 'PROV-006'; // Laboratorio Aliens S.A.S.
  } else if (marcaLower.includes('shamir') || marcaLower.includes('austral')) {
    proveedorId = 'PROV-007'; // Austral Lens Colombia S.A.S.
  } else if (marcaLower.includes('megalens')) {
    proveedorId = 'PROV-008'; // Megalens Digital Lab
  } else if (item.categoria === 'Lentes de Contacto') {
    if (marcaLower.includes('alcon') || marcaLower.includes('air optix') || marcaLower.includes('acuvue')) {
      proveedorId = 'PROV-005'; // Optecom S.A.S. distribuye Alcon/Acuvue
    } else {
      proveedorId = 'PROV-001'; // Co-Opticas S.A.S. distribuye CooperVision, Bausch & Lomb
    }
  }

  return {
    ...item,
    proveedorId,
    precioCompra: item.precioCompra ?? Math.round(item.precio * 0.5),
    precioVenta: item.precioVenta ?? item.precio,
    codigoBarras: item.codigoBarras ?? item.id
  };
});
