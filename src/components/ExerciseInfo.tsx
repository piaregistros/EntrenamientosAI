import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, ShieldAlert, Award, Play, ExternalLink } from 'lucide-react';
import { Exercise } from '../types';
import { apiFetch } from '../lib/api';
import ExerciseIcon from './ExerciseIcon';

interface ExerciseInfoProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
}

const getYoutubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // If it's already a youtube embed or youtube-nocookie embed URL, make sure it uses youtube-nocookie
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    return url.replace('youtube.com/embed/', 'youtube-nocookie.com/embed/');
  }
  
  // Extract ID from watch URLs or share URLs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}`;
  }
  
  // If it's a raw 11-char ID
  if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
    return `https://www.youtube-nocookie.com/embed/${url}`;
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  return null;
};

export default function ExerciseInfo({ exercise, isOpen, onClose }: ExerciseInfoProps) {
  const [activeTab, setActiveTab] = useState<'ejecucion' | 'seguridad' | 'ficha'>('ejecucion');

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // La ficha completa (pasos, claves, errores, vídeo, músculos) se pide al servidor al abrir,
  // así no depende de qué objeto de ejercicio pase quien abre el modal.
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const exerciseId = exercise?.id;

  useEffect(() => {
    if (!isOpen || !exerciseId) return;
    let cancelled = false;
    setDetail(null);
    setLoadState('loading');
    setActiveTab('ejecucion');
    apiFetch(`/api/exercises/${encodeURIComponent(exerciseId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setLoadState('ok');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, exerciseId]);

  if (!exercise) return null;

  const ex: Exercise = { ...exercise, ...(detail || {}) };
  const embedUrl = getYoutubeEmbedUrl(ex.video_url);
  const watchUrl = ex.video_url && ex.video_url.startsWith('http') ? ex.video_url : null;
  const youtubeSearchUrl =
    'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${ex.name} técnica`);
  const secondaryMuscles = Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles : [];

  // Format progression types for display
  const formatProgression = (type: string) => {
    switch (type) {
      case 'reps_then_weight':
        return 'Repeticiones y luego peso';
      case 'double_progression':
        return 'Progresión doble';
      case 'linear':
        return 'Lineal simple';
      default:
        return type || 'N/A';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ 
              y: '100%', 
              opacity: 1 
            }}
            animate={{ 
              y: 0, 
              opacity: 1 
            }}
            exit={{ 
              y: '100%', 
              opacity: 0 
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-2xl bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <ExerciseIcon exercise={ex} compact={false} className="w-14 h-28 shrink-0 rounded-lg bg-neutral-950" />
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-white leading-tight">
                    {ex.name}
                  </h3>
                  <span className="text-xs text-neutral-400 font-medium">
                    {ex.target_muscle} • {ex.equipment}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-neutral-800 px-4 bg-neutral-950/40">
              {(['ejecucion', 'seguridad', 'ficha'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider relative transition-colors cursor-pointer ${
                    activeTab === tab ? 'text-lime-400' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {tab === 'ejecucion' && 'Ejecución'}
                  {tab === 'seguridad' && 'Técnica y Seguridad'}
                  {tab === 'ficha' && 'Ficha Técnica'}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-neutral-200">
              
              {/* TAB 1: EJECUCIÓN */}
              {activeTab === 'ejecucion' && (
                <div className="space-y-5">
                  {loadState === 'loading' && (
                    <p className="text-xs text-neutral-500">Cargando ficha completa…</p>
                  )}
                  {loadState === 'error' && (
                    <p className="text-xs text-amber-400/90">
                      No se pudo cargar la ficha completa; se muestran los datos disponibles.
                    </p>
                  )}

                  {/* Vídeo (viene de la API: exercise_media) */}
                  {embedUrl ? (
                    <div className="space-y-2">
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                        <iframe
                          src={embedUrl}
                          title={`Video de demostración para ${ex.name}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {watchUrl && (
                        <a
                          href={watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-lime-400"
                        >
                          <ExternalLink size={12} /> Abrir en YouTube
                        </a>
                      )}
                    </div>
                  ) : loadState === 'loading' ? null : (
                    <div className="p-4 bg-neutral-950/40 border border-dashed border-neutral-700 rounded-xl text-center space-y-2">
                      <Play size={20} className="mx-auto text-neutral-500" />
                      <p className="text-sm text-neutral-300">Todavía no hay un vídeo para este ejercicio.</p>
                      <a
                        href={youtubeSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-lime-400 hover:underline"
                      >
                        <ExternalLink size={12} /> Buscar la técnica en YouTube
                      </a>
                    </div>
                  )}

                  {/* Músculos y equipo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-neutral-950/50 border border-neutral-800/60 rounded-xl">
                      <span className="block text-xs text-neutral-400 font-medium">Músculo objetivo</span>
                      <span className="text-sm font-semibold text-white">{ex.target_muscle || '—'}</span>
                    </div>
                    <div className="p-3 bg-neutral-950/50 border border-neutral-800/60 rounded-xl">
                      <span className="block text-xs text-neutral-400 font-medium">Equipo</span>
                      <span className="text-sm font-semibold text-white">{ex.equipment || '—'}</span>
                    </div>
                  </div>
                  {secondaryMuscles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-neutral-400 font-medium">Secundarios:</span>
                      {secondaryMuscles.map((m) => (
                        <span key={m} className="px-2 py-0.5 text-xs rounded-full bg-neutral-800 text-neutral-300 capitalize">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* General Instructions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider text-lime-400/90">
                      <Info size={14} /> Instrucciones
                    </h4>
                    <p className="text-sm text-neutral-300 leading-relaxed bg-neutral-950/30 p-3.5 rounded-xl border border-neutral-800/40">
                      {ex.instructions || 'No hay instrucciones generales registradas para este ejercicio.'}
                    </p>
                  </div>

                  {/* Execution Steps */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider text-lime-400/90">
                      Pasos de ejecución
                    </h4>
                    {ex.steps && ex.steps.length > 0 ? (
                      <ol className="space-y-2.5">
                        {ex.steps.map((step, index) => (
                          <li key={index} className="flex gap-3 text-sm leading-relaxed">
                            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-lime-500/10 text-lime-400 text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-neutral-300">{step}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">
                        Este ejercicio todavía no tiene pasos detallados.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TÉCNICA Y SEGURIDAD */}
              {activeTab === 'seguridad' && (
                <div className="space-y-5">
                  {/* Technical cues */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider text-teal-400">
                      <Award size={14} /> Claves técnicas
                    </h4>
                    {ex.technical_cues && ex.technical_cues.length > 0 ? (
                      <ul className="space-y-2">
                        {ex.technical_cues.map((cue, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                            <span className="text-teal-400 mt-1">•</span>
                            <span>{cue}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">
                        Este ejercicio todavía no tiene claves técnicas.
                      </p>
                    )}
                  </div>

                  {/* Common mistakes */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider text-red-400">
                      <ShieldAlert size={14} /> Errores comunes
                    </h4>
                    {ex.common_mistakes && ex.common_mistakes.length > 0 ? (
                      <ul className="space-y-2">
                        {ex.common_mistakes.map((mistake, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                            <span className="text-red-400 mt-1">✗</span>
                            <span>{mistake}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">
                        Este ejercicio todavía no tiene errores frecuentes registrados.
                      </p>
                    )}
                  </div>

                  {/* Safety Notes */}
                  {ex.safety_notes && (
                    <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-1">
                      <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider block">
                        Advertencias de Seguridad
                      </span>
                      <p className="text-sm text-neutral-300 leading-relaxed">
                        {ex.safety_notes}
                      </p>
                    </div>
                  )}

                  {/* Contraindications */}
                  {ex.contraindications && (
                    <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl space-y-1">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">
                        Contraindicaciones
                      </span>
                      <p className="text-sm text-neutral-300 leading-relaxed">
                        {ex.contraindications}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FICHA */}
              {activeTab === 'ficha' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2 bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                    <ExerciseIcon exercise={ex} compact={false} className="w-32 h-64" />
                    <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Músculos implicados</p>
                  </div>
                  <div className="divide-y divide-neutral-800 bg-neutral-950/50 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="flex justify-between p-3.5 text-sm">
                      <span className="text-neutral-400">Equipamiento</span>
                      <span className="font-semibold text-white">{ex.equipment}</span>
                    </div>
                    <div className="flex justify-between p-3.5 text-sm">
                      <span className="text-neutral-400">Categoría</span>
                      <span className="font-semibold text-white capitalize">{ex.category}</span>
                    </div>
                    <div className="flex justify-between p-3.5 text-sm">
                      <span className="text-neutral-400">Incremento mínimo</span>
                      <span className="font-semibold text-white">{ex.weight_increment_kg} kg</span>
                    </div>
                    <div className="flex justify-between p-3.5 text-sm">
                      <span className="text-neutral-400">Sistema de Progresión</span>
                      <span className="font-semibold text-white">
                        {formatProgression(ex.progression_type)}
                      </span>
                    </div>
                    <div className="flex justify-between p-3.5 text-sm">
                      <span className="text-neutral-400">Progresión por Reps</span>
                      <span className={`font-semibold ${ex.rep_progression_enabled ? 'text-lime-400' : 'text-neutral-400'}`}>
                        {ex.rep_progression_enabled ? 'Activado' : 'Desactivado'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Footer Action (Close) */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/40 flex justify-end">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-neutral-800 text-white hover:bg-neutral-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Guía
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
