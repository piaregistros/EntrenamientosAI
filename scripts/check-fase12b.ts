// Fase 12b: forma de las respuestas de la API, desglose de discos y botones +/- del peso.
import assert from 'node:assert/strict';
import { toList } from '../src/lib/apiShapes.ts';
import { plateBreakdown, stepWeight, usesPlateCalculator } from '../src/lib/weightControl.ts';

// --- toList: /api/exercises devuelve { count, exercises } (causa de «exercises.filter is not a function»)
assert.deepEqual(toList({ count: 2, exercises: [1, 2] }, 'exercises'), [1, 2]);
assert.deepEqual(toList([3, 4], 'exercises'), [3, 4]);
assert.deepEqual(toList({ count: 0 }, 'exercises'), []);
assert.deepEqual(toList({ a: 1 }), []);
assert.deepEqual(toList(null, 'x'), []);
assert.deepEqual(toList(undefined), []);
assert.deepEqual(toList('texto', 'x'), []);
assert.doesNotThrow(() => toList({ exercises: {} }, 'exercises').filter(() => true));

// --- Discos: solo con barra olímpica
for (const eq of ['Barra', 'Barra o máquina', 'barra']) assert.equal(usesPlateCalculator(eq), true, eq);
for (const eq of [
  'Kettlebell', 'Mancuernas', 'Mancuerna', 'Mancuernas o peso corporal', 'Peso corporal', 'TRX', 'Goma',
  'Máquina', 'Máquina o banco', 'Polea', 'Landmine', 'Trap bar', 'Cajón pliométrico', 'Cuerda de combate',
  'Remo ergómetro', '', null, undefined,
]) assert.equal(usesPlateCalculator(eq as any), false, String(eq));
assert.equal(plateBreakdown(20), 'Discos: solo barra');
assert.equal(plateBreakdown(0), 'Discos: solo barra');
assert.equal(plateBreakdown(60), 'Discos: 1×20 por lado');
assert.equal(plateBreakdown(102.5), 'Discos: 1×25 + 1×15 + 1×1.25 por lado');

// --- Botones +/-
const KB = [8, 10, 12, 16, 20, 24, 28, 32];
assert.equal(stepWeight(0, 1, 4, KB), 8, 'desde 0, la kettlebell más ligera');
assert.equal(stepWeight(8, 1, 4, KB), 10);
assert.equal(stepWeight(12, 1, 4, KB), 16);
assert.equal(stepWeight(14, 1, 4, KB), 16, 'peso intermedio: la siguiente que haya');
assert.equal(stepWeight(32, 1, 4, KB), 32, 'en la más pesada no inventa otra');
assert.equal(stepWeight(16, -1, 4, KB), 12);
assert.equal(stepWeight(8, -1, 4, KB), 0);
assert.equal(stepWeight(0, -1, 4, KB), 0);
assert.equal(stepWeight(NaN, 1, 4, KB), 8);
assert.equal(stepWeight(0, 1, 2.5), 2.5, 'sin pesos fijos: paso estándar');
assert.equal(stepWeight(0, 1, 5, []), 5);
assert.equal(stepWeight(0, 1, 0), 2.5, 'paso 0 o inválido: 2,5');
assert.equal(stepWeight(2.5, -1, 2.5), 0);
assert.equal(stepWeight(0, -1, 2.5), 0);
assert.equal(stepWeight(0.1, 1, 0.2), 0.3, 'sin ruido de coma flotante');
assert.equal(stepWeight(7.5, 1, 2.5, null), 10);

console.log('check-fase12b: ok');
