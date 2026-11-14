// Fase 12c: la sugerida es siempre la del gimnasio, salvo que se elija «Casa».
import assert from 'node:assert/strict';
import { DEFAULT_LOCATION_FILTER, suggestionLocation } from '../src/lib/homeLocation.ts';

assert.equal(DEFAULT_LOCATION_FILTER, 'gimnasio', 'el filtro por defecto es Gimnasio');
assert.equal(suggestionLocation('gimnasio'), 'gimnasio');
assert.equal(suggestionLocation('todas'), 'gimnasio', 'con «Todas» la sugerida sigue siendo de gimnasio');
assert.equal(suggestionLocation('casa'), 'casa');
console.log('check-fase12c: ok');
