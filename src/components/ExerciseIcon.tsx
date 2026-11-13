import { Dumbbell } from 'lucide-react';
import MuscleMap from './MuscleMap';
import { MuscleExercise, resolveExerciseMuscles } from '../lib/exerciseMuscles';

// Mapa muscular del ejercicio (cuerpo en gris, músculo principal resaltado)
// o un icono neutro si no hay coincidencia.
export default function ExerciseIcon({
  exercise,
  className,
  compact = true,
}: {
  exercise?: MuscleExercise | null;
  className: string;
  compact?: boolean;
}) {
  const highlight = exercise ? resolveExerciseMuscles(exercise).highlight : null;
  if (highlight) {
    return (
      <MuscleMap
        highlight={highlight}
        compact={compact}
        className={`${className} overflow-hidden`}
      />
    );
  }
  return (
    <span className={`${className} inline-flex items-center justify-center`} aria-hidden>
      <Dumbbell className="w-[60%] h-[60%]" />
    </span>
  );
}
