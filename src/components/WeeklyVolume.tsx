import { useEffect, useState, lazy, Suspense } from 'react';
import { VolumeChart, fetchVolumeChart } from '../lib/progressApi';
import { GROUP_COLORS, GroupedBars } from './charts/SvgCharts';

const MuscleHeatMap = lazy(() => import('./MuscleHeatMap'));

export default function WeeklyVolume({
  userId,
  compact = false,
}: {
  userId: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<VolumeChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    fetchVolumeChart(userId, compact ? 8 : 12)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Error al cargar el volumen');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, compact]);

  if (loading) return <p className="text-xs text-neutral-500 text-center py-6">Cargando volumen…</p>;
  if (error) return <p className="text-xs text-amber-400 text-center py-4">{error}</p>;
  if (!data) return null;

  const hasData = data.items.some((w) => w.total_sets > 0);
  const { push, pull, upper, lower, notes } = data.balance;

  return (
    <div id="weekly-volume" className="space-y-3">
      <div>
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Volumen semanal</h3>
        <p className="text-[10px] text-neutral-500">
          Series efectivas por grupo · banda de referencia {data.reference.min_sets}–{data.reference.max_sets} series/semana
        </p>
      </div>
      {!hasData ? (
        <p className="text-xs text-neutral-500 text-center py-6">Todavía no hay series de trabajo en estas semanas.</p>
      ) : (
        <>
          <GroupedBars weeks={data.items} groups={data.groups} reference={data.reference} />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {data.groups.map((g, i) => (
              <span key={g} className="text-[10px] text-neutral-300 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }} />
                {g} <span className="text-neutral-500">({data.averages[g] ?? 0})</span>
              </span>
            ))}
          </div>
          {!compact && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Empuje / Tirón</p>
                <p className="text-sm font-black text-white mt-1">
                  {push} <span className="text-neutral-500 font-bold">/</span> {pull}
                </p>
                <p className="text-[10px] text-neutral-500">media de series/semana</p>
              </div>
              <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Superior / Inferior</p>
                <p className="text-sm font-black text-white mt-1">
                  {upper} <span className="text-neutral-500 font-bold">/</span> {lower}
                </p>
                <p className="text-[10px] text-neutral-500">media de series/semana</p>
              </div>
            </div>
          )}
          {notes.map((n) => (
            <p key={n} className="text-[11px] text-amber-200/90">{n}</p>
          ))}
          {!compact && Object.keys(data.heat || {}).length > 0 && (
            <Suspense fallback={<p className="text-[10px] text-neutral-500">Cargando mapa muscular…</p>}>
              <MuscleHeatMap heat={data.heat} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}
