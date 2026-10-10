import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Info,
  Pause,
  Play,
} from 'lucide-react';

interface FirstWorkoutGuideProps {
  onStart: () => void;
}

export default function FirstWorkoutGuide({
  onStart,
}: FirstWorkoutGuideProps) {
  return (
    <div
      id="first-workout-guide"
      className="fixed inset-0 z-[90] bg-neutral-950/95 backdrop-blur-sm flex items-center justify-center p-5"
    >
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
          Tu primer entrenamiento
        </p>

        <h2 className="mt-2 text-2xl font-black">
          Así funciona una sesión
        </h2>

        <div className="mt-6 space-y-3">
          <div className="flex gap-3 rounded-2xl bg-neutral-950 p-4">
            <Play className="mt-0.5 shrink-0 text-lime-400" size={18} />
            <div>
              <p className="text-sm font-bold">1. Empieza</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Pulsa empezar cuando estés preparada.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl bg-neutral-950 p-4">
            <Info className="mt-0.5 shrink-0 text-lime-400" size={18} />
            <div>
              <p className="text-sm font-bold">2. Aprende el movimiento</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Puedes abrir la información del ejercicio para ver instrucciones
                y técnica.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl bg-neutral-950 p-4">
            <CheckCircle2 className="mt-0.5 shrink-0 text-lime-400" size={18} />
            <div>
              <p className="text-sm font-bold">3. Registra las series</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Introduce el peso, repeticiones y esfuerzo percibido.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl bg-neutral-950 p-4">
            <Pause className="mt-0.5 shrink-0 text-lime-400" size={18} />
            <div>
              <p className="text-sm font-bold">4. Descansa</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                La aplicación te ayuda a controlar los descansos.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 text-sm font-black text-neutral-950"
        >
          Ver mi rutina
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
