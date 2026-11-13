// Iconos de ejercicio: mapeo EXPLÍCITO nombre → pictograma (Fase 9).
//
// 26 pictogramas SVG de trazo original (public/icons/), uno por patrón de
// movimiento o aparato. Los 59 del catálogo tienen entrada explícita
// (scripts/check-icons.ts). Si el ejercicio no está en el mapa (p. ej. uno
// creado por el usuario):
//   1. patrón de movimiento,
//   2. músculo principal,
//   3. si nada encaja, null (la interfaz pone un icono neutro).
//
// Los SVG son negros para usarse como máscara CSS y heredar currentColor
// (se leen bien en modo claro y en modo oscuro).

export const ICON_DIR = '/icons/';
export const ICON_EXT = '.svg';
export const ICON_VERSION = '9';

export type IconKey =
  | 'banca'
  | 'aperturas'
  | 'hombro'
  | 'lateral'
  | 'pajaros'
  | 'face_pull'
  | 'jalon'
  | 'remo'
  | 'pullover'
  | 'curl'
  | 'triceps'
  | 'triceps_alto'
  | 'sentadilla'
  | 'prensa'
  | 'extension_cuadriceps'
  | 'zancada'
  | 'gemelo'
  | 'hip'
  | 'peso_muerto'
  | 'curl_femoral'
  | 'abduccion'
  | 'patada_gluteo'
  | 'plancha'
  | 'crunch'
  | 'pallof'
  | 'elevacion_rodillas';

export const ICON_KEYS: IconKey[] = [
  'banca', 'aperturas', 'hombro', 'lateral', 'pajaros', 'face_pull',
  'jalon', 'remo', 'pullover', 'curl', 'triceps', 'triceps_alto',
  'sentadilla', 'prensa', 'extension_cuadriceps', 'zancada', 'gemelo',
  'hip', 'peso_muerto', 'curl_femoral', 'abduccion', 'patada_gluteo',
  'plancha', 'crunch', 'pallof', 'elevacion_rodillas',
];

/** Qué dibuja cada pictograma (para decidir a ojo y para el informe). */
export const ICON_DESCRIPTION: Record<IconKey, string> = {
  banca: 'press banca con barra (pecho, tumbado)',
  aperturas: 'aperturas de pecho / cruce de poleas',
  hombro: 'press de hombros (barra encima de la cabeza)',
  lateral: 'elevaciones laterales con mancuernas',
  pajaros: 'pájaros / deltoides posterior (brazos atrás)',
  face_pull: 'face pull (cuerda a la cara)',
  jalon: 'jalón al pecho en polea (espalda vertical)',
  remo: 'remo sentado en polea (espalda horizontal)',
  pullover: 'pullover en polea',
  curl: 'curl de bíceps con mancuerna',
  triceps: 'extensión de tríceps en polea (hacia abajo)',
  triceps_alto: 'extensión de tríceps por encima de la cabeza / press francés',
  sentadilla: 'sentadilla con barra',
  prensa: 'prensa de piernas',
  extension_cuadriceps: 'extensión de cuádriceps en máquina',
  zancada: 'zancada / sentadilla búlgara / step-up',
  gemelo: 'elevación de gemelos de pie (de puntillas)',
  hip: 'hip thrust con barra',
  peso_muerto: 'peso muerto rumano (bisagra de cadera)',
  curl_femoral: 'curl femoral tumbado',
  abduccion: 'abducción de cadera en máquina',
  patada_gluteo: 'patada de glúteo / extensión de cadera',
  plancha: 'plancha (core)',
  crunch: 'crunch',
  pallof: 'pallof press (anti-rotación)',
  elevacion_rodillas: 'elevación de rodillas (colgado)',
};

export function normalizeExerciseName(value?: string | null): string {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

// Nombre normalizado (minúsculas, sin tildes) → pictograma.
export const EXERCISE_ICON_BY_NAME: Record<string, IconKey> = {
  // Pecho
  'press banca plano': 'banca',
  'press banca con mancuernas': 'banca',
  'press inclinado con mancuernas 30 grados': 'banca',
  'press convergente de pecho': 'banca',
  'press inclinado en maquina': 'banca',
  'aperturas de pecho en maquina': 'aperturas',
  'cruce de poleas': 'aperturas',
  // Hombro
  'press militar con barra': 'hombro',
  'press de hombro con mancuernas agarre neutro': 'hombro',
  'press de hombros en maquina': 'hombro',
  'elevaciones laterales con mancuernas': 'lateral',
  'elevaciones laterales en maquina': 'lateral',
  'elevaciones laterales en polea': 'lateral',
  'pajaros en maquina': 'pajaros',
  'face pull': 'face_pull',
  // Espalda
  'jalon al pecho agarre amplio': 'jalon',
  'jalon al pecho agarre neutro': 'jalon',
  'jalon unilateral en polea': 'jalon',
  'pullover en polea': 'pullover',
  'remo en maquina': 'remo',
  'remo con pecho apoyado': 'remo',
  'remo sentado en polea': 'remo',
  'remo unilateral en polea': 'remo',
  'remo unilateral con mancuerna': 'remo',
  // Brazos
  'curl con mancuernas': 'curl',
  'curl inclinado con mancuernas': 'curl',
  'curl martillo': 'curl',
  'curl de biceps en maquina': 'curl',
  'curl de biceps en polea': 'curl',
  'extension de triceps en polea': 'triceps',
  'extension de triceps con cuerda': 'triceps',
  'extension de triceps por encima de la cabeza': 'triceps_alto',
  'press frances': 'triceps_alto',
  // Pierna
  'prensa de piernas': 'prensa',
  'prensa unilateral': 'prensa',
  'extension de cuadriceps': 'extension_cuadriceps',
  'hack squat': 'sentadilla',
  'sentadilla libre': 'sentadilla',
  'sentadilla goblet': 'sentadilla',
  'sentadilla bulgara': 'zancada',
  'zancadas': 'zancada',
  'step-up': 'zancada',
  'elevacion de gemelos de pie': 'gemelo',
  'elevacion de gemelos sentado': 'gemelo',
  // Glúteo / isquios
  'hip thrust': 'hip',
  'hip thrust unilateral': 'hip',
  'extension de cadera en maquina': 'patada_gluteo',
  'patada de gluteo en polea': 'patada_gluteo',
  'abduccion de cadera en maquina': 'abduccion',
  'peso muerto rumano': 'peso_muerto',
  'peso muerto rumano con mancuernas': 'peso_muerto',
  'curl femoral': 'curl_femoral',
  'curl femoral sentado': 'curl_femoral',
  'curl femoral tumbado': 'curl_femoral',
  // Core
  'plancha': 'plancha',
  'pallof press': 'pallof',
  'crunch en maquina': 'crunch',
  'crunch en polea': 'crunch',
  'elevacion de rodillas': 'elevacion_rodillas',
};

// Si el ejercicio no está en el mapa (creado por el usuario): patrón de movimiento…
export const ICON_BY_PATTERN: Record<string, IconKey> = {
  abduccion_cadera: 'abduccion',
  abduccion_hombro: 'lateral',
  abduccion_horizontal: 'pajaros',
  aduccion_hombro: 'aperturas',
  anti_extension: 'plancha',
  anti_rotacion: 'pallof',
  bisagra_cadera: 'peso_muerto',
  empuje_horizontal: 'banca',
  empuje_vertical: 'hombro',
  extension_cadera: 'hip',
  extension_codo: 'triceps',
  extension_hombro: 'pullover',
  extension_rodilla: 'extension_cuadriceps',
  flexion_cadera: 'elevacion_rodillas',
  flexion_codo: 'curl',
  flexion_columna: 'crunch',
  flexion_plantar: 'gemelo',
  flexion_rodilla: 'curl_femoral',
  sentadilla: 'sentadilla',
  traccion_horizontal: 'remo',
  traccion_vertical: 'jalon',
  zancada: 'zancada',
};

// …y después el músculo principal (primera coincidencia).
export const ICON_BY_MUSCLE: Array<[string, IconKey]> = [
  ['pectoral', 'banca'], ['pecho', 'banca'],
  ['deltoides lateral', 'lateral'], ['deltoides posterior', 'pajaros'], ['deltoides', 'hombro'], ['hombro', 'hombro'],
  ['dorsal', 'jalon'], ['espalda', 'remo'], ['trapecio', 'remo'],
  ['triceps', 'triceps'], ['biceps', 'curl'], ['braquial', 'curl'],
  ['gluteo', 'hip'], ['isquio', 'curl_femoral'], ['cuadriceps', 'sentadilla'], ['gemelo', 'gemelo'],
  ['core', 'plancha'], ['abdominal', 'crunch'], ['oblicuo', 'pallof'],
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
  return key ? `${ICON_DIR}${key}${ICON_EXT}?v=${ICON_VERSION}` : null;
}
