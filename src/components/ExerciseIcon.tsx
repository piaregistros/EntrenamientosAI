import { Dumbbell } from 'lucide-react';
import { exerciseIconSrc, IconExercise } from '../lib/exerciseIcons';

// Ilustración del ejercicio (mapa explícito en lib/exerciseIcons.ts) o un icono neutro si no hay coincidencia.
export default function ExerciseIcon({ exercise, className }: { exercise?: IconExercise | null; className: string }) {
  const src = exercise ? exerciseIconSrc(exercise) : null;
  return src ? (
    <img src={src} alt="" className={`${className} object-cover bg-white`} />
  ) : (
    <span className={`${className} bg-neutral-800 text-neutral-400 inline-flex items-center justify-center`}>
      <Dumbbell size={16} />
    </span>
  );
}
