/** Temporizador de descanso (Fase 8). Preferencias en localStorage y defaults por tipo. */

export const REST_STEP = 15;
export const REST_MIN = 15;
export const REST_MAX = 600;
export const REST_PREF_KEY = 'entreno-rest-pref';

export const REST_DEFAULTS: Record<string, number> = {
  aislamiento: 90,
  compuesto: 150,
  core: 60,
};

export type RestPref = {
  byExercise: Record<string, number>;
};

export function clampRest(seconds: number): number {
  const n = Math.round(Number(seconds) || 0);
  if (n < REST_MIN) return REST_MIN;
  if (n > REST_MAX) return REST_MAX;
  return n;
}

export function formatRest(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function exerciseRestType(item: any): string {
  const measure = item?.exercise?.measure_type || item?.measure_type;
  if (measure === 'time') return 'core';
  const t = String(item?.exercise?.exercise_type || item?.exercise_type || '').toLowerCase();
  if (t === 'aislamiento' || t === 'compuesto' || t === 'core') return t;
  return 'compuesto';
}

export function defaultRestSeconds(item: any): number {
  return REST_DEFAULTS[exerciseRestType(item)] ?? 120;
}

export function loadRestPref(): RestPref {
  try {
    const raw = localStorage.getItem(REST_PREF_KEY);
    if (!raw) return { byExercise: {} };
    const parsed = JSON.parse(raw);
    const byExercise = parsed?.byExercise && typeof parsed.byExercise === 'object' ? parsed.byExercise : {};
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(byExercise)) {
      const n = Number(v);
      if (k && n > 0) clean[k] = clampRest(n);
    }
    return { byExercise: clean };
  } catch {
    return { byExercise: {} };
  }
}

export function saveRestPref(prefs: RestPref): void {
  try {
    localStorage.setItem(REST_PREF_KEY, JSON.stringify(prefs));
  } catch {
    // almacenamiento lleno o modo privado
  }
}

export function rememberExerciseRest(exerciseId: string, seconds: number): void {
  if (!exerciseId || !seconds) return;
  const prefs = loadRestPref();
  prefs.byExercise[exerciseId] = clampRest(seconds);
  saveRestPref(prefs);
}

export function resolveRestSeconds(item: any): number {
  const eid = String(item?.exercise?.id || item?.exercise_id || '');
  const prefs = loadRestPref();
  if (eid && prefs.byExercise[eid] > 0) return prefs.byExercise[eid];
  const planned = Number(item?.rest_seconds);
  if (planned > 0) return clampRest(planned);
  return defaultRestSeconds(item);
}
