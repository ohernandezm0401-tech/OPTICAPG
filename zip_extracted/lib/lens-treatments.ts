import { TratamientoLente } from './types';

export interface TreatmentOption<T> {
  id: T;
  label: string;
  price: number;
  description?: string;
  manufacturer?: string;
}

export const DISENO_OPTIONS: TreatmentOption<TratamientoLente['diseno']>[] = [
  { id: 'monofocal', label: 'Monofocal (Visión Sencilla)', price: 0, description: 'Corrección para una sola distancia visual (cerca o lejos).' },
  { id: 'bifocal', label: 'Bifocal', price: 60000, description: 'Dos campos visuales distintos (lejos y cerca) separados por una línea visible (Flattop).' },
  { id: 'progresivo', label: 'Progresivo (Multifocal)', price: 150000, description: 'Transición gradual entre visión de lejos, intermedia y cerca sin líneas divisorias.' },
  { id: 'ocupacional', label: 'Ocupacional (Mid-Distance)', price: 120000, description: 'Optimizado para distancias intermedias y de cerca. Ideal para oficina y pantallas.' }
];

export const FABRICACION_OPTIONS: TreatmentOption<TratamientoLente['fabricacion']>[] = [
  { id: 'terminado', label: 'Terminado (Stock / Moldeado)', price: 0, description: 'Lente pre-fabricado en fábrica. Rápido y económico.' },
  { id: 'tallado-convencional', label: 'Tallado Convencional', price: 50000, description: 'Tallado mecánico en laboratorio según la receta específica del paciente.' },
  { id: 'freeform', label: 'Freeform Digital', price: 120000, description: 'Tallado digital punto por punto de alta precisión. Máxima nitidez y campos visuales amplios.' }
];

export const MATERIAL_OPTIONS: TreatmentOption<TratamientoLente['material']>[] = [
  { id: 'cr39', label: 'CR-39 / Resina (Índice 1.50)', price: 0, description: 'Excelente claridad óptica (Abbe 58). Recomendado para fórmulas bajas (hasta ±2.00 D).' },
  { id: 'policarbonato', label: 'Policarbonato (Índice 1.59)', price: 40000, description: 'Altamente resistente a impactos y liviano. Recomendado para niños, deportistas y fórmulas moderadas.' },
  { id: 'trivex', label: 'Trivex (Índice 1.53)', price: 80000, description: 'Excelente nitidez óptica (Abbe 45) y resistencia extrema al impacto. Ideal para monturas al aire.' },
  { id: '1.60', label: 'Alto Índice 1.60', price: 90000, description: 'Lente más delgado y estético. Recomendado para fórmulas entre ±2.00 D y ±4.00 D.' },
  { id: '1.67', label: 'Alto Índice 1.67', price: 140000, description: 'Muy delgado y liviano. Recomendado para fórmulas altas (entre ±4.00 D y ±6.00 D).' },
  { id: '1.74', label: 'Ultra Alto Índice 1.74', price: 220000, description: 'El lente de resina más delgado y plano disponible. Para fórmulas superiores a ±6.00 D.' }
];

export const ANTIRREFLEJO_OPTIONS: TreatmentOption<string>[] = [
  { id: 'ninguno', label: 'Sin Antirreflejo (Básico)', price: 0 },
  { id: 'hmc-basico', label: 'HMC Básico', price: 30000, description: 'Antirreflejo estándar para reducir reflejos de luces artificiales.' },
  // Essilor
  { id: 'crizal-easy', label: 'Crizal Easy Pro', price: 80000, description: 'Fácil de limpiar, repele el polvo y el agua.', manufacturer: 'Essilor' },
  { id: 'crizal-rock', label: 'Crizal Rock', price: 140000, description: 'Alta resistencia a rayas y suciedad.', manufacturer: 'Essilor' },
  { id: 'crizal-sapphire', label: 'Crizal Sapphire HR', price: 200000, description: 'El antirreflejo más transparente con protección UV total.', manufacturer: 'Essilor' },
  // Zeiss
  { id: 'zeiss-lotutec', label: 'Zeiss LotuTec', price: 80000, description: 'Recubrimiento básico hidrofóbico y antirreflejo.', manufacturer: 'Zeiss' },
  { id: 'zeiss-duravision-silver', label: 'Zeiss DuraVision Silver', price: 140000, description: 'Excelente propiedades antirreflejantes y fácil limpieza.', manufacturer: 'Zeiss' },
  { id: 'zeiss-duravision-platinum', label: 'Zeiss DuraVision Platinum', price: 200000, description: 'Recubrimiento Zeiss extremadamente duro y resistente.', manufacturer: 'Zeiss' },
  // Hoya
  { id: 'hoya-hi-vision-easy', label: 'Hoya Hi-Vision Easy', price: 80000, description: 'Buena resistencia a rayas y repelencia al agua.', manufacturer: 'Hoya' },
  { id: 'hoya-hi-vision-longlife', label: 'Hoya Hi-Vision LongLife', price: 160000, description: 'Tratamiento ultra resistente y duradero de Hoya.', manufacturer: 'Hoya' },
  // Shamir
  { id: 'shamir-hmc', label: 'Shamir HMC', price: 70000, description: 'Antirreflejo básico de laboratorio Shamir.', manufacturer: 'Shamir' },
  { id: 'shamir-glacier-plus', label: 'Shamir Glacier Plus UV', price: 130000, description: 'Protección antirreflejo y contra rayos UV.', manufacturer: 'Shamir' }
];

export const FOTOCROMATICO_OPTIONS: TreatmentOption<TratamientoLente['fotocromatico']>[] = [
  { id: 'ninguno', label: 'Sin Fotocromático (Lente Claro)', price: 0 },
  { id: 'estandar', label: 'Fotocromático Estándar (Genérico)', price: 70000, description: 'Oscurecimiento básico al sol y aclarado en interiores.' },
  { id: 'transitions-gen8', label: 'Transitions Signature Gen 8', price: 160000, description: 'La última generación de Transitions. Rápida activación y aclarado.' },
  { id: 'transitions-xtractive', label: 'Transitions XTRActive', price: 220000, description: 'Extra oscuro al sol y se activa ligeramente detrás del parabrisas del auto.' },
  { id: 'sensity', label: 'Hoya Sensity', price: 180000, description: 'Tecnología fotocromática avanzada de Hoya. Gran rendimiento térmico.' }
];

export const FOTOCROMATICO_COLORS = [
  { id: 'gris', label: 'Gris (Neutral y natural)' },
  { id: 'cafe', label: 'Café / Marrón (Mejora el contraste)' },
  { id: 'verde', label: 'Verde G-15 (Estilo clásico y confort)' },
  { id: 'ambar', label: 'Ámbar (Ideal para baja luminosidad)' }
];

export const BLUE_BLOCK_OPTIONS = [
  { id: 'ninguno', label: 'Sin Filtro de Luz Azul', price: 0 },
  { id: 'crizal-prevencia', label: 'Crizal Prevencia (Essilor)', price: 60000, manufacturer: 'Essilor', description: 'Filtra selectivamente la luz azul perjudicial y deja pasar la benéfica.' },
  { id: 'duravision-blueprotect', label: 'DuraVision BlueProtect (Zeiss)', price: 65000, manufacturer: 'Zeiss', description: 'Atenúa la luz azul-violeta emitida por pantallas y luces LED.' },
  { id: 'hoya-bluecontrol', label: 'Hi-Vision BlueControl (Hoya)', price: 60000, manufacturer: 'Hoya', description: 'Mantiene los ojos en condiciones más relajadas frente a pantallas digitales.' },
  { id: 'glacier-blue-shield', label: 'Glacier Blue Shield (Shamir)', price: 55000, manufacturer: 'Shamir', description: 'Bloquea la radiación nociva de pantallas con reflejo residual mínimo.' },
  { id: 'estandar-blue', label: 'Filtro Azul Genérico', price: 40000, description: 'Protección básica contra fatiga visual digital.' }
];

/**
 * Validates lens treatment selections according to compatibility rules.
 */
export function validarCompatibilidadTratamientos(tratamiento: TratamientoLente): { compatible: boolean; alertas: string[] } {
  const alertas: string[] = [];

  // 1. Fotocromático + Blue Block -> Incompatible
  if (tratamiento.fotocromatico !== 'ninguno' && tratamiento.blueBlock) {
    alertas.push(
      'El tratamiento Fotocromático y el filtro de Luz Azul (Blue Block) no se recomiendan juntos: la tecnología fotocromática de última generación (como Transitions) ya cuenta con filtros nativos que bloquean hasta el 85% de la luz azul nociva. Seleccionar ambos generará costos duplicados innecesarios.'
    );
  }

  // 2. Bifocal + Freeform -> Incompatible
  if (tratamiento.diseno === 'bifocal' && tratamiento.fabricacion === 'freeform') {
    alertas.push(
      'La fabricación Freeform Digital no es compatible con el diseño Bifocal tradicional. Los lentes bifocales solo se pueden proveer en Terminado (Stock) o Tallado Convencional.'
    );
  }

  // 3. Alto Índice 1.74 + Transitions -> Solo disponible en Gen 8, no XTRActive
  if (tratamiento.material === '1.74' && tratamiento.fotocromatico === 'transitions-xtractive') {
    alertas.push(
      'El material Ultra Alto Índice 1.74 no está disponible comercialmente con la tecnología Transitions XTRActive en el laboratorio seleccionado. Cambie a Transitions Gen 8 o use Alto Índice 1.67.'
    );
  }

  // 4. Terminado + Progresivo -> Incompatible
  if (tratamiento.diseno === 'progresivo' && tratamiento.fabricacion === 'terminado') {
    alertas.push(
      'El diseño Progresivo (Multifocal) requiere un proceso de tallado personalizado y de alta precisión (Tallado Convencional o Freeform Digital). No existen progresivos pre-fabricados en stock (Terminados).'
    );
  }

  // 5. Terminado + Ocupacional -> Incompatible
  if (tratamiento.diseno === 'ocupacional' && tratamiento.fabricacion === 'terminado') {
    alertas.push(
      'El diseño Ocupacional requiere tallado digital personalizado en laboratorio según la distancia de trabajo del paciente. No está disponible en lentes Terminados.'
    );
  }

  // 6. Trivex + 1.74/1.67/1.60 -> El material Trivex es un material con índice 1.53, no se puede cruzar con otros índices
  // (Esto se maneja por el tipo de material ya que son opciones exclusivas, pero está bien documentado).

  // Determinate compatibility based on errors
  // Rules 2, 3, 4, 5 are hard errors. Rule 1 is a commercial/technical warning.
  const hasHardErrors = 
    (tratamiento.diseno === 'bifocal' && tratamiento.fabricacion === 'freeform') ||
    (tratamiento.material === '1.74' && tratamiento.fotocromatico === 'transitions-xtractive') ||
    (tratamiento.diseno === 'progresivo' && tratamiento.fabricacion === 'terminado') ||
    (tratamiento.diseno === 'ocupacional' && tratamiento.fabricacion === 'terminado');

  return {
    compatible: !hasHardErrors,
    alertas
  };
}

/**
 * Calculates incremental cost of lens treatments based on selection.
 */
export function calcularPrecioTratamientos(tratamiento: TratamientoLente): {
  total: number;
  desglose: { concepto: string; valor: number }[];
} {
  const desglose: { concepto: string; valor: number }[] = [];
  let total = 0;

  // Lente Base / Diseño
  const disenoOpt = DISENO_OPTIONS.find(d => d.id === tratamiento.diseno);
  if (disenoOpt && disenoOpt.price > 0) {
    desglose.push({ concepto: `Diseño: ${disenoOpt.label}`, valor: disenoOpt.price });
    total += disenoOpt.price;
  }

  // Fabricación
  const fabOpt = FABRICACION_OPTIONS.find(f => f.id === tratamiento.fabricacion);
  if (fabOpt && fabOpt.price > 0) {
    desglose.push({ concepto: `Fabricación: ${fabOpt.label}`, valor: fabOpt.price });
    total += fabOpt.price;
  }

  // Material
  const matOpt = MATERIAL_OPTIONS.find(m => m.id === tratamiento.material);
  if (matOpt && matOpt.price > 0) {
    desglose.push({ concepto: `Material: ${matOpt.label}`, valor: matOpt.price });
    total += matOpt.price;
  }

  // Antirreflejo
  const arOpt = ANTIRREFLEJO_OPTIONS.find(a => a.id === tratamiento.antirreflejo);
  if (arOpt && arOpt.price > 0) {
    desglose.push({ concepto: `Antirreflejo: ${arOpt.label}`, valor: arOpt.price });
    total += arOpt.price;
  }

  // Fotocromático
  const fotoOpt = FOTOCROMATICO_OPTIONS.find(f => f.id === tratamiento.fotocromatico);
  if (fotoOpt && fotoOpt.price > 0) {
    const colorStr = tratamiento.fotocromaticoColor ? ` (${tratamiento.fotocromaticoColor.toUpperCase()})` : '';
    desglose.push({ concepto: `Fotocromático: ${fotoOpt.label}${colorStr}`, valor: fotoOpt.price });
    total += fotoOpt.price;
  }

  // Blue Block
  if (tratamiento.blueBlock && tratamiento.blueBlockTipo) {
    const bbOpt = BLUE_BLOCK_OPTIONS.find(b => b.id === tratamiento.blueBlockTipo);
    if (bbOpt && bbOpt.price > 0) {
      desglose.push({ concepto: `Filtro Azul: ${bbOpt.label}`, valor: bbOpt.price });
      total += bbOpt.price;
    }
  }

  return {
    total,
    desglose
  };
}
