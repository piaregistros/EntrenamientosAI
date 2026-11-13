import { useEffect, useState } from 'react';
import type { MuscleId } from '../lib/exerciseMuscles';

// Carga perezosa del SVG del cuerpo (≈ 58 kB) para no meterlo en el JS inicial.
export default function MuscleHeatMap({ heat }: { heat: Record<string, number> }) {
  const [Map, setMap] = useState<null | typeof import('./MuscleMap').default>(null);
  useEffect(() => {
    import('./MuscleMap').then((m) => setMap(() => m.default));
  }, []);
  if (!Map) return <p className="text-[10px] text-neutral-500 text-center py-4">Cargando mapa…</p>;

  const highlight = {
    primary: [] as MuscleId[],
    secondary: [] as MuscleId[],
    view: 'front' as const,
    focus: 'full' as const,
  };
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Mapa de volumen (media semanal)</p>
      <div className="grid grid-cols-2 gap-3 bg-neutral-950/50 border border-neutral-800 rounded-xl p-3">
        <div className="h-56">
          <Map highlight={{ ...highlight, view: 'front' }} heat={heat} className="w-full h-full" />
        </div>
        <div className="h-56">
          <Map highlight={{ ...highlight, view: 'back' }} heat={heat} className="w-full h-full" />
        </div>
      </div>
      <p className="text-[10px] text-neutral-500">El verde más intenso se acerca a 20 series/semana en ese músculo.</p>
    </div>
  );
}
