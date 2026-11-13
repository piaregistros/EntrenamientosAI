import { Dumbbell } from 'lucide-react';
import { exerciseIconSrc, IconExercise } from '../lib/exerciseIcons';

// Pictograma de trazo (mapa explícito en lib/exerciseIcons.ts). Se pinta con
// currentColor (máscara CSS) para verse bien en modo claro y en modo oscuro.
// Si no hay coincidencia, un icono neutro (mancuerna) del mismo color.
export default function ExerciseIcon({ exercise, className }: { exercise?: IconExercise | null; className: string }) {
  const src = exercise ? exerciseIconSrc(exercise) : null;
  if (src) {
    return (
      <span
        aria-hidden
        className={`${className} inline-block align-middle`}
        style={{
          backgroundColor: 'currentColor',
          WebkitMaskImage: `url("${src}")`,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskImage: `url("${src}")`,
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: 'contain',
          maskMode: 'alpha',
        }}
      />
    );
  }
  return (
    <span className={`${className} inline-flex items-center justify-center`} aria-hidden>
      <Dumbbell className="w-[60%] h-[60%]" />
    </span>
  );
}
