import { apiFetch } from './api';

export type ChartRange = '4w' | '12w' | 'all';

export interface ExerciseSessionPoint {
  date: string;
  workout_id: string;
  measure_type: string;
  best_time_s: number | null;
  e1rm: number | null;
  top_weight_kg: number | null;
  volume_kg: number;
  top_reps: number | null;
  working_sets: number;
  is_deload: boolean;
}

export interface ExerciseChart {
  exercise_id: string;
  name: string;
  target_muscle?: string | null;
  equipment?: string | null;
  measure_type: string;
  range: ChartRange;
  unit: string;
  sessions: ExerciseSessionPoint[];
  count: number;
}

export interface VolumeWeek {
  week_start: string;
  week_label: string;
  groups: Record<string, number>;
  total_sets: number;
}

export interface VolumeChart {
  weeks: number;
  week_start: string;
  week_end: string;
  groups: string[];
  reference: { min_sets: number; max_sets: number };
  items: VolumeWeek[];
  averages: Record<string, number>;
  balance: { push: number; pull: number; upper: number; lower: number; notes: string[] };
  heat: Record<string, number>;
}

export function formatChartDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export async function fetchExerciseChart(userId: string, exerciseId: string, range: ChartRange): Promise<ExerciseChart> {
  const res = await apiFetch(
    `/api/progress/exercise/${encodeURIComponent(exerciseId)}?user_id=${encodeURIComponent(userId)}&range=${range}`,
  );
  if (!res.ok) throw new Error('No se pudo cargar el historial del ejercicio');
  return res.json();
}

export async function fetchVolumeChart(userId: string, weeks = 12): Promise<VolumeChart> {
  const res = await apiFetch(`/api/progress/volume?user_id=${encodeURIComponent(userId)}&weeks=${weeks}`);
  if (!res.ok) throw new Error('No se pudo cargar el volumen semanal');
  return res.json();
}
