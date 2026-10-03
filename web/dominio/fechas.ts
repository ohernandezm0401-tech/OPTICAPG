// PLT-11 (T06) — Fechas de calendario en UTC (almacenamiento) con día civil
// `AAAA-MM-DD`. La presentación en `America/Bogota` la hace quien muestra;
// aquí no hay zona implícita distinta de la que el llamador pasa a
// `fechaCivilEnZona`.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parsearFechaIso(fecha: string): { anio: number; mes: number; dia: number } {
  const coincidencia = ISO.exec(fecha);
  if (!coincidencia) {
    throw new Error('la fecha debe tener la forma AAAA-MM-DD');
  }
  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    comprobacion.getUTCFullYear() !== anio ||
    comprobacion.getUTCMonth() !== mes - 1 ||
    comprobacion.getUTCDate() !== dia
  ) {
    throw new Error('la fecha no existe en el calendario');
  }
  return { anio, mes, dia };
}

export function desplazarDias(fecha: string, dias: number): string {
  if (!Number.isInteger(dias)) {
    throw new Error('el desplazamiento debe ser un número entero de días');
  }
  const { anio, mes, dia } = parsearFechaIso(fecha);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias));
  const anioR = resultado.getUTCFullYear();
  const mesR = String(resultado.getUTCMonth() + 1).padStart(2, '0');
  const diaR = String(resultado.getUTCDate()).padStart(2, '0');
  return `${anioR}-${mesR}-${diaR}`;
}

/** 0 = domingo … 6 = sábado, sobre el día civil (no sobre un instante local). */
export function diaSemana(fecha: string): number {
  const { anio, mes, dia } = parsearFechaIso(fecha);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/** Día civil de un instante en la zona indicada (p. ej. `America/Bogota`). */
export function fechaCivilEnZona(instante: Date, zonaHoraria: string): string {
  if (Number.isNaN(instante.getTime())) {
    throw new Error('el instante no es una fecha válida');
  }
  let formato: Intl.DateTimeFormat;
  try {
    formato = new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new Error('la zona horaria no es válida');
  }
  const partes = formato.formatToParts(instante);
  const anio = partes.find((p) => p.type === 'year')?.value;
  const mes = partes.find((p) => p.type === 'month')?.value;
  const dia = partes.find((p) => p.type === 'day')?.value;
  if (!anio || !mes || !dia) {
    throw new Error('no se pudo obtener el día civil en la zona horaria');
  }
  return `${anio}-${mes}-${dia}`;
}
