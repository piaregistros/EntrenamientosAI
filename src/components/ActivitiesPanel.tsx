import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Pencil, Trash2 } from 'lucide-react';

export default function ActivitiesPanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [pick, setPick] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(45);
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState('');
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [c, l] = await Promise.all([apiFetch('/api/activities/classes'), apiFetch('/api/activities/log')]);
    if (!c.ok) return;
    setClasses((await c.json()).classes || []);
    if (l.ok) setLogs((await l.json()).logs || []);
  };
  useEffect(() => { load(); }, []);

  const startNew = (c: any) => {
    setEditId(null); setPick(c); setMinutes(c.minutes); setRpe(6); setNotes('');
    setDay(new Date().toISOString().slice(0, 10)); setMsg(''); setError('');
  };
  const startEdit = (log: any) => {
    const c = classes.find((x) => x.id === log.class_id) || { id: log.class_id, name: log.class_name, minutes: log.duration_minutes };
    setEditId(log.id); setPick(c); setMinutes(log.duration_minutes || 45); setRpe(log.rpe || 6);
    setNotes(log.notes || ''); setDay(log.date); setMsg(''); setError('');
  };

  const save = async () => {
    if (!pick) return;
    setBusy(true); setError('');
    const payload = { class_id: pick.id, date: day, duration_minutes: minutes, rpe, notes: notes || null };
    const res = await apiFetch(editId ? `/api/activities/log/${editId}` : '/api/activities/log', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.detail || 'No se guardó'); return; }
    setMsg(editId ? 'Clase actualizada' : `${pick.name} guardado`);
    setPick(null); setEditId(null); await load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Borrar esta clase?')) return;
    const res = await apiFetch(`/api/activities/log/${id}`, { method: 'DELETE' });
    if (res.ok) { setMsg('Borrada'); await load(); }
    else setError('No se pudo borrar');
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Clase Enjoy / otra actividad</h4>
      <p className="text-[11px] text-neutral-500 -mt-2">Si hoy no toca A/B/C, apunta aquí BodyPump, ciclo, WOD…</p>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {msg && <p className="text-xs text-lime-400">{msg}</p>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {classes.map((c) => (
          <button key={c.id} onClick={() => startNew(c)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs ${
              pick?.id === c.id && !editId ? 'border-lime-400 bg-lime-400/10 text-lime-300' : 'border-neutral-800 bg-neutral-900'
            }`}>{c.name}</button>
        ))}
      </div>
      {pick && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
          <p className="text-sm font-semibold">{editId ? 'Editar' : 'Registrar'} {pick.name}</p>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-sm" />
          <div className="flex gap-2">
            <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-1/2 bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-sm" />
            <input type="number" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="w-1/2 bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-sm" />
          </div>
          <p className="text-[10px] text-neutral-500">Minutos · dureza 1–10</p>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-sm" />
          <div className="flex gap-2">
            <button disabled={busy} onClick={save} className="flex-1 bg-lime-400 text-neutral-950 font-bold rounded-xl py-2 text-sm">{editId ? 'Guardar cambios' : 'Guardar clase'}</button>
            <button onClick={() => { setPick(null); setEditId(null); }} className="px-3 text-xs text-neutral-400">Cancelar</button>
          </div>
        </div>
      )}
      {logs.slice(0, 8).map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
          <div>
            <p className="text-sm font-semibold">{l.class_name}</p>
            <p className="text-[11px] text-neutral-500">{l.date} · {l.duration_minutes} min{l.rpe ? ` · ${l.rpe}/10` : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => startEdit(l)} className="text-neutral-400"><Pencil size={14} /></button>
            <button onClick={() => remove(l.id)} className="text-red-400"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
