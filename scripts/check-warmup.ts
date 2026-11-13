// Comprueba que src/lib/warmup.ts sigue la misma regla que app/warmup.py.
import assert from 'node:assert/strict';
import { BAR_KG, isIsolation, suggestWarmup } from '../src/lib/warmup.ts';

function bench(extra: Record<string, unknown> = {}) {
  return {
    name: 'Press banca plano',
    equipment: 'Barra',
    exercise_type: 'compuesto',
    measure_type: 'reps',
    weight_increment_kg: 2.5,
    ...extra,
  };
}

function curl(extra: Record<string, unknown> = {}) {
  return {
    name: 'Curl de bíceps en máquina',
    equipment: 'Máquina',
    exercise_type: 'aislamiento',
    measure_type: 'reps',
    weight_increment_kg: 2.5,
    category: 'brazos',
    ...extra,
  };
}

const compound = suggestWarmup(bench(), 100);
assert.deepEqual(compound.map((s) => s.percent), [40, 60, 80]);
assert.deepEqual(compound.map((s) => s.reps), [8, 5, 3]);
assert.deepEqual(compound.map((s) => s.weight_kg), [40, 60, 80]);

const bar = suggestWarmup(bench(), 50);
assert.ok(bar[0].weight_kg >= BAR_KG);
assert.ok(bar.every((s) => s.weight_kg < 50 * 0.9));

assert.equal(isIsolation(curl()), true);
const iso = suggestWarmup(curl(), 30);
assert.deepEqual(iso.map((s) => s.percent), [50, 70]);
assert.equal(iso[0].weight_kg, 15);
assert.equal(iso[1].weight_kg, 20);

assert.deepEqual(suggestWarmup({ name: 'Plancha', equipment: 'Peso corporal', measure_type: 'time' }, 0), []);
assert.deepEqual(suggestWarmup({ name: 'Dominadas', equipment: 'Peso corporal', measure_type: 'bodyweight' }, 0), []);
assert.deepEqual(suggestWarmup(curl(), 8), []);

const light = suggestWarmup(bench(), 30);
assert.equal(light.length, 1);
assert.equal(light[0].weight_kg, BAR_KG);
assert.ok(light[0].label.includes('Barra'));

const db = suggestWarmup({
  name: 'Press de hombro con mancuernas',
  equipment: 'Mancuernas',
  exercise_type: 'compuesto',
  measure_type: 'reps',
  weight_increment_kg: 2,
}, 22);
assert.equal(db[0].weight_kg, 12);
assert.equal(db[1].weight_kg, 16);

console.log('check-warmup: ok');
