// Comprobación del mapa muscular (npm run check:icons).
import {
  EXERCISE_MUSCLE_BY_NAME, MUSCLE_BY_MUSCLE, MUSCLE_BY_PATTERN, MUSCLE_IDS,
  normalizeExerciseName, resolveExerciseMuscles, type MuscleId, type MuscleHighlight,
} from '../src/lib/exerciseMuscles';
import catalog from './catalog-snapshot.json';

type Ex = { name: string; target_muscle: string; category: string; equipment: string; movement_pattern: string };
const exercises = catalog as Ex[];

const errors: string[] = [];
const fail = (m: string) => errors.push(m);

const VALID = new Set<string>(MUSCLE_IDS);
const VIEWS = new Set(['front', 'back']);
const FOCUSES = new Set(['full', 'upper', 'lower']);

function assertHighlight(label: string, h: MuscleHighlight) {
  if (!Array.isArray(h.primary) || h.primary.length === 0) fail(`${label}: falta músculo principal`);
  if (!Array.isArray(h.secondary)) fail(`${label}: secondary debe ser un array`);
  if (!VIEWS.has(h.view)) fail(`${label}: vista inválida «${h.view}»`);
  if (!FOCUSES.has(h.focus)) fail(`${label}: recorte inválido «${h.focus}»`);
  for (const m of [...h.primary, ...h.secondary]) {
    if (!VALID.has(m)) fail(`${label}: músculo desconocido «${m}»`);
  }
}

if (exercises.length === 0) fail('el snapshot del catálogo está vacío');
const catalogNames = new Set(exercises.map((e) => normalizeExerciseName(e.name)));
for (const e of exercises) {
  const n = normalizeExerciseName(e.name);
  if (!(n in EXERCISE_MUSCLE_BY_NAME)) fail(`sin mapa muscular explícito: ${e.name}`);
}
for (const k of Object.keys(EXERCISE_MUSCLE_BY_NAME)) {
  if (!catalogNames.has(k)) fail(`entrada del mapa que no es del catálogo: ${k}`);
}
for (const [k, h] of Object.entries(EXERCISE_MUSCLE_BY_NAME)) assertHighlight(k, h);
for (const [k, h] of Object.entries(MUSCLE_BY_PATTERN)) assertHighlight(`patrón ${k}`, h);
for (const [k, h] of MUSCLE_BY_MUSCLE) assertHighlight(`músculo ${k}`, h);

// El músculo principal pintado debe corresponder al grupo del ejercicio.
const REGION: Record<string, MuscleId[]> = {
  pectoral: ['chest'],
  pecho: ['chest'],
  'deltoides lateral': ['front_deltoid'],
  'deltoides posterior': ['rear_deltoid'],
  deltoides: ['front_deltoid', 'rear_deltoid'],
  hombro: ['front_deltoid', 'rear_deltoid'],
  dorsal: ['lats'],
  espalda: ['lats', 'trapezius', 'rear_deltoid', 'lower_back'],
  triceps: ['triceps'],
  biceps: ['biceps'],
  braquial: ['biceps', 'forearm'],
  gluteo: ['glutes'],
  isquio: ['hamstrings'],
  cuadriceps: ['quadriceps'],
  gemelo: ['calves'],
  core: ['abs', 'obliques'],
  abdominal: ['abs', 'obliques'],
  recto: ['abs'],
};
for (const e of exercises) {
  const muscle = normalizeExerciseName(e.target_muscle);
  const h = EXERCISE_MUSCLE_BY_NAME[normalizeExerciseName(e.name)];
  const regions = Object.keys(REGION).filter((r) => muscle.includes(r));
  if (!regions.length) { fail(`${e.name}: músculo sin región conocida («${e.target_muscle}»)`); continue; }
  const ok = regions.some((r) => h.primary.some((m) => REGION[r].includes(m)));
  if (!ok) fail(`${e.name}: el principal «${h.primary.join(', ')}» no corresponde al músculo «${e.target_muscle}»`);
}

const probes: Array<[string, any, MuscleId | null]> = [
  ['por patrón', { name: 'Ejercicio inventado', movement_pattern: 'flexion_codo' }, 'biceps'],
  ['por músculo', { name: 'Ejercicio inventado', target_muscle: 'Pectoral superior' }, 'chest'],
  ['sin datos → null', { name: 'Ejercicio inventado' }, null],
  ['nombre del catálogo con tildes/mayúsculas', { name: 'PRENSA DE PIERNAS' }, 'quadriceps'],
];
for (const [label, ex, expected] of probes) {
  const got = resolveExerciseMuscles(ex).highlight?.primary[0] ?? null;
  if (got !== expected) fail(`fallback ${label}: esperado ${expected}, obtenido ${got}`);
}

if (process.argv.includes('--table')) {
  console.log('| # | Ejercicio | Músculo | Vista | Principal | Secundarios |');
  console.log('|---|---|---|---|---|---|');
  exercises.forEach((e, i) => {
    const h = EXERCISE_MUSCLE_BY_NAME[normalizeExerciseName(e.name)];
    const vista = h.view === 'back' ? 'espalda' : 'frente';
    console.log(`| ${i + 1} | ${e.name} | ${e.target_muscle} | ${vista} | ${h.primary.join(', ')} | ${h.secondary.join(', ') || '—'} |`);
  });
}

if (errors.length) {
  console.error(`✗ ${errors.length} problema(s) en el mapa muscular:\n - ` + errors.join('\n - '));
  process.exit(1);
}
console.log(`✓ músculos OK: ${exercises.length} ejercicios con mapa explícito, ${MUSCLE_IDS.length} regiones válidas`);
