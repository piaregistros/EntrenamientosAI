import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_KEY = 'entreno:chunk-reload';

export function isChunkLoadError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : '';
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    name === 'ChunkLoadError'
    || /Failed to fetch dynamically imported module/i.test(msg)
    || /Loading chunk [\w.-]+ failed/i.test(msg)
    || /error loading dynamically imported module/i.test(msg)
    || /Importing a module script failed/i.test(msg)
    || /Failed to load module script/i.test(msg)
  );
}

export function reloadOnceForChunkError(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return false;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    // Si no hay sessionStorage, recargamos igualmente una vez por turno.
  }
  window.location.reload();
  return true;
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * React.lazy cachea la promesa rechazada: si un chunk falla al cargar,
 * la segunda apertura falla al instante y, sin ErrorBoundary, deja la
 * pantalla en negro. Aquí, ante un ChunkLoadError, recargamos una vez
 * (por si el service worker o un índice viejo apuntaban a un hash
 * que ya no existe) y si vuelve a fallar dejamos que el ErrorBoundary
 * muestre el reintento.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await importer();
      clearChunkReloadFlag();
      return mod;
    } catch (err) {
      if (isChunkLoadError(err) && reloadOnceForChunkError()) {
        return new Promise(() => {});
      }
      throw err;
    }
  });
}
