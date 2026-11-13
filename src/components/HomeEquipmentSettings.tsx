import React, { useEffect, useState } from 'react';
import { Home, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Item {
  key: string;
  label: string;
  available: boolean;
}

interface Payload {
  items: Item[];
  available: string[];
  kettlebell_weights: number[];
  dumbbell_increment_kg: number;
}

export default function HomeEquipmentSettings() {
  const [data, setData] = useState<Payload | null>(null);
  const [kbText, setKbText] = useState('');
  const [dbInc, setDbInc] = useState('2.5');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await apiFetch('/api/home-equipment');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || 'No se pudo cargar el material de casa');
      setData(body);
      setKbText((body.kettlebell_weights || []).join(', '));
      setDbInc(String(body.dumbbell_increment_kg ?? 2.5));
    } catch (e: any) {
      setErr(e.message || 'No se pudo cargar el material de casa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const parseWeights = (): number[] | null => {
    const parts = kbText.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const nums = parts.map((s) => Number(s.replace(',', '.')));
    if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null;
    return Array.from(new Set(nums)).sort((a, b) => a - b);
  };

  const save = async (next: Payload) => {
    const weights = parseWeights();
    if (!weights || weights.length === 0) {
      setErr('Indica al menos un peso de kettlebell (por ejemplo: 8, 10, 12, 16, 20, 24, 28, 32).');
      return;
    }
    const inc = Number(String(dbInc).replace(',', '.'));
    if (!Number.isFinite(inc) || inc <= 0) {
      setErr('El incremento de las mancuernas debe ser un número mayor que 0.');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch('/api/home-equipment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available: next.items.filter((i) => i.available).map((i) => i.key),
          kettlebell_weights: weights,
          dumbbell_increment_kg: inc,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || 'No se pudo guardar');
      setData(body);
      setKbText((body.kettlebell_weights || []).join(', '));
      setDbInc(String(body.dumbbell_increment_kg ?? inc));
      setMsg('Material de casa guardado');
    } catch (e: any) {
      setErr(e.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: string) => {
    if (!data) return;
    const next = {
      ...data,
      items: data.items.map((i) => i.key === key ? { ...i, available: !i.available } : i),
    };
    setData(next);
    void save(next);
  };

  return (
    <div id="home-equipment-settings" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Home size={16} className="text-lime-400" />
        <h3 className="text-sm font-extrabold text-white">Material de casa</h3>
      </div>
      <p className="text-[11px] text-neutral-500">
        Se usa los días que entrenas en casa: las sustituciones priorizan lo que tienes aquí,
        y las kettlebells suben al siguiente peso que tengas (no de 2,5 en 2,5 kg).
      </p>
      {loading && <div className="flex items-center gap-2 text-neutral-400 text-xs"><Loader size={14} className="animate-spin" /> Cargando…</div>}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-1.5">
            {data.items.map((item) => (
              <label key={item.key} className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200">
                <input
                  type="checkbox"
                  checked={item.available}
                  onChange={() => toggle(item.key)}
                  disabled={saving}
                  className="accent-lime-400"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Pesos de kettlebell (kg)</label>
            <input
              id="input-kettlebell-weights"
              value={kbText}
              onChange={(e) => setKbText(e.target.value)}
              onBlur={() => data && void save(data)}
              placeholder="8, 10, 12, 16, 20, 24, 28, 32"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Incremento de mancuernas (kg por mancuerna)</label>
            <input
              id="input-dumbbell-increment"
              value={dbInc}
              onChange={(e) => setDbInc(e.target.value)}
              onBlur={() => data && void save(data)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <p className="text-[10px] text-neutral-600">Con placas de 1,25 kg por lado, el paso es 2,5 kg.</p>
          </div>
        </>
      )}
      {msg && <p className="text-xs text-lime-400 flex items-center gap-1"><CheckCircle2 size={12} /> {msg}</p>}
      {err && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {err}</p>}
    </div>
  );
}
