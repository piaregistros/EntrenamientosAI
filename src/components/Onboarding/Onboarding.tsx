import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Timer,
  Target,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
  onClose?: () => void;
}

type AnswerKey =
  | 'goal'
  | 'experience'
  | 'days'
  | 'duration'
  | 'priority'
  | 'style';

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface Question {
  key: AnswerKey;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  text: string;
  options: Option[];
}

const questions: Question[] = [
  {
    key: 'goal',
    icon: Target,
    title: '¿Cuál es tu objetivo principal?',
    text: 'Esto nos ayuda a elegir el tipo de entrenamiento que mejor encaja contigo.',
    options: [
      {
        value: 'hypertrophy',
        label: 'Ganar músculo',
        description: 'Priorizar hipertrofia y desarrollo muscular.',
      },
      {
        value: 'strength',
        label: 'Ganar fuerza',
        description: 'Priorizar rendimiento y fuerza.',
      },
      {
        value: 'glutes',
        label: 'Mejorar glúteos',
        description: 'Dar mayor prioridad al trabajo de glúteos.',
      },
      {
        value: 'general',
        label: 'Mejorar en general',
        description: 'Una combinación equilibrada de objetivos.',
      },
    ],
  },
  {
    key: 'experience',
    icon: Dumbbell,
    title: '¿Qué experiencia tienes entrenando?',
    text: 'No buscamos que sepas hacerlo todo. Queremos adaptar el punto de partida.',
    options: [
      {
        value: 'beginner',
        label: 'Principiante',
        description: 'Estoy empezando o llevo poco tiempo.',
      },
      {
        value: 'intermediate',
        label: 'Intermedio',
        description: 'Ya entreno con cierta regularidad.',
      },
      {
        value: 'advanced',
        label: 'Avanzado',
        description: 'Tengo bastante experiencia entrenando.',
      },
    ],
  },
  {
    key: 'days',
    icon: HeartPulse,
    title: '¿Cuántos días puedes entrenar?',
    text: 'Elige una frecuencia que puedas mantener de forma realista.',
    options: [
      { value: '2', label: '2 días por semana' },
      { value: '3', label: '3 días por semana' },
      { value: '4', label: '4 días por semana' },
      { value: '5', label: '5 días por semana' },
    ],
  },
  {
    key: 'duration',
    icon: Timer,
    title: '¿Cuánto tiempo tienes por sesión?',
    text: 'La duración disponible influirá en cuánto trabajo podemos incluir.',
    options: [
      { value: '30', label: '30 minutos' },
      { value: '45', label: '45 minutos' },
      { value: '60', label: '60 minutos' },
      { value: '75', label: '75 minutos o más' },
    ],
  },
  {
    key: 'priority',
    icon: Sparkles,
    title: '¿Quieres dar prioridad a alguna zona?',
    text: 'Puedes elegir un enfoque concreto o mantener una distribución equilibrada.',
    options: [
      {
        value: 'balanced',
        label: 'Todo equilibrado',
        description: 'Repartir el trabajo de forma equilibrada.',
      },
      {
        value: 'glutes',
        label: 'Glúteos',
        description: 'Dar más protagonismo a los glúteos.',
      },
      {
        value: 'lower',
        label: 'Tren inferior',
        description: 'Dar más protagonismo a piernas y tren inferior.',
      },
      {
        value: 'upper',
        label: 'Tren superior',
        description: 'Dar más protagonismo a espalda, pecho y hombros.',
      },
    ],
  },
  {
    key: 'style',
    icon: Dumbbell,
    title: '¿Cómo prefieres organizar tus entrenamientos?',
    text: 'No necesitas conocer los nombres técnicos.',
    options: [
      {
        value: 'full_body',
        label: 'Cuerpo completo',
        description: 'Trabajar todo el cuerpo en cada sesión.',
      },
      {
        value: 'split',
        label: 'Rutinas divididas',
        description: 'Repartir los grupos musculares entre sesiones.',
      },
      {
        value: 'mixed',
        label: 'Me da igual',
        description: 'Dejar que Entrenamiento elija lo más adecuado.',
      },
    ],
  },
];

export default function Onboarding({
  user,
  onComplete,
  onClose,
}: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<AnswerKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const current = questions[step];
  const Icon = current.icon;
  const selected = answers[current.key];
  const isLast = step === questions.length - 1;

  const choose = (value: string) => {
    setError('');
    setAnswers((previous) => ({
      ...previous,
      [current.key]: value,
    }));
  };

  const next = () => {
    if (!selected) {
      setError('Selecciona una opción para continuar.');
      return;
    }

    setError('');
    setStep((value) => Math.min(questions.length - 1, value + 1));
  };

  const back = () => {
    setError('');
    setStep((value) => Math.max(0, value - 1));
  };

  const finish = async () => {
    if (!selected) {
      setError('Selecciona una opción para continuar.');
      return;
    }

    const requiredKeys: AnswerKey[] = [
      'goal',
      'experience',
      'days',
      'duration',
      'priority',
      'style',
    ];

    if (!requiredKeys.every((key) => Boolean(answers[key]))) {
      setError('Completa todas las preguntas antes de continuar.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await apiFetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: {
            goal: answers.goal,
            experience: answers.experience,
            days: answers.days,
            duration: answers.duration,
            priority: answers.priority,
            style: answers.style,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'No se pudo guardar el onboarding.');
      }

      onComplete();
    } catch (error) {
      console.error('Onboarding completion error:', error);
      setError(
        'No hemos podido guardar tu programa. Comprueba la conexión e inténtalo de nuevo.',
      );
      setSaving(false);
    }
  };

  return (
    <div
      id="onboarding-overlay"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-neutral-950 p-5 text-white sm:items-center"
    >
      <div className="w-full max-w-md py-2 sm:py-5">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="absolute right-5 top-5 text-neutral-500 hover:text-white disabled:opacity-30"
            aria-label="Cerrar"
          >
            ×
          </button>
        )}

        <div className="mb-8 flex gap-1.5">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index <= step ? 'bg-lime-400' : 'bg-neutral-800'
              }`}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-7 shadow-2xl">
          <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-lime-500/20 bg-lime-500/10 text-lime-400">
            <Icon size={30} />
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
            Personaliza tu entrenamiento
          </p>

          <h1 className="text-3xl font-black tracking-tight">
            {current.title}
          </h1>

          <p className="mt-4 text-sm leading-6 text-neutral-400">
            {current.text}
          </p>

          {step === 0 && (
            <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm font-bold text-white">
                Hola, {user?.name || 'bienvenido/a'}.
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Responde estas preguntas y prepararemos tu punto de partida.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-2.5">
            {current.options.map((option) => {
              const isSelected = selected === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => choose(option.value)}
                  disabled={saving}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-lime-400 bg-lime-400/10'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                  } disabled:opacity-60`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? 'border-lime-400 bg-lime-400 text-neutral-950'
                          : 'border-neutral-700'
                      }`}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>

                    <div>
                      <p
                        className={`text-sm font-black ${
                          isSelected ? 'text-lime-300' : 'text-white'
                        }`}
                      >
                        {option.label}
                      </p>

                      {option.description && (
                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-300">
              {error}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0 || saving}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-neutral-800 px-4 text-sm font-bold text-neutral-400 disabled:opacity-20"
            >
              <ArrowLeft size={16} />
              Atrás
            </button>

            {!isLast ? (
              <button
                type="button"
                onClick={next}
                disabled={saving}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-lime-400 px-5 text-sm font-black text-neutral-950 disabled:opacity-60"
              >
                Continuar
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-lime-400 px-5 text-sm font-black text-neutral-950 disabled:opacity-60"
              >
                {saving ? 'Creando tu rutina...' : 'Crear mi rutina'}
                {!saving && <Check size={16} />}
              </button>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-neutral-600">
          Paso {step + 1} de {questions.length}
        </p>
      </div>
    </div>
  );
}
