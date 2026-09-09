import React, { useState, useEffect } from 'react';
import { Calendar, Timer, Dumbbell, ChevronDown, ChevronUp, Loader, AlertTriangle, Info } from 'lucide-react';
import { WorkoutLog, WorkoutSet, Exercise } from '../types';
import { apiFetch } from '../lib/api';

interface HistoryListProps {
  onOpenExerciseInfo?: (exercise: Exercise) => void;
}

export default function HistoryList({ onOpenExerciseInfo }: HistoryListProps) {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [exercisesList, setExercisesList] = useState<Exercise[]>([]);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group maps to find exercise names for rendering
  const exNames: Record<string, string> = {
    'ex-1': 'Curl de bíceps en máquina',
    'ex-2': 'Curl femoral',
    'ex-3': 'Elevaciones laterales en máquina',
    'ex-4': 'Extensión de tríceps en polea',
    'ex-5': 'Face pull',
    'ex-6': 'Hip thrust',
    'ex-7': 'Jalón al pecho agarre neutro',
    'ex-8': 'Plancha',
    'ex-9': 'Prensa de piernas',
    'ex-10': 'Press banca plano',
    'ex-11': 'Press de hombro con mancuernas agarre neutro',
    'ex-12': 'Press inclinado con mancuernas 30 grados',
    'ex-13': 'Remo con pecho apoyado',
    'ex-14': 'Remo unilateral con mancuerna',
    'ex-15': 'Sentadilla búlgara',
    'ex-16': 'Zancadas'
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/workouts');
      if (!res.ok) throw new Error('Error al obtener el historial de entrenamientos');
      const data = await res.json();
      setWorkouts(data);

      const exRes = await apiFetch('/api/exercises');
      if (exRes.ok) {
        const exData = await exRes.json();
        setExercisesList(exData);
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedWorkoutId(expandedWorkoutId === id ? null : id);
  };

  const calculateTotalVolume = (sets: WorkoutSet[] | undefined) => {
    if (!sets) return 0;
    return sets.reduce((sum, s) => {
      if (s.is_warmup || s.exercise_id === 'ex-8') return sum; // exclude warmup and Plancha
      return sum + s.weight_kg * s.reps;
    }, 0);
  };

  const getWorkingSetsCount = (sets: WorkoutSet[] | undefined) => {
    if (!sets) return 0;
    return sets.filter(s => !s.is_warmup).length;
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
        <div id="history-error" className="bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs flex gap-3">
          <AlertTriangle className="shrink-0 text-red-400" size={16} />
          <span>{error}</span>
        </div>
      )}

      {workouts.length > 0 ? (
        <div className="space-y-4">
          {workouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id;
            const volume = calculateTotalVolume(workout.sets);
            const workingSetsCount = getWorkingSetsCount(workout.sets);
            
            // Format nice date e.g. "03 septiembre 2026"
            const formattedDate = new Date(workout.date).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            return (
              <div
                key={workout.id}
                id={`history-workout-card-${workout.id}`}
                className={`bg-neutral-900 border transition-all rounded-2xl overflow-hidden ${
                  isExpanded ? 'border-lime-500/50 ring-1 ring-lime-500/20' : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Header row click to expand */}
                <div
                  id={`history-workout-header-${workout.id}`}
                  onClick={() => toggleExpand(workout.id)}
                  className="p-4 cursor-pointer flex justify-between items-start select-none"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                        {formattedDate}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                        workout.status === 'completed'
                          ? 'bg-lime-500/10 border-lime-500/20 text-lime-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {workout.status === 'completed' ? 'Completado' : 'Cancelado'}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white leading-tight">
                      {workout.routine_name}
                    </h3>

                    {/* Stats strip */}
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
                          <span className="text-neutral-500 text-[10px]">volumen</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    id={`btn-expand-workout-${workout.id}`}
                    className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-850 text-neutral-400 group-hover:text-white"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded sets summary lists */}
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
                          {/* Group sets by exercise_id */}
                          {(Array.from(new Set(workout.sets.map(s => s.exercise_id))) as string[]).map(exId => {
                            const exSets = workout.sets!.filter(s => s.exercise_id === exId);
                            const matchedExercise = exercisesList.find(e => e.id === exId);
                            const name = matchedExercise?.name || exNames[exId] || 'Ejercicio';

                            return (
                              <div key={exId} className="bg-neutral-900 border border-neutral-850/50 p-3 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5 text-white">
                                    <span className="text-xs font-extrabold">{name}</span>
                                    {matchedExercise && onOpenExerciseInfo && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenExerciseInfo(matchedExercise);
                                        }}
                                        className="p-1 text-neutral-500 hover:text-lime-400 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
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

                                <div className="grid grid-cols-2 gap-1.5">
                                  {exSets.map((s) => (
                                    <div key={s.id} className="bg-neutral-950 border border-neutral-850/20 px-2 py-1.5 rounded-lg text-[11px] font-mono flex items-center justify-between">
                                      <span className={s.is_warmup ? 'text-yellow-400 font-bold' : 'text-neutral-400'}>
                                        {s.is_warmup ? 'Calentamiento' : `Serie ${s.set_number}`}
                                      </span>
                                      <span className="text-white font-bold">
                                        {s.exercise_id === 'ex-8'
                                          ? `${s.reps}s`
                                          : `${s.weight_kg}kg × ${s.reps} ${s.rir !== null ? `(RIR ${s.rir})` : ''}`
                                        }
                                      </span>
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
