import body from '../assets/muscleBody.json';
import type { MuscleFocus, MuscleHighlight, MuscleId, MuscleView } from '../lib/exerciseMuscles';

// Una región lógica puede pintarse en frente, espalda o ambas (p. ej. tríceps).
const REGION: Record<string, { side: MuscleView; slug: string }> = {
  chest: { side: 'front', slug: 'chest' },
  front_deltoid: { side: 'front', slug: 'deltoids' },
  rear_deltoid: { side: 'back', slug: 'deltoids' },
  biceps: { side: 'front', slug: 'biceps' },
  triceps_front: { side: 'front', slug: 'triceps' },
  triceps_back: { side: 'back', slug: 'triceps' },
  forearm_front: { side: 'front', slug: 'forearm' },
  forearm_back: { side: 'back', slug: 'forearm' },
  abs: { side: 'front', slug: 'abs' },
  obliques: { side: 'front', slug: 'obliques' },
  quadriceps: { side: 'front', slug: 'quadriceps' },
  adductors_front: { side: 'front', slug: 'adductors' },
  adductors_back: { side: 'back', slug: 'adductors' },
  calves_front: { side: 'front', slug: 'calves' },
  calves_back: { side: 'back', slug: 'calves' },
  trapezius_front: { side: 'front', slug: 'trapezius' },
  trapezius_back: { side: 'back', slug: 'trapezius' },
  lats: { side: 'back', slug: 'upper-back' },
  lower_back: { side: 'back', slug: 'lower-back' },
  glutes: { side: 'back', slug: 'gluteal' },
  hamstrings: { side: 'back', slug: 'hamstring' },
  tibialis: { side: 'front', slug: 'tibialis' },
  neck_front: { side: 'front', slug: 'neck' },
  neck_back: { side: 'back', slug: 'neck' },
};

const ALIASES: Record<string, string[]> = {
  triceps: ['triceps_front', 'triceps_back'],
  forearm: ['forearm_front', 'forearm_back'],
  adductors: ['adductors_front', 'adductors_back'],
  calves: ['calves_front', 'calves_back'],
  trapezius: ['trapezius_front', 'trapezius_back'],
  neck: ['neck_front', 'neck_back'],
};

function expand(ids: MuscleId[]): string[] {
  const out: string[] = [];
  for (const id of ids) out.push(...(ALIASES[id] ?? [id]));
  return out;
}

// Recortes en unidades del SVG original (frente 0–724, espalda 724–1448).
const CROPS: Record<MuscleView, Record<MuscleFocus, string>> = {
  front: {
    full: '40 40 644 1380',
    upper: '80 140 564 740',
    lower: '120 600 484 800',
  },
  back: {
    full: '764 40 644 1380',
    upper: '804 140 564 740',
    lower: '844 600 484 800',
  },
};

type Bank = Record<string, string[]>;
const FRONT = body.front as Bank;
const BACK = body.back as Bank;

function heatFill(t: number): string {
  const v = Math.max(0, Math.min(1, t));
  return `color-mix(in srgb, var(--muscle-primary) ${Math.round(v * 100)}%, var(--muscle-idle))`;
}

function intensityOf(key: string, heat?: Record<string, number>): number {
  if (!heat) return 0;
  if (heat[key] != null) return heat[key];
  const base = key.replace(/_front$/, '').replace(/_back$/, '');
  return heat[base] ?? 0;
}

function BodySvg({
  view,
  focus,
  primary,
  secondary,
  heat,
}: {
  view: MuscleView;
  focus: MuscleFocus;
  primary: Set<string>;
  secondary: Set<string>;
  heat?: Record<string, number>;
}) {
  const bank = view === 'front' ? FRONT : BACK;
  const outline = view === 'front' ? body.outlineFront : body.outlineBack;
  const viewBox = CROPS[view][focus];

  const slugKeys: Record<string, string[]> = {};
  for (const [key, meta] of Object.entries(REGION)) {
    if (meta.side === view) (slugKeys[meta.slug] ??= []).push(key);
  }

  const idle: string[] = [];
  const mid: string[] = [];
  const top: string[] = [];
  for (const [slug, paths] of Object.entries(bank)) {
    const keys = slugKeys[slug] ?? [];
    let fill = 'var(--muscle-idle)';
    let bucket = idle;
    if (heat) {
      const t = Math.max(0, ...keys.map((k) => intensityOf(k, heat)), intensityOf(slug, heat));
      fill = heatFill(t);
      bucket = t > 0 ? top : idle;
    } else if (keys.some((k) => primary.has(k))) {
      fill = 'var(--muscle-primary)';
      bucket = top;
    } else if (keys.some((k) => secondary.has(k))) {
      fill = 'var(--muscle-secondary)';
      bucket = mid;
    }
    for (const d of paths) {
      bucket.push(`<path d="${d}" fill="${fill}" stroke="var(--muscle-gap)" stroke-width="2.2" stroke-linejoin="round"/>`);
    }
  }
  const markup = [
    `<path d="${outline}" fill="none" stroke="var(--muscle-outline)" stroke-width="18" stroke-linejoin="round" stroke-linecap="round"/>`,
    ...idle,
    ...mid,
    ...top,
  ].join('');

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      role="img"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export default function MuscleMap({
  highlight,
  compact = false,
  className = '',
  heat,
}: {
  highlight: MuscleHighlight;
  compact?: boolean;
  className?: string;
  heat?: Record<string, number>;
}) {
  const primary = new Set(expand(highlight.primary));
  const secondary = new Set(expand(highlight.secondary).filter((k) => !primary.has(k)));
  const focus = compact ? highlight.focus : 'full';
  return (
    <div className={className}>
      <BodySvg view={highlight.view} focus={focus} primary={primary} secondary={secondary} heat={heat} />
    </div>
  );
}
