// Mapa muscular de ejercicio (Fase 9b).
//
// Un solo cuerpo SVG (frente y espalda) con regiones coloreables. Los 59 del
// catálogo tienen entrada explícita (src/lib/exerciseMuscleMap.json), comprobada
// por scripts/check-icons.ts. Si el ejercicio no está en el mapa (uno creado
// por el usuario): patrón de movimiento → músculo principal → null (icono neutro).
//
// Las rutas del cuerpo proceden de react-native-body-highlighter
// (MIT, © 2022 ELABBASSI Hicham). Ver src/assets/MUSCLE_BODY_LICENSE.txt.

import catalogMap from './exerciseMuscleMap.json';

export const MUSCLE_IDS = [
  'chest',
  'front_deltoid',
  'rear_deltoid',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'quadriceps',
  'adductors',
  'calves',
  'trapezius',
  'lats',
  'lower_back',
  'glutes',
  'hamstrings',
  'tibialis',
  'neck',
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];
export type MuscleView = 'front' | 'back';
export type MuscleFocus = 'full' | 'upper' | 'lower';

export interface MuscleHighlight {
  primary: MuscleId[];
  secondary: MuscleId[];
  view: MuscleView;
  focus: MuscleFocus;
}

export function normalizeExerciseName(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const EXERCISE_MUSCLE_BY_NAME: Record<string, MuscleHighlight> = catalogMap as Record<string, MuscleHighlight>;

// Si el ejercicio no está en el mapa (creado por el usuario): patrón de movimiento…
export const MUSCLE_BY_PATTERN: Record<string, MuscleHighlight> = {
  abduccion_cadera: { primary: ['glutes'], secondary: [], view: 'back', focus: 'lower' },
  abduccion_hombro: { primary: ['front_deltoid'], secondary: ['trapezius'], view: 'front', focus: 'upper' },
  abduccion_horizontal: { primary: ['rear_deltoid'], secondary: ['trapezius'], view: 'back', focus: 'upper' },
  aduccion_hombro: { primary: ['chest'], secondary: ['front_deltoid'], view: 'front', focus: 'upper' },
  anti_extension: { primary: ['abs'], secondary: ['obliques'], view: 'front', focus: 'upper' },
  anti_rotacion: { primary: ['obliques'], secondary: ['abs'], view: 'front', focus: 'upper' },
  bisagra_cadera: { primary: ['hamstrings'], secondary: ['glutes', 'lower_back'], view: 'back', focus: 'lower' },
  empuje_horizontal: { primary: ['chest'], secondary: ['front_deltoid', 'triceps'], view: 'front', focus: 'upper' },
  empuje_vertical: { primary: ['front_deltoid'], secondary: ['triceps', 'trapezius'], view: 'front', focus: 'upper' },
  extension_cadera: { primary: ['glutes'], secondary: ['hamstrings'], view: 'back', focus: 'lower' },
  extension_codo: { primary: ['triceps'], secondary: ['forearm'], view: 'back', focus: 'upper' },
  extension_hombro: { primary: ['lats'], secondary: ['chest'], view: 'back', focus: 'upper' },
  extension_rodilla: { primary: ['quadriceps'], secondary: [], view: 'front', focus: 'lower' },
  flexion_cadera: { primary: ['abs'], secondary: ['obliques'], view: 'front', focus: 'upper' },
  flexion_codo: { primary: ['biceps'], secondary: ['forearm'], view: 'front', focus: 'upper' },
  flexion_columna: { primary: ['abs'], secondary: ['obliques'], view: 'front', focus: 'upper' },
  flexion_plantar: { primary: ['calves'], secondary: [], view: 'back', focus: 'lower' },
  flexion_rodilla: { primary: ['hamstrings'], secondary: ['calves'], view: 'back', focus: 'lower' },
  sentadilla: { primary: ['quadriceps'], secondary: ['glutes', 'adductors'], view: 'front', focus: 'lower' },
  traccion_horizontal: { primary: ['lats'], secondary: ['rear_deltoid', 'biceps'], view: 'back', focus: 'upper' },
  traccion_vertical: { primary: ['lats'], secondary: ['biceps', 'rear_deltoid'], view: 'back', focus: 'upper' },
  zancada: { primary: ['quadriceps'], secondary: ['glutes', 'hamstrings'], view: 'front', focus: 'lower' },
};

// …y después el músculo principal (primera coincidencia).
export const MUSCLE_BY_MUSCLE: Array<[string, MuscleHighlight]> = [
  ['pectoral', { primary: ['chest'], secondary: [], view: 'front', focus: 'upper' }],
  ['pecho', { primary: ['chest'], secondary: [], view: 'front', focus: 'upper' }],
  ['deltoides lateral', { primary: ['front_deltoid'], secondary: [], view: 'front', focus: 'upper' }],
  ['deltoides posterior', { primary: ['rear_deltoid'], secondary: [], view: 'back', focus: 'upper' }],
  ['deltoides', { primary: ['front_deltoid'], secondary: [], view: 'front', focus: 'upper' }],
  ['hombro', { primary: ['front_deltoid'], secondary: [], view: 'front', focus: 'upper' }],
  ['dorsal', { primary: ['lats'], secondary: [], view: 'back', focus: 'upper' }],
  ['espalda', { primary: ['lats'], secondary: [], view: 'back', focus: 'upper' }],
  ['trapecio', { primary: ['trapezius'], secondary: [], view: 'back', focus: 'upper' }],
  ['triceps', { primary: ['triceps'], secondary: [], view: 'back', focus: 'upper' }],
  ['biceps', { primary: ['biceps'], secondary: [], view: 'front', focus: 'upper' }],
  ['braquial', { primary: ['biceps'], secondary: ['forearm'], view: 'front', focus: 'upper' }],
  ['gluteo', { primary: ['glutes'], secondary: [], view: 'back', focus: 'lower' }],
  ['isquio', { primary: ['hamstrings'], secondary: [], view: 'back', focus: 'lower' }],
  ['cuadriceps', { primary: ['quadriceps'], secondary: [], view: 'front', focus: 'lower' }],
  ['gemelo', { primary: ['calves'], secondary: [], view: 'back', focus: 'lower' }],
  ['core', { primary: ['abs'], secondary: ['obliques'], view: 'front', focus: 'upper' }],
  ['abdominal', { primary: ['abs'], secondary: ['obliques'], view: 'front', focus: 'upper' }],
  ['recto', { primary: ['abs'], secondary: [], view: 'front', focus: 'upper' }],
  ['oblicuo', { primary: ['obliques'], secondary: ['abs'], view: 'front', focus: 'upper' }],
];

export interface MuscleExercise {
  name?: string | null;
  target_muscle?: string | null;
  movement_pattern?: string | null;
}

export type MuscleSource = 'name' | 'pattern' | 'muscle' | 'none';

export function resolveExerciseMuscles(ex: MuscleExercise): { highlight: MuscleHighlight | null; source: MuscleSource } {
  const byName = EXERCISE_MUSCLE_BY_NAME[normalizeExerciseName(ex.name)];
  if (byName) return { highlight: byName, source: 'name' };
  const byPattern = ex.movement_pattern ? MUSCLE_BY_PATTERN[ex.movement_pattern] : undefined;
  if (byPattern) return { highlight: byPattern, source: 'pattern' };
  const muscle = normalizeExerciseName(ex.target_muscle);
  if (muscle) {
    for (const [needle, highlight] of MUSCLE_BY_MUSCLE) {
      if (muscle.includes(needle)) return { highlight, source: 'muscle' };
    }
  }
  return { highlight: null, source: 'none' };
}
