// Iconos de ejercicio: mapeo EXPLÍCITO nombre → ilustración (Fase 7).
//
// Antes se adivinaba por palabras sueltas del nombre dentro de WorkoutActive.tsx (y todo lo que no
// encajaba acababa con el icono de la prensa). Ahora:
//   1. mapa explícito de los 59 ejercicios del catálogo (comprobado por scripts/check-icons.ts),
//   2. si el ejercicio no está en el mapa (p. ej. uno creado por el usuario): patrón de movimiento,
//   3. después músculo principal,
//   4. y si nada encaja devuelve null (la interfaz pone un icono neutro en vez de uno equivocado).
//
// Solo hay 12 ilustraciones (public/icons4). Los ejercicios sin dibujo propio usan el de su grupo
// muscular; los huecos conocidos están en GAPS y en el informe de la Fase 7.

export const ICON_DIR = '/icons4/';
export const ICON_VERSION = '2';

export type IconKey =
  | 'banca' | 'curl' | 'gemelo' | 'hip' | 'hombro' | 'jalon'
  | 'lateral' | 'plancha' | 'prensa' | 'remo' | 'sentadilla' | 'triceps';

export const ICON_KEYS: IconKey[] = [
  'banca', 'curl', 'gemelo', 'hip', 'hombro', 'jalon', 'lateral', 'plancha', 'prensa', 'remo', 'sentadilla', 'triceps',
];

/** Qué dibuja cada ilustración (para decidir a ojo y para el informe). */
export const ICON_DESCRIPTION: Record<IconKey, string> = {
  banca: 'press banca con barra (pecho)',
  curl: 'curl de bíceps en máquina sentado',
  gemelo: 'elevación de gemelos de pie en máquina',
  hip: 'hip thrust con barra (glúteo / cadera)',
  hombro: 'press de hombros en máquina',
  jalon: 'jalón al pecho en polea (espalda vertical)',
  lateral: 'elevación lateral en máquina (deltoides)',
  plancha: 'plancha (core)',
  prensa: 'prensa de piernas (pierna en máquina)',
  remo: 'remo sentado en polea (espalda horizontal)',
  sentadilla: 'sentadilla con barra en jaula',
  triceps: 'extensión de tríceps en polea',
};

/** Ejercicios del catálogo sin ilustración propia (usan la de su grupo). */
export const GAPS = [
  'Curl femoral (los 3), Peso muerto rumano (2), Abducción de cadera, Patada de glúteo → hip (glúteo/cadera): falta dibujo de isquios / bisagra / abductora',
  'Crunch (2), Pallof press, Elevación de rodillas → plancha: falta dibujo de crunch / core dinámico',
  'Aperturas de pecho, Cruce de poleas → banca: falta dibujo de aperturas / poleas',
  'Pájaros en máquina, Face pull → lateral / remo: falta dibujo de deltoides posterior',
  'Extensión de cuádriceps → prensa: falta dibujo de la máquina de extensiones',
];

export function normalizeExerciseName(value?: string | null): string {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

// Nombre normalizado (minúsculas, sin tildes) → ilustración.
export const EXERCISE_ICON_BY_NAME: Record<string, IconKey> = {
  // Pecho
  'press banca plano': 'banca',
  'press banca con mancuernas': 'banca',
  'press inclinado con mancuernas 30 grados': 'banca',
  'press convergente de pecho': 'banca',
  'press inclinado en maquina': 'banca',
  'aperturas de pecho en maquina': 'banca',
  'cruce de poleas': 'banca',
  // Hombro
  'press militar con barra': 'hombro',
  'press de hombro con mancuernas agarre neutro': 'hombro',
  'press de hombros en maquina': 'hombro',
  'elevaciones laterales con mancuernas': 'lateral',
  'elevaciones laterales en maquina': 'lateral',
  'elevaciones laterales en polea': 'lateral',
  'pajaros en maquina': 'lateral',
  // Espalda
  'jalon al pecho agarre amplio': 'jalon',
  'jalon al pecho agarre neutro': 'jalon',
  'jalon unilateral en polea': 'jalon',
  'pullover en polea': 'jalon',
  'remo en maquina': 'remo',
  'remo con pecho apoyado': 'remo',
  'remo sentado en polea': 'remo',
  'remo unilateral en polea': 'remo',
  'remo unilateral con mancuerna': 'remo',
  'face pull': 'remo',
  // Brazos
  'curl con mancuernas': 'curl',
  'curl inclinado con mancuernas': 'curl',
  'curl martillo': 'curl',
  'curl de biceps en maquina': 'curl',
  'curl de biceps en polea': 'curl',
  'extension de triceps en polea': 'triceps',
  'extension de triceps con cuerda': 'triceps',
  'extension de triceps por encima de la cabeza': 'triceps',
  'press frances': 'triceps',
  // Pierna
  'prensa de piernas': 'prensa',
  'prensa unilateral': 'prensa',
  'extension de cuadriceps': 'prensa',
  'hack squat': 'sentadilla',
  'sentadilla libre': 'sentadilla',
  'sentadilla goblet': 'sentadilla',
  'sentadilla bulgara': 'sentadilla',
  'zancadas': 'sentadilla',
  'step-up': 'sentadilla',
  'elevacion de gemelos de pie': 'gemelo',
  'elevacion de gemelos sentado': 'gemelo',
  // Glúteo / isquios
  'hip thrust': 'hip',
  'hip thrust unilateral': 'hip',
  'extension de cadera en maquina': 'hip',
  'patada de gluteo en polea': 'hip',
  'abduccion de cadera en maquina': 'hip',
  'peso muerto rumano': 'hip',
  'peso muerto rumano con mancuernas': 'hip',
  'curl femoral': 'hip',
  'curl femoral sentado': 'hip',
  'curl femoral tumbado': 'hip',
  // Core
  'plancha': 'plancha',
  'pallof press': 'plancha',
  'crunch en maquina': 'plancha',
  'crunch en polea': 'plancha',
  'elevacion de rodillas': 'plancha',
};

// Si el ejercicio no está en el mapa (creado por el usuario): patrón de movimiento…
export const ICON_BY_PATTERN: Record<string, IconKey> = {
  abduccion_cadera: 'hip', abduccion_hombro: 'lateral', abduccion_horizontal: 'lateral',
  aduccion_hombro: 'banca', anti_extension: 'plancha', anti_rotacion: 'plancha', bisagra_cadera: 'hip',
  empuje_horizontal: 'banca', empuje_vertical: 'hombro', extension_cadera: 'hip', extension_codo: 'triceps',
  extension_hombro: 'jalon', extension_rodilla: 'prensa', flexion_cadera: 'plancha', flexion_codo: 'curl',
  flexion_columna: 'plancha', flexion_plantar: 'gemelo', flexion_rodilla: 'hip', sentadilla: 'sentadilla',
  traccion_horizontal: 'remo', traccion_vertical: 'jalon', zancada: 'sentadilla',
};

// …y después el músculo principal (primera coincidencia).
export const ICON_BY_MUSCLE: Array<[string, IconKey]> = [
  ['pectoral', 'banca'], ['pecho', 'banca'],
  ['deltoides lateral', 'lateral'], ['deltoides posterior', 'lateral'], ['deltoides', 'hombro'], ['hombro', 'hombro'],
  ['dorsal', 'jalon'], ['espalda', 'remo'], ['trapecio', 'remo'],
  ['triceps', 'triceps'], ['biceps', 'curl'], ['braquial', 'curl'],
  ['gluteo', 'hip'], ['isquio', 'hip'], ['cuadriceps', 'prensa'], ['gemelo', 'gemelo'],
  ['core', 'plancha'], ['abdominal', 'plancha'], ['oblicuo', 'plancha'],
];

export interface IconExercise {
  name?: string | null;
  target_muscle?: string | null;
  movement_pattern?: string | null;
}

export type IconSource = 'name' | 'pattern' | 'muscle' | 'none';

export function resolveExerciseIcon(ex: IconExercise): { key: IconKey | null; source: IconSource } {
  const byName = EXERCISE_ICON_BY_NAME[normalizeExerciseName(ex.name)];
  if (byName) return { key: byName, source: 'name' };
  const byPattern = ex.movement_pattern ? ICON_BY_PATTERN[ex.movement_pattern] : undefined;
  if (byPattern) return { key: byPattern, source: 'pattern' };
  const muscle = normalizeExerciseName(ex.target_muscle);
  if (muscle) {
    for (const [needle, key] of ICON_BY_MUSCLE) if (muscle.includes(needle)) return { key, source: 'muscle' };
  }
  return { key: null, source: 'none' };
}

export function exerciseIconSrc(ex: IconExercise): string | null {
  const { key } = resolveExerciseIcon(ex);
  return key ? `${ICON_DIR}${key}.jpg?v=${ICON_VERSION}` : null;
}
