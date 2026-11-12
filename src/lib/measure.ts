// Tipo de medida de un ejercicio: 'reps' | 'time' | 'bodyweight'.
// La fuente de verdad es el backend (exercises.measure_type / recommendations.measure_type);
// la inferencia por nombre solo es el último recurso (historial, ejercicios antiguos sin dato).
export type MeasureType = 'reps' | 'time' | 'bodyweight';

const TIMED_KEYWORDS = [
  'plancha', 'isometric', 'wall sit', 'sentadilla en pared', 'dead hang', 'colgado estatic', 'hollow hold', 'l-sit', 'mantenid',
];

const strip = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function isTimedByName(name: unknown): boolean {
  const n = strip(name);
  return TIMED_KEYWORDS.some((k) => n.includes(k));
}

// measure_type de ejercicios conocidos por el servidor (se rellena al cargar las recomendaciones).
const knownMeasure: Record<string, MeasureType> = {};

export function rememberMeasure(exerciseId: unknown, measure: unknown): void {
  if (exerciseId && (measure === 'reps' || measure === 'time' || measure === 'bodyweight')) {
    knownMeasure[String(exerciseId)] = measure;
  }
}

export function measureOf(exercise: any): MeasureType {
  const ex = exercise?.exercise || exercise || {};
  const declared = ex.measure_type || exercise?.measure_type || knownMeasure[String(ex.id ?? '')];
  if (declared === 'time' || declared === 'bodyweight' || declared === 'reps') return declared;
  if (isTimedByName(ex.name)) return 'time';
  return 'reps';
}

export function isTimedExercise(exercise: any): boolean {
  return measureOf(exercise) === 'time';
}

// 2.5 -> "2,5"; 12 -> "12"
export function fmtKg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  return Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 });
}
