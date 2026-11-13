import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { fmtKg } from '../lib/measure';
import { StagnationItem } from '../types';

type Home = {
  tomorrow: string;
  next_routine_id: string | null;
  next_routine_name: string | null;
  overlap: string[];
  deload_due: boolean;
  streak_7: number;
  streak_28: number;
  loads: Record<string, { next_weight_kg: number; reason: string }>;
  stagnation?: StagnationItem[];
};


function grupo(muscle: string): string {
  const m = (muscle || "").toLowerCase();
  if (m.includes("deltoides") || m.includes("hombro")) return "Hombros";
  if (m.includes("pectoral")) return "Pecho";
  if (m.includes("dorsal") || m.includes("espalda")) return "Espalda";
  if (m.includes("cuadriceps") || m.includes("cuádriceps")) return "Cuádriceps";
  if (m.includes("gluteo") || m.includes("glúteo")) return "Glúteos";
  if (m.includes("isquio")) return "Isquios";
  if (m.includes("bicep") || m.includes("bícep")) return "Bíceps";
  if (m.includes("tricep") || m.includes("trícep")) return "Tríceps";
  if (m.includes("gemelo")) return "Gemelos";
  if (m.includes("abdominal") || m.includes("core")) return "Core";
  return muscle || "Otros";
}
function agrupar(items: { muscle: string; sets: number }[]) {
  const map = new Map<string, number>();
  for (const v of items) {
    const g = grupo(v.muscle);
    map.set(g, (map.get(g) || 0) + v.sets);
  }
  return Array.from(map.entries()).map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets);
}

export default function HomeProgress({
  userId,
  onStart,
}: {
  userId: string;
  onStart: (routineId: string) => void;
}) {
  const [home, setHome] = useState<Home | null>(null);
  const [stagnation, setStagnation] = useState<StagnationItem[]>([]);
  const [stats, setStats] = useState<{ volume_7d: { muscle: string; sets: number }[]; e1rm: { name: string; e1rm: number }[] } | null>(null);
  const [openStats, setOpenStats] = useState(false);

  useEffect(() => {
    if (!userId) return;
    apiFetch(`/api/progress/home?user_id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data: Home) => {
        setHome(data);
        if (Array.isArray(data?.stagnation)) setStagnation(data.stagnation);
      })
      .catch(() => setHome(null));
    apiFetch(`/api/progress/stagnation?user_id=${encodeURIComponent(userId)}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setStagnation(Array.isArray(data?.items) ? data.items : []))
      .catch(() => { /* si falla, se usa lo que venga en /home */ });
  }, [userId]);

  const loadStats = async () => {
    const res = await apiFetch(`/api/progress/stats?user_id=${encodeURIComponent(userId)}`);
    setStats(await res.json());
    setOpenStats(true);
  };

  const start = (deload: boolean) => {
    if (!home?.next_routine_id) return;
    localStorage.setItem('entreno-next-loads', JSON.stringify(home.loads || {}));
    localStorage.setItem('entreno-deload', deload ? '1' : '0');
    onStart(home.next_routine_id);
  };

  if (!home) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-bold text-white">{home.tomorrow}</p>
      {home.overlap.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
          <p className="font-bold">Se pisan con el último entreno</p>
          <p className="mt-1">{home.overlap.join(', ')}</p>
        </div>
      )}
      {stagnation.length > 0 && (
        <div id="stagnation-alerts" className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-[11px] text-orange-100 space-y-2">
          <p className="font-bold text-orange-200">
            {stagnation.length === 1 ? 'Un ejercicio está estancado' : `${stagnation.length} ejercicios estancados`}
          </p>
          {stagnation.slice(0, 6).map((s) => (
            <div key={s.exercise_id} className="border-t border-orange-500/20 pt-2 first:border-0 first:pt-0">
              <p className="font-bold text-white">{s.name}</p>
              <p className="mt-0.5 text-orange-100/90">{s.reason}</p>
              {s.suggested_deload_kg != null && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-orange-200">
                  Deload sugerido: {fmtKg(s.suggested_deload_kg)} kg
                </p>
              )}
            </div>
          ))}
          <p className="text-[10px] text-orange-200/80">
            Al empezar el entreno verás el aviso en el ejercicio y podrás sustituirlo.
          </p>
        </div>
      )}
      <p className="text-[11px] text-neutral-400">
        {home.streak_7} días en 7 · {home.streak_28} en 28
        {home.deload_due ? ' · toca descarga' : ''}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => start(false)}
          className="flex-1 bg-lime-400 text-black font-extrabold text-xs py-3 rounded-xl"
        >
          Empezar {home.next_routine_name || ''}
        </button>
        {home.deload_due && (
          <button
            type="button"
            onClick={() => start(true)}
            className="px-3 border border-neutral-700 text-neutral-300 text-xs font-bold rounded-xl"
          >
            Descarga
          </button>
        )}
      </div>
      <button type="button" onClick={loadStats} className="text-[11px] text-lime-400 font-bold">
        Esta semana
      </button>
      {openStats && stats && (
        <div className="text-[11px] text-neutral-300 space-y-1">
          {agrupar(stats.volume_7d || []).map((v) => (
            <div key={v.muscle} className="flex items-center gap-2">
              <span className="w-28 truncate text-xs text-neutral-300">{v.muscle || 'Sin músculo'}</span>
              <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full bg-lime-400" style={{ width: Math.min(100, (v.sets / 12) * 100) + '%' }} />
              </div>
              <span className="w-6 text-right text-xs text-lime-400">{v.sets}</span>
            </div>
          ))}
          <div className="pt-2 text-neutral-500">Mejor marca estimada</div>
          {(stats.e1rm || []).slice(0, 6).map((e) => (
            <div key={e.name}>{e.name}: {e.e1rm} kg</div>
          ))}
        </div>
      )}
    </div>
  );
}
