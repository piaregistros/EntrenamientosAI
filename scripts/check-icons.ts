// Comprobación del mapeo de iconos (npm run check:icons). Sin dependencias de test:
// se empaqueta con esbuild y se ejecuta con node. `--table` imprime la tabla antes → después.
import fs from 'node:fs';
import path from 'node:path';
import {
  EXERCISE_ICON_BY_NAME, ICON_BY_MUSCLE, ICON_BY_PATTERN, ICON_DIR, ICON_KEYS,
  normalizeExerciseName, resolveExerciseIcon, exerciseIconSrc,
} from '../src/lib/exerciseIcons';
import catalog from './catalog-snapshot.json';

type Ex = { name: string; target_muscle: string; category: string; equipment: string; movement_pattern: string };
const exercises = catalog as Ex[];

// Lógica ANTIGUA de WorkoutActive.tsx (palabras sueltas del nombre), solo para comparar «antes».
function legacyIcon(name: string): string {
  const n = normalizeExerciseName(name);
  const f = (x: string) => x;
  if (n.includes('plancha') || n.includes('crunch') || n.includes('rodilla') || n.includes('pallof')) return f('plancha');
  if (n.includes('prensa')) return f('prensa');
  if (n.includes('femoral') || n.includes('peso muerto') || n.includes('hip') || n.includes('patada') || n.includes('abduc') || n.includes('cadera')) return f('hip');
  if (n.includes('jalon') || n.includes('estirar') || n.includes('pullover')) return f('jalon');
  if (n.includes('remo')) return f('remo');
  if (n.includes('lateral')) return f('lateral');
  if (n.includes('gemelo')) return f('gemelo');
  if (n.includes('tricep') || n.includes('frances')) return f('triceps');
  if (n.includes('curl') || n.includes('bicep') || n.includes('martillo')) return f('curl');
  if (n.includes('hombro') || n.includes('militar') || n.includes('pajaro') || n.includes('face')) return f('hombro');
  if (n.includes('banca') || n.includes('apertura') || n.includes('cruce') || n.includes('convergente') || (n.includes('inclinado') && !n.includes('curl'))) return f('banca');
  if (n.includes('sentadilla') || n.includes('zancada') || n.includes('hack') || n.includes('goblet') || n.includes('step')) return f('sentadilla');
  if (n.includes('cuadricep')) return f('sentadilla');
  return f('prensa');
}

const errors: string[] = [];
const fail = (m: string) => errors.push(m);

// Se ejecuta siempre desde la raíz del repo (npm run check:icons).
const publicDir = path.resolve(process.cwd(), 'public' + ICON_DIR);

// 1. Los 59 del catálogo tienen entrada explícita y no sobran entradas.
if (exercises.length !== 59) fail(`el snapshot del catálogo tiene ${exercises.length} ejercicios (esperados 59)`);
const catalogNames = new Set(exercises.map((e) => normalizeExerciseName(e.name)));
for (const e of exercises) {
  if (!(normalizeExerciseName(e.name) in EXERCISE_ICON_BY_NAME)) fail(`sin icono explícito: ${e.name}`);
}
for (const k of Object.keys(EXERCISE_ICON_BY_NAME)) {
  if (!catalogNames.has(k)) fail(`entrada del mapa que no es del catálogo: ${k}`);
}
// 2. Todos los valores son claves válidas y los ficheros existen.
for (const [k, v] of Object.entries({ ...EXERCISE_ICON_BY_NAME, ...ICON_BY_PATTERN })) {
  if (!ICON_KEYS.includes(v)) fail(`icono desconocido «${v}» para ${k}`);
}
for (const [, v] of ICON_BY_MUSCLE) if (!ICON_KEYS.includes(v)) fail(`icono desconocido «${v}» en ICON_BY_MUSCLE`);
for (const key of ICON_KEYS) {
  const file = path.join(publicDir, `${key}.jpg`);
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) fail(`falta el fichero ${file}`);
}
// 3. Coherencia: el icono explícito de cada ejercicio es el de su patrón o su músculo, o está justificado.
//    (Excepciones deliberadas: se elige por el gesto, no por el patrón.)
const DELIBERATE: Record<string, string> = {
  'face pull': 'remo (tracción horizontal con polea; el icono de hombro es una máquina de press)',
  'pajaros en maquina': 'lateral (misma máquina sentada con brazos abiertos)',
  'extension de cuadriceps': 'prensa (máquina de pierna)',
  'curl femoral': 'hip (cadera posterior)', 'curl femoral sentado': 'hip', 'curl femoral tumbado': 'hip',
  'cruce de poleas': 'banca (pecho)', 'aperturas de pecho en maquina': 'banca (pecho)',
  'hack squat': 'sentadilla', 'pullover en polea': 'jalon', 'press militar con barra': 'hombro',
  'sentadilla bulgara': 'sentadilla', 'zancadas': 'sentadilla', 'step-up': 'sentadilla',
  'prensa unilateral': 'prensa', 'prensa de piernas': 'prensa',
};
for (const e of exercises) {
  const n = normalizeExerciseName(e.name);
  const explicit = EXERCISE_ICON_BY_NAME[n];
  const byPattern = ICON_BY_PATTERN[e.movement_pattern];
  if (explicit !== byPattern && !(n in DELIBERATE)) {
    fail(`${e.name}: icono explícito «${explicit}» ≠ icono de su patrón «${byPattern}» y no está justificado en DELIBERATE`);
  }
}
// 4. El grupo muscular nunca se contradice: un ejercicio de pecho no puede llevar el icono de otra región.
const REGION: Record<string, string[]> = {
  pectoral: ['banca'], deltoides: ['hombro', 'lateral'], dorsal: ['jalon', 'remo'], espalda: ['remo', 'jalon', 'lateral'],
  triceps: ['triceps'], biceps: ['curl'], braquial: ['curl'], gluteo: ['hip'], isquio: ['hip'],
  cuadriceps: ['prensa', 'sentadilla'], gemelo: ['gemelo'], core: ['plancha'], abdominal: ['plancha'],
};
for (const e of exercises) {
  const muscle = normalizeExerciseName(e.target_muscle);
  const key = EXERCISE_ICON_BY_NAME[normalizeExerciseName(e.name)];
  const regions = Object.keys(REGION).filter((r) => muscle.includes(r));
  if (!regions.length) { fail(`${e.name}: músculo sin región conocida («${e.target_muscle}»)`); continue; }
  // Basta con que el icono sea el de alguno de los músculos principales del ejercicio.
  const ok = regions.some((r) => REGION[r].includes(key));
  if (!ok) fail(`${e.name}: el icono «${key}» no corresponde al músculo «${e.target_muscle}»`);
}
// 5. Fallbacks para ejercicios propios.
const probes: Array<[string, any, string | null]> = [
  ['por patrón', { name: 'Ejercicio inventado', movement_pattern: 'flexion_codo' }, 'curl'],
  ['por músculo', { name: 'Ejercicio inventado', target_muscle: 'Pectoral superior' }, 'banca'],
  ['sin datos → null (la UI pone un icono neutro, no uno equivocado)', { name: 'Ejercicio inventado' }, null],
  ['nombre del catálogo con tildes/mayúsculas', { name: 'PRENSA DE PIERNAS' }, 'prensa'],
];
for (const [label, ex, expected] of probes) {
  const got = resolveExerciseIcon(ex).key;
  if (got !== expected) fail(`fallback ${label}: esperado ${expected}, obtenido ${got}`);
}
if (exerciseIconSrc({ name: 'Ejercicio inventado' }) !== null) fail('exerciseIconSrc debe devolver null sin coincidencia');

if (process.argv.includes('--table')) {
  console.log('| # | Ejercicio | Músculo | Antes | Después | Cambio |');
  console.log('|---|---|---|---|---|---|');
  exercises.forEach((e, i) => {
    const before = legacyIcon(e.name);
    const after = EXERCISE_ICON_BY_NAME[normalizeExerciseName(e.name)];
    console.log(`| ${i + 1} | ${e.name} | ${e.target_muscle} | ${before} | ${after} | ${before === after ? '' : '**cambia**'} |`);
  });
}

if (errors.length) {
  console.error(`✗ ${errors.length} problema(s) en el mapeo de iconos:\n - ` + errors.join('\n - '));
  process.exit(1);
}
console.log(`✓ iconos OK: ${exercises.length} ejercicios con icono explícito, ${ICON_KEYS.length} ilustraciones existentes`);
