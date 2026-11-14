import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Pencil, Loader, Check, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import ExerciseIcon from './ExerciseIcon';
import { toList } from '../lib/apiShapes';

// Fase 7: gestión de rutinas (y de sus ejercicios) y de ejercicios propios. Admin y propietario.
interface Props {
  user: any;
  onBack: () => void;
}

type Tab = 'routines' | 'exercises';

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const d = await res.json();
    if (typeof d.detail === 'string') return d.detail;
  } catch { /* sin cuerpo */ }
  return fallback;
}

export default function ManageView({ user, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('routines');
  const [routines, setRoutines] = useState<any[]>([]);
  const [openRoutine, setOpenRoutine] = useState<any | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineLocation, setNewRoutineLocation] = useState<'gimnasio' | 'casa'>('gimnasio');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [exFilter, setExFilter] = useState('');
  const [editing, setEditing] = useState<any | null>(null);

  const flash = (m: string) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 3500); };
  const fail = (m: string) => { setErr(m); setMsg(null); };

  const loadRoutines = async () => {
    const res = await apiFetch(`/api/routines?user_id=${encodeURIComponent(user.id)}`);
    if (res.ok) setRoutines(toList(await res.json(), 'routines'));
  };
  const loadExercises = async () => {
    const res = await apiFetch('/api/exercises?include_inactive=true');
    // /api/exercises devuelve { count, exercises }: no es un array (causa del «filter is not a function»).
    if (res.ok) setExercises(toList(await res.json(), 'exercises'));
  };
  const loadRoutine = async (id: string) => {
    const res = await apiFetch(`/api/routines/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOpenRoutine(data && typeof data === 'object' ? { ...data, exercises: toList(data.exercises) } : null);
    }
  };

  useEffect(() => { void loadRoutines(); void loadExercises(); }, []);

  const run = async (fn: () => Promise<Response>, okMsg: string, errMsg: string, after?: () => Promise<void>) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) { fail(await readError(res, errMsg)); return false; }
      flash(okMsg);
      if (after) await after();
      return true;
    } catch (e: any) {
      fail(e.message || errMsg);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const json = (method: string, body?: any): RequestInit => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // ---- rutinas
  const createRoutine = async () => {
    const name = newRoutineName.trim();
    if (!name) return;
    const ok = await run(() => apiFetch('/api/routines', json('POST', { name, user_id: user.id, location: newRoutineLocation })), 'Rutina creada', 'No se pudo crear la rutina', async () => {
      setNewRoutineName('');
      await loadRoutines();
    });
    return ok;
  };
  const renameRoutine = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    await run(() => apiFetch(`/api/routines/${id}`, json('PUT', { name })), 'Rutina renombrada', 'No se pudo renombrar', async () => {
      setRenaming(null);
      await loadRoutines();
      if (openRoutine?.id === id) await loadRoutine(id);
    });
  };
  const deleteRoutine = async (r: any) => {
    if (!window.confirm(`¿Borrar la rutina «${r.name}»? Si tiene entrenos, se desactiva y se conserva el histórico.`)) return;
    await run(() => apiFetch(`/api/routines/${r.id}`, { method: 'DELETE' }), 'Rutina eliminada', 'No se pudo borrar', async () => {
      if (openRoutine?.id === r.id) setOpenRoutine(null);
      await loadRoutines();
    });
  };

  // ---- ejercicios de una rutina
  const refreshOpen = async () => { if (openRoutine) await loadRoutine(openRoutine.id); };
  const addToRoutine = async (exerciseId: string) => {
    if (!openRoutine) return;
    await run(() => apiFetch(`/api/routines/${openRoutine.id}/exercises`, json('POST', { exercise_id: exerciseId })), 'Ejercicio añadido', 'No se pudo añadir', async () => {
      setAddQuery('');
      await refreshOpen();
    });
  };
  const updateRoutineExercise = async (reId: string, patch: any) => {
    if (!openRoutine) return;
    await run(() => apiFetch(`/api/routines/${openRoutine.id}/exercises/${reId}`, json('PUT', patch)), 'Guardado', 'No se pudo guardar', refreshOpen);
  };
  const removeFromRoutine = async (re: any) => {
    if (!openRoutine || !window.confirm(`¿Quitar «${re.name}» de la rutina?`)) return;
    await run(() => apiFetch(`/api/routines/${openRoutine.id}/exercises/${re.id}`, { method: 'DELETE' }), 'Ejercicio quitado', 'No se pudo quitar', refreshOpen);
  };
  const move = async (index: number, delta: number) => {
    if (!openRoutine) return;
    const ids = toList(openRoutine.exercises).map((e: any) => e.id);
    const j = index + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    await run(() => apiFetch(`/api/routines/${openRoutine.id}/exercises/order`, json('PUT', { routine_exercise_ids: ids })), 'Orden guardado', 'No se pudo reordenar', refreshOpen);
  };

  const addCandidates = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const inRoutine = new Set(toList(openRoutine?.exercises).map((e: any) => e.exercise_id));
    return toList(exercises).filter((e: any) => e.is_active && !inRoutine.has(e.id) && String(e.name || '').toLowerCase().includes(q)).slice(0, 8);
  }, [addQuery, exercises, openRoutine]);

  // ---- ejercicios
  const visibleExercises = useMemo(() => {
    const q = exFilter.trim().toLowerCase();
    return toList(exercises).filter((e: any) => !q || String(e.name || '').toLowerCase().includes(q) || (e.target_muscle || '').toLowerCase().includes(q));
  }, [exercises, exFilter]);

  const saveExercise = async () => {
    if (!editing) return;
    const body: any = {
      target_muscle: editing.target_muscle,
      equipment: editing.equipment,
      category: editing.category,
      instructions: editing.instructions,
      weight_increment_kg: Number(editing.weight_increment_kg) || undefined,
    };
    if (editing.is_custom) body.name = editing.name;
    await run(() => apiFetch(`/api/exercises/${editing.id}`, json('PUT', body)), 'Ejercicio guardado', 'No se pudo guardar', async () => {
      setEditing(null);
      await loadExercises();
    });
  };
  const toggleActive = async (e: any) => {
    await run(() => apiFetch(`/api/exercises/${e.id}`, json('PUT', { is_active: !e.is_active })), e.is_active ? 'Ejercicio desactivado' : 'Ejercicio reactivado', 'No se pudo cambiar', loadExercises);
  };
  const deleteExercise = async (e: any) => {
    if (!window.confirm(`¿Borrar «${e.name}»? Si tiene historial se desactiva y se conserva.`)) return;
    await run(() => apiFetch(`/api/exercises/${e.id}`, { method: 'DELETE' }), 'Ejercicio eliminado', 'No se pudo borrar', loadExercises);
  };

  const inputCls = 'bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white w-full';

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button type="button" id="btn-manage-back" onClick={onBack} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-lg font-extrabold text-white">Gestionar rutinas y ejercicios</h2>
        {busy && <Loader size={14} className="animate-spin text-neutral-500" />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {([['routines', 'Rutinas'], ['exercises', 'Ejercicios']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" id={`tab-manage-${k}`} onClick={() => setTab(k)}
            className={`py-2 rounded-xl text-xs font-extrabold border ${tab === k ? 'bg-lime-400 text-black border-lime-400' : 'bg-neutral-900 text-neutral-300 border-neutral-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {msg && <p className="text-xs text-lime-400">{msg}</p>}
      {err && <p className="text-xs text-red-400">{err}</p>}

      {tab === 'routines' && !openRoutine && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input id="input-new-routine" className={inputCls} value={newRoutineName} onChange={(e) => setNewRoutineName(e.target.value)} placeholder="Nombre de la nueva rutina" />
            <select id="select-new-routine-location" value={newRoutineLocation} onChange={(e) => setNewRoutineLocation(e.target.value as 'gimnasio' | 'casa')}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-2 text-xs text-white">
              <option value="gimnasio">Gimnasio</option>
              <option value="casa">Casa</option>
            </select>
            <button type="button" id="btn-create-routine" disabled={busy || !newRoutineName.trim()} onClick={createRoutine}
              className="bg-lime-400 text-black font-extrabold text-xs px-3 rounded-xl flex items-center gap-1 disabled:opacity-50"><Plus size={14} /> Crear</button>
          </div>
          {toList(routines).map((r: any) => (
            <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex items-center gap-2">
              {renaming === r.id ? (
                <>
                  <input className={inputCls} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                  <button type="button" onClick={() => renameRoutine(r.id)} className="p-2 text-lime-400"><Check size={16} /></button>
                  <button type="button" onClick={() => setRenaming(null)} className="p-2 text-neutral-400"><X size={16} /></button>
                </>
              ) : (
                <>
                  <button type="button" className="flex-1 text-left" onClick={() => loadRoutine(r.id)}>
                    <p className="text-sm font-extrabold text-white flex items-center gap-2">
                      {r.name}
                      {r.location === 'casa' && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wide bg-lime-400/15 text-lime-400 border border-lime-400/30 rounded-full px-1.5 py-0.5">Casa</span>
                      )}
                    </p>
                    <p className="text-[10px] text-neutral-500">{r.session_label || `Día ${r.day_order}`} · tocar para editar ejercicios</p>
                  </button>
                  <button type="button" onClick={() => { setRenaming(r.id); setRenameValue(r.name); }} className="p-2 text-neutral-400"><Pencil size={15} /></button>
                  <button type="button" onClick={() => deleteRoutine(r)} className="p-2 text-red-400"><Trash2 size={15} /></button>
                </>
              )}
            </div>
          ))}
          {toList(routines).length === 0 && <p className="text-xs text-neutral-500">Aún no tienes rutinas.</p>}
        </div>
      )}

      {tab === 'routines' && openRoutine && (
        <div className="space-y-3">
          <button type="button" onClick={() => setOpenRoutine(null)} className="text-xs text-neutral-400 flex items-center gap-1"><ArrowLeft size={12} /> Todas las rutinas</button>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            {openRoutine.name}
            {openRoutine.location === 'casa' && (
              <span className="text-[9px] font-extrabold uppercase tracking-wide bg-lime-400/15 text-lime-400 border border-lime-400/30 rounded-full px-1.5 py-0.5">Casa</span>
            )}
          </h3>

          {toList(openRoutine.exercises).map((re: any, i: number) => (
            <div key={re.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <ExerciseIcon exercise={re} className="w-12 h-12 rounded-lg shrink-0" />
                <p className="flex-1 text-sm font-bold text-white">{re.name || re.exercise?.name}</p>
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 text-neutral-400 disabled:opacity-30"><ChevronUp size={16} /></button>
                <button type="button" disabled={i === openRoutine.exercises.length - 1} onClick={() => move(i, 1)} className="p-1.5 text-neutral-400 disabled:opacity-30"><ChevronDown size={16} /></button>
                <button type="button" onClick={() => removeFromRoutine(re)} className="p-1.5 text-red-400"><Trash2 size={15} /></button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[['target_sets', 'Series'], ['target_rep_min', 'Reps mín'], ['target_rep_max', 'Reps máx'], ['target_rir', 'RIR']].map(([field, label]) => (
                  <label key={field} className="text-[9px] uppercase text-neutral-500 font-bold">
                    {label}
                    <input type="number" className={inputCls} defaultValue={re[field] ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        if (v !== null && v !== re[field]) void updateRoutineExercise(re.id, { [field]: v });
                      }} />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 space-y-2">
            <input id="input-add-exercise" className={inputCls} value={addQuery} onChange={(e) => setAddQuery(e.target.value)} placeholder="Añadir ejercicio: escribe para buscar" />
            {addCandidates.map((e: any) => (
              <button key={e.id} type="button" onClick={() => addToRoutine(e.id)} className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                <ExerciseIcon exercise={e} className="w-10 h-10 rounded-md shrink-0" />
                <span className="flex-1 text-xs font-bold text-white">{e.name}</span>
                <span className="text-[10px] text-neutral-500">{e.equipment}</span>
                <Plus size={14} className="text-lime-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'exercises' && !editing && (
        <div className="space-y-3">
          <input id="input-filter-exercises" className={inputCls} value={exFilter} onChange={(e) => setExFilter(e.target.value)} placeholder="Filtrar por nombre o músculo" />
          {visibleExercises.map((e: any) => (
            <div key={e.id} className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex items-center gap-2 ${e.is_active ? '' : 'opacity-50'}`}>
              <ExerciseIcon exercise={e} className="w-12 h-12 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{e.name}</p>
                <p className="text-[10px] text-neutral-500">{e.equipment} · {e.target_muscle}{e.is_custom ? ' · propio' : ''}{e.is_active ? '' : ' · desactivado'}</p>
              </div>
              {e.can_edit && (
                <>
                  <button type="button" onClick={() => setEditing({ ...e })} className="p-2 text-neutral-400"><Pencil size={15} /></button>
                  <button type="button" onClick={() => toggleActive(e)} className="text-[10px] font-bold text-neutral-300 border border-neutral-700 rounded-lg px-2 py-1">{e.is_active ? 'Desactivar' : 'Activar'}</button>
                  <button type="button" onClick={() => deleteExercise(e)} className="p-2 text-red-400"><Trash2 size={15} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'exercises' && editing && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white">Editar ejercicio</h3>
          {!editing.is_custom && <p className="text-[10px] text-neutral-500">Ejercicio del catálogo: el nombre no se puede cambiar.</p>}
          {([['name', 'Nombre'], ['target_muscle', 'Músculo'], ['equipment', 'Equipo'], ['category', 'Categoría'], ['weight_increment_kg', 'Incremento de peso (kg)']] as [string, string][]).map(([f, label]) => (
            <label key={f} className="text-[10px] uppercase text-neutral-500 font-bold block">
              {label}
              <input className={inputCls} disabled={f === 'name' && !editing.is_custom} value={editing[f] ?? ''}
                onChange={(e) => setEditing({ ...editing, [f]: e.target.value })} />
            </label>
          ))}
          <label className="text-[10px] uppercase text-neutral-500 font-bold block">
            Instrucciones
            <textarea className={inputCls} rows={3} value={editing.instructions ?? ''} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <button type="button" id="btn-save-exercise" disabled={busy} onClick={saveExercise} className="bg-lime-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl">Guardar</button>
            <button type="button" onClick={() => setEditing(null)} className="text-neutral-300 text-xs border border-neutral-700 rounded-xl px-4 py-2">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
