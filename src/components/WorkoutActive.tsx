import React, { useState, useEffect, useRef } from 'react';
import { Play, Dumbbell, Timer, ArrowRight, ArrowLeft, Plus, Check, Trash2, Pencil, Save, X, RefreshCw, XCircle, ChevronRight, CheckCircle2, AlertTriangle, Loader, Volume2, Info, MessageCircle, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Exercise, Routine, RoutineExercise, WorkoutLog, WorkoutSet, ExerciseSubstitution } from '../types';
import { apiFetch } from '../lib/api';

interface WorkoutActiveProps {
  user: any;
  routineId: string;
  existingWorkoutId?: string | null;
  onWorkoutFinished: () => void;
  onWorkoutExit: () => void;
  onOpenExerciseInfo?: (exercise: any) => void;
}

function isTimedExercise(exercise: any) {
  return String(exercise?.exercise?.name || exercise?.name || "")
    .trim()
    .toLowerCase() === "plancha";
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
  // Los relojes se basan en timestamps reales para funcionar
  // correctamente aunque el navegador quede en segundo plano.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [totalRestDuration, setTotalRestDuration] = useState<number>(0);

  // Form states for adding sets
  const [inputWeight, setInputWeight] = useState<string>('');
  const [inputReps, setInputReps] = useState<string>('');
  const [inputRir, setInputRir] = useState<string>('2');
  const [isWarmup, setIsWarmup] = useState<boolean>(false);
  const [setNote, setSetNote] = useState<string>('');
  // Edición de series registradas
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<string>('');
  const [editingReps, setEditingReps] = useState<string>('');
  const [editingRir, setEditingRir] = useState<string>('2');
  const [editingWarmup, setEditingWarmup] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<string>('');
  const [savingEditedSet, setSavingEditedSet] = useState(false);


  // Modals & panels
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishNotes, setFinishNotes] = useState('');
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [availableSubs, setAvailableSubs] = useState<any[]>([]);
  const [subReason, setSubReason] = useState('No disponible');
  const [substitutionsMap, setSubstitutionsMap] = useState<Record<string, RoutineExercise>>({});

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submittingSet, setSubmittingSet] = useState(false);
  const [submittingWorkout, setSubmittingWorkout] = useState(false);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sound play helper simulation
  const audioContextRef = useRef<AudioContext | null>(null);

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

  // Reloj de sesión basado en tiempo real.
  // setInterval solo sirve para refrescar la pantalla; el tiempo
  // transcurrido siempre se calcula mediante Date.now().
  useEffect(() => {
    if (sessionStartedAt === null) return;

    const updateElapsed = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000))
      );
    };

    updateElapsed();

    const interval = window.setInterval(updateElapsed, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateElapsed();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [sessionStartedAt]);

  // Descanso basado en un instante real de finalización.
  // El navegador puede pausar los timers en segundo plano sin alterar
  // el tiempo real transcurrido.
  useEffect(() => {
    if (restEndsAt === null) {
      setRestSecondsLeft(null);
      return;
    }

    let finished = false;

    const updateRest = () => {
      const remaining = Math.max(
        0,
        Math.ceil((restEndsAt - Date.now()) / 1000)
      );

      setRestSecondsLeft(remaining);

      if (remaining <= 0 && !finished) {
        finished = true;
        playTimerDoneSound();
        setRestSecondsLeft(null);
        setRestEndsAt(null);
      }
    };

    updateRest();

    const interval = window.setInterval(updateRest, 250);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateRest();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [restEndsAt]);

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
          throw new Error('No se pudo inicializar el entrenamiento');
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

      // El cronómetro continúa desde el inicio real de la sesión.
      if (startData.date) {
        const startedAt = new Date(startData.date).getTime();

        if (!Number.isNaN(startedAt)) {
          setSessionStartedAt(startedAt);
          setElapsedSeconds(
            Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
          );
        }
      }

      // 2. Fetch routine with exercise list and last performance
      const routRes = await apiFetch(`/api/routines/${routineId}/with-last-performance?user_id=${encodeURIComponent(user.id)}`);
      if (!routRes.ok) throw new Error('Error al cargar datos de rutina');
      const routData = await routRes.json();
      setRoutine(routData.routine || routData);

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

      setExercises(loadedExercises);

      // Recuperar exactamente el ejercicio que estaba activo antes
      // de refrescar o cambiar de dispositivo.
      if (startData.current_exercise_id) {
        const restoredIndex = loadedExercises.findIndex(
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
      const recsRes = await apiFetch(`/api/routines/${routineId}/recommendations?user_id=${encodeURIComponent(user.id)}`);
      if (recsRes.ok) {
        const recsData = await recsRes.json();
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

    if (rec) {
      // El backend usa recommended_rep_target.
      // recommended_weight_kg puede ser null cuando no existe histórico.
      const recommendedWeight = rec.recommended_weight_kg;
      const recommendedReps =
        rec.recommended_rep_target ??
        rec.recommended_reps ??
        activeExerciseItem.target_rep_min;

      setInputWeight(
        recommendedWeight != null
          ? String(recommendedWeight)
          : isTimedExercise(activeExerciseItem)
            ? '0'
            : '20'
      );

      setInputReps(
        recommendedReps != null
          ? String(recommendedReps)
          : '1'
      );
    } else if (lastPerf && lastPerf.sets.length > 0) {
      const lastWeight = lastPerf.sets[0].weight_kg;
      const lastReps = lastPerf.sets[0].reps;

      setInputWeight(lastWeight != null ? String(lastWeight) : '20');
      setInputReps(lastReps != null ? String(lastReps) : '1');
    } else {
      setInputWeight(isTimedExercise(activeExerciseItem) ? '0' : '20');
      setInputReps(
        activeExerciseItem.target_rep_min != null
          ? String(activeExerciseItem.target_rep_min)
          : '1'
      );
    }
    
    setIsWarmup(false);
    setSetNote('');
  }, [activeExIndex, exercises, recommendations]);

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
      // El backend exige set_number.
      // No usamos simplemente la cantidad de series porque, si el
      // usuario borra una serie intermedia, pueden quedar huecos
      // (por ejemplo 1, 3). En ese caso debemos continuar desde
      // el número más alto existente.
      const exerciseSets = loggedSets.filter(
        s => s.exercise_id === activeExercise.id
      );

      const nextSetNumber =
        exerciseSets.length > 0
          ? Math.max(...exerciseSets.map(s => Number(s.set_number) || 0)) + 1
          : 1;

      const res = await apiFetch(`/api/workouts/${workoutLog.id}/sets?user_id=${encodeURIComponent(user.id)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exercise_id: activeExercise.id,
          set_number: nextSetNumber,
          weight_kg: weight,
          reps: reps,
          rir: isWarmup || inputRir === 'N/A' ? null : parseInt(inputRir),
          is_warmup: isWarmup,
          notes: setNote
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la serie');

      // Update logged sets locally
      setLoggedSets(prev => [...prev, data]);
      setSetNote(''); // clear note

      // Trigger Rest Timer automatically.
      // Guardamos el instante exacto en que debe terminar.
      if (activeExerciseItem.rest_seconds > 0) {
        const restDuration = activeExerciseItem.rest_seconds;
        const endsAt = Date.now() + restDuration * 1000;

        setTotalRestDuration(restDuration);
        setRestEndsAt(endsAt);
        setRestSecondsLeft(
          Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
        );
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar la serie.');
    } finally {
      setSubmittingSet(false);
    }
  };
  const handleStartEditSet = (set: WorkoutSet) => {
    setError(null);
    setEditingSetId(set.id);
    setEditingWeight(String(set.weight_kg ?? 0));
    setEditingReps(String(set.reps ?? 1));
    setEditingRir(set.rir == null ? 'N/A' : String(set.rir));
    setEditingWarmup(Boolean(set.is_warmup));
    setEditingNote(set.notes ?? '');
  };

  const handleCancelEditSet = () => {
    setEditingSetId(null);
    setEditingWeight('');
    setEditingReps('');
    setEditingRir('2');
    setEditingWarmup(false);
    setEditingNote('');
  };

  const handleSaveEditedSet = async (set: WorkoutSet) => {
    if (!workoutLog) return;

    const weight = parseFloat(editingWeight);
    const reps = parseInt(editingReps, 10);

    if (!Number.isFinite(weight) || weight < 0) {
      setError('Introduce un peso válido.');
      return;
    }

    if (!Number.isFinite(reps) || reps < 1) {
      setError('Introduce un número de repeticiones válido.');
      return;
    }

    const rir =
      editingWarmup || editingRir === 'N/A'
        ? null
        : parseInt(editingRir, 10);

    if (
      rir !== null &&
      (!Number.isFinite(rir) || rir < 0 || rir > 10)
    ) {
      setError('Introduce un RIR válido.');
      return;
    }

    setSavingEditedSet(true);
    setError(null);

    try {
      const res = await apiFetch(
        `/api/workouts/${encodeURIComponent(workoutLog.id)}/sets/${encodeURIComponent(set.id)}?user_id=${encodeURIComponent(user.id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            set_number: set.set_number,
            weight_kg: weight,
            reps,
            rir,
            is_warmup: editingWarmup,
            notes: editingNote.trim() || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail ||
          data.error ||
          'No se pudo actualizar la serie'
        );
      }

      setLoggedSets(prev =>
        prev.map(currentSet =>
          currentSet.id === set.id ? data : currentSet
        )
      );

      handleCancelEditSet();

    } catch (err: any) {
      setError(
        err.message ||
        'Error al actualizar la serie.'
      );
    } finally {
      setSavingEditedSet(false);
    }
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

      // El servidor es la fuente de verdad. Eliminamos localmente
      // la serie y conservamos los números que devuelve el estado
      // actual. No renumeramos a mano en el frontend.
      setLoggedSets(prev => prev.filter(s => s.id !== setId));
    } catch (err: any) {
      setError(err.message || 'Error al borrar la serie.');
    }
  };

  const getWorkoutShareText = () => {
    const completedSets = loggedSets.filter(set => !set.is_warmup);

    const exerciseMap = new Map<string, WorkoutSet[]>();

    completedSets.forEach(set => {
      const key = set.exercise_id;
      const current = exerciseMap.get(key) ?? [];
      current.push(set);
      exerciseMap.set(key, current);
    });

    const exerciseLines: string[] = [];

    exerciseMap.forEach((sets) => {
      const exerciseName = sets[0]?.exercise_name?.trim() || 'Ejercicio';
      const plancha = exerciseName.toLowerCase() === 'plancha';

      const seriesText = [...sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map(set => {
          if (plancha) {
            return `${set.weight_kg} kg × ${set.reps} s`;
          }

          return `${set.weight_kg} kg × ${set.reps}`;
        })
        .join(' · ');

      exerciseLines.push(`• ${exerciseName}: ${seriesText}`);
    });

    const duration = Math.max(1, Math.round(elapsedSeconds / 60));

    const totalVolume = completedSets.reduce(
      (total, set) =>
        total +
        (Number(set.weight_kg) || 0) * (Number(set.reps) || 0),
      0
    );

    const lines = [
      '🏋️ ENTRENAMIENTO COMPLETADO',
      '',
      `⏱️ Duración: ${duration} min`,
      `💪 Ejercicios: ${exerciseMap.size}`,
      `🔢 Series: ${completedSets.length}`,
    ];

    if (totalVolume > 0) {
      lines.push(
        `📦 Volumen: ${Math.round(totalVolume).toLocaleString('es-ES')} kg`
      );
    }

    if (exerciseLines.length > 0) {
      lines.push('', ...exerciseLines);
    }

    if (finishNotes.trim()) {
      lines.push('', `📝 ${finishNotes.trim()}`);
    }

    lines.push('', '🔥 ¡Entrenamiento completado!');

    return lines.join('\n');
  };

  const handleShareWhatsApp = async () => {
    const text = getWorkoutShareText();
    const encodedText = encodeURIComponent(text);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Entrenamiento completado",
          text,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
      return;
    }

    if (isMobile) {
      window.location.href = "whatsapp://send?text=" + encodedText;
      return;
    }

    window.location.href = "whatsapp://send?text=" + encodedText;
  };
  const handleNativeShare = async () => {
    const text = getWorkoutShareText();

    if (!navigator.share) return;

    try {
      await navigator.share({
        title: 'Entrenamiento completado',
        text,
      });
    } catch {
      // Cancelar el menú de compartir no es un error.
    }
  };

  const handleExitCompletedWorkout = () => {
    setWorkoutCompleted(false);
    onWorkoutFinished();
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
          current_exercise_id: workoutLog.current_exercise_id ?? null,
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo finalizar el entrenamiento');
      }

      setShowFinishModal(false);
      setWorkoutCompleted(true);
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
      onWorkoutExit();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar el entrenamiento.');
      setShowCancelConfirm(false);
    } finally {
      setSubmittingWorkout(false);
    }
  };

  // Open substitutions selector
  const handleOpenSubstitutions = async () => {
    if (!activeExercise) return;
    setShowSubModal(true);
    setAvailableSubs([]);
    setError(null);
    try {
      const res = await apiFetch(`/api/exercises/${activeExercise.id}/substitutions?user_id=${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error('No se encontraron alternativas.');
      const data = await res.json();
      setAvailableSubs(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar sustituciones.');
    }
  };

  // Execute substitution
  const handleSelectSubstitution = async (alternativeExerciseId: string) => {
    if (!workoutLog || !activeExercise) return;
    setSubmittingSub(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/workouts/${workoutLog.id}/substitute-exercise?user_id=${encodeURIComponent(user.id)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_exercise_id: activeExercise.id,
          substitute_exercise_id: alternativeExerciseId,
          reason: subReason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Conflicto al sustituir ejercicio.');
      }

      // Success! Update active exercises list locally
      const updatedExercises = [...exercises];
      // Build a modified routine exercise with the substitute
      const substitutedExItem: RoutineExercise = {
        ...activeExerciseItem,
        exercise_id: alternativeExerciseId,
        exercise: data.substitute_exercise,
        last_performance: data.last_performance ? {
          date: new Date().toISOString(),
          sets: data.last_performance
        } : null
      };

      updatedExercises[activeExIndex] = substitutedExItem;
      setExercises(updatedExercises);
      
      // Update substitutions tracking map
      setSubstitutionsMap({
        ...substitutionsMap,
        [activeExercise.id]: substitutedExItem
      });

      setShowSubModal(false);
    } catch (err: any) {
      setError(err.message || 'No se pudo realizar la sustitución.');
    } finally {
      setSubmittingSub(false);
    }
  };

  // Adjust numeric helpers with ease
  const adjustWeight = (amount: number) => {
    const current = parseFloat(inputWeight) || 0;
    const next = Math.max(0, current + amount);
    setInputWeight(next.toString());
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

  return (
    <div id="active-workout-panel" className="min-h-screen w-full bg-neutral-950 text-neutral-100 pb-8 max-w-md mx-auto select-none relative">
      
      {/* Upper sticky header with timer */}
      <div className="sticky top-0 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 px-4 py-3.5 z-30 flex items-center justify-between">
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
                  <span className="truncate max-w-[110px]">{re.exercise?.name}</span>
                  {setsCount > 0 && (
                    <span className="bg-lime-500 text-black w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">
                      {setsCount}
                    </span>
                  )}
                  {isSubbed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 border border-neutral-900 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
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
                  <h3 id="active-exercise-name" className="text-xl font-extrabold text-white leading-tight">{activeExercise.name}</h3>
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
                id="btn-substitute-trigger"
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

            {/* Recommendations Widget (reps_then_weight) */}
            {activeRec && (
              <div id="progression-recommendation-box" className="bg-lime-400/[0.04] border border-lime-400/20 p-4 rounded-xl flex gap-3.5 items-start">
                <div className="p-1 rounded-lg bg-lime-400/10 text-lime-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Progresión Recomendada</h4>
                  <p className="text-[11px] text-lime-400 font-bold mt-1">
                    {isTimedExercise(activeExerciseItem)
                      ? `Intenta aguantar ${activeRec.recommended_rep_target} segundos en plancha`
                      : `Usa ${activeRec.recommended_weight_kg} kg · apunta a ${activeRec.recommended_rep_target} reps`
                    }
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">{activeRec.reason}</p>
                </div>
              </div>
            )}
          </div>
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
                      onClick={() => adjustWeight(-activeExercise.weight_increment_kg)}
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
                      onChange={(e) => setInputWeight(e.target.value)}
                      className="w-full bg-transparent text-center font-mono font-bold text-white text-sm focus:outline-none"
                    />
                    <button
                      id="btn-weight-plus"
                      type="button"
                      onClick={() => adjustWeight(activeExercise.weight_increment_kg)}
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
                    Plancha (0 kg)
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
                  className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-3.5"
                >
                  {editingSetId === set.id ? (
                    <div className="space-y-3">

                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                          set.is_warmup
                            ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400'
                            : 'bg-lime-400/10 border border-lime-400/20 text-lime-400'
                        }`}>
                          {set.is_warmup ? 'C' : `${set.set_number}`}
                        </span>

                        <span className="text-xs font-bold text-white">
                          Editar serie
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                            Peso (kg)
                          </label>

                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={editingWeight}
                            onChange={e => setEditingWeight(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3 text-white text-sm font-mono font-bold text-center focus:outline-none focus:border-lime-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                            {set.exercise_name?.trim().toLowerCase() === 'plancha'
                              ? 'Tiempo (s)'
                              : 'Reps'}
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={editingReps}
                            onChange={e => setEditingReps(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3 text-white text-sm font-mono font-bold text-center focus:outline-none focus:border-lime-500"
                          />
                        </div>

                      </div>

                      <div className="grid grid-cols-2 gap-3">

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                            RIR
                          </label>

                          <select
                            value={editingWarmup ? 'N/A' : editingRir}
                            onChange={e => setEditingRir(e.target.value)}
                            disabled={editingWarmup}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3 text-white text-xs font-bold focus:outline-none focus:border-lime-500 disabled:opacity-50"
                          >
                            <option value="0">RIR 0 (Fallo)</option>
                            <option value="1">RIR 1</option>
                            <option value="2">RIR 2</option>
                            <option value="3">RIR 3</option>
                            <option value="4">RIR 4</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                            Tipo
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingWarmup(current => {
                                const next = !current;

                                if (next) {
                                  setEditingRir('N/A');
                                } else {
                                  setEditingRir('2');
                                }

                                return next;
                              });
                            }}
                            className={`w-full font-bold py-2.5 px-3 rounded-xl text-xs border transition-all ${
                              editingWarmup
                                ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                            }`}
                          >
                            {editingWarmup ? 'Calentamiento' : 'Trabajo'}
                          </button>
                        </div>

                      </div>

                      <input
                        type="text"
                        value={editingNote}
                        onChange={e => setEditingNote(e.target.value)}
                        placeholder="Notas de esta serie..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-lime-500"
                      />

                      <div className="flex gap-2">

                        <button
                          type="button"
                          onClick={() => handleSaveEditedSet(set)}
                          disabled={savingEditedSet}
                          className="flex-1 bg-lime-400 hover:bg-lime-300 text-black font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {savingEditedSet ? (
                            <Loader className="animate-spin" size={14} />
                          ) : (
                            <Save size={14} />
                          )}

                          Guardar
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelEditSet}
                          disabled={savingEditedSet}
                          className="flex-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <X size={14} />
                          Cancelar
                        </button>

                      </div>

                    </div>
                  ) : (

                    <div className="flex justify-between items-center">

                      <div className="flex items-center gap-3 min-w-0">

                        <span className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          set.is_warmup
                            ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400'
                            : 'bg-lime-400/10 border border-lime-400/20 text-lime-400'
                        }`}>
                          {set.is_warmup ? 'C' : `${set.set_number}`}
                        </span>

                        <div className="min-w-0">

                          <div className="flex items-center gap-2 flex-wrap">

                            <span className="text-xs font-black text-white">
                              {set.exercise_name?.trim().toLowerCase() === 'plancha'
                                ? 'Plancha'
                                : `${set.weight_kg} kg`}
                            </span>

                            <span className="text-neutral-500 text-xs">
                              ×
                            </span>

                            <span className="text-xs font-black text-white">
                              {set.reps}{' '}
                              {set.exercise_name?.trim().toLowerCase() === 'plancha'
                                ? 'segundos'
                                : 'reps'}
                            </span>

                            {set.rir !== null && (
                              <span className="text-[9px] bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded-md text-neutral-400 font-bold">
                                RIR {set.rir}
                              </span>
                            )}

                          </div>

                          {set.notes && (
                            <p className="text-[10px] text-neutral-400 mt-1 italic">
                              "{set.notes}"
                            </p>
                          )}

                        </div>

                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">

                        <button
                          id={`btn-edit-set-${idx}`}
                          type="button"
                          onClick={() => handleStartEditSet(set)}
                          className="text-neutral-500 hover:text-lime-400 p-2 rounded-xl hover:bg-lime-500/10 transition-all"
                          title="Editar serie"
                          aria-label={`Editar serie ${set.set_number}`}
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          id={`btn-delete-set-${idx}`}
                          type="button"
                          onClick={() => handleDeleteSet(set.id)}
                          className="text-neutral-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all"
                          title="Borrar serie"
                          aria-label={`Borrar serie ${set.set_number}`}
                        >
                          <Trash2 size={14} />
                        </button>

                      </div>

                    </div>

                  )}
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

      {/* Floating Rest Timer Component */}
      <AnimatePresence>
        {restSecondsLeft !== null && (
          <motion.div
            id="rest-timer-bar"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-40 bg-lime-400 text-black border border-lime-300 rounded-2xl p-4 shadow-2xl flex items-center justify-between select-none max-w-md mx-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center font-black animate-pulse">
                {restSecondsLeft}
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wide uppercase">Temporizador de Descanso</h4>
                <p className="text-[10px] opacity-75 font-medium mt-0.5">Respira, concéntrate y prepárate...</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                id="btn-timer-add-30"
                onClick={() => {
                  setRestEndsAt(prev => (prev ?? Date.now()) + 30000);
                }}
                className="bg-black/10 hover:bg-black/15 font-bold px-2.5 py-1.5 rounded-lg text-[10px]"
                style={{ minHeight: '30px' }}
              >
                +30s
              </button>
              <button
                id="btn-timer-skip"
                onClick={() => {
                  setRestEndsAt(null);
                  setRestSecondsLeft(null);
                }}
                className="bg-black text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px]"
                style={{ minHeight: '30px' }}
              >
                Omitir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Alternativas Recomendadas</h4>
              {availableSubs.length > 0 ? (
                <div className="space-y-2.5">
                  {availableSubs.map((sub: any) => {
                    const alt = sub.alternative_exercise;
                    return (
                      <div
                        key={sub.id}
                        id={`sub-item-${alt.id}`}
                        className="bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700/80 p-4 rounded-xl flex justify-between items-center transition-all cursor-pointer group"
                        onClick={() => handleSelectSubstitution(alt.id)}
                      >
                        <div className="space-y-1 pr-4">
                          <p className="text-xs font-extrabold text-white group-hover:text-lime-400 transition-colors">{alt.name}</p>
                          <p className="text-[9px] text-neutral-500 font-medium leading-normal">{sub.reason}</p>
                          <div className="flex gap-2 mt-1">
                            {sub.same_muscle && (
                              <span className="text-[8px] bg-lime-500/10 border border-lime-500/20 text-lime-400 px-1.5 py-0.5 rounded font-bold uppercase">Mismo Músculo</span>
                            )}
                            {sub.same_movement_pattern && (
                              <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Mismo Patrón</span>
                            )}
                          </div>
                        </div>
                        <button
                          id={`btn-select-sub-${alt.id}`}
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
                <p className="text-xs text-neutral-500 text-center py-4">No se encontraron alternativas directas configuradas para este ejercicio.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Workout Completed / Share */}
      {workoutCompleted && (
        <div
          id="workout-completed-screen"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl select-none max-h-[90vh] overflow-y-auto"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-lime-500/10 border border-lime-500/20 text-lime-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} />
              </div>

              <h3 className="text-xl font-black text-white">
                ¡Entrenamiento completado!
              </h3>

              <p className="text-xs text-neutral-400">
                Has terminado tu sesión. Puedes compartirla directamente.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                <div className="text-lg font-black text-white">
                  {Math.max(1, Math.round(elapsedSeconds / 60))}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  minutos
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                <div className="text-lg font-black text-white">
                  {new Set(
                    loggedSets
                      .filter(set => !set.is_warmup)
                      .map(set => set.exercise_id)
                  ).size}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  ejercicios
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                <div className="text-lg font-black text-white">
                  {loggedSets.filter(set => !set.is_warmup).length}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  series
                </div>
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                Resumen
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Array.from(
                  new Map<string, WorkoutSet>(
                    loggedSets
                      .filter(set => !set.is_warmup)
                      .map(set => [set.exercise_id, set] as [string, WorkoutSet])
                  ).values()
                ).map((firstSet: WorkoutSet) => {
                  const exerciseSets = loggedSets
                    .filter(
                      set =>
                        set.exercise_id === firstSet.exercise_id &&
                        !set.is_warmup
                    )
                    .sort((a, b) => a.set_number - b.set_number);

                  return (
                    <div
                      key={firstSet.exercise_id}
                      className="text-xs"
                    >
                      <div className="font-bold text-white">
                        {firstSet.exercise_name?.trim() || 'Ejercicio'}
                      </div>

                      <div className="text-neutral-500">
                        {exerciseSets
                          .map(set => `${set.weight_kg} kg × ${set.reps}`)
                          .join(' · ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {finishNotes.trim() && (
                <div className="border-t border-neutral-800 pt-3 text-xs text-neutral-400">
                  <span className="font-bold text-neutral-500">
                    Nota:
                  </span>{' '}
                  {finishNotes.trim()}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                id="btn-share-whatsapp"
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ minHeight: '48px' }}
              >
                <MessageCircle size={18} />
                Compartir por WhatsApp
              </button>

              {typeof navigator !== 'undefined' && !!navigator.share && (
                <button
                  id="btn-share-native"
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ minHeight: '48px' }}
                >
                  <Share2 size={17} />
                  Compartir con otras apps
                </button>
              )}
            </div>

            <button
              id="btn-completed-continue"
              type="button"
              onClick={handleExitCompletedWorkout}
              className="w-full bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-neutral-300 font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98]"
              style={{ minHeight: '44px' }}
            >
              Continuar
            </button>
          </motion.div>
        </div>
      )}

      {/* Finish Workout Notes Modal */}
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
