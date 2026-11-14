import React, { useState, useEffect, useRef } from 'react';
import { Play, Dumbbell, Timer, ArrowRight, ArrowLeft, Plus, Check, Trash2, RefreshCw, XCircle, ChevronRight, CheckCircle2, AlertTriangle, Loader, Volume2, Info, MessageCircle } from 'lucide-react';
// share icons added below if missing

import { motion, AnimatePresence } from 'motion/react';
import { Exercise, Routine, RoutineExercise, WorkoutLog, WorkoutSet, ExerciseSubstitution, SubstituteResponse, SubstituteOption, StagnationItem } from '../types';
import { apiFetch } from '../lib/api';
import { plateBreakdown, stepWeight, usesPlateCalculator } from '../lib/weightControl';
import { isTimedExercise, rememberMeasure, fmtKg } from '../lib/measure';
import { rebuildSessionExercises } from '../lib/rebuildSession';
import { REST_MIN, REST_STEP, formatRest, rememberExerciseRest, resolveRestSeconds } from '../lib/restTimer';
import { cancelRestPush, scheduleRestPush } from '../lib/push';
import ExerciseIcon from './ExerciseIcon';
import WarmupBlock from './WarmupBlock';
import type { WarmupSet } from '../lib/warmup';

interface WorkoutActiveProps {
  user: any;
  routineId: string;
  existingWorkoutId?: string | null;
  onWorkoutFinished: () => void;
  onWorkoutExit: () => void;
  onOpenExerciseInfo?: (exercise: any) => void;
}

// Fase 6: el tipo de medida (reps / time / bodyweight) viene del servidor (src/lib/measure.ts).

// Peso inicial cuando no hay historial ni recomendación: nunca un valor inventado.
// Peso corporal puro / ejercicios por tiempo -> 0; resto -> vacío (el usuario elige).
function defaultStartWeight(item: any): string {
  if (isTimedExercise(item)) return '0';
  const equip = String(item?.exercise?.equipment || '').trim().toLowerCase();
  if (equip === 'peso corporal') return '0';
  return '';
}

export default function WorkoutActive({
  user,
  routineId,
  existingWorkoutId,
  onWorkoutFinished,
  onWorkoutExit,
  onOpenExerciseInfo,
}: WorkoutActiveProps) {
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [activeExIndex, setActiveExIndex] = useState(0);
  const [loggedSets, setLoggedSets] = useState<WorkoutSet[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Timer states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [totalRestDuration, setTotalRestDuration] = useState<number>(0);

  // Form states for adding sets
  const lastWeightByExercise = React.useRef<Record<string, string>>({});
  const [inputWeight, setInputWeight] = useState<string>('');
  const [inputReps, setInputReps] = useState<string>('');
  const [inputRir, setInputRir] = useState<string>('2');
  const [isWarmup, setIsWarmup] = useState<boolean>(false);
  const [setNote, setSetNote] = useState<string>('');

  // Modals & panels
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [finishNotes, setFinishNotes] = useState('');
  const [showSubModal, setShowSubModal] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraId, setExtraId] = useState('');
  const [availableSubs, setAvailableSubs] = useState<any[]>([]);
  const [subReason, setSubReason] = useState('No disponible');
  // Fase 7: selector de sustituciones con buscador, equipo no disponible y «usar siempre en la rutina»
  const [subData, setSubData] = useState<SubstituteResponse | null>(null);
  const [subQuery, setSubQuery] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subAlways, setSubAlways] = useState(false);
  const [substitutionsMap, setSubstitutionsMap] = useState<Record<string, RoutineExercise>>({});
  const [stagnation, setStagnation] = useState<StagnationItem[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submittingSet, setSubmittingSet] = useState(false);
  const [submittingWorkout, setSubmittingWorkout] = useState(false);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sound play helper simulation
  const audioContextRef = useRef<AudioContext | null>(null);
  const workoutStartMsRef = useRef<number | null>(null);
  const restEndsAtMsRef = useRef<number | null>(null);

  const announceRestDone = () => {
    playTimerDoneSound();
    try {
      const vibrate = (navigator as any).vibrate;
      if (typeof vibrate === 'function') vibrate.call(navigator, [200, 80, 200]);
    } catch {
      // El dispositivo no admite vibración o el usuario no lo ha concedido.
    }
  };

  const playTimerDoneSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio playback failed (blocked or not supported), ignore gracefully
    }
  };

  // Start or recover workout and fetch details on mount.
  useEffect(() => {
    startWorkoutSession();
  }, [routineId, existingWorkoutId]);

  useEffect(() => {
    if (!user?.id) return;
    apiFetch(`/api/progress/stagnation?user_id=${encodeURIComponent(user.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setStagnation(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setStagnation([]));
  }, [user?.id]);

  const syncElapsedFromClock = () => {
    const start = workoutStartMsRef.current;
    if (!start) return;
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
  };

  const restExerciseName = () => {
    const item = exercises[activeExIndex];
    return String(item?.exercise?.name || item?.name || '').trim();
  };

  const persistRestEnds = (ends: number, total: number, exerciseName?: string) => {
    try {
      let name = exerciseName || '';
      if (!name) {
        try {
          const prev = sessionStorage.getItem('entreno-rest-ends');
          if (prev && prev.startsWith('{')) {
            const parsed = JSON.parse(prev);
            if (parsed?.exerciseName) name = String(parsed.exerciseName);
          }
        } catch {}
      }
      sessionStorage.setItem('entreno-rest-ends', JSON.stringify({ ends, total, exerciseName: name }));
    } catch {}
  };

  const syncRestPush = (seconds: number | null, exerciseName?: string) => {
    if (seconds && seconds > 0) {
      void scheduleRestPush(seconds, exerciseName || restExerciseName());
    } else {
      void cancelRestPush();
    }
  };

  const syncRestFromClock = () => {
    const ends = restEndsAtMsRef.current;
    if (ends == null) return;
    const left = Math.ceil((ends - Date.now()) / 1000);
    if (left <= 0) {
      restEndsAtMsRef.current = null;
      try { sessionStorage.removeItem('entreno-rest-ends'); } catch {}
      setRestSecondsLeft(null);
      announceRestDone();
    } else {
      setRestSecondsLeft(left);
    }
  };

  const beginRest = (seconds: number, exerciseName?: string) => {
    if (!seconds || seconds <= 0) return;
    const duration = Math.max(REST_MIN, seconds);
    const name = exerciseName || restExerciseName();
    setTotalRestDuration(duration);
    const ends = Date.now() + duration * 1000;
    restEndsAtMsRef.current = ends;
    persistRestEnds(ends, duration, name);
    setRestSecondsLeft(duration);
    syncRestPush(duration, name);
  };

  const addRestSeconds = (extra: number) => {
    const currentEnds = restEndsAtMsRef.current ?? (Date.now() + (restSecondsLeft || 0) * 1000);
    const minEnds = Date.now() + REST_MIN * 1000;
    const ends = Math.max(minEnds, currentEnds + extra * 1000);
    restEndsAtMsRef.current = ends;
    const left = Math.max(REST_MIN, Math.ceil((ends - Date.now()) / 1000));
    const total = extra > 0 ? Math.max(totalRestDuration, left) : totalRestDuration;
    setTotalRestDuration(total);
    persistRestEnds(ends, total, restExerciseName());
    setRestSecondsLeft(left);
    const eid = exercises[activeExIndex]?.exercise?.id;
    if (eid) rememberExerciseRest(eid, left);
    syncRestPush(left, restExerciseName());
  };

  const clearRest = () => {
    restEndsAtMsRef.current = null;
    try { sessionStorage.removeItem('entreno-rest-ends'); } catch {}
    setRestSecondsLeft(null);
    syncRestPush(null);
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('entreno-rest-ends');
      if (saved) {
        let ends = 0;
        let total = 0;
        if (saved.startsWith('{')) {
          const parsed = JSON.parse(saved);
          ends = Number(parsed.ends);
          total = Number(parsed.total) || 0;
        } else {
          ends = Number(saved);
        }
        if (ends > Date.now()) {
          restEndsAtMsRef.current = ends;
          const left = Math.ceil((ends - Date.now()) / 1000);
          setRestSecondsLeft(left);
          setTotalRestDuration(total > 0 ? total : left);
          const name = saved.startsWith('{') ? String((JSON.parse(saved) as any).exerciseName || '') : '';
          void scheduleRestPush(left, name);
        } else {
          sessionStorage.removeItem('entreno-rest-ends');
          void cancelRestPush();
        }
      }
    } catch {}
    const tick = () => {
      syncElapsedFromClock();
      syncRestFromClock();
    };
    tick();
    const interval = setInterval(tick, 250);
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', tick);
    window.addEventListener('pageshow', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', tick);
      window.removeEventListener('pageshow', tick);
    };
  }, []);

  const startWorkoutSession = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Recover the existing session when App.tsx restored one.
      // Otherwise create a new in_progress session.
      let startData: any;

      if (existingWorkoutId) {
        const existingRes = await apiFetch(
          `/api/workouts/${encodeURIComponent(existingWorkoutId)}?user_id=${encodeURIComponent(user.id)}`
        );

        if (!existingRes.ok) {
          throw new Error('No se pudo recuperar el entrenamiento en curso');
        }

        startData = await existingRes.json();
        setLoggedSets(Array.isArray(startData.sets) ? startData.sets : []);
      } else {
        const startRes = await apiFetch('/api/workouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            routine_id: routineId,
          }),
        });

        if (!startRes.ok) {
          const fail = await startRes.json().catch(() => ({}));
          throw new Error(fail.detail || fail.error || 'No se pudo inicializar el entrenamiento');
        }

        startData = await startRes.json();

        // Si el backend ha encontrado una sesión ya existente,
        // recuperamos sus datos inmediatamente.
        if (startData.existing && startData.id) {
          const existingRes = await apiFetch(
            `/api/workouts/${encodeURIComponent(startData.id)}?user_id=${encodeURIComponent(user.id)}`
          );

          if (!existingRes.ok) {
            throw new Error('No se pudo recuperar el entrenamiento en curso');
          }

          startData = await existingRes.json();
          setLoggedSets(Array.isArray(startData.sets) ? startData.sets : []);
        } else {
          setLoggedSets([]);
        }
      }

      setWorkoutLog(startData);

      // El cronómetro debe continuar desde el inicio real de la sesión.
      if (startData.date) {
        const startedAt = new Date(startData.date).getTime();
        if (!Number.isNaN(startedAt)) {
          workoutStartMsRef.current = startedAt;
          setElapsedSeconds(
            Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
          );
        } else {
          workoutStartMsRef.current = Date.now();
        }
      }

      // 2. Fetch routine with exercise list and last performance
      const routRes = await apiFetch(`/api/routines/${routineId}/with-last-performance?user_id=${encodeURIComponent(user.id)}`);
      if (!routRes.ok) throw new Error('Error al cargar datos de rutina');
      const routData = await routRes.json();
      setRoutine(routData.routine || routData);

      // La carga recomendada guardada en el navegador ('entreno-next-loads') puede
      // estar obsoleta (p. ej. tras borrar un entreno). Antes de pintar nada se
      // sustituye SIEMPRE por la que dice el servidor; si no se puede validar, se
      // descarta en vez de fiarse de ella.
      try {
        const homeRes = await apiFetch(`/api/progress/home?user_id=${encodeURIComponent(user.id)}`);
        if (homeRes.ok) {
          const homeData = await homeRes.json();
          localStorage.setItem('entreno-next-loads', JSON.stringify(homeData?.loads || {}));
        } else {
          localStorage.removeItem('entreno-next-loads');
        }
      } catch {
        localStorage.removeItem('entreno-next-loads');
      }

      const loadedExercises = (routData.exercises || []).map((item: any) => {
          const sourceExercise = item.exercise || {};

          const exercise = {
            ...sourceExercise,
            id:
              sourceExercise.id ||
              item.id ||
              item.exercise_id ||
              item.exercise?.exercise_id,
            name:
              sourceExercise.name ||
              item.name ||
              item.exercise_name ||
              "Ejercicio",
          };

          return {
            ...item,
            id: item.id || item.exercise_id || exercise.id,
            exercise,
            target_sets: item.target_sets ?? item.target?.sets,
            target_rep_min: item.target_rep_min ?? item.target?.rep_min,
            target_rep_max: item.target_rep_max ?? item.target?.rep_max,
            target_rir: item.target_rir ?? item.target?.rir,
            rest_seconds: item.rest_seconds ?? item.target?.rest_seconds,
          };
        });

      // Reconstruir la sesión tal y como estaba: sustituciones y ejercicios
      // extra se guardan en el servidor (antes solo vivían en memoria).
      const restoredExercises = rebuildSessionExercises(
        loadedExercises,
        startData.substitutions,
        startData.extra_exercises,
        Array.isArray(startData.sets) ? startData.sets : []
      );
      setExercises(restoredExercises.items);
      setSubstitutionsMap(restoredExercises.substitutionsMap);

      // Recuperar exactamente el ejercicio que estaba activo antes
      // de refrescar o cambiar de dispositivo.
      if (startData.current_exercise_id) {
        const restoredIndex = restoredExercises.items.findIndex(
          (item: any) =>
            item.exercise?.id === startData.current_exercise_id ||
            item.exercise_id === startData.current_exercise_id ||
            item.id === startData.current_exercise_id
        );

        if (restoredIndex >= 0) {
          setActiveExIndex(restoredIndex);
        } else {
          // Si el ejercicio ya no pertenece a la rutina, usamos el primero.
          setActiveExIndex(0);
        }
      } else {
        setActiveExIndex(0);
      }

      // 3. Fetch recommendations for the progression rule
      const recsRes = await apiFetch(`/api/routines/${routineId}/recommendations?user_id=${encodeURIComponent(user.id)}${startData?.id ? `&workout_id=${encodeURIComponent(startData.id)}` : ''}`);
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        (recsData.recommendations || []).forEach((r: any) => rememberMeasure(r.exercise_id, r.measure_type));
        setRecommendations(recsData.recommendations || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const persistCurrentExercise = async (exerciseId: string) => {
    if (!workoutLog?.id || !user?.id) return;

    try {
      const response = await apiFetch(
        `/api/workouts/${encodeURIComponent(workoutLog.id)}?user_id=${encodeURIComponent(user.id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: workoutLog.status,
            duration_minutes: workoutLog.duration_minutes ?? null,
            notes: workoutLog.notes ?? null,
            current_exercise_id: exerciseId,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          '[WorkoutActive] No se pudo guardar el ejercicio actual:',
          response.status
        );
        return;
      }

      setWorkoutLog(prev =>
        prev
          ? {
              ...prev,
              current_exercise_id: exerciseId,
            }
          : prev
      );
    } catch (error) {
      console.error(
        '[WorkoutActive] Error guardando el ejercicio actual:',
        error
      );
    }
  };

  const loadCatalog = async () => {
    if (catalog.length) {
      setShowAddExtra(true);
      return;
    }
    try {
      const res = await apiFetch('/api/exercises');
      const data = await res.json();
      const list = Array.isArray(data?.exercises) ? data.exercises : Array.isArray(data) ? data : [];
      setCatalog(list.filter((e: any) => e.is_active !== false && e.is_active !== 0));
      setShowAddExtra(true);
    } catch {
      setError('No se pudo cargar el catálogo.');
    }
  };

  const addExtraExercise = async () => {
    const ex = catalog.find((e) => e.id === extraId);
    if (!ex) {
      setError('Elige un ejercicio.');
      return;
    }
    const already = exercises.findIndex((re) => re.exercise?.id === ex.id || re.exercise_id === ex.id);
    if (already >= 0) {
      selectExercise(already);
      setShowAddExtra(false);
      return;
    }
    if (!workoutLog?.id) {
      setError('La sesión todavía no está lista.');
      return;
    }

    // Se guarda primero en el servidor: si falla, no se añade a medias y
    // el usuario ve el error (antes se perdía en silencio al recargar).
    try {
      const res = await apiFetch(
        `/api/workouts/${encodeURIComponent(workoutLog.id)}/extra-exercises?user_id=${encodeURIComponent(user.id)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: ex.id,
            target_sets: 3,
            target_rep_min: 8,
            target_rep_max: 12,
            target_rir: 2,
            rest_seconds: 90,
          }),
        }
      );
      if (!res.ok) {
        const fail = await res.json().catch(() => ({}));
        throw new Error(typeof fail.detail === 'string' ? fail.detail : 'No se pudo añadir el ejercicio.');
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo añadir el ejercicio.');
      return;
    }

    const item = {
      id: 'extra-' + ex.id,
      exercise_id: ex.id,
      order: exercises.length + 1,
      target_sets: 3,
      target_rep_min: 8,
      target_rep_max: 12,
      target_rir: 2,
      rest_seconds: 90,
      is_optional: true,
      exercise: ex,
    };
    const next = [...exercises, item];
    setExercises(next);
    setActiveExIndex(next.length - 1);
    setShowAddExtra(false);
    setError(null);
    void persistCurrentExercise(ex.id);
  };

  const selectExercise = (index: number) => {
    if (index < 0 || index >= exercises.length) return;

    setActiveExIndex(index);

    const exerciseId = exercises[index]?.exercise?.id;

    if (exerciseId) {
      void persistCurrentExercise(exerciseId);
    }
  };

  const activeExerciseItem = exercises[activeExIndex];
  const activeExercise = activeExerciseItem?.exercise;

  // Sync inputs with recommendations when active exercise changes
  useEffect(() => {
    if (!activeExerciseItem || !activeExercise) return;
    
    // Find recommendation
    const rec = recommendations.find(r => r.exercise_id === activeExercise.id);
    const lastPerf = activeExerciseItem.last_performance;

    let stored = {};
    try { stored = JSON.parse(localStorage.getItem('entreno-next-loads') || '{}'); } catch { stored = {}; }
    const planned = stored[activeExercise.id];
    const deload = localStorage.getItem('entreno-deload') === '1';
    const remembered = lastWeightByExercise.current[String(activeExercise?.id || '')];
    if (remembered && !isTimedExercise(activeExerciseItem)) {
      setInputWeight(remembered);
      return;
    }
    // Fase 6: la recomendación del servidor es la fuente de verdad (misma doble progresión que
    // al cerrar el entreno). Las cargas guardadas en el navegador solo valen si no hay recomendación.
    const increment = Number(rec?.increment_kg ?? activeExercise.weight_increment_kg ?? 0) || 0;
    const deloadWeight = (w: number) =>
      increment > 0 ? Math.round((w * 0.9) / increment) * increment : Math.round(w * 0.9 * 10) / 10;
    if (rec) {
      // recommended_weight_kg puede ser null cuando no existe histórico.
      const recommendedWeight = rec.recommended_weight_kg;
      const recommendedReps =
        rec.recommended_rep_target ??
        rec.recommended_reps ??
        activeExerciseItem.target_rep_min;

      if (recommendedWeight != null) {
        const w = deload && rec.kind !== 'deload' && rec.recommendation !== 'deload' && recommendedWeight > 0
          ? deloadWeight(Number(recommendedWeight))
          : Number(recommendedWeight);
        setInputWeight(String(w));
      } else {
        setInputWeight(defaultStartWeight(activeExerciseItem));
      }

      setInputReps(
        recommendedReps != null
          ? String(recommendedReps)
          : '1'
      );
    } else if (planned && planned.next_weight_kg != null && !isTimedExercise(activeExerciseItem)) {
      const w = deload ? deloadWeight(Number(planned.next_weight_kg)) : planned.next_weight_kg;
      setInputWeight(String(w));
      setInputReps(String(planned.next_reps || activeExerciseItem.target_rep_min || 8));
    } else if (lastPerf && lastPerf.sets.length > 0) {
      const lastWeight = lastPerf.sets[0].weight_kg;
      const lastReps = lastPerf.sets[0].reps;

      setInputWeight(lastWeight != null ? String(lastWeight) : defaultStartWeight(activeExerciseItem));
      setInputReps(lastReps != null ? String(lastReps) : '1');
    } else {
      setInputWeight(defaultStartWeight(activeExerciseItem));
      setInputReps(
        activeExerciseItem.target_rep_min != null
          ? String(activeExerciseItem.target_rep_min)
          : '1'
      );
    }
    
    setIsWarmup(false);
    setSetNote('');
  }, [activeExIndex, exercises, recommendations]);

  const persistSet = async (opts: { weight: number; reps: number; isWarmup: boolean; rir: number | null; notes?: string; startRest: boolean; }) => {
    if (!workoutLog || !activeExercise) return;
    const nextSetNumber =
      loggedSets.filter(s => s.exercise_id === activeExercise.id).length + 1;
    const res = await apiFetch(`/api/workouts/${workoutLog.id}/sets?user_id=${encodeURIComponent(user.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_id: activeExercise.id,
        set_number: nextSetNumber,
        weight_kg: opts.weight,
        reps: opts.reps,
        rir: opts.rir,
        is_warmup: opts.isWarmup,
        notes: opts.notes || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'No se pudo guardar la serie');
    setLoggedSets((current) => [...current, data]);
    if (opts.startRest) beginRest(resolveRestSeconds(activeExerciseItem));
  };

  const handleAddSet = async () => {
    if (!workoutLog || !activeExercise) return;
    const weight = parseFloat(inputWeight);
    const reps = parseInt(inputReps);

    if (isNaN(weight) || weight < 0 || isNaN(reps) || reps <= 0) {
      setError('Por favor, introduce peso y repeticiones válidos.');
      return;
    }

    setSubmittingSet(true);
    setError(null);

    try {
      await persistSet({
        weight,
        reps,
        isWarmup,
        rir: isWarmup || inputRir === 'N/A' ? null : parseInt(inputRir),
        notes: setNote,
        startRest: true,
      });
      setSetNote('');
    } catch (err: any) {
      setError(err.message || 'Error al guardar la serie.');
    } finally {
      setSubmittingSet(false);
    }
  };

  const logSuggestedWarmup = async (set: WarmupSet) => {
    setError(null);
    await persistSet({ weight: set.weight_kg, reps: set.reps, isWarmup: true, rir: null, startRest: false });
  };

  const handleDeleteSet = async (setId: string) => {
    if (!workoutLog) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/workouts/${workoutLog.id}/sets/${setId}?user_id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo borrar la serie');
      }

      // Filter out locally and adjust set numbers (server automatically does it but we match)
      const remaining = loggedSets.filter(s => s.id !== setId);
      setLoggedSets(remaining);
    } catch (err: any) {
      setError(err.message || 'Error al borrar la serie.');
    }
  };

  const handleFinishWorkout = async () => {
    if (!workoutLog) return;
    setSubmittingWorkout(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/workouts/${workoutLog.id}?user_id=${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          duration_minutes: Math.max(1, Math.round(elapsedSeconds / 60)),
          notes: finishNotes,
          current_exercise_id: workoutLog.current_exercise_id ?? null, is_deload: localStorage.getItem('entreno-deload') === '1' ? 1 : 0,
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo finalizar el entrenamiento');
      }

      setShowFinishModal(false);
      setWorkoutCompleted(true);
      clearRest();
    } catch (err: any) {
      setError(err.message || 'Error al guardar entrenamiento.');
      setShowFinishModal(false);
    } finally {
      setSubmittingWorkout(false);
    }
  };

  const handleCancelWorkout = async () => {
    if (!workoutLog) return;
    setSubmittingWorkout(true);
    setError(null);

    try {
      const res = await apiFetch(
        `/api/workouts/${encodeURIComponent(workoutLog.id)}?user_id=${encodeURIComponent(user.id)}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || 'No se pudo cancelar el entrenamiento');
      }

      setShowCancelConfirm(false);
      clearRest();
      onWorkoutExit();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar el entrenamiento.');
      setShowCancelConfirm(false);
    } finally {
      setSubmittingWorkout(false);
    }
  };

  // Hueco de la rutina que ocupa el ejercicio activo (si ya está sustituido, el original de la rutina).
  const slotOriginalId = (item: any): string => item?.original_exercise_id || item?.exercise?.id || item?.exercise_id;

  const loadSubstitutions = async (query: string) => {
    if (!activeExercise) return;
    setSubLoading(true);
    try {
      const qs = new URLSearchParams({ user_id: String(user.id) });
      if (workoutLog?.id) qs.set('workout_id', String(workoutLog.id));
      if (query.trim()) qs.set('q', query.trim());
      const res = await apiFetch(`/api/exercises/${slotOriginalId(activeExerciseItem)}/substitutions?${qs.toString()}`);
      if (!res.ok) throw new Error('No se encontraron alternativas.');
      const data = await res.json();
      setSubData(Array.isArray(data) ? { substitutions: data } as any : data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar sustituciones.');
    } finally {
      setSubLoading(false);
    }
  };

  // Open substitutions selector
  const handleOpenSubstitutions = async () => {
    if (!activeExercise) return;
    setShowSubModal(true);
    setAvailableSubs([]);
    setSubData(null);
    setSubQuery('');
    setSubAlways(false);
    setError(null);
    await loadSubstitutions('');
  };

  // Buscador: con texto se busca en TODO el catálogo (con un pequeño retardo al teclear).
  useEffect(() => {
    if (!showSubModal) return;
    const t = setTimeout(() => { void loadSubstitutions(subQuery); }, subQuery ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subQuery]);

  const toggleUnavailableEquipment = async (family: string) => {
    const current = new Set(subData?.unavailable_equipment || []);
    if (current.has(family)) current.delete(family); else current.add(family);
    const res = await apiFetch(`/api/user-equipment?user_id=${encodeURIComponent(user.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unavailable: Array.from(current) }),
    });
    if (res.ok) await loadSubstitutions(subQuery);
  };

  // Execute substitution
  const handleSelectSubstitution = async (alternativeExerciseId: string) => {
    if (!workoutLog || !activeExercise) return;
    setSubmittingSub(true);
    setError(null);

    try {
      const originalId = slotOriginalId(activeExerciseItem);
      const res = await apiFetch(`/api/workouts/${workoutLog.id}/substitute-exercise?user_id=${encodeURIComponent(user.id)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_exercise_id: originalId,
          substitute_exercise_id: alternativeExerciseId,
          reason: subReason,
          always_in_routine: subAlways ? true : undefined,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error((typeof data.detail === 'string' && data.detail) || data.error || 'Conflicto al sustituir ejercicio.');
      }

      // Success! Update active exercises list locally
      const updatedExercises = [...exercises];
      // Build a modified routine exercise with the substitute. El historial y la carga sugerida son
      // los del SUSTITUTO (los calcula el servidor con el rango de series/reps del hueco).
      const substitutedExItem: any = {
        ...activeExerciseItem,
        exercise_id: alternativeExerciseId,
        original_exercise_id: originalId,
        exercise: data.substitute_exercise,
        last_performance: data.last_performance_detail
          ? { date: data.last_performance_detail.date, sets: data.last_performance_detail.sets || [] }
          : null
      };

      updatedExercises[activeExIndex] = substitutedExItem;
      setExercises(updatedExercises);

      // La recomendación del sustituto sustituye a la del ejercicio original.
      if (data.recommendation) {
        rememberMeasure(data.recommendation.exercise_id, data.recommendation.measure_type);
        setRecommendations((prev) => [
          ...prev.filter((r) => r.exercise_id !== data.recommendation.exercise_id && r.exercise_id !== originalId
            && r.exercise_id !== activeExercise.id),
          data.recommendation,
        ]);
      }
      // Las sugerencias de carga del navegador son del ejercicio anterior: no valen para el sustituto.
      delete lastWeightByExercise.current[String(alternativeExerciseId)];

      // Update substitutions tracking map
      const nextMap = { ...substitutionsMap };
      delete nextMap[activeExercise.id];
      nextMap[alternativeExerciseId] = substitutedExItem;
      setSubstitutionsMap(nextMap);

      setShowSubModal(false);
      if (data.substitute_exercise?.id) {
        void persistCurrentExercise(data.substitute_exercise.id);
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo realizar la sustitución.');
    } finally {
      setSubmittingSub(false);
    }
  };

  // Adjust numeric helpers with ease
  // Fase 12b: con kettlebells, +/− saltan entre los pesos que hay (desde 0, a la más ligera).
  // El valor se recuerda por ejercicio: antes se perdía si llegaba la recomendación del servidor
  // (el efecto de sincronización repone el valor inicial) y el primer «+» parecía no hacer nada.
  const adjustWeight = (direction: 1 | -1) => {
    const current = parseFloat(inputWeight) || 0;
    const steps = activeRec?.weight_steps;
    const next = stepWeight(current, direction, weightStep, steps);
    const text = String(next);
    setInputWeight(text);
    if (activeExercise?.id) lastWeightByExercise.current[String(activeExercise.id)] = text;
  };

  const adjustReps = (amount: number) => {
    const current = parseInt(inputReps) || 0;
    const next = Math.max(1, current + amount);
    setInputReps(next.toString());
  };

  // Helper formatting for session duration
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stagnationOf = (exerciseId?: string | null) =>
    stagnation.find((s) => s.exercise_id === exerciseId);
  const activeStagnation = stagnationOf(activeExercise?.id);
  const restProgress = totalRestDuration > 0 && restSecondsLeft != null
    ? Math.max(0, Math.min(100, (restSecondsLeft / totalRestDuration) * 100))
    : 0;

  if (loading) {
    return (
      <div id="workout-active-loading" className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-lime-400">
        <Loader className="animate-spin mb-4" size={32} />
        <span className="text-sm font-semibold tracking-wide text-neutral-400">Preparando tu sesión...</span>
      </div>
    );
  }

  const activeExerciseSets = loggedSets.filter(s => s.exercise_id === activeExercise?.id);
  const activeRec = recommendations.find(r => r.exercise_id === activeExercise?.id);
  const plannedWorkingWeight = (() => {
    const rec = activeRec?.recommended_weight_kg;
    if (rec != null && Number(rec) > 0) return Number(rec);
    const last = (activeExerciseItem?.last_performance?.sets || []).filter((s: any) => !s.is_warmup);
    if (last.length) return Math.max(...last.map((s: any) => Number(s.weight_kg) || 0));
    const input = parseFloat(inputWeight);
    return Number.isFinite(input) && input > 0 ? input : 0;
  })();
  // Paso de los botones +/-: el efectivo del servidor (según equipo), luego el del ejercicio, luego 2,5 kg.
  const weightStep = Number(activeRec?.increment_kg) > 0 ? Number(activeRec.increment_kg) : (Number(activeExercise?.weight_increment_kg) > 0 ? Number(activeExercise.weight_increment_kg) : 2.5);

  return (
    <div id="active-workout-panel" className="min-h-screen w-full bg-neutral-950 text-neutral-100 max-w-md mx-auto select-none relative pb-8">
      
      {/* Cabecera fija: tiempo, rutina, Finalizar y (si corre) la barra de descanso */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900">
      <div className="px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400">
            <Timer size={16} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none">Tiempo</span>
            <p id="workout-stopwatch" className="text-sm font-mono font-bold text-white mt-0.5">{formatTime(elapsedSeconds)}</p>
          </div>
        </div>

        <span className="text-xs font-black text-neutral-300">{routine?.name || 'Entrenando'}</span>

        <button
          id="btn-open-finish-modal"
          onClick={() => setShowFinishModal(true)}
          className="bg-lime-400 hover:bg-lime-300 text-black font-extrabold px-4 py-2 rounded-xl text-xs transition-all active:scale-95 shadow-md"
          style={{ minHeight: '36px' }}
        >
          Finalizar
        </button>
      </div>

      {/* Barra de descanso (fase 12b): ARRIBA, pegada bajo la cabecera, y no abajo. Una barra fija
          en la parte inferior tapaba justo los controles de la serie (+/−, Registrar) y «Cancelar
          Sesión»: los clics caían en la barra. Arriba no cubre nunca los controles del final. */}
      <AnimatePresence>
        {restSecondsLeft !== null && (
          <motion.div
            id="rest-timer-bar"
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className="mx-3 mb-2 mt-1 bg-lime-400 text-black border border-lime-300 rounded-2xl px-3 py-2 shadow-xl flex items-center select-none"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-[3.25rem] h-9 rounded-xl bg-black/10 flex items-center justify-center font-black tabular-nums text-sm">
                    {formatRest(restSecondsLeft)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black tracking-wide uppercase">Descanso</h4>
                    <p className="text-[10px] opacity-75 font-medium mt-0.5 truncate">Respira y prepárate para la siguiente serie</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id="btn-timer-minus-15"
                    type="button"
                    onClick={() => addRestSeconds(-REST_STEP)}
                    className="bg-black/10 hover:bg-black/15 font-bold px-2 py-1.5 rounded-lg text-[10px]"
                    style={{ minHeight: '30px' }}
                  >
                    −15 s
                  </button>
                  <button
                    id="btn-timer-plus-15"
                    type="button"
                    onClick={() => addRestSeconds(REST_STEP)}
                    className="bg-black/10 hover:bg-black/15 font-bold px-2 py-1.5 rounded-lg text-[10px]"
                    style={{ minHeight: '30px' }}
                  >
                    +15 s
                  </button>
                  <button
                    id="btn-timer-skip"
                    type="button"
                    onClick={() => clearRest()}
                    className="bg-black text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px]"
                    style={{ minHeight: '30px' }}
                  >
                    Omitir
                  </button>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-black/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-black/40 transition-[width] duration-200"
                  style={{ width: restProgress + '%' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <div className="px-4 mt-4 space-y-5">
        
        {/* Horizontal exercises progress view list */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Ejercicios de la Sesión</span>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x select-none">
            {exercises.map((re, idx) => {
              const isSelected = idx === activeExIndex;
              const isSubbed = !!substitutionsMap[re.exercise_id];
              const setsCount = loggedSets.filter(s => s.exercise_id === re.exercise_id).length;
              return (
                <button
                  key={re.id}
                  id={`ex-tab-${idx}`}
                  onClick={() => selectExercise(idx)}
                  className={`snap-center flex items-center gap-1.5 shrink-0 px-4 py-3 rounded-xl border text-xs font-bold transition-all relative ${
                    isSelected 
                      ? 'bg-neutral-900 border-lime-400 text-white' 
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                  style={{ minWidth: '100px' }}
                >
                  <span className="opacity-60">{idx + 1}.</span>
                  <span className="truncate max-w-[110px] flex items-center gap-1"><ExerciseIcon exercise={re.exercise} className="w-12 h-12 rounded" />{re.exercise?.name}</span>
                  {setsCount > 0 && (
                    <span className="bg-lime-500 text-black w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">
                      {setsCount}
                    </span>
                  )}
                  {isSubbed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 border border-neutral-900 rounded-full" />
                  )}
                  {stagnationOf(re.exercise?.id) && (
                    <span
                      title="Estancado"
                      className="absolute -top-1 -left-1 bg-orange-500 text-black text-[8px] font-black uppercase tracking-wide px-1 rounded"
                    >
                      Estancado
                    </span>
                  )}
                </button>
              );
            })}
            <button
              id="btn-add-extra-exercise"
              type="button"
              onClick={() => void loadCatalog()}
              className="snap-center shrink-0 px-4 py-3 rounded-xl border border-dashed border-lime-400/60 text-lime-400 text-xs font-bold"
            >
              + Ejercicio
            </button>
          </div>
          {showAddExtra && (
            <div className="flex gap-2 mt-2">
              <select
                value={extraId}
                onChange={(e) => setExtraId(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Elige ejercicio…</option>
                {catalog
                  .slice()
                  .sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'))
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
              </select>
              <button type="button" onClick={addExtraExercise} className="bg-lime-400 text-black font-extrabold text-xs px-3 rounded-xl">
                Añadir
              </button>
            </div>
          )}
        </div>

        {error && (
          <div id="workout-error-banner" className="bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs flex gap-3 items-start">
            <AlertTriangle className="shrink-0 mt-0.5 text-red-400" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Current Active Exercise details card */}
        {activeExercise && (
          <div id="active-exercise-card" className="scroll-mt-20 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-lime-400 uppercase tracking-widest">{activeExercise.target_muscle}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <ExerciseIcon exercise={activeExercise} compact={false} className="w-16 h-32 rounded-xl mr-2 bg-neutral-950" /><h3 id="active-exercise-name" className="text-xl font-extrabold text-white leading-tight">{activeExercise.name}</h3>
                  {onOpenExerciseInfo && (
                    <button
                      onClick={() => onOpenExerciseInfo(activeExercise)}
                      className="p-1 text-neutral-400 hover:text-lime-400 rounded-lg transition-colors cursor-pointer mt-0.5 flex items-center justify-center"
                      title="Ver ficha técnica"
                    >
                      <Info size={16} />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 uppercase font-semibold">{activeExercise.equipment} · RIR {activeExerciseItem.target_rir} recomendado</p>
              </div>
              <button
                id="btn-flag-discomfort" onClick={async () => {
                  const zone = window.prompt('Zona (hombro, lumbar, rodilla, codo, otro)', 'hombro');
                  if (!zone || !activeExercise) return;
                  await apiFetch('/api/progress/flag?user_id=' + encodeURIComponent(user.id), {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ exercise_id: activeExercise.id, zone, note: '' }),
                  });
                  setError('Aviso guardado: ' + zone);
                }} className="bg-neutral-800 text-orange-300 font-bold px-3 py-1.5 rounded-xl text-[10px] border border-neutral-700/50">Molestia</button>
              <button id="btn-substitute-trigger"
                onClick={handleOpenSubstitutions}
                className="bg-neutral-800 hover:bg-neutral-700 text-yellow-400 font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 transition-all border border-neutral-700/50 active:scale-95"
                style={{ minHeight: '32px' }}
              >
                <RefreshCw size={12} className="animate-spin-slow" />
                <span>Sustituir</span>
              </button>
            </div>

            {/* Target & Last Performance */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-800/60">
              <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/40">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Objetivo de Serie</span>
                <p className="text-sm font-black text-white mt-1">
                  {isTimedExercise(activeExerciseItem)
                    ? `${activeExerciseItem.target_sets} × ${activeExerciseItem.target_rep_min}-${activeExerciseItem.target_rep_max} s`
                    : `${activeExerciseItem.target_sets} × ${activeExerciseItem.target_rep_min}-${activeExerciseItem.target_rep_max} reps`
                  }
                </p>
              </div>
              <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/40">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Última Vez</span>
                <p className="text-sm font-mono text-lime-400 mt-1 font-bold">
                  {activeExerciseItem.last_performance && activeExerciseItem.last_performance.sets.length > 0 ? (
                    isTimedExercise(activeExerciseItem)
                      ? `${activeExerciseItem.last_performance.sets.map(s => `${s.reps}s`).join('/')}`
                      : (() => {
                          const workingSets = activeExerciseItem.last_performance.sets.filter(
                            s => !s.is_warmup
                          );

                          if (workingSets.length === 0) return '--';

                          const firstWeight = workingSets[0].weight_kg;
                          const sameWeight = workingSets.every(
                            s => s.weight_kg === firstWeight
                          );

                          if (sameWeight) {
                            return `${firstWeight}kg × ${workingSets.map(s => s.reps).join('/')}`;
                          }

                          return workingSets
                            .map(s => `${s.weight_kg}kg × ${s.reps}`)
                            .join(' · ');
                        })()
                  ) : (
                    '--'
                  )}
                </p>
              </div>
            </div>

            {activeStagnation && (
              <div id="stagnation-badge" className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-xl space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">
                  {activeStagnation.kind === 'fail_streak' ? 'Aviso de deload' : 'Estancamiento'}
                </p>
                <p className="text-[11px] text-orange-100 leading-snug">{activeStagnation.reason}</p>
                <div className="flex flex-wrap gap-2">
                  {activeStagnation.suggested_deload_kg != null && (
                    <span className="text-[10px] font-bold text-orange-200 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg">
                      Deload: {fmtKg(activeStagnation.suggested_deload_kg)} kg
                    </span>
                  )}
                  <button
                    type="button"
                    id="btn-stagnation-substitute"
                    onClick={() => void handleOpenSubstitutions()}
                    className="text-[10px] font-extrabold uppercase tracking-wide text-black bg-orange-400 hover:bg-orange-300 px-2.5 py-1 rounded-lg"
                  >
                    Sustituir ejercicio
                  </button>
                </div>
              </div>
            )}

            {/* Recommendations Widget (reps_then_weight) */}
            {activeRec && (
              <div id="progression-recommendation-box" className="bg-lime-400/[0.04] border border-lime-400/20 p-4 rounded-xl flex gap-3.5 items-start">
                <div className="p-1 rounded-lg bg-lime-400/10 text-lime-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Progresión Recomendada</h4>
                  <p className="text-[11px] text-lime-400 font-bold mt-1">
                    {(() => {
                      const timed = isTimedExercise(activeExerciseItem) || activeRec.measure_type === 'time';
                      const unit = timed ? 's' : ' reps';
                      const reps = activeRec.recommended_rep_target ?? activeExerciseItem.target_rep_min;
                      const w = activeRec.recommended_weight_kg;
                      const kind = activeRec.recommendation;
                      if (kind === 'start' || (w == null && !timed)) {
                        return `Sin historial: elige un peso cómodo y apunta a ${reps}${unit}`;
                      }
                      if (timed && !(w > 0)) {
                        return kind === 'add_reps'
                          ? `Intenta aguantar ${reps} s por serie`
                          : `Objetivo: ${reps} s por serie`;
                      }
                      const load = w > 0 ? `${fmtKg(w)} kg` : 'tu peso corporal';
                      if (kind === 'increase_weight') return `Sube a ${load} · vuelve a ${reps}${unit}`;
                      if (kind === 'deload') return `Baja a ${load} · ${reps}${unit}`;
                      if (kind === 'add_reps') return `Mantén ${load} · apunta a ${reps}${unit} (+1 por serie)`;
                      return `Usa ${load} · apunta a ${reps}${unit}`;
                    })()}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">{activeRec.reason}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeExercise && !isTimedExercise(activeExerciseItem) && plannedWorkingWeight > 0 && (
          <WarmupBlock
            exercise={activeExercise}
            workingWeight={plannedWorkingWeight}
            loggedSets={activeExerciseSets}
            disabled={submittingSet}
            onLog={logSuggestedWarmup}
            onDelete={handleDeleteSet}
          />
        )}

        {/* Set Logger Inputs Form */}
        {activeExercise && (
          <div id="set-logger-inputs" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Añadir Nueva Serie</span>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Weight control */}
              {!isTimedExercise(activeExerciseItem) ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Peso (kg)</label>
                  <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-1 relative">
                    <button
                      id="btn-weight-minus"
                      type="button"
                      onClick={() => adjustWeight(-1)}
                      className="w-8 h-8 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center font-bold text-sm border border-neutral-800 active:bg-neutral-850"
                      style={{ minHeight: '32px' }}
                    >
                      -
                    </button>
                    
                      
<input
                      id="input-weight"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={inputWeight}
                      onChange={(e) => { setInputWeight(e.target.value); if (activeExercise?.id) lastWeightByExercise.current[String(activeExercise.id)] = e.target.value; }}
                      className="w-full bg-transparent text-center font-mono font-bold text-white text-sm focus:outline-none"
                    />
                    <button
                      id="btn-weight-plus"
                      type="button"
                      onClick={() => adjustWeight(1)}
                      className="w-8 h-8 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center font-bold text-sm border border-neutral-800 active:bg-neutral-850"
                      style={{ minHeight: '32px' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Peso (kg)</label>
                  <div className="flex items-center justify-center h-10 bg-neutral-950/40 border border-neutral-850 rounded-xl text-neutral-500 text-xs font-bold">
                    Sin carga (0 kg)
                  </div>
                </div>
              )}

              {/* Reps/Seconds control */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  {isTimedExercise(activeExerciseItem) ? 'Tiempo (s)' : 'Reps'}
                </label>
                <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-1 relative">
                  <button
                    id="btn-reps-minus"
                    type="button"
                    onClick={() => adjustReps(-1)}
                    className="w-8 h-8 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center font-bold text-sm border border-neutral-800 active:bg-neutral-850"
                    style={{ minHeight: '32px' }}
                  >
                    -
                  </button>
                  <input
                    id="input-reps"
                    type="number"
                    placeholder="0"
                    value={inputReps}
                    onChange={(e) => setInputReps(e.target.value)}
                    className="w-full bg-transparent text-center font-mono font-bold text-white text-sm focus:outline-none"
                  />
                  <button
                    id="btn-reps-plus"
                    type="button"
                    onClick={() => adjustReps(1)}
                    className="w-8 h-8 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center font-bold text-sm border border-neutral-800 active:bg-neutral-850"
                    style={{ minHeight: '32px' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* RIR & Warmup row */}
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">RIR (Esfuerzo)</label>
                <select
                  id="select-rir"
                  value={isWarmup ? 'N/A' : inputRir}
                  onChange={(e) => setInputRir(e.target.value)}
                  disabled={isWarmup}
                  className={`w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-lime-500 ${
                    isWarmup ? 'text-neutral-600 opacity-60 cursor-not-allowed' : 'text-white'
                  }`}
                  style={{ minHeight: '38px' }}
                >
                  <option value="0">RIR 0 (Fallo)</option>
                  <option value="1">RIR 1 (Extremo)</option>
                  <option value="2">RIR 2 (Objetivo)</option>
                  <option value="3">RIR 3 (Cómodo)</option>
                  <option value="4">RIR 4 (Ligero)</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Tipo de Serie</label>
                <button
                  id="btn-toggle-warmup"
                  type="button"
                  onClick={() => {
                    setIsWarmup((current) => {
                      const next = !current;
                      setInputRir(next ? 'N/A' : '2');
                      return next;
                    });
                  }}
                  className={`w-full font-bold py-2.5 px-3 rounded-xl text-xs transition-all border flex items-center justify-center gap-1.5 ${
                    isWarmup
                      ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                  style={{ minHeight: '38px' }}
                >
                  <Dumbbell size={12} />
                  <span>{isWarmup ? 'Calentamiento' : 'Serie de Trabajo'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
{!isTimedExercise(activeExerciseItem) && usesPlateCalculator(activeExercise?.equipment) && (
              <div className="mt-2 space-y-1">
                <p id="plate-breakdown" className="text-xs font-bold text-lime-400">
                  {plateBreakdown(parseFloat(inputWeight) || 0)}
                </p>
              </div>
            )}
              <input
                id="input-set-note"
                type="text"

            


                placeholder="Notas de esta serie (ej: Molestia hombro, fácil...)"
                value={setNote}
                onChange={(e) => setSetNote(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-lime-500"
              />
            </div>

            <button
              id="btn-add-set-submit"
              type="button"
              onClick={handleAddSet}
              disabled={submittingSet}
              className="w-full bg-lime-400 hover:bg-lime-300 text-black font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              {submittingSet ? (
                <Loader className="animate-spin" size={14} />
              ) : (
                <>
                  <Check size={16} />
                  <span>Registrar Serie</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Logged sets summary table */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Series Registradas ({activeExerciseSets.length})</span>
          {activeExerciseSets.length > 0 ? (
            <div id="sets-history-table" className="space-y-2">
              {activeExerciseSets.map((set, idx) => (
                <div
                  key={set.id}
                  id={`logged-set-item-${idx}`}
                  className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-3.5 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                      set.is_warmup 
                        ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400'
                        : 'bg-lime-400/10 border border-lime-400/20 text-lime-400'
                    }`}>
                      {set.is_warmup ? 'C' : `${set.set_number}`}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">
                          {set.exercise_name?.trim().toLowerCase() === 'plancha' ? 'Plancha' : `${set.weight_kg} kg`}
                        </span>
                        <span className="text-neutral-500 text-xs">×</span>
                        <span className="text-xs font-black text-white">
                          {set.reps} {set.exercise_name?.trim().toLowerCase() === 'plancha' ? 'segundos' : 'reps'}
                        </span>
                        {set.rir !== null && (
                          <span className="text-[9px] bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded-md text-neutral-400 font-bold">
                            RIR {set.rir}
                          </span>
                        )}
                      </div>
                      {set.notes && (
                        <p className="text-[10px] text-neutral-400 mt-1 italic">"{set.notes}"</p>
                      )}
                    </div>
                  </div>

                  <button
                    id={`btn-delete-set-${idx}`}
                    onClick={() => handleDeleteSet(set.id)}
                    className="text-neutral-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-900/40 border border-neutral-900/60 rounded-2xl p-6 text-center">
              <Dumbbell className="mx-auto text-neutral-700 mb-2" size={24} />
              <p className="text-xs text-neutral-400">Comienza registrando tu primera serie arriba.</p>
            </div>
          )}
        </div>

        {/* Exercises navigator buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            id="btn-workout-prev-ex"
            disabled={activeExIndex === 0}
            onClick={() => selectExercise(activeExIndex - 1)}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none py-2"
            style={{ minHeight: '44px' }}
          >
            <ArrowLeft size={16} />
            <span>Anterior</span>
          </button>

          <span className="text-xs text-neutral-500 font-bold">
            {activeExIndex + 1} de {exercises.length}
          </span>

          <button
            id="btn-workout-next-ex"
            disabled={activeExIndex === exercises.length - 1}
            onClick={() => selectExercise(activeExIndex + 1)}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none py-2"
            style={{ minHeight: '44px' }}
          >
            <span>Siguiente</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Exit Workout button */}
        <div className="pt-8 flex justify-center">
          <button
            id="btn-exit-workout"
            type="button"
            onClick={onWorkoutExit}
            className="text-neutral-400 hover:text-white font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl transition-all hover:bg-neutral-800/60"
            style={{ minHeight: '44px' }}
          >
            <span>Salir</span>
          </button>
        </div>

        {/* Cancel Workout button */}
        <div className="pt-2 text-center">
          <button
            id="btn-cancel-workout"
            type="button"
            onClick={() => {
              setShowCancelConfirm(true);
            }}
            className="text-neutral-500 hover:text-red-400 font-bold text-xs uppercase tracking-wider py-2 flex items-center justify-center gap-1.5 mx-auto hover:bg-red-500/5 px-4 rounded-xl transition-all"
          >
            <XCircle size={14} />
            <span>Cancelar Sesión</span>
          </button>
        </div>

      </div>


      {/* Substitution Drawer Modal */}
      {showSubModal && (
        <div id="substitutions-modal" className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="bg-neutral-900 border border-neutral-800 rounded-t-3xl w-full max-w-md p-6 space-y-6 pb-12 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Sustitución en Sesión</span>
                <h3 className="text-lg font-black text-white mt-1">Sustituir {activeExercise?.name}</h3>
              </div>
              <button
                id="btn-close-substitutions"
                onClick={() => setShowSubModal(false)}
                className="bg-neutral-800 text-neutral-400 rounded-full p-1.5 hover:text-white"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            {/* Substitution reason input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Motivo del Cambio</label>
              <select
                id="select-sub-reason"
                value={subReason}
                onChange={(e) => setSubReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-white text-xs font-bold focus:outline-none"
              >
                <option value="Falta de equipamiento / Máquina ocupada">Falta de equipamiento / Ocupada</option>
                <option value="Molestia articular o muscular">Molestia articular o muscular</option>
                <option value="Fatiga excesiva en el patrón">Fatiga excesiva</option>
                <option value="Preferencia / Variación">Preferencia personal</option>
              </select>
            </div>

            {/* Equipo que no está libre en el gimnasio */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Equipo no disponible</label>
              <div className="flex flex-wrap gap-1.5">
                {['mancuernas', 'maquina', 'polea', 'barra', 'peso corporal'].map((fam) => {
                  const off = (subData?.unavailable_equipment || []).includes(fam);
                  return (
                    <button key={fam} type="button" id={`btn-equip-${fam.replace(' ', '-')}`}
                      onClick={() => toggleUnavailableEquipment(fam)}
                      className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg border transition-all ${off ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'bg-neutral-950 border-neutral-800 text-neutral-400'}`}>
                      {fam === 'maquina' ? 'máquina' : fam}{off ? ' ✕' : ''}
                    </button>
                  );
                })}
              </div>
              {subData?.original_unavailable && (
                <p className="text-[10px] text-amber-300">El equipo de {activeExercise?.name} está marcado como no disponible: las alternativas libres salen primero.</p>
              )}
            </div>

            {/* Buscador: cualquier ejercicio del catálogo */}
            <div className="relative">
              <input
                id="input-sub-search"
                value={subQuery}
                onChange={(e) => setSubQuery(e.target.value)}
                placeholder="Buscar cualquier ejercicio del catálogo…"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-white text-xs font-bold focus:outline-none focus:border-lime-500/50"
              />
              {subLoading && <Loader size={14} className="absolute right-3 top-3 animate-spin text-neutral-500" />}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-neutral-300 font-semibold">
              <input id="chk-sub-always" type="checkbox" checked={subAlways} onChange={(e) => setSubAlways(e.target.checked)} className="accent-lime-400" />
              Usar siempre esta sustitución en esta rutina
            </label>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                {subQuery.trim() ? 'Resultados de la búsqueda' : 'Alternativas, de más a menos parecidas'}
              </h4>
              {(subData?.substitutions || []).length > 0 ? (
                <div className="space-y-2.5">
                  {(subData?.substitutions || []).map((sub: SubstituteOption) => {
                    const levelLabel = sub.match_level === 'pattern' ? 'Mismo patrón'
                      : sub.match_level === 'muscle' ? 'Mismo músculo'
                      : sub.match_level === 'related' ? 'Grupo parecido' : '';
                    return (
                      <div
                        key={sub.exercise_id}
                        id={`sub-item-${sub.exercise_id}`}
                        className={`bg-neutral-950/60 border ${sub.is_habitual ? 'border-lime-500/40' : 'border-neutral-800/80'} hover:border-neutral-700/80 p-4 rounded-xl flex justify-between items-center transition-all cursor-pointer group`}
                        onClick={() => !submittingSub && handleSelectSubstitution(sub.exercise_id)}
                      >
                        <div className="space-y-1 pr-4 min-w-0">
                          {sub.is_habitual && (
                            <span className="text-[8px] bg-lime-400 text-black px-1.5 py-0.5 rounded font-black uppercase">Tu elección habitual</span>
                          )}
                          <p className="text-xs font-extrabold text-white group-hover:text-lime-400 transition-colors">{sub.name}</p>
                          <p className="text-[9px] text-neutral-500 font-medium leading-normal">{sub.equipment}{sub.target_muscle ? ` · ${sub.target_muscle}` : ''}</p>
                          <p className="text-[9px] text-neutral-500 font-medium leading-normal">{sub.reason}</p>
                          {sub.suggested_weight_kg != null && (
                            <p className="text-[9px] text-lime-300 font-semibold">Tu carga: {sub.suggested_weight_kg} kg{sub.suggested_reps ? ` × ${sub.suggested_reps}` : ''}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {levelLabel && (
                              <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">{levelLabel}</span>
                            )}
                            {sub.previously_used && !sub.is_habitual && (
                              <span className="text-[8px] bg-neutral-800 border border-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded font-bold uppercase">Ya la has usado</span>
                            )}
                            {sub.unavailable_equipment && (
                              <span className="text-[8px] bg-red-500/10 border border-red-500/30 text-red-300 px-1.5 py-0.5 rounded font-bold uppercase">Equipo no disponible</span>
                            )}
                            {sub.always_in_routine && (
                              <span className="text-[8px] bg-amber-500/10 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">Fija en esta rutina</span>
                            )}
                          </div>
                        </div>
                        <button
                          id={`btn-select-sub-${sub.exercise_id}`}
                          disabled={submittingSub}
                          className="bg-neutral-800 text-neutral-300 hover:text-white px-3 py-2 rounded-lg text-[10px] font-extrabold shrink-0 active:scale-95 transition-all"
                          style={{ minHeight: '32px' }}
                        >
                          Elegir
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 text-center py-4">
                  {subLoading ? 'Buscando…' : subQuery.trim() ? 'Ningún ejercicio coincide con la búsqueda.' : 'No hay alternativas parecidas: usa el buscador para elegir cualquier ejercicio.'}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Finish Workout Notes Modal */}
      {workoutCompleted && (
        <div id="workout-completed-summary" className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-lg font-black text-white">Sesión terminada</h3>
            <p className="text-sm text-neutral-400">{formatTime(elapsedSeconds)} · {loggedSets.filter(s => !s.is_warmup).length} series</p>
            <button
              type="button"
              onClick={() => {
                const byEx = new Map<string, typeof loggedSets>();
                loggedSets.forEach((s) => {
                  const k = s.exercise_name || s.exercise_id;
                  byEx.set(k, [...(byEx.get(k) || []), s]);
                });
                const lines = ["ENTRENAMIENTO COMPLETADO", "", ...Array.from(byEx.entries()).map(([n, xs]) => `• ${n}: ${xs.filter(s=>!s.is_warmup).map(s=>`${s.weight_kg}kg x ${s.reps}`).join(" · ")}`)];
                const text = lines.join("\n");
                const encoded = encodeURIComponent(text);
                if (navigator.share) {
                  navigator.share({ title: "Entrenamiento", text }).catch(() => {
                    window.location.href = "whatsapp://send?text=" + encoded;
                  });
                } else {
                  window.location.href = "whatsapp://send?text=" + encoded;
                }
              }}
              className="w-full bg-[#25D366] text-white font-extrabold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} /> Compartir por WhatsApp
            </button>
            <button
              type="button"
              onClick={() => onWorkoutFinished()}
              className="w-full border border-neutral-700 text-neutral-300 font-bold py-3 rounded-xl text-sm"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {showFinishModal && (
        <div id="finish-workout-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl select-none"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-lime-500/10 border border-lime-500/20 text-lime-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-black text-white">¡Buen entrenamiento!</h3>
              <p className="text-xs text-neutral-400">Guarda un breve resumen sobre tus sensaciones, molestias o marcas de hoy.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Notas del Entrenamiento</label>
              <textarea
                id="finish-notes-input"
                placeholder="Ej: Muy buenas sensaciones en press banca, pero costó terminar bíceps..."
                value={finishNotes}
                onChange={(e) => setFinishNotes(e.target.value)}
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-3.5 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-finish-cancel-modal"
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-neutral-400 font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98]"
                style={{ minHeight: '44px' }}
              >
                Volver
              </button>
              <button
                id="btn-finish-confirm-submit"
                type="button"
                onClick={handleFinishWorkout}
                disabled={submittingWorkout}
                className="bg-gradient-to-r from-lime-400 to-emerald-500 text-black font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ minHeight: '44px' }}
              >
                {submittingWorkout ? (
                  <Loader className="animate-spin" size={14} />
                ) : (
                  <span>Guardar Todo</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancel Workout Confirmation Modal */}
      {showCancelConfirm && (
        <div id="cancel-workout-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl select-none"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-black text-white">¿Cancelar Entrenamiento?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Se eliminarán permanentemente esta sesión y todas las series registradas. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-cancel-keep-workout"
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-neutral-400 font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98]"
                style={{ minHeight: '44px' }}
              >
                Continuar
              </button>
              <button
                id="btn-cancel-confirm-workout"
                type="button"
                onClick={() => {
                  handleCancelWorkout();
                }}
                disabled={submittingWorkout}
                className="bg-red-500 hover:bg-red-650 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ minHeight: '44px' }}
              >
                {submittingWorkout ? (
                  <Loader className="animate-spin" size={14} />
                ) : (
                  <span>Sí, eliminar</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
