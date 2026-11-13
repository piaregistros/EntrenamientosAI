import { useEffect, useState } from 'react';
import { ChartRange, ExerciseChart, fetchExerciseChart, formatChartDate } from '../lib/progressApi';
import { fmtKg } from '../lib/measure';
import { LineChart } from './charts/SvgCharts';

const RANGES: { id: ChartRange; label: string }[] = [
  { id: '4w', label: '4 semanas' },
  { id: '12w', label: '12 semanas' },
  { id: 'all', label: 'Todo' },
];

export default function ExerciseProgressChart({
  userId,
  exerciseId,
  compact = false,
}: {
  userId: string;
  exerciseId: string;
  compact?: boolean;
}) {
  const [range, setRange] = useState<ChartRange>('12w');
  const [data, setData] = useState<ExerciseChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'main' | 'volume'>('main');

  useEffect(() => {
    if (!userId || !exerciseId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchExerciseChart(userId, exerciseId, range)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Error al cargar la gráfica');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, exerciseId, range]);

  const timed = data?.measure_type === 'time' || data?.unit === 's';
  const labels = (data?.sessions || []).map((s) => formatChartDate(s.date));
  const mainValues = (data?.sessions || []).map((s) => (timed ? s.best_time_s : s.e1rm));
  const weightValues = (data?.sessions || []).map((s) => s.top_weight_kg);
  const volumeValues = (data?.sessions || []).map((s) => s.volume_kg);
  const muted = (data?.sessions || []).map((s) => s.is_deload);
  const last = data?.sessions?.[data.sessions.length - 1];

  return (
    <div id="exercise-progress-chart" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                range === r.id ? 'bg-lime-400 text-black' : 'text-neutral-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {!timed && !compact && (
          <button
            type="button"
            onClick={() => setMetric((m) => (m === 'main' ? 'volume' : 'main'))}
            className="text-[10px] font-bold text-lime-400"
          >
            {metric === 'main' ? 'Ver volumen' : 'Ver 1RM'}
          </button>
        )}
      </div>

      {loading && <p className="text-xs text-neutral-500 text-center py-6">Cargando gráfica…</p>}
      {error && <p className="text-xs text-amber-400 text-center py-4">{error}</p>}
      {!loading && !error && data && data.count === 0 && (
        <p className="text-xs text-neutral-500 text-center py-6">Aún no hay series de trabajo en este periodo.</p>
      )}
      {!loading && !error && data && data.count > 0 && (
        <>
          {last && (
            <p className="text-[11px] text-neutral-300">
              {timed ? (
                <>Mejor tiempo: <span className="font-bold text-white">{last.best_time_s} s</span></>
              ) : metric === 'volume' ? (
                <>Volumen de la última sesión: <span className="font-bold text-white">{fmtKg(last.volume_kg)} kg</span></>
              ) : (
                <>
                  1RM estimado: <span className="font-bold text-white">{fmtKg(last.e1rm)} kg</span>
                  {last.top_weight_kg != null && (
                    <span className="text-neutral-500"> · top {fmtKg(last.top_weight_kg)} kg × {last.top_reps}</span>
                  )}
                </>
              )}
              {last.is_deload && <span className="ml-1 text-orange-300">· descarga</span>}
            </p>
          )}
          {timed ? (
            <LineChart values={mainValues} labels={labels} unit="s" mutedFlags={muted} formatY={(v) => `${Math.round(v)}`} />
          ) : metric === 'volume' ? (
            <LineChart values={volumeValues} labels={labels} unit="kg" color="#38bdf8" mutedFlags={muted} formatY={(v) => fmtKg(v)} />
          ) : (
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">1RM estimado (Epley)</p>
              <LineChart values={mainValues} labels={labels} unit="kg" mutedFlags={muted} formatY={(v) => fmtKg(v)} />
              {!compact && (
                <>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 pt-2">Peso máximo de la sesión</p>
                  <LineChart values={weightValues} labels={labels} unit="kg" color="#fbbf24" mutedFlags={muted} height={120} formatY={(v) => fmtKg(v)} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
