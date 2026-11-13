// Series de aproximación sugeridas (Fase 11). Misma regla que app/warmup.py.

import { measureOf } from './measure';

export const BAR_KG = 20;
export const LIGHT_KG = 10;
export const MODERATE_KG = 40;

export interface WarmupExercise {
  name?: string | null;
  equipment?: string | null;
  exercise_type?: string | null;
  measure_type?: string | null;
  weight_increment_kg?: number | null;
  category?: string | null;
}

export interface WarmupSet {
  percent: number;
  weight_kg: number;
  reps: number;
  label: string;
}

const ISOLATION_TYPES = new Set(['aislamiento', 'core']);
const COMPOUND_TYPES = new Set(['compuesto', 'unilateral']);
const ISOLATION_NAME_BITS = [
  'curl',
  'extension de triceps',
  'elevacion lateral',
  'elevaciones laterales',
  'apertura',
  'pajaro',
  'face pull',
  'patada',
  'encogimiento',
  'gemelo',
  'elevacion de gemelo',
  'crunch',
  'abdominal',
];

function norm(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function equipmentClass(equipment: unknown): string {
  const first = norm(equipment).split(/\s+o\s+|[/+,]/)[0]?.trim() || '';
  if (!first) return 'other';
  if (first.startsWith('peso corporal') || first.startsWith('bodyweight') || first.startsWith('calistenia')) return 'bodyweight';
  if (first.startsWith('mancuerna') || first.startsWith('kettlebell') || first.startsWith('pesa rusa')) return 'dumbbell';
  if (first.startsWith('barra') || first.startsWith('smith') || first.startsWith('multipower')) return 'barbell';
  if (first.startsWith('polea') || first.startsWith('cable')) return 'cable';
  if (first.startsWith('maquina')) return 'machine';
  return 'other';
}

export function isIsolation(ex: WarmupExercise): boolean {
  const typ = norm(ex.exercise_type);
  if (ISOLATION_TYPES.has(typ)) return true;
  if (COMPOUND_TYPES.has(typ)) return false;
  const name = norm(ex.name);
  if (ISOLATION_NAME_BITS.some((bit) => name.includes(bit))) return true;
  const cat = norm(ex.category);
  return cat === 'brazos' || cat === 'core';
}

export function roundToStep(value: number, step: number): number {
  if (step && step > 0) return Math.round(Math.round(value / step) * step * 100) / 100;
  return Math.round(value * 100) / 100;
}

function resolveIncrement(ex: WarmupExercise): number {
  const stored = Number(ex.weight_increment_kg);
  if (Number.isFinite(stored) && stored > 0) return stored;
  return 2.5;
}

export function suggestWarmup(ex: WarmupExercise, workingWeight: number): WarmupSet[] {
  const measure = measureOf(ex);
  if (measure === 'time' || measure === 'bodyweight') return [];
  const weight = Number(workingWeight);
  if (!Number.isFinite(weight) || weight < LIGHT_KG) return [];

  const step = resolveIncrement(ex);
  const cls = equipmentClass(ex.equipment);
  const isolation = isIsolation(ex);
  const plan: Array<[number, number]> =
    isolation || weight < MODERATE_KG ? [[50, 8], [70, 5]] : [[40, 8], [60, 5], [80, 3]];

  const out: WarmupSet[] = [];
  for (const [percent, reps] of plan) {
    let raw = weight * (percent / 100);
    if (cls === 'barbell') raw = Math.max(raw, BAR_KG);
    let rounded = roundToStep(raw, step);
    if (cls === 'barbell' && rounded < BAR_KG) rounded = BAR_KG;
    if (rounded <= 0) continue;
    if (rounded >= weight * 0.9 || rounded >= weight) continue;
    if (out.length && Math.abs(out[out.length - 1].weight_kg - rounded) < 1e-6) continue;
    const label = cls === 'barbell' && Math.abs(rounded - BAR_KG) < 1e-6
      ? `Barra vacía × ${reps}`
      : `${percent} % × ${reps}`;
    out.push({ percent, weight_kg: rounded, reps, label });
  }
  return out;
}
