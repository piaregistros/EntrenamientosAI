import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Trophy, TrendingUp, Dumbbell, Timer, Flame, CheckCircle, BarChart3, ChevronRight, Loader, AlertTriangle } from 'lucide-react';
import { PRRecord, WorkoutStats } from '../types';
import { apiFetch } from '../lib/api';
const BodyEvolutionSection = lazy(() => import('./BodyEvolutionSection'));
const ExerciseProgressChart = lazy(() => import('./ExerciseProgressChart'));
const WeeklyVolume = lazy(() => import('./WeeklyVolume'));

interface StatsViewProps {
  user: any;
}

export default function StatsView({ user }: StatsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'fuerza' | 'evolucion'>('fuerza');
  const [statsSummary, setStatsSummary] = useState<WorkoutStats | null>(null);
  const [prs, setPrs] = useState<PRRecord[]>([]);
  const [exercisesList, setExercisesList] = useState<any[]>([]);
  const [selectedExId, setSelectedExId] = useState<string>('');
  const [exHistory, setExHistory] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    fetchStatsData();
  }, []);

  useEffect(() => {
    if (selectedExId) {
      fetchExerciseHistory(selectedExId);
    }
  }, [selectedExId]);

  const fetchStatsData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch summary stats
      const sumRes = await apiFetch(`/api/stats/summary?user_id=${encodeURIComponent(user.id)}`);
      if (!sumRes.ok) throw new Error('Error al cargar resumen estadístico');
      const sumData = await sumRes.json();
      const summary = sumData.summary || sumData;
      setStatsSummary({
        completed_workouts: summary.completed_workouts || 0,
        total_duration_minutes: summary.total_duration_minutes || 0,
        working_sets: summary.working_sets || 0,
        total_reps: summary.total_reps || 0,
        timed_seconds: summary.timed_seconds || 0,
        total_volume_kg: summary.total_volume_kg || 0,
      });
      const hechos = Array.isArray(sumData.exercises) ? sumData.exercises : [];
      if (hechos.length > 0) {
        setSelectedExId(hechos[0].id);
      }

      // 2. Fetch personal records
      const prRes = await apiFetch(`/api/stats/prs?user_id=${encodeURIComponent(user.id)}`);
      if (!prRes.ok) throw new Error('Error al cargar records personales (PRs)');
      const prData = await prRes.json();
      const prList = Array.isArray(prData) ? prData : (prData.prs || []);
      setPrs(prList.map((pr: any) => {
        const best = pr.best_estimated_1rm || pr.best_weight || pr;
        return {
          exercise_id: pr.exercise_id,
          exercise_name: pr.exercise_name || pr.name || '',
          weight_kg: best.weight_kg ?? pr.weight_kg ?? 0,
          reps: best.reps ?? pr.reps ?? 0,
          date: best.date || pr.date || '',
          estimated_1rm: best.estimated_1rm_kg ?? pr.estimated_1rm ?? 0,
        };
      }));

      // 3. Fetch exercises for selection dropdown
      const exRes = await apiFetch('/api/exercises');
      if (exRes.ok) {
        const exData = await exRes.json();
        const exercises = Array.isArray(exData)
          ? exData
          : (Array.isArray(exData.exercises) ? exData.exercises : []);

        setExercisesList(exercises);

        if (exercises.length > 0) {
          setSelectedExId((current) =>
            current && exercises.some((ex: any) => ex.id === current)
              ? current
              : exercises[0].id
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExerciseHistory = async (exerciseId: string) => {
    setLoadingHistory(true);
    try {
      const res = await apiFetch(`/api/stats/exercise/${exerciseId}?user_id=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data)
          ? data
          : (Array.isArray(data.evolution) ? data.evolution : (Array.isArray(data.history) ? data.history : []));
        setExHistory(raw.map((h: any) => {
          const sets = Array.isArray(h.sets) ? h.sets : [];
          const top = sets.reduce(
            (a: any, s: any) => ((Number(s.weight_kg) || 0) > (Number(a.weight_kg) || 0) ? s : a),
            sets[0] || {},
          );
          return {
            date: h.date,
            max_weight_kg: h.max_weight_kg ?? top.weight_kg ?? 0,
            max_reps: h.max_reps ?? top.reps ?? h.total_reps ?? 0,
            total_volume_kg: h.total_volume_kg ?? h.volume_kg ?? 0,
          };
        }));
      }
    } catch (e) {
      console.error('Error fetching exercise history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div id="stats-loading" className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-lime-400">
        <Loader className="animate-spin mb-4" size={32} />
        <span className="text-sm font-semibold tracking-wide text-neutral-400">Analizando tu progresión...</span>
      </div>
    );
  }

  return (
    <div id="stats-panel-container" className="min-h-screen bg-neutral-950 text-neutral-100 pb-24 px-4 pt-6 max-w-md mx-auto select-none space-y-6">
      <div>
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Progreso</span>
        <h2 id="stats-header-title" className="text-2xl font-black text-white mt-1">
          {activeSubTab === 'fuerza' ? 'Análisis de Fuerza' : 'Evolución Corporal'}
        </h2>
      </div>

      {/* Sub-tab Pill Selector */}
      <div className="grid grid-cols-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
        <button
          onClick={() => setActiveSubTab('fuerza')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'fuerza'
              ? 'bg-lime-400 text-black shadow'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Análisis de Fuerza
        </button>
        <button
          onClick={() => {
            setActiveSubTab('evolucion');
            setError(null);
          }}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'evolucion'
              ? 'bg-lime-400 text-black shadow'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Evolución Corporal
        </button>
      </div>

      {activeSubTab === 'fuerza' ? (
        <>
          {error && (
            <div id="stats-error" className="bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs flex gap-3">
              <AlertTriangle className="shrink-0 text-red-400" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Summary Metrics Grid */}
          {statsSummary && (
            <div id="stats-summary-grid" className="grid grid-cols-2 gap-3.5">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="text-neutral-500 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Entrenamientos</span>
                  <CheckCircle size={14} className="text-lime-400" />
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-white">{statsSummary.completed_workouts}</span>
                  <p className="text-[10px] text-neutral-400 mt-1">sesiones completadas</p>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="text-neutral-500 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Volumen Total</span>
                  <TrendingUp size={14} className="text-lime-400" />
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-white">{(statsSummary.total_volume_kg || 0).toLocaleString()} <span className="text-xs font-bold">kg</span></span>
                  <p className="text-[10px] text-neutral-400 mt-1">peso total desplazado</p>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="text-neutral-500 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Series de Trabajo</span>
                  <Dumbbell size={14} className="text-neutral-400" />
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-white">{statsSummary.working_sets}</span>
                  <p className="text-[10px] text-neutral-400 mt-1">series efectivas</p>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="text-neutral-500 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Métricas Plancha</span>
                  <Timer size={14} className="text-yellow-400" />
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-white">{statsSummary.timed_seconds} <span className="text-xs font-bold">s</span></span>
                  <p className="text-[10px] text-neutral-400 mt-1">isométrico acumulado</p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Exercise Progress Analyzer */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Progreso por Ejercicio</h3>
                <p className="text-[10px] text-neutral-500">1RM estimado, peso máximo y volumen por sesión</p>
              </div>
              <BarChart3 size={16} className="text-lime-400" />
            </div>

            <select
              id="select-stats-exercise"
              value={selectedExId}
              onChange={(e) => setSelectedExId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-bold focus:outline-none focus:border-lime-500"
              style={{ minHeight: '38px' }}
            >
              {exercisesList.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>

            {selectedExId && (
              <Suspense fallback={<div className="py-8 flex justify-center text-lime-400"><Loader className="animate-spin" size={20} /></div>}>
                <ExerciseProgressChart userId={user.id} exerciseId={selectedExId} />
              </Suspense>
            )}

            {loadingHistory ? (
              <div className="py-8 flex justify-center text-lime-400">
                <Loader className="animate-spin" size={20} />
              </div>
            ) : exHistory.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Registro de Progresiones</span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {exHistory.map((h, idx) => (
                      <div key={idx} className="bg-neutral-950/45 border border-neutral-850/30 p-2.5 rounded-xl flex justify-between items-center">
                        <span className="text-[10px] font-mono text-neutral-400">
                          {new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-white">{h.max_weight_kg} kg × {h.max_reps} reps</span>
                          <span className="text-[10px] text-neutral-500 font-semibold block">Vol: {(h.total_volume_kg || 0).toLocaleString()} kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-6">No hay registros completados para este ejercicio en tu historial.</p>
            )}
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <Suspense fallback={<p className="text-xs text-neutral-500">Cargando volumen…</p>}>
              <WeeklyVolume userId={user.id} />
            </Suspense>
          </div>

          {/* Personal Records (PRs) list */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-800/60">
              <div className="flex items-center gap-2">
                <Trophy className="text-lime-400 shrink-0" size={18} />
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Récords Personales (PRs)</h3>
                  <p className="text-[10px] text-neutral-500">Estimación de 1RM por Epley</p>
                </div>
              </div>
            </div>

            {prs.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {prs.map((pr) => (
                  <div key={pr.exercise_id} className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60 flex justify-between items-center group hover:border-neutral-700 transition-all">
                    <div>
                      <h4 className="text-xs font-extrabold text-white group-hover:text-lime-400 transition-colors">{pr.exercise_name}</h4>
                      <p className="text-[9px] text-neutral-500 mt-1 font-semibold uppercase">
                        Récord: {pr.weight_kg} kg × {pr.reps} reps
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-lime-400">{pr.estimated_1rm} kg</span>
                      <span className="text-[9px] text-neutral-500 font-semibold block mt-0.5">e1RM</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-6">Registra entrenamientos completos para calcular tus récords personales.</p>
            )}
          </div>
        </>
      ) : (
        <Suspense fallback={<p className="text-xs text-neutral-500 text-center py-10">Cargando evolución…</p>}>
          <BodyEvolutionSection user={user} />
        </Suspense>
      )}
    </div>
  );
}
