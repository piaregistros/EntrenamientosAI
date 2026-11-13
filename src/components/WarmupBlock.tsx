import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { WorkoutSet } from '../types';
import { suggestWarmup, WarmupExercise, WarmupSet } from '../lib/warmup';
import { fmtKg } from '../lib/measure';

function almost(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.051;
}

export default function WarmupBlock({
  exercise,
  workingWeight,
  loggedSets,
  disabled,
  onLog,
  onDelete,
}: {
  exercise: WarmupExercise & { id?: string };
  workingWeight: number;
  loggedSets: WorkoutSet[];
  disabled?: boolean;
  onLog: (set: WarmupSet) => Promise<void>;
  onDelete: (setId: string) => Promise<void>;
}) {
  const suggestions = useMemo(() => suggestWarmup(exercise, workingWeight), [exercise, workingWeight]);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  if (suggestions.length === 0) return null;

  const matchOf = (s: WarmupSet): WorkoutSet | undefined =>
    loggedSets.find((ls) => ls.is_warmup && almost(ls.weight_kg, s.weight_kg) && ls.reps === s.reps);

  const doneCount = suggestions.filter((s) => matchOf(s)).length;

  const toggle = async (s: WarmupSet) => {
    if (disabled) return;
    const key = `${s.weight_kg}-${s.reps}`;
    const existing = matchOf(s);
    setBusy(key);
    try {
      if (existing) await onDelete(existing.id);
      else await onLog(s);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="warmup-suggested" className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        id="btn-toggle-warmup-block"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Calentamiento</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            {doneCount}/{suggestions.length} series · no cuentan para la progresión ni el volumen
            {workingWeight > 0 && <span> · sobre {fmtKg(workingWeight)} kg</span>}
          </p>
        </div>
        {open ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {suggestions.map((s) => {
            const existing = matchOf(s);
            const key = `${s.weight_kg}-${s.reps}`;
            const checked = !!existing;
            return (
              <button
                key={key}
                type="button"
                id={`btn-warmup-${s.percent}`}
                disabled={disabled || busy !== null}
                onClick={() => void toggle(s)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                  checked
                    ? 'bg-yellow-400/10 border-yellow-400/30'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                } disabled:opacity-50`}
              >
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-neutral-600 text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="flex-1">
                  <span className="text-xs font-extrabold text-white">{fmtKg(s.weight_kg)} kg × {s.reps}</span>
                  <span className="block text-[10px] text-neutral-500">{s.label}</span>
                </span>
                <span className="text-[10px] font-bold text-yellow-400/80 uppercase">C</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
