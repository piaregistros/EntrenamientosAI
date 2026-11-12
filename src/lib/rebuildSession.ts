// Reconstruye la lista de ejercicios de una sesión reanudada a partir de lo que
// guarda el servidor: sustituciones, extras y (por compatibilidad con sesiones
// anteriores a esta versión) extras deducidos de las series ya registradas.
export function rebuildSessionExercises(
  routineItems: any[],
  substitutions: any,
  extraExercises: any,
  sets: any[]
): { items: any[]; substitutionsMap: Record<string, any> } {
  const substitutionsMap: Record<string, any> = {};
  const subList = Array.isArray(substitutions) ? substitutions : [];

  let items = routineItems.map((item: any) => {
    const originalId = item.exercise?.id ?? item.exercise_id;
    const sub = subList.find((x: any) => x.original_exercise_id === originalId);
    if (!sub || !sub.substitute_exercise) return item;
    const substituted = {
      ...item,
      exercise_id: sub.substitute_exercise_id,
      exercise: sub.substitute_exercise,
      // Fase 7: el hueco recuerda qué ejercicio de la rutina ocupa, y el historial es el del SUSTITUTO.
      original_exercise_id: originalId,
      last_performance: sub.last_performance
        ? { date: sub.last_performance.date, sets: sub.last_performance.sets || [] }
        : null,
    };
    // La marca amarilla de la pestaña se consulta por el ejercicio que se hace ahora.
    substitutionsMap[sub.substitute_exercise_id] = substituted;
    return substituted;
  });

  const knownIds = new Set(items.map((i: any) => i.exercise?.id ?? i.exercise_id));
  const extraList = Array.isArray(extraExercises) ? extraExercises : [];
  for (const extra of extraList) {
    if (!extra?.exercise || knownIds.has(extra.exercise_id)) continue;
    knownIds.add(extra.exercise_id);
    items.push({
      id: 'extra-' + extra.exercise_id,
      exercise_id: extra.exercise_id,
      order: items.length + 1,
      target_sets: extra.target_sets ?? 3,
      target_rep_min: extra.target_rep_min ?? 8,
      target_rep_max: extra.target_rep_max ?? 12,
      target_rir: extra.target_rir ?? 2,
      rest_seconds: extra.rest_seconds ?? 90,
      is_optional: true,
      exercise: extra.exercise,
    });
  }

  // Sesiones antiguas: extras que solo existen como series registradas.
  for (const s of sets) {
    if (!s?.exercise_id || knownIds.has(s.exercise_id)) continue;
    knownIds.add(s.exercise_id);
    items.push({
      id: 'extra-' + s.exercise_id,
      exercise_id: s.exercise_id,
      order: items.length + 1,
      target_sets: 3,
      target_rep_min: 8,
      target_rep_max: 12,
      target_rir: 2,
      rest_seconds: 90,
      is_optional: true,
      exercise: {
        id: s.exercise_id,
        name: s.exercise_name || 'Ejercicio',
        target_muscle: s.target_muscle || '',
        category: s.category || '',
        equipment: s.equipment || '',
      },
    });
  }

  return { items, substitutionsMap };
}
