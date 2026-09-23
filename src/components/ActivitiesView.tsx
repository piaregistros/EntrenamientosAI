import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Bike, Check, Clock } from 'lucide-react';

const CAT: Record<string, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
  cycle: 'Ciclo',
  mind: 'Cuerpo-mente',
  aqua: 'Agua',
  sport: 'Deporte',
  other: 'Otro',
};

export default function ActivitiesView({ user }: { user: any }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [pick, setPick] = useState<any>(null);
  const [minutes, setMinutes] = useState(45);
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState('');
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [c, l] = await Promise.all([
      apiFetch('/api/activities/classes'),
      apiFetch('/api/activities/log'),
    ]);
    if (!c.ok) {
      setError('No está el backend de actividades.');
      return;
    }
    setClasses((await c.json()).classes || []);
    if (l.ok) setLogs((await l.json()).logs || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!pick) return;
    setSaving(true);
    setError('');
    const res = await apiFetch('/api/activities/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: pick.id,
        date: day,
        duration_minutes: minutes,
        rpe,
        notes: notes || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.detail || 'No se guardó');
      return;
    }
    setMsg(`${pick.name} guardado`);
    setPick(null);
    setNotes('');
    await load();
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28 text-neutral-100">
      <p className="text-lime-400 text-xs uppercase tracking-[0.2em] font-semibold">Enjoy Murcia</p>
      <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
        <Bike size={22} className="text-lime-400" /> Clases
      </h1>
      <p className="text-neutral-500 text-xs mt-1">Pablo Neruda, 2. No sustituye A/B/C; solo apunta lo que hiciste.</p>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {msg && <p className="mt-3 text-sm text-lime-400">{msg}</p>}

      <div className="mt-4 space-y-2">
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => { setPick(c); setMinutes(c.minutes); setMsg(''); }}
            className={`w-full text-left rounded-xl border p-3 ${
              pick?.id === c.id ? 'border-lime-400 bg-lime-400/10' : 'border-neutral-800 bg-neutral-900'
            }`}
          >
            <div className="flex justify-between">
              <p className="font-semibold">{c.name}</p>
              <span className="text-[10px] uppercase text-neutral-500">{CAT[c.category] || c.category}</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">{c.minutes} min · {c.note}</p>
          </button>
        ))}
      </div>

      {pick && (
        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
          <p className="font-semibold">Registrar {pick.name}</p>
          <label className="block text-xs text-neutral-500">Fecha</label>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3" />
          <label className="block text-xs text-neutral-500">Minutos</label>
          <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3" />
          <label className="block text-xs text-neutral-500">Dureza 1–10</label>
          <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="w-full" />
          <p className="text-sm text-lime-400">{rpe}/10</p>
          <input placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm" />
          <button disabled={saving} onClick={save}
            className="w-full bg-lime-400 text-neutral-950 font-bold rounded-xl py-3 flex items-center justify-center gap-2">
            <Check size={16} /> Guardar clase
          </button>
        </div>
      )}

      <h2 className="mt-8 text-xs uppercase text-neutral-500">Últimas clases</h2>
      <div className="mt-2 space-y-2">
        {logs.map((l) => (
          <div key={l.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 flex justify-between">
            <div>
              <p className="font-semibold text-sm">{l.class_name}</p>
              <p className="text-xs text-neutral-500">{l.date}</p>
            </div>
            <p className="text-xs text-neutral-400 flex items-center gap-1">
              <Clock size={12} /> {l.duration_minutes} min{l.rpe ? ` · RPE ${l.rpe}` : ''}
            </p>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sm text-neutral-500">Aún no hay clases apuntadas.</p>}
      </div>
    </div>
  );
}
