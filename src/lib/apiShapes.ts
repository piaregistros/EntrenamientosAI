// Fase 12b: lectura defensiva de respuestas de la API.
// /api/exercises devuelve { count, exercises: [...] }; otras rutas devuelven la lista directa.
// Un componente que dé por hecho "es un array" revienta con «x.filter is not a function».

/** Devuelve siempre un array: la propia lista, o `data[key]`, o `[]`. */
export function toList<T = any>(data: unknown, key?: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (key && data && typeof data === 'object') {
    const inner = (data as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}
