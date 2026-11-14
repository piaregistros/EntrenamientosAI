// Fase 12b: reglas de los controles de peso del entreno activo (testeables sin React).
import { equipmentClass } from './warmup';

/** Barra olímpica de referencia para el desglose de discos. */
export const PLATE_BAR_KG = 20;
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

function normEquipment(equipment: unknown): string {
  return String(equipment ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * El desglose de discos solo tiene sentido con barra olímpica (la primera opción de equipo es «Barra»).
 * Kettlebell, mancuernas, peso corporal, TRX, gomas, máquinas, poleas, landmine o trap bar
 * (barra de peso distinto) no muestran «Discos: …».
 */
export function usesPlateCalculator(equipment: unknown): boolean {
  const first = normEquipment(equipment).split(/\s+o\s+|[/+,]/)[0]?.trim() || '';
  if (!first.startsWith('barra')) return false;
  return equipmentClass(equipment) === 'barbell';
}

/** «2×20 + 1×5 por lado» / «solo barra». */
export function plateBreakdown(totalKg: number): string {
  const side = Math.max(0, (Number.isFinite(totalKg) ? totalKg : 0) - PLATE_BAR_KG) / 2;
  let left = side;
  const used: string[] = [];
  for (const pl of PLATES_KG) {
    const n = Math.floor(left / pl + 1e-6);
    if (n) {
      used.push(`${n}×${pl}`);
      left = Math.round((left - n * pl) * 100) / 100;
    }
  }
  return 'Discos: ' + (used.length ? used.join(' + ') + ' por lado' : 'solo barra');
}

function cleanSteps(steps: unknown): number[] {
  if (!Array.isArray(steps)) return [];
  const out = steps.map(Number).filter((v) => Number.isFinite(v) && v > 0);
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Siguiente valor del botón +/−.
 * - Con pesos fijos (kettlebells): + sube a la siguiente que haya (desde 0, la más ligera);
 *   − baja a la anterior o a 0. En la más pesada, + no inventa un peso mayor.
 * - Sin pesos fijos: ± `step` (mínimo 0).
 */
export function stepWeight(current: number, direction: 1 | -1, step: number, steps?: unknown): number {
  const cur = Number.isFinite(current) && current > 0 ? current : 0;
  const fixed = cleanSteps(steps);
  if (fixed.length) {
    if (direction > 0) {
      const next = fixed.find((s) => s > cur + 1e-6);
      return next ?? cur;
    }
    const lighter = fixed.filter((s) => s < cur - 1e-6);
    return lighter.length ? lighter[lighter.length - 1] : 0;
  }
  const inc = Number.isFinite(step) && step > 0 ? step : 2.5;
  return Math.max(0, round2(cur + direction * inc));
}
