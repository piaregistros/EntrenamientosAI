import React, { useState, useEffect } from 'react';
import { Play, Dumbbell, Scale, TrendingUp, Calendar, CheckCircle2, ChevronRight, Plus, Loader, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Routine, WorkoutLog, BodyMetric } from '../types';
import { apiFetch } from '../lib/api';

interface DashboardProps {
  user: any;
  onStartWorkout: (routineId: string) => void;
  onNavigateToTab: (tab: string) => void;
  onOpenExerciseInfo?: (exercise: any) => void;
}

export default function Dashboard({ user, onStartWorkout, onNavigateToTab, onOpenExerciseInfo }: DashboardProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [lastWorkout, setLastWorkout] = useState<WorkoutLog | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutLog | null>(null);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedRoutineForPreview, setSelectedRoutineForPreview] = useState<Routine | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData();
  }, [user?.id]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Rutinas del usuario
      const routRes = await apiFetch(
        `/api/routines?user_id=${encodeURIComponent(user.id)}`
      );

      if (!routRes.ok) {
        throw new Error('Error al cargar rutinas');
      }

      const routData = await routRes.json();
      const routineList = Array.isArray(routData) ? routData : [];

      // El listado de rutinas no incluye necesariamente sus ejercicios.
      // Cargamos el detalle real de cada rutina para la vista previa.
      const routinesWithExercises = await Promise.all(
        routineList.map(async (routine: Routine) => {
          const detailRes = await apiFetch(
            `/api/routines/${routine.id}?user_id=${encodeURIComponent(user.id)}`
          );

          if (!detailRes.ok) {
            return routine;
          }

          const detail = await detailRes.json();

          const rawExercises = Array.isArray(detail.exercises)
            ? detail.exercises
            : routine.exercises || [];

          const normalizedExercises = rawExercises.map((item: any) => {
            const sourceExercise = item.exercise || {};

            const exercise = {
              ...sourceExercise,
              id:
                sourceExercise.id ||
                item.exercise_id ||
                item.id ||
                item.exercise?.exercise_id,
              name:
                sourceExercise.name ||
                item.name ||
                item.exercise_name ||
                "Ejercicio",
              target_muscle:
                sourceExercise.target_muscle ||
                item.target_muscle ||
                "",
              category:
                sourceExercise.category ||
                item.category ||
                "",
              equipment:
                sourceExercise.equipment ||
                item.equipment ||
                "",
              safety_notes:
                sourceExercise.safety_notes ??
                item.safety_notes ??
                "",
              instructions:
                sourceExercise.instructions ??
                item.instructions ??
                "",
              contraindications:
                sourceExercise.contraindications ??
                item.contraindications ??
                "",
              weight_increment_kg:
                sourceExercise.weight_increment_kg ??
                item.weight_increment_kg ??
                0,
              progression_type:
                sourceExercise.progression_type ??
                item.progression_type ??
                "",
              rep_progression_enabled:
                sourceExercise.rep_progression_enabled ??
                item.rep_progression_enabled ??
                false,
              steps:
                sourceExercise.steps ??
                item.steps,
              technical_cues:
                sourceExercise.technical_cues ??
                item.technical_cues,
              common_mistakes:
                sourceExercise.common_mistakes ??
                item.common_mistakes,
              video_url:
                sourceExercise.video_url ??
                item.video_url,
            };

            return {
              ...item,
              exercise,
              exercise_id: item.exercise_id || exercise.id,
            };
          });

          return {
            ...routine,
            ...detail,
            exercises: normalizedExercises,
          };
        })
      );

      setRoutines(routinesWithExercises);

      // 2. Historial de entrenamientos
      const workRes = await apiFetch(
        `/api/workouts?user_id=${encodeURIComponent(user.id)}`
      );

      if (!workRes.ok) {
        throw new Error('Error al cargar historial');
      }

      const workData = await workRes.json();
      const completed = Array.isArray(workData)
        ? workData.filter((w: WorkoutLog) => w.status === 'completed')
        : [];

      setLastWorkout(completed.length > 0 ? completed[0] : null);

      // 3. Entrenamiento actualmente en curso
      const activeRes = await apiFetch(
        `/api/workouts/in-progress?user_id=${encodeURIComponent(user.id)}`
      );

      if (!activeRes.ok) {
        throw new Error('Error al comprobar entrenamiento en curso');
      }

      const activeData = await activeRes.json();
      setActiveWorkout(
        activeData && activeData.status === 'in_progress'
          ? activeData
          : null
      );

      // 4. Métricas corporales
      const metricRes = await apiFetch(
        `/api/body-metrics?user_id=${encodeURIComponent(user.id)}`
      );

      if (!metricRes.ok) {
        throw new Error('Error al cargar métricas de peso');
      }

      const metricData = await metricRes.json();
      setMetrics(
        Array.isArray(metricData.metrics)
          ? metricData.metrics
          : []
      );
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      setError('Por favor, introduce un peso válido.');
      return;
    }

    setLoggingWeight(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch('/api/body-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          weight_kg: weight,
          date: new Date().toISOString().split('T')[0],
          notes: 'Registrado desde la pantalla de inicio'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el peso');
      }

      setSuccessMsg(`¡Peso de ${weight} kg registrado con éxito!`);
      setWeightInput('');
      
      // El backend devuelve la métrica creada directamente.
      // Aceptamos también { metric: ... } por compatibilidad.
      const savedMetric = data.metric ?? data;
      setMetrics((previous) => [savedMetric, ...previous]);
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar el peso.');
    } finally {
      setLoggingWeight(false);
    }
  };

  // Determine next recommended routine
  const getNextRecommendedRoutine = () => {
    if (routines.length === 0) return null;
    if (!lastWorkout) return routines[0]; // If first time, Routine A is recommended

    const lastId = lastWorkout.routine_id;
    const lastIndex = routines.findIndex(r => r.id === lastId);
    if (lastIndex === -1 || lastIndex === routines.length - 1) {
      return routines[0]; // Rotate back to first
    }
    return routines[lastIndex + 1]; // Next in rotation
  };

  const recommendedRoutine = getNextRecommendedRoutine();

  if (loading) {
    return (
      <div id="dashboard-loading" className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-lime-400">
        <Loader className="animate-spin mb-4" size={32} />
        <span className="text-sm font-semibold tracking-wide text-neutral-400">Cargando tu panel de control...</span>
      </div>
    );
  }

  return (
    <div id="dashboard-container" className="min-h-screen bg-neutral-950 text-neutral-100 pb-24 px-4 pt-6 max-w-md mx-auto select-none space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Panel de Control</span>
          <h2 id="dashboard-greeting" className="text-2xl font-black text-white mt-1">¡Hola, {user.name}! 👋</h2>
        </div>
        <div className="bg-lime-500/10 border border-lime-500/20 px-3 py-1 rounded-full text-[10px] font-bold text-lime-400 uppercase tracking-wider">
          {user.role === 'admin' ? 'Administrador' : 'Atleta'}
        </div>
      </div>

      {/* Active Workout Widget */}
      {activeWorkout && activeWorkout.routine_id && (
        <div
          id="active-workout-card"
          className="bg-lime-500/10 border border-lime-400/40 rounded-2xl p-5 shadow-xl space-y-4 ring-1 ring-lime-500/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-lime-500/15 border border-lime-500/25 flex items-center justify-center text-lime-400">
                <Dumbbell size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-lime-400 uppercase tracking-wide">
                  Entrenamiento en curso
                </h4>
                <p className="text-[10px] text-neutral-400">
                  Sesión guardada automáticamente
                </p>
              </div>
            </div>

            <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h5 className="text-base font-extrabold text-white">
              {activeWorkout.routine_name || 'Entrenamiento'}
            </h5>
            <p className="text-[11px] text-neutral-400">
              Iniciado el{' '}
              {new Date(activeWorkout.date).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
              })}{' '}
              a las{' '}
              {new Date(activeWorkout.date).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <button
            id="btn-resume-active-workout"
            type="button"
            onClick={() => onStartWorkout(activeWorkout.routine_id!)}
            className="w-full bg-lime-400 hover:bg-lime-300 text-black font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Play size={14} fill="currentColor" />
            <span>Continuar entrenamiento</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}


      {error && (
        <div id="dashboard-error" className="bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs flex gap-3">
          <span className="font-bold">Error:</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div id="dashboard-success" className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 p-4 rounded-xl text-xs flex gap-3">
          <CheckCircle2 size={16} className="text-lime-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Recommended Routine Card */}
      {recommendedRoutine && (
        <div id="recommended-routine-card" className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/5 blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] bg-lime-400/10 text-lime-400 font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider border border-lime-400/20">Siguiente Entrenamiento</span>
              <h3 id="recommended-routine-title" className="text-xl font-extrabold text-white mt-3">{recommendedRoutine.name}</h3>
              <p className="text-xs text-neutral-400 mt-1">Personalizado para progresión de fuerza e hipertrofia.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lime-400">
              <Dumbbell size={18} />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-800/60 flex items-center justify-between">
            <button
              id="btn-preview-routine"
              onClick={() => setSelectedRoutineForPreview(recommendedRoutine)}
              className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1.5"
            >
              <Info size={14} />
              <span>Ver Ejercicios</span>
            </button>
            <button
              id="btn-start-recommended-workout"
              onClick={() => onStartWorkout(recommendedRoutine.id)}
              className="bg-lime-400 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 hover:bg-lime-300 transition-all active:scale-95 shadow-lg shadow-lime-500/5"
              style={{ minHeight: '44px' }}
            >
              <Play size={12} fill="currentColor" />
              <span>Empezar</span>
            </button>
          </div>
        </div>
      )}

      {/* Routine list switcher */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Elegir Rutina</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {routines.map((routine) => (
            <button
              key={routine.id}
              id={`select-routine-${routine.id}`}
              onClick={() => setSelectedRoutineForPreview(routine)}
              className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 p-3.5 rounded-xl flex flex-col justify-between items-start transition-all active:scale-95 text-left h-24 relative"
            >
              <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wide">Rutina {routine.day_order}</span>
              <span className="text-sm font-extrabold text-white leading-tight">{routine.name}</span>
              <span className="text-[9px] text-neutral-500 mt-1 block">Toca para ver</span>
            </button>
          ))}
        </div>
      </div>

      {/* Last Session Review Widget */}
      {lastWorkout && (
        <div id="last-session-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-neutral-800/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400">
                <Calendar size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Último Entrenamiento</h4>
                <p className="text-[10px] text-neutral-500">Completado el {new Date(lastWorkout.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
            <button
              id="last-session-nav-btn"
              onClick={() => onNavigateToTab('history')}
              className="text-[10px] font-bold text-lime-400 uppercase tracking-wide flex items-center gap-0.5 hover:underline"
            >
              <span>Historial</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-extrabold text-white">{lastWorkout.routine_name}</h5>
            {lastWorkout.sets && lastWorkout.sets.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 max-h-36 overflow-y-auto pr-1">
                {/* Group sets by exercise name to show beautifully */}
                {(Array.from(new Set(lastWorkout.sets.map(s => s.exercise_id))) as string[]).slice(0, 3).map(exerciseId => {
                  const exerciseSets = lastWorkout.sets!.filter(s => s.exercise_id === exerciseId && !s.is_warmup);
                  const firstSet = lastWorkout.sets!.find(s => s.exercise_id === exerciseId);
                  if (exerciseSets.length === 0) return null;
                  
                  const name =
                    firstSet?.exercise_name ||
                    'Ejercicio';

                  const isTimedExercise =
                    name.trim().toLowerCase() === 'plancha';

                  return (
                    <div key={exerciseId} className="flex justify-between items-center bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-800/40">
                      <span className="text-xs font-extrabold text-neutral-300">{name}</span>
                      <span className="text-[11px] font-mono text-lime-400">
                        {isTimedExercise
                          ? `${exerciseSets.map(s => `${s.reps}s`).join(' · ')}`
                          : `${exerciseSets[0].weight_kg}kg · ${exerciseSets.map(s => s.reps).join('/')}`
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Sin series registradas en esta sesión.</p>
            )}
          </div>
        </div>
      )}

      {/* Routine Preview Modal / Drawer */}
      {selectedRoutineForPreview && (
        <div id="routine-preview-modal" className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-neutral-900 border border-neutral-800 rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6 space-y-6 pb-12 shadow-2xl"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-lime-400 uppercase tracking-widest">Resumen de Routine</span>
                <h3 id="preview-routine-title" className="text-xl font-extrabold text-white mt-1">{selectedRoutineForPreview.name}</h3>
              </div>
              <button
                id="btn-close-routine-preview"
                onClick={() => setSelectedRoutineForPreview(null)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-full p-1.5 transition-all"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Lista de Ejercicios</h4>
              <div className="space-y-2.5">
                {selectedRoutineForPreview.exercises && selectedRoutineForPreview.exercises.map((re, idx) => (
                  <div key={re.id} className="flex justify-between items-center bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/60">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-neutral-500 font-bold bg-neutral-900 w-6 h-6 rounded-lg flex items-center justify-center border border-neutral-800">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-extrabold text-white">{re.exercise?.name}</p>
                          {re.exercise && onOpenExerciseInfo && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenExerciseInfo(re.exercise);
                              }}
                              className="p-1 text-neutral-500 hover:text-lime-400 rounded-md transition-colors cursor-pointer"
                              title="Ver ficha del ejercicio"
                            >
                              <Info size={12} />
                            </button>
                          )}
                        </div>
                        <p className="text-[9px] text-neutral-500 mt-0.5 uppercase font-semibold tracking-wider">
                          {re.exercise?.target_muscle} · {re.exercise?.equipment}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-lime-400">
                        {re.exercise?.name?.trim().toLowerCase() === 'plancha'
                          ? `${re.target_sets} × ${re.target_rep_min}-${re.target_rep_max}s`
                          : `${re.target_sets} × ${re.target_rep_min}-${re.target_rep_max}`
                        }
                      </p>
                      <p className="text-[9px] text-neutral-500 mt-0.5 font-medium">RIR {re.target_rir} · {re.rest_seconds}s desc</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              id="btn-modal-start-workout"
              onClick={() => {
                const id = selectedRoutineForPreview.id;
                setSelectedRoutineForPreview(null);
                onStartWorkout(id);
              }}
              className="w-full bg-lime-400 text-black font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg hover:bg-lime-300 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <Play size={14} fill="currentColor" />
              <span>Empezar este Entrenamiento</span>
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
