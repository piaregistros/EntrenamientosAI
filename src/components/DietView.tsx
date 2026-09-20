import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Utensils, RefreshCw, ShoppingCart, Check } from 'lucide-react';

const SLOT_LABEL: Record<string, string> = {
  breakfast: 'Desayuno',
  peri: 'Peri-entreno',
  lunch: 'Comida',
  snack: 'Snack',
  dinner: 'Cena',
};

export default function DietView({ user }: { user: any }) {
  const [goals, setGoals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [week, setWeek] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [tab, setTab] = useState<'hoy' | 'semana' | 'lista' | 'ajuste'>('hoy');
  const [shopping, setShopping] = useState<any[]>([]);
  const [openMeal, setOpenMeal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const [g, p, t, w] = await Promise.all([
      apiFetch('/api/diet/goals'),
      apiFetch('/api/diet/profile'),
      apiFetch('/api/diet/today'),
      apiFetch('/api/diet/week'),
    ]);
    if (!g.ok || !p.ok || !t.ok || !w.ok) {
      setError('No se pudo cargar la dieta. ¿Backend en feature/diet-engine?');
      return;
    }
    setGoals((await g.json()).goals);
    setProfile(await p.json());
    setToday((await t.json()).day);
    setWeek(await w.json());
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async (patch: Record<string, unknown>) => {
    setSaving(true);
    const body = { ...profile, ...patch };
    const res = await apiFetch('/api/diet/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: body.goal,
        meals_per_day: Number(body.meals_per_day || 4),
        weight_kg: body.weight_kg ? Number(body.weight_kg) : null,
        notes: body.notes || null,
      }),
    });
    if (res.ok) {
      setProfile(await res.json());
      await apiFetch('/api/diet/week/generate', { method: 'POST' });
      await load();
    }
    setSaving(false);
  };

  const loadShopping = async () => {
    const res = await apiFetch('/api/diet/shopping-list');
    if (res.ok) setShopping((await res.json()).items);
  };

  const markEaten = async (meal: any, day: string) => {
    await apiFetch('/api/diet/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: day, recipe_id: meal.recipe_id, slot: meal.slot, eaten: true }),
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28 text-neutral-100">
      <p className="text-lime-400 text-xs uppercase tracking-[0.2em] font-semibold">Nutricion</p>
      <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
        <Utensils size={22} className="text-lime-400" /> Dieta A/B/C
      </h1>
      <p className="text-neutral-400 text-sm mt-1">
        Hola {user?.name || ''}. Sin cerdo ni marisco. Pescado kosher sí. Recetas de 5–25 min.
      </p>

      {error && <div className="mt-4 text-sm bg-red-950/60 border border-red-800 text-red-200 rounded-xl p-3">{error}</div>}

      <div className="flex gap-1 bg-neutral-900 rounded-xl p-1 my-5">
        {(['hoy', 'semana', 'lista', 'ajuste'] as const).map((id) => (
          <button key={id} onClick={() => { setTab(id); if (id === 'lista') loadShopping(); }}
            className={`flex-1 text-[11px] uppercase py-2 rounded-lg font-semibold ${tab === id ? 'bg-lime-400 text-neutral-950' : 'text-neutral-400'}`}>
            {id}
          </button>
        ))}
      </div>

      {tab === 'hoy' && today && (
        <section>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 mb-4">
            <p className="text-lime-400 text-xs uppercase">{today.weekday}</p>
            <h2 className="text-xl font-bold">{today.kind === 'train' ? `Entreno ${today.routine_name}` : 'Descanso'}</h2>
            <p className="text-neutral-400 text-sm mt-2">{today.note}</p>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
              <div className="bg-neutral-800 rounded-lg py-2">P {today.planned.protein} g</div>
              <div className="bg-neutral-800 rounded-lg py-2">C {today.planned.carbs} g</div>
              <div className="bg-neutral-800 rounded-lg py-2">G {today.planned.fat} g</div>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">Objetivo: {today.targets.kcal} kcal · {today.targets.protein_g} g P</p>
          </div>
          {today.meals.map((meal: any) => (
            <button key={meal.recipe_id + meal.slot} onClick={() => setOpenMeal(meal)}
              className="w-full text-left rounded-2xl border border-neutral-800 bg-neutral-900 p-4 mb-3">
              <div className="flex justify-between">
                <span className="text-lime-400 text-[11px] uppercase">{SLOT_LABEL[meal.slot] || meal.slot}</span>
                <span className="text-neutral-500 text-xs">{meal.minutes} min</span>
              </div>
              <p className="font-semibold mt-1">{meal.name}</p>
              <p className="text-xs text-neutral-400 mt-1">{meal.kcal} kcal · {meal.protein} g P</p>
            </button>
          ))}
        </section>
      )}

      {tab === 'semana' && week && week.days.map((d: any) => (
        <div key={d.date} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 mb-3">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-neutral-500 uppercase">{d.weekday}</p>
              <p className="font-semibold">{d.kind === 'train' ? d.routine_name : 'Descanso'}</p>
            </div>
            <p className="text-sm">{d.planned.kcal} kcal</p>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-300">
            {d.meals.map((m: any) => (
              <li key={m.slot + m.recipe_id}><span className="text-neutral-500">{SLOT_LABEL[m.slot]} · </span>{m.name}</li>
            ))}
          </ul>
        </div>
      ))}

      {tab === 'lista' && (
        <section>
          <div className="flex items-center gap-2 mb-3 text-lime-400"><ShoppingCart size={16} /><h2 className="font-semibold">Lista de la compra</h2></div>
          {shopping.map((item) => (
            <div key={item.item} className="flex justify-between border-b border-neutral-800 py-2 text-sm">
              <span>{item.item}</span><span className="text-neutral-500">×{item.appearances}</span>
            </div>
          ))}
        </section>
      )}

      {tab === 'ajuste' && profile && (
        <section className="space-y-4">
          <p className="text-sm text-neutral-400">El plan lo calcula el backend. No inventa alimentos.</p>
          {goals.map((g) => (
            <button key={g.id} onClick={() => saveProfile({ goal: g.id })}
              className={`text-left w-full rounded-xl p-3 border ${profile.goal === g.id ? 'border-lime-400 bg-lime-400/10' : 'border-neutral-800 bg-neutral-900'}`}>
              <p className="font-semibold">{g.name}</p>
              <p className="text-xs text-neutral-400 mt-1">{g.summary}</p>
            </button>
          ))}
          <div>
            <p className="text-xs uppercase text-neutral-500 mb-1">Cómo repartir el día</p>
            <p className="text-xs text-neutral-500 mb-2">Las kcal las fija el objetivo de arriba. Esto solo cambia el número de tomas.</p>
            {[
              { n: 3, title: '3 tomas', desc: 'Desayuno, comida y cena. Platos más grandes.' },
              { n: 4, title: '4 tomas', desc: 'Lo mismo + un snack entre horas.' },
              { n: 5, title: '5 tomas', desc: 'Snack + algo peri-entreno los días A/B/C.' },
            ].map((opt) => (
              <button key={opt.n} onClick={() => saveProfile({ meals_per_day: opt.n })}
                className={`text-left w-full rounded-xl p-3 border mb-2 ${Number(profile.meals_per_day) === opt.n ? 'border-lime-400 bg-lime-400/10' : 'border-neutral-800 bg-neutral-900'}`}>
                <p className="font-semibold">{opt.title}</p>
                <p className="text-xs text-neutral-400 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
          <input type="number" defaultValue={profile.weight_kg || ''} placeholder="Peso kg"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3"
            onBlur={(e) => { if (e.target.value) saveProfile({ weight_kg: Number(e.target.value) }); }} />
          <button disabled={saving} onClick={() => saveProfile({})}
            className="w-full flex items-center justify-center gap-2 bg-lime-400 text-neutral-950 font-bold rounded-xl py-3">
            <RefreshCw size={16} /> Regenerar semana
          </button>
        </section>
      )}

      {openMeal && today && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setOpenMeal(null)}>
          <div className="w-full max-w-md mx-auto bg-neutral-900 rounded-t-3xl p-5 pb-10" onClick={(e) => e.stopPropagation()}>
            <p className="text-lime-400 text-xs uppercase">{SLOT_LABEL[openMeal.slot]}</p>
            <h3 className="text-xl font-bold mt-1">{openMeal.name}</h3>
            <p className="text-sm text-neutral-400 mt-1">{openMeal.minutes} min · {openMeal.kcal} kcal · {openMeal.protein} g P</p>
            <h4 className="mt-4 text-xs uppercase text-neutral-500">Ingredientes</h4>
            <ul className="text-sm mt-1 space-y-1">{openMeal.ingredients.map((i: string) => <li key={i}>· {i}</li>)}</ul>
            <h4 className="mt-4 text-xs uppercase text-neutral-500">Pasos</h4>
            <ol className="text-sm mt-1 space-y-1 list-decimal pl-4">{openMeal.steps.map((s: string) => <li key={s}>{s}</li>)}</ol>
            <button onClick={() => { markEaten(openMeal, today.date); setOpenMeal(null); }}
              className="mt-5 w-full bg-lime-400 text-neutral-950 font-bold rounded-xl py-3 flex items-center justify-center gap-2">
              <Check size={16} /> Marcar como hecha
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
