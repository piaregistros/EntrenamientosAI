import React, { useState, useEffect } from 'react';
import { Calendar, Timer, Dumbbell, ChevronDown, ChevronUp, Loader, AlertTriangle, Info, Trash2, MessageCircle, Pencil, Plus, Check, X } from 'lucide-react';
import { WorkoutLog, WorkoutSet, Exercise } from '../types';
import { apiFetch } from '../lib/api';
import { isTimedByName } from '../lib/measure';

interface HistoryListProps {
  user: {
    id: string;
    name?: string;
    role?: string;
  };
  onOpenExerciseInfo?: (exercise: Exercise) => void;
}

export default function HistoryList({ user, onOpenExerciseInfo }: HistoryListProps) {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [exercisesList, setExercisesList] = useState<Exercise[]>([]);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editRir, setEditRir] = useState('');
  const [addExerciseId, setAddExerciseId] = useState('');
  const [addWeight, setAddWeight] = useState('20');
  const [addReps, setAddReps] = useState('8');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchHistory();
  }, [user?.id]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/workouts?user_id=${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error('Error al obtener el historial de entrenamientos');
      const data = await res.json();
      setWorkouts(Array.isArray(data) ? data : []);

      const exRes = await apiFetch('/api/exercises');
      if (exRes.ok) {
        const exData = await exRes.json();
        const list = Array.isArray(exData.exercises)
          ? exData.exercises
          : Array.isArray(exData)
            ? exData
            : [];
        setExercisesList(list.filter((e: Exercise) => e.is_active !== false));
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedWorkoutId(expandedWorkoutId === id ? null : id);
    setEditingSetId(null);
  };

  const patchWorkoutSets = (workoutId: string, sets: WorkoutSet[]) => {
    setWorkouts((current) =>
      current.map((w) => (w.id === workoutId ? { ...w, sets } : w))
    );
  };

  const handleDeleteWorkout = async (workout: WorkoutLog) => {
    const routineName = workout.routine_name || 'este entrenamiento';
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar ${routineName} del ${new Date(workout.date).toLocaleDateString('es-ES')}?\n\nEsta acción eliminará también todas las series registradas y no se puede deshacer.`
    );
    if (!confirmed) return;
    try {
      setError(null);
      const res = await apiFetch(`/api/workouts/${encodeURIComponent(workout.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'Error al eliminar el entrenamiento');
      }
      // Las cargas recomendadas guardadas en el navegador pueden venir del entreno
      // borrado: se descartan (el servidor ya ha recalculado la progresión).
      localStorage.removeItem('entreno-next-loads');
      setWorkouts((current) => current.filter((item) => item.id !== workout.id));
      if (expandedWorkoutId === workout.id) setExpandedWorkoutId(null);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el entrenamiento.');
    }
  };

  const getWorkoutShareText = (workout: WorkoutLog) => {
    const sets = workout.sets || [];
    const formattedDate = new Date(workout.date).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const byEx = new Map<string, WorkoutSet[]>();
    sets.forEach((s) => {
      const key = s.exercise_id || s.exercise_name || s.id;
      byEx.set(key, [...(byEx.get(key) || []), s]);
    });
    const exerciseLines: string[] = [];
    byEx.forEach((exSets) => {
      const name = exSets.find((s) => s.exercise_name)?.exercise_name
        || exercisesList.find((e) => e.id === exSets[0].exercise_id)?.name
        || 'Ejercicio';
      const series = exSets
        .filter((s) => !s.is_warmup)
        .map((s) => `${s.weight_kg}kg x ${s.reps}`)
        .join(' · ');
      exerciseLines.push(`• ${name}: ${series}`);
    });
    const volume = sets.reduce((sum, s) => {
      if (s.is_warmup || isTimedByName(s.exercise_name)) return sum;
      return sum + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0);
    }, 0);
    const lines = [
      'ENTRENAMIENTO COMPLETADO',
      '',
      `Fecha: ${formattedDate}`,
      `Rutina: ${workout.routine_name || 'Entrenamiento'}`,
      `Duracion: ${workout.duration_minutes || '--'} min`,
      `Series: ${sets.filter((s) => !s.is_warmup).length}`,
    ];
    if (volume > 0) lines.push(`Volumen: ${Math.round(volume).toLocaleString('es-ES')} kg`);
    if (exerciseLines.length) lines.push('', ...exerciseLines);
    if (workout.notes?.trim()) lines.push('', workout.notes.trim());
    return lines.join('\n');
  };

  const handleShareWhatsApp = async (workout: WorkoutLog) => {
    const text = getWorkoutShareText(workout);
    const encoded = encodeURIComponent(text);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title: 'Entrenamiento completado', text });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    window.location.href = 'whatsapp://send?text=' + encoded;
  };

  const startEditSet = (s: WorkoutSet) => {
    setEditingSetId(s.id);
    setEditWeight(String(s.weight_kg ?? ''));
    setEditReps(String(s.reps ?? ''));
    setEditRir(s.rir == null ? '' : String(s.rir));
  };

  const saveEditSet = async (workout: WorkoutLog, s: WorkoutSet) => {
    const weight = parseFloat(editWeight);
    const reps = parseInt(editReps, 10);
    if (Number.isNaN(weight) || weight < 0 || Number.isNaN(reps) || reps < 1) {
      setError('Peso o repeticiones no válidos.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/workouts/${encodeURIComponent(workout.id)}/sets/${encodeURIComponent(s.id)}?user_id=${encodeURIComponent(user.id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            set_number: s.set_number,
            weight_kg: weight,
            reps,
            rir: editRir === '' ? null : parseInt(editRir, 10),
            is_warmup: s.is_warmup,
            notes: s.notes ?? null,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || 'No se pudo guardar la serie');
      const updated = { ...s, weight_kg: weight, reps, rir: editRir === '' ? null : parseInt(editRir, 10) };
      patchWorkoutSets(workout.id, (workout.sets || []).map((x) => (x.id === s.id ? updated : x)));
      setEditingSetId(null);
    } catch (err: any) {
      setError(err.message || 'Error al editar la serie.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSet = async (workout: WorkoutLog, s: WorkoutSet) => {
    if (!window.confirm('¿Borrar esta serie?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/workouts/${encodeURIComponent(workout.id)}/sets/${encodeURIComponent(s.id)}?user_id=${encodeURIComponent(user.id)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'No se pudo borrar la serie');
      }
      patchWorkoutSets(workout.id, (workout.sets || []).filter((x) => x.id !== s.id));
    } catch (err: any) {
      setError(err.message || 'Error al borrar la serie.');
    } finally {
      setSaving(false);
    }
  };

  const isPlank = (name?: string | null) => isTimedByName(name);

  const addSet = async (workout: WorkoutLog) => {
    if (!addExerciseId) {
      setError('Elige un ejercicio.');
      return;
    }
    const chosen = exercisesList.find((e) => e.id === addExerciseId);
    const timed = isPlank(chosen?.name);
    const weight = timed ? 0 : parseFloat(addWeight);
    const reps = parseInt(addReps, 10);
    if (Number.isNaN(weight) || weight < 0 || Number.isNaN(reps) || reps < 1) {
      setError(timed ? 'Segundos no válidos.' : 'Peso o repeticiones no válidos.');
      return;
    }
    const existing = (workout.sets || []).filter((s) => s.exercise_id === addExerciseId);
    const setNumber = existing.length + 1;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/workouts/${encodeURIComponent(workout.id)}/sets?user_id=${encodeURIComponent(user.id)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: addExerciseId,
            set_number: setNumber,
            weight_kg: weight,
            reps,
            rir: null,
            is_warmup: false,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || 'No se pudo añadir la serie');
      const name = exercisesList.find((e) => e.id === addExerciseId)?.name;
      patchWorkoutSets(workout.id, [...(workout.sets || []), { ...data, exercise_name: data.exercise_name || name }]);
    } catch (err: any) {
      setError(err.message || 'Error al añadir la serie.');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalVolume = (sets: WorkoutSet[] | undefined) => {
    if (!sets) return 0;
    return sets.reduce((sum, s) => {
      const isTimed = isTimedByName(s.exercise_name);
      if (s.is_warmup || isTimed) return sum;
      return sum + s.weight_kg * s.reps;
    }, 0);
  };

  const getWorkingSetsCount = (sets: WorkoutSet[] | undefined) => {
    if (!sets) return 0;
    return sets.filter((s) => !s.is_warmup).length;
  };

  if (loading) {
    return (
      <div id="history-loading" className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-lime-400">
        <Loader className="animate-spin mb-4" size={32} />
        <span className="text-sm font-semibold tracking-wide text-neutral-400">Cargando tu historial...</span>
      </div>
    );
  }

  return (
    <div id="history-panel-container" className="min-h-screen bg-neutral-950 text-neutral-100 pb-24 px-4 pt-6 max-w-md mx-auto select-none space-y-6">
      <div>
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Historial</span>
        <h2 id="history-header-title" className="text-2xl font-black text-white mt-1">Tus Sesiones</h2>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/60 text-red-300 text-xs rounded-xl p-3 flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {workouts.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id;
            const volume = calculateTotalVolume(workout.sets);
            const workingSetsCount = getWorkingSetsCount(workout.sets);
            const formattedDate = new Date(workout.date).toLocaleDateString('es-ES', {
              weekday: 'short', day: 'numeric', month: 'short',
            });

            return (
              <div key={workout.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-neutral-500 shrink-0" />
                      <span className="text-[11px] font-bold text-neutral-400 uppercase">{formattedDate}</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-white truncate">{workout.routine_name || 'Entrenamiento'}</h3>
                    <div className="flex items-center gap-4 text-[11px] text-neutral-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Timer size={13} className="text-neutral-500" />
                        <span>{workout.duration_minutes || '--'} min</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Dumbbell size={13} className="text-neutral-500" />
                        <span>{workingSetsCount} series</span>
                      </div>
                      {volume > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-lime-400 font-bold">{volume.toLocaleString()} kg</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {workout.status === 'completed' && (
                      <button
                        id={`btn-share-whatsapp-${workout.id}`}
                        onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(workout); }}
                        className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-850 text-neutral-500 hover:text-green-400"
                        title="Compartir por WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                    )}
                    <button
                      id={`btn-delete-workout-${workout.id}`}
                      onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(workout); }}
                      className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-850 text-neutral-500 hover:text-red-400"
                      title="Eliminar entrenamiento"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExpand(workout.id); }}
                      className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-white"
                      title={isExpanded ? 'Contraer' : 'Ver detalles'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div id={`history-expanded-panel-${workout.id}`} className="bg-neutral-950/60 border-t border-neutral-850 px-4 py-4 space-y-4">
                    {workout.notes && (
                      <div className="bg-neutral-900 border border-neutral-850 p-3 rounded-xl">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide block">Notas de la sesión</span>
                        <p className="text-xs text-neutral-300 mt-1 italic">"{workout.notes}"</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Desglose de Ejercicios</h4>
                      {workout.sets && workout.sets.length > 0 ? (
                        <div className="space-y-3">
                          {(Array.from(new Set(workout.sets.map((s) => s.exercise_id))) as string[]).map((exId) => {
                            const exSets = workout.sets!.filter((s) => s.exercise_id === exId);
                            const matchedExercise = exercisesList.find((e) => e.id === exId);
                            const name =
                              exSets.find((s) => s.exercise_name)?.exercise_name ||
                              matchedExercise?.name ||
                              'Ejercicio';
                            return (
                              <div key={exId} className="bg-neutral-900 border border-neutral-850/50 p-3 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5 text-white">
                                    <span className="text-xs font-extrabold">{name}</span>
                                    {matchedExercise && onOpenExerciseInfo && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onOpenExerciseInfo(matchedExercise); }}
                                        className="p-1 text-neutral-500 hover:text-lime-400 rounded-lg"
                                        title="Ver ficha técnica"
                                      >
                                        <Info size={12} />
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                    {exSets.length} {exSets.length === 1 ? 'serie' : 'series'}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {exSets.map((s) => (
                                    <div key={s.id} className="bg-neutral-950 border border-neutral-850/20 px-2 py-1.5 rounded-lg text-[11px]">
                                      {editingSetId === s.id ? (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <input value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="w-16 bg-neutral-900 border border-neutral-700 rounded-md px-1.5 py-1 text-white" inputMode="decimal" />
                                          <span className="text-neutral-500">kg ×</span>
                                          <input value={editReps} onChange={(e) => setEditReps(e.target.value)} className="w-12 bg-neutral-900 border border-neutral-700 rounded-md px-1.5 py-1 text-white" inputMode="numeric" />
                                          <span className="text-neutral-500">RIR</span>
                                          <input value={editRir} onChange={(e) => setEditRir(e.target.value)} className="w-10 bg-neutral-900 border border-neutral-700 rounded-md px-1.5 py-1 text-white" inputMode="numeric" />
                                          <button disabled={saving} onClick={() => saveEditSet(workout, s)} className="p-1 text-lime-400"><Check size={14} /></button>
                                          <button onClick={() => setEditingSetId(null)} className="p-1 text-neutral-500"><X size={14} /></button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between gap-2">
                                          <span className={s.is_warmup ? 'text-yellow-400 font-bold' : 'text-neutral-400'}>
                                            {s.is_warmup ? 'Calentamiento' : `Serie ${s.set_number}`}
                                          </span>
                                          <span className="text-white font-bold">
                                            {isTimedByName(s.exercise_name)
                                              ? `${s.reps}s`
                                              : `${s.weight_kg}kg × ${s.reps} ${s.rir !== null ? `(RIR ${s.rir})` : ''}`}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <button onClick={() => startEditSet(s)} className="p-1 text-neutral-500 hover:text-lime-400" title="Editar serie"><Pencil size={12} /></button>
                                            <button onClick={() => deleteSet(workout, s)} className="p-1 text-neutral-500 hover:text-red-400" title="Borrar serie"><Trash2 size={12} /></button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-600">No se registraron series en este entrenamiento.</p>
                      )}
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 space-y-2">
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus size={12} /> Añadir serie
                      </h4>
                      <select
                        value={addExerciseId}
                        onChange={(e) => {
                          setAddExerciseId(e.target.value);
                          const chosen = exercisesList.find((x) => x.id === e.target.value);
                          if (isPlank(chosen?.name)) setAddReps('30');
                        }}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-xs text-white"
                      >
                        <option value="">Elige ejercicio…</option>
                        {exercisesList
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                          .map((e) => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                      </select>
                      <div className="flex gap-2">
                        {isPlank(exercisesList.find((e) => e.id === addExerciseId)?.name) ? (
                          <input value={addReps} onChange={(e) => setAddReps(e.target.value)} className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-xs text-white" placeholder="segundos" inputMode="numeric" />
                        ) : (
                          <>
                            <input value={addWeight} onChange={(e) => setAddWeight(e.target.value)} className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-xs text-white" placeholder="kg" inputMode="decimal" />
                            <input value={addReps} onChange={(e) => setAddReps(e.target.value)} className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-xs text-white" placeholder="reps" inputMode="numeric" />
                          </>
                        )}
                        <button
                          disabled={saving}
                          onClick={() => addSet(workout)}
                          className="bg-lime-400 text-black font-extrabold text-xs px-3 rounded-lg disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div id="history-empty" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-4 shadow-lg">
          <Calendar className="mx-auto text-neutral-700" size={32} />
          <h3 className="text-sm font-extrabold text-white">Sin entrenamientos</h3>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-[240px] mx-auto">
            Aún no has registrado ningún entrenamiento completado. ¡Comienza uno hoy!
          </p>
        </div>
      )}
    </div>
  );
}
