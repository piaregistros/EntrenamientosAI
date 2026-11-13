import { useMemo } from 'react';

export type Point = {
  x: number; // 0..1
  y: number; // value
  label: string;
  secondary?: number | null;
  muted?: boolean;
};

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const padded = value * 1.08;
  const exp = Math.pow(10, Math.floor(Math.log10(padded)));
  const n = padded / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * exp;
}

function ticks(max: number, count = 4): number[] {
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i * 10) / 10);
}

export function LineChart({
  values,
  labels,
  unit,
  color = '#a3e635',
  mutedFlags,
  height = 160,
  formatY,
}: {
  values: Array<number | null | undefined>;
  labels: string[];
  unit: string;
  color?: string;
  mutedFlags?: boolean[];
  height?: number;
  formatY?: (v: number) => string;
}) {
  const fmt = formatY || ((v: number) => String(Math.round(v * 10) / 10));
  const pts = useMemo(() => {
    const nums = values.map((v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v)));
    const present = nums.filter((v): v is number => v != null);
    const max = niceMax(Math.max(0, ...present));
    const n = Math.max(nums.length, 1);
    return {
      max,
      points: nums.map((v, i) => ({
        i,
        v,
        x: n === 1 ? 0.5 : i / (n - 1),
        y: v == null ? null : 1 - v / max,
        label: labels[i] || '',
        muted: mutedFlags?.[i] || false,
      })),
    };
  }, [values, labels, mutedFlags]);

  const w = 320;
  const h = height;
  const padL = 36;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const drawn = pts.points.filter((p) => p.v != null);
  const d = drawn
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${padL + p.x * iw} ${padT + (p.y as number) * ih}`)
    .join(' ');
  const area = drawn.length
    ? `${d} L ${padL + drawn[drawn.length - 1].x * iw} ${padT + ih} L ${padL + drawn[0].x * iw} ${padT + ih} Z`
    : '';

  if (!drawn.length) {
    return <p className="text-xs text-neutral-500 text-center py-8">Sin datos en este periodo.</p>;
  }

  const yTicks = ticks(pts.max);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label={`Gráfica en ${unit}`}>
      {yTicks.map((t, i) => {
        const y = padT + (1 - t / pts.max) * ih;
        return (
          <g key={i}>
            <line x1={padL} x2={padL + iw} y1={y} y2={y} stroke="currentColor" className="text-neutral-800" strokeWidth="1" />
            <text x={padL - 4} y={y + 3} textAnchor="end" className="fill-neutral-500" fontSize="8">
              {fmt(t)}
            </text>
          </g>
        );
      })}
      {area && <path d={area} fill={color} opacity="0.12" />}
      {d && <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.points.map((p, i) =>
        p.v == null ? null : (
          <circle
            key={i}
            cx={padL + p.x * iw}
            cy={padT + (p.y as number) * ih}
            r={drawn.length > 20 ? 2 : 3}
            fill={p.muted ? '#737373' : color}
          />
        ),
      )}
      {pts.points.map((p, i) => {
        const show = pts.points.length <= 6 || i === 0 || i === pts.points.length - 1 || i === Math.floor(pts.points.length / 2);
        if (!show) return null;
        return (
          <text key={`l${i}`} x={padL + p.x * iw} y={h - 6} textAnchor="middle" className="fill-neutral-500" fontSize="8">
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}

export function GroupedBars({
  weeks,
  groups,
  reference,
  height = 180,
}: {
  weeks: { week_label: string; groups: Record<string, number> }[];
  groups: string[];
  reference: { min_sets: number; max_sets: number };
  height?: number;
}) {
  const palette = ['#a3e635', '#38bdf8', '#fbbf24', '#f472b6', '#c4b5fd', '#fb7185', '#2dd4bf', '#94a3b8', '#f97316', '#e879f9', '#86efac'];
  const colorOf = (g: string, i: number) => palette[i % palette.length];
  const maxVal = niceMax(Math.max(reference.max_sets, ...weeks.flatMap((w) => groups.map((g) => w.groups[g] || 0)), 1));
  const w = 320;
  const h = height;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 28;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const n = Math.max(weeks.length, 1);
  const slot = iw / n;
  const barW = Math.max(2, (slot * 0.7) / Math.max(groups.length, 1));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Volumen semanal por grupo">
      <rect
        x={padL}
        y={padT + (1 - reference.max_sets / maxVal) * ih}
        width={iw}
        height={((reference.max_sets - reference.min_sets) / maxVal) * ih}
        fill="#a3e635"
        opacity="0.08"
      />
      <line
        x1={padL}
        x2={padL + iw}
        y1={padT + (1 - reference.min_sets / maxVal) * ih}
        y2={padT + (1 - reference.min_sets / maxVal) * ih}
        stroke="#a3e635"
        strokeDasharray="3 3"
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1={padL}
        x2={padL + iw}
        y1={padT + (1 - reference.max_sets / maxVal) * ih}
        y2={padT + (1 - reference.max_sets / maxVal) * ih}
        stroke="#a3e635"
        strokeDasharray="3 3"
        strokeWidth="1"
        opacity="0.5"
      />
      {ticks(maxVal).map((t, i) => {
        const y = padT + (1 - t / maxVal) * ih;
        return (
          <text key={i} x={padL - 4} y={y + 3} textAnchor="end" className="fill-neutral-500" fontSize="8">
            {t}
          </text>
        );
      })}
      {weeks.map((week, wi) =>
        groups.map((g, gi) => {
          const val = week.groups[g] || 0;
          const bh = (val / maxVal) * ih;
          const x = padL + wi * slot + slot * 0.15 + gi * barW;
          const y = padT + ih - bh;
          return <rect key={`${wi}-${g}`} x={x} y={y} width={barW} height={Math.max(0, bh)} fill={colorOf(g, gi)} rx="0.5" />;
        }),
      )}
      {weeks.map((week, wi) => {
        const show = weeks.length <= 8 || wi === 0 || wi === weeks.length - 1 || wi % 2 === 0;
        if (!show) return null;
        return (
          <text key={`l${wi}`} x={padL + wi * slot + slot / 2} y={h - 6} textAnchor="middle" className="fill-neutral-500" fontSize="7">
            {week.week_label}
          </text>
        );
      })}
    </svg>
  );
}

export const GROUP_COLORS = [
  '#a3e635', '#38bdf8', '#fbbf24', '#f472b6', '#c4b5fd', '#fb7185', '#2dd4bf', '#94a3b8', '#f97316', '#e879f9', '#86efac',
];
