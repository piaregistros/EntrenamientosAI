// Fase 12c: la rutina sugerida es SIEMPRE la del gimnasio. Solo si Pablo elige el filtro «Casa»
// se pide al servidor el espejo de casa (Casa X sustituye a X). «Todas» y «Gimnasio» → gimnasio.
export type LocationFilter = 'todas' | 'gimnasio' | 'casa';

export const DEFAULT_LOCATION_FILTER: LocationFilter = 'gimnasio';

export function suggestionLocation(filter: LocationFilter): 'gimnasio' | 'casa' {
  return filter === 'casa' ? 'casa' : 'gimnasio';
}
