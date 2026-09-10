import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Calendar, Scale, Ruler, Camera, Target, 
  ChevronDown, ChevronUp, AlertCircle, Loader, Sparkles, HelpCircle 
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { BodyMetric, BodyMeasurement, UserGoal } from '../types';
import BodyPhotosSection from './BodyPhotosSection';

interface BodyEvolutionSectionProps {
  user: any;
}

// Map goal types to Spanish friendly labels
const GOAL_TYPE_LABELS: Record<string, string> = {
  muscle_gain: 'Ganancia muscular',
  strength: 'Fuerza',
  fat_loss: 'Pérdida de grasa',
  maintenance: 'Mantenimiento',
  other: 'Otro'
};

// Las fechas de mediciones son fechas de calendario, no instantes UTC.
// Generamos siempre YYYY-MM-DD usando la fecha local del dispositivo.
function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convierte una fecha YYYY-MM-DD sin pasar por UTC.
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Muestra una fecha de calendario sin desplazamientos por zona horaria.
function formatLocalDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions
): string {
  return parseLocalDate(dateString).toLocaleDateString('es-ES', options);
}

// Simple custom line chart using SVG for lightweight, high-performance visualization
function SVGLineChart({
  data,
  dataKey,
  label,
  color = '#a3e635', // lime-400
  unit = '',
}: {
  data: any[];
  dataKey: string;
  label: string;
  color?: string;
  unit?: string;
}) {
  // Filter items that actually have a numeric value
  const validData = data
    .filter(item => item[dataKey] !== undefined && item[dataKey] !== null)
    .map(item => ({
      date: item.date,
      value: Number(item[dataKey]),
    }))
    // Sort chronologically (oldest to newest)
    .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  if (validData.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
        Sin registros para {label}
      </div>
    );
  }

  if (validData.length === 1) {
    return (
      <div className="h-28 flex flex-col items-center justify-center bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
        <span className="text-lg font-black text-white">{validData[0].value}{unit}</span>
        <span className="text-[10px] text-neutral-400 mt-1 font-medium">Un registro disponible ({validData[0].date})</span>
      </div>
    );
  }

  const values = validData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  // Add 10% padding to graph limits
  const yMin = minVal - range * 0.1;
  const yMax = maxVal + range * 0.1;
  const yRange = yMax - yMin;

  const width = 300;
  const height = 100;
  const padding = { top: 12, right: 12, bottom: 20, left: 12 };

  const points = validData.map((d, index) => {
    const x = padding.left + (index / (validData.length - 1)) * (width - padding.left - padding.right);
    const y = height - padding.bottom - ((d.value - yMin) / yRange) * (height - padding.top - padding.bottom);
    return { x, y, date: d.date, value: d.value };
  });

  const pathD = points.reduce((acc, p, index) => {
    return acc + `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }, '');

  const areaD = pathD + 
    `L ${points[points.length - 1].x.toFixed(1)} ${(height - padding.bottom).toFixed(1)} ` +
    `L ${points[0].x.toFixed(1)} ${(height - padding.bottom).toFixed(1)} Z`;

  return (
    <div className="bg-neutral-900/40 p-4 border border-neutral-800 rounded-xl space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">{label}</span>
        <span className="text-lime-400 font-extrabold">{validData[validData.length - 1].value}{unit}</span>
      </div>
      <div className="relative w-full h-24">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Reference Lines */}
          <line 
            x1={padding.left} 
            y1={padding.top} 
            x2={width - padding.right} 
            y2={padding.top} 
            stroke="#1f1f1f" 
            strokeWidth="1" 
            strokeDasharray="3 3" 
          />
          <line 
            x1={padding.left} 
            y1={height - padding.bottom} 
            x2={width - padding.right} 
            y2={height - padding.bottom} 
            stroke="#262626" 
            strokeWidth="1" 
          />

          {/* Area under line */}
          <path d={areaD} fill={`url(#gradient-${dataKey})`} />

          {/* Path Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Point Markers */}
          {points.map((p, i) => (
            <circle 
              key={i} 
              cx={p.x} 
              cy={p.y} 
              r="3" 
              fill="#0a0a0a" 
              stroke={color} 
              strokeWidth="1.5" 
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[8px] text-neutral-500 font-mono">
        <span>{validData[0].date}</span>
        <span>{validData[validData.length - 1].date}</span>
      </div>
    </div>
  );
}

export default function BodyEvolutionSection({ user }: BodyEvolutionSectionProps) {
  const [activeTab, setActiveTab] = useState<'datos' | 'medidas' | 'fotos' | 'objetivos'>('datos');
  
  // Data lists
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [goals, setGoals] = useState<UserGoal[]>([]);

  // State indicators
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form toggles
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  // Collapsible lists
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null);
  const [expandedMeasurementId, setExpandedMeasurementId] = useState<string | null>(null);

  // Selector for custom measurements chart
  const [selectedChartMeasurement, setSelectedChartMeasurement] = useState<string>('waist_cm');

  // Form States
  const [metricForm, setMetricForm] = useState({
    date: getLocalDateString(),
    weight_kg: '',
    body_fat_pct: '',
    muscle_mass_kg: '',
    water_pct: '',
    visceral_fat: '',
    basal_metabolic_rate_kcal: '',
    bone_mass_kg: '',
    notes: ''
  });

  const [measurementForm, setMeasurementForm] = useState({
    date: getLocalDateString(),
    waist_cm: '',
    chest_cm: '',
    arm_left_cm: '',
    arm_right_cm: '',
    thigh_left_cm: '',
    thigh_right_cm: '',
    hip_cm: '',
    neck_cm: '',
    notes: ''
  });

  const [goalForm, setGoalForm] = useState({
    goal_type: 'muscle_gain',
    title: '',
    description: '',
    start_date: getLocalDateString(),
    target_date: ''
  });

  // Load section content dynamically
  useEffect(() => {
    fetchTabData();
  }, [activeTab, user.id]);

  const fetchTabData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'datos') {
        const res = await apiFetch(`/api/body-metrics?user_id=${user.id}`);
        if (!res.ok) throw new Error('Error al cargar datos de composición corporal');
        const data = await res.json();
        // The API returns { count: X, metrics: [...] }
        setMetrics(data.metrics || []);
      } else if (activeTab === 'medidas') {
        const res = await apiFetch(`/api/body/measurements?user_id=${user.id}`);
        if (!res.ok) throw new Error('Error al cargar medidas corporales');
        const data = await res.json();
        // The API returns { count: X, measurements: [...] }
        setMeasurements(data.measurements || []);
      } else if (activeTab === 'objetivos') {
        const res = await apiFetch(`/api/body/goals?user_id=${user.id}`);
        if (!res.ok) throw new Error('Error al cargar objetivos');
        const data = await res.json();
        // The API returns { count: X, goals: [...] }
        setGoals(data.goals || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error al descargar datos del servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Submit handlers
  const handleMetricSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricForm.weight_kg) {
      setError('El peso corporal es obligatorio.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        user_id: user.id,
        date: metricForm.date,
        weight_kg: Number(metricForm.weight_kg),
        body_fat_pct: metricForm.body_fat_pct ? Number(metricForm.body_fat_pct) : null,
        muscle_mass_kg: metricForm.muscle_mass_kg ? Number(metricForm.muscle_mass_kg) : null,
        water_pct: metricForm.water_pct ? Number(metricForm.water_pct) : null,
        visceral_fat: metricForm.visceral_fat ? Number(metricForm.visceral_fat) : null,
        basal_metabolic_rate_kcal: metricForm.basal_metabolic_rate_kcal ? Number(metricForm.basal_metabolic_rate_kcal) : null,
        bone_mass_kg: metricForm.bone_mass_kg ? Number(metricForm.bone_mass_kg) : null,
        notes: metricForm.notes || null
      };

      const res = await apiFetch('/api/body-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar medición');
      }

      // Reset form and close
      setMetricForm({
        date: getLocalDateString(),
        weight_kg: '',
        body_fat_pct: '',
        muscle_mass_kg: '',
        water_pct: '',
        visceral_fat: '',
        basal_metabolic_rate_kcal: '',
        bone_mass_kg: '',
        notes: ''
      });
      setShowMetricForm(false);
      fetchTabData();
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMeasurementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one measurement was filled
    const hasAnyValue = [
      measurementForm.waist_cm, measurementForm.chest_cm,
      measurementForm.arm_left_cm, measurementForm.arm_right_cm,
      measurementForm.thigh_left_cm, measurementForm.thigh_right_cm,
      measurementForm.hip_cm, measurementForm.neck_cm
    ].some(val => val !== '');

    if (!hasAnyValue) {
      setError('Debes registrar al menos una medida.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        user_id: user.id,
        date: measurementForm.date,
        waist_cm: measurementForm.waist_cm ? Number(measurementForm.waist_cm) : null,
        chest_cm: measurementForm.chest_cm ? Number(measurementForm.chest_cm) : null,
        arm_left_cm: measurementForm.arm_left_cm ? Number(measurementForm.arm_left_cm) : null,
        arm_right_cm: measurementForm.arm_right_cm ? Number(measurementForm.arm_right_cm) : null,
        thigh_left_cm: measurementForm.thigh_left_cm ? Number(measurementForm.thigh_left_cm) : null,
        thigh_right_cm: measurementForm.thigh_right_cm ? Number(measurementForm.thigh_right_cm) : null,
        hip_cm: measurementForm.hip_cm ? Number(measurementForm.hip_cm) : null,
        neck_cm: measurementForm.neck_cm ? Number(measurementForm.neck_cm) : null,
        notes: measurementForm.notes || null
      };

      const res = await apiFetch('/api/body/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar medidas');
      }

      setMeasurementForm({
        date: getLocalDateString(),
        waist_cm: '',
        chest_cm: '',
        arm_left_cm: '',
        arm_right_cm: '',
        thigh_left_cm: '',
        thigh_right_cm: '',
        hip_cm: '',
        neck_cm: '',
        notes: ''
      });
      setShowMeasurementForm(false);
      fetchTabData();
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title) {
      setError('El título del objetivo es obligatorio.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        user_id: user.id,
        goal_type: goalForm.goal_type,
        title: goalForm.title.trim(),
        description: goalForm.description.trim() || null,
        start_date: goalForm.start_date,
        target_date: goalForm.target_date || null,
        is_active: true
      };

      const res = await apiFetch('/api/body/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar objetivo');
      }

      setGoalForm({
        goal_type: 'muscle_gain',
        title: '',
        description: '',
        start_date: getLocalDateString(),
        target_date: ''
      });
      setShowGoalForm(false);
      fetchTabData();
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete methods
  const handleDeleteMetric = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de peso?')) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/body-metrics/${id}?user_id=${user.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar registro');
      fetchTabData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar.');
    }
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de medidas?')) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/body/measurements/${id}?user_id=${user.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar medidas');
      fetchTabData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este objetivo?')) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/body/goals/${id}?user_id=${user.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar objetivo');
      fetchTabData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar.');
    }
  };

  // Extract latest items safely
  const latestMetric = metrics[0] || null;
  const latestMeasurement = measurements[0] || null;

  return (
    <div className="space-y-6">
      {/* Visual Navigation Sub-Tabs */}
      <div className="flex border-b border-neutral-900 pb-px">
        {(['datos', 'medidas', 'fotos', 'objetivos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-extrabold border-b-2 transition-all capitalize ${
              activeTab === tab
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab === 'datos' ? 'Composición' : tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-950/45 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs animate-shake">
          <AlertCircle className="shrink-0 mt-0.5 text-red-400" size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: DATOS (COMPOSICIÓN CORPORAL) */}
      {activeTab === 'datos' && (
        <div className="space-y-6">
          {/* Dashboard Summary Metrics Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Peso Corporal</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{latestMetric?.weight_kg ?? '—'}</span>
                {latestMetric?.weight_kg && <span className="text-[10px] font-bold text-neutral-400">kg</span>}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Grasa Corporal</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{latestMetric?.body_fat_pct ?? '—'}</span>
                {latestMetric?.body_fat_pct && <span className="text-[10px] font-bold text-neutral-400">%</span>}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Masa Muscular</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{latestMetric?.muscle_mass_kg ?? '—'}</span>
                {latestMetric?.muscle_mass_kg && <span className="text-[10px] font-bold text-neutral-400">kg</span>}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Agua Corporal</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{latestMetric?.water_pct ?? '—'}</span>
                {latestMetric?.water_pct && <span className="text-[10px] font-bold text-neutral-400">%</span>}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Grasa Visceral</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{latestMetric?.visceral_fat ?? '—'}</span>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Metabolismo Basal</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{latestMetric?.basal_metabolic_rate_kcal ?? '—'}</span>
                {latestMetric?.basal_metabolic_rate_kcal && <span className="text-[10px] font-bold text-neutral-400">kcal</span>}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between col-span-2">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Masa Ósea</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{latestMetric?.bone_mass_kg ?? '—'}</span>
                {latestMetric?.bone_mass_kg && <span className="text-[10px] font-bold text-neutral-400">kg</span>}
              </div>
            </div>
          </div>

          {/* Quick Action Trigger */}
          <button
            onClick={() => setShowMetricForm(!showMetricForm)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-lime-400 hover:bg-lime-500 text-black font-extrabold rounded-xl text-xs transition-colors shadow-md"
          >
            <Plus size={16} />
            Registrar medición corporal
          </button>

          {/* Collapsible Form */}
          {showMetricForm && (
            <form onSubmit={handleMetricSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 animate-slideDown">
              <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
                <Scale size={14} /> Nueva Medición Corporal
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha</label>
                  <input
                    type="date"
                    value={metricForm.date}
                    onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Peso (kg) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="72.5"
                      value={metricForm.weight_kg}
                      onChange={(e) => setMetricForm({ ...metricForm, weight_kg: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">% Grasa</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="14.5"
                      value={metricForm.body_fat_pct}
                      onChange={(e) => setMetricForm({ ...metricForm, body_fat_pct: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Muscular (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="59.2"
                      value={metricForm.muscle_mass_kg}
                      onChange={(e) => setMetricForm({ ...metricForm, muscle_mass_kg: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Agua %</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="58.2"
                      value={metricForm.water_pct}
                      onChange={(e) => setMetricForm({ ...metricForm, water_pct: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Grasa Visceral</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="4"
                      value={metricForm.visceral_fat}
                      onChange={(e) => setMetricForm({ ...metricForm, visceral_fat: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Basal (kcal)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="1750"
                      value={metricForm.basal_metabolic_rate_kcal}
                      onChange={(e) => setMetricForm({ ...metricForm, basal_metabolic_rate_kcal: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Masa Ósea (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="3.25"
                      value={metricForm.bone_mass_kg}
                      onChange={(e) => setMetricForm({ ...metricForm, bone_mass_kg: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Notas</label>
                  <textarea
                    rows={2}
                    placeholder="En ayunas, báscula de bioimpedancia..."
                    value={metricForm.notes}
                    onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowMetricForm(false)}
                  className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 font-bold rounded-lg text-xs transition-colors border border-neutral-850"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-lime-400 hover:bg-lime-50 text-black font-extrabold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader className="animate-spin text-black" size={14} /> : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          {/* SVG Line Charts */}
          {metrics.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block">Gráficas de Evolución</h3>
              <div className="grid grid-cols-1 gap-4">
                <SVGLineChart data={metrics} dataKey="weight_kg" label="Evolución Peso" unit=" kg" color="#a3e635" />
                {metrics.some(m => m.body_fat_pct) && (
                  <SVGLineChart data={metrics} dataKey="body_fat_pct" label="Grasa Corporal" unit="%" color="#f59e0b" />
                )}
                {metrics.some(m => m.muscle_mass_kg) && (
                  <SVGLineChart data={metrics} dataKey="muscle_mass_kg" label="Masa Muscular" unit=" kg" color="#3b82f6" />
                )}
              </div>
            </div>
          )}

          {/* History Metrics List */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block">Histórico de Mediciones</h3>
            {loading ? (
              <div className="py-6 flex justify-center text-lime-400">
                <Loader className="animate-spin" size={20} />
              </div>
            ) : metrics.length > 0 ? (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {metrics.map((metric) => {
                  const isExpanded = expandedMetricId === metric.id;
                  return (
                    <div 
                      key={metric.id} 
                      className="bg-neutral-900/60 border border-neutral-800/60 rounded-xl overflow-hidden transition-all duration-200"
                    >
                      <div 
                        onClick={() => setExpandedMetricId(isExpanded ? null : metric.id)}
                        className="p-3.5 flex justify-between items-center cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-neutral-500" />
                          <span className="text-xs font-mono font-bold text-neutral-300">
                            {formatLocalDate(metric.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-white">{metric.weight_kg} kg</span>
                          {isExpanded ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3.5 pb-4 pt-1.5 border-t border-neutral-850/50 space-y-3.5 bg-neutral-950/20">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Grasa Corporal:</span>
                              <span className="font-extrabold text-white">{metric.body_fat_pct ? `${metric.body_fat_pct}%` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Muscular:</span>
                              <span className="font-extrabold text-white">{metric.muscle_mass_kg ? `${metric.muscle_mass_kg} kg` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Agua:</span>
                              <span className="font-extrabold text-white">{metric.water_pct ? `${metric.water_pct}%` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Grasa Visceral:</span>
                              <span className="font-extrabold text-white">{metric.visceral_fat ?? '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Metabolismo:</span>
                              <span className="font-extrabold text-white">{metric.basal_metabolic_rate_kcal ? `${metric.basal_metabolic_rate_kcal} kcal` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Masa Ósea:</span>
                              <span className="font-extrabold text-white">{metric.bone_mass_kg ? `${metric.bone_mass_kg} kg` : '—'}</span>
                            </div>
                          </div>

                          {metric.notes && (
                            <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-850 text-[10px] text-neutral-400 leading-relaxed italic">
                              {metric.notes}
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMetric(metric.id);
                              }}
                              className="text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-1 py-1 px-2.5 rounded bg-red-950/10 border border-red-950/20"
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-6">No hay registros de composición corporal en tu historial.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MEDIDAS (MEDIDAS CORPORALES) */}
      {activeTab === 'medidas' && (
        <div className="space-y-6">
          {/* Latest Measurement Display */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 space-y-3.5">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800/60">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5"><Ruler size={14} className="text-lime-400" /> Últimas Medidas Corporales</span>
              {latestMeasurement && (
                <span className="text-[10px] font-mono text-neutral-500">
                  {formatLocalDate(latestMeasurement.date, { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-neutral-950/40 p-2.5 rounded-lg flex justify-between items-center border border-neutral-850/20">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Cintura</span>
                <span className="text-sm font-extrabold text-white">{latestMeasurement?.waist_cm ? `${latestMeasurement.waist_cm} cm` : '—'}</span>
              </div>
              <div className="bg-neutral-950/40 p-2.5 rounded-lg flex justify-between items-center border border-neutral-850/20">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Pecho</span>
                <span className="text-sm font-extrabold text-white">{latestMeasurement?.chest_cm ? `${latestMeasurement.chest_cm} cm` : '—'}</span>
              </div>
              <div className="bg-neutral-950/40 p-2.5 rounded-lg flex justify-between items-center border border-neutral-850/20">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Brazo Izq</span>
                <span className="text-sm font-extrabold text-white">{latestMeasurement?.arm_left_cm ? `${latestMeasurement.arm_left_cm} cm` : '—'}</span>
              </div>
              <div className="bg-neutral-950/40 p-2.5 rounded-lg flex justify-between items-center border border-neutral-850/20">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Brazo Der</span>
                <span className="text-sm font-extrabold text-white">{latestMeasurement?.arm_right_cm ? `${latestMeasurement.arm_right_cm} cm` : '—'}</span>
              </div>
              <div className="bg-neutral-950/40 p-2.5 rounded-lg flex justify-between items-center border border-neutral-850/20">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Muslo Izq</span>
                <span className="text-sm font-extrabold text-white">{latestMeasurement?.thigh_left_cm ? `${latestMeasurement.thigh_left_cm} cm` : '—'}</span>
              </div>
              <div className="bg-neutral-950/40 p-2.5 rounded-lg flex justify-between items-center border border-neutral-850/20">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Muslo Der</span>
                <span className="text-sm font-extrabold text-white">{latestMeasurement?.thigh_right_cm ? `${latestMeasurement.thigh_right_cm} cm` : '—'}</span>
              </div>
              <div className="bg-neutral-950/40 p-2.5 rounded-lg flex justify-between items-center border border-neutral-850/20">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Cadera</span>
                <span className="text-sm font-extrabold text-white">{latestMeasurement?.hip_cm ? `${latestMeasurement.hip_cm} cm` : '—'}</span>
              </div>
              <div className="bg-neutral-950/40 p-2.5 rounded-lg flex justify-between items-center border border-neutral-850/20">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Cuello</span>
                <span className="text-sm font-extrabold text-white">{latestMeasurement?.neck_cm ? `${latestMeasurement.neck_cm} cm` : '—'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowMeasurementForm(!showMeasurementForm)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-lime-400 hover:bg-lime-500 text-black font-extrabold rounded-xl text-xs transition-colors shadow-md"
          >
            <Plus size={16} />
            Registrar medidas corporales
          </button>

          {/* Collapsible Form */}
          {showMeasurementForm && (
            <form onSubmit={handleMeasurementSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 animate-slideDown">
              <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler size={14} /> Nuevas Medidas Corporales
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha</label>
                  <input
                    type="date"
                    value={measurementForm.date}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, date: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Cintura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="82.5"
                      value={measurementForm.waist_cm}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, waist_cm: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Pecho (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="101.2"
                      value={measurementForm.chest_cm}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, chest_cm: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Brazo Izquierdo (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="38.0"
                      value={measurementForm.arm_left_cm}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, arm_left_cm: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Brazo Derecho (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="38.2"
                      value={measurementForm.arm_right_cm}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, arm_right_cm: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Muslo Izquierdo (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="56.0"
                      value={measurementForm.thigh_left_cm}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, thigh_left_cm: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Muslo Derecho (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="56.3"
                      value={measurementForm.thigh_right_cm}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, thigh_right_cm: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Cadera (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="95.5"
                      value={measurementForm.hip_cm}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, hip_cm: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Cuello (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="37.5"
                      value={measurementForm.neck_cm}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, neck_cm: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Notas</label>
                  <textarea
                    rows={2}
                    placeholder="Registrado por la tarde, frío..."
                    value={measurementForm.notes}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowMeasurementForm(false)}
                  className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 font-bold rounded-lg text-xs transition-colors border border-neutral-850"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-lime-400 hover:bg-lime-50 text-black font-extrabold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader className="animate-spin text-black" size={14} /> : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          {/* Measurements SVG Evolution Chart */}
          {measurements.length > 1 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest">Gráfica de Medidas</h3>
                <select
                  value={selectedChartMeasurement}
                  onChange={(e) => setSelectedChartMeasurement(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 text-[10px] text-white font-bold rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="waist_cm">Cintura</option>
                  <option value="chest_cm">Pecho</option>
                  <option value="arm_left_cm">Brazo Izq</option>
                  <option value="arm_right_cm">Brazo Der</option>
                  <option value="thigh_left_cm">Muslo Izq</option>
                  <option value="thigh_right_cm">Muslo Der</option>
                  <option value="hip_cm">Cadera</option>
                  <option value="neck_cm">Cuello</option>
                </select>
              </div>
              <SVGLineChart 
                data={measurements} 
                dataKey={selectedChartMeasurement} 
                label={`Evolución ${selectedChartMeasurement.replace('_cm', '').replace('_', ' ')}`} 
                unit=" cm" 
                color="#a3e635" 
              />
            </div>
          )}

          {/* History Measurements List */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block">Histórico de Medidas</h3>
            {loading ? (
              <div className="py-6 flex justify-center text-lime-400">
                <Loader className="animate-spin" size={20} />
              </div>
            ) : measurements.length > 0 ? (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {measurements.map((m) => {
                  const isExpanded = expandedMeasurementId === m.id;
                  const metricsFilledCount = [
                    m.waist_cm, m.chest_cm, m.arm_left_cm, m.arm_right_cm,
                    m.thigh_left_cm, m.thigh_right_cm, m.hip_cm, m.neck_cm
                  ].filter(v => v !== null && v !== undefined).length;

                  return (
                    <div 
                      key={m.id} 
                      className="bg-neutral-900/60 border border-neutral-800/60 rounded-xl overflow-hidden transition-all duration-200"
                    >
                      <div 
                        onClick={() => setExpandedMeasurementId(isExpanded ? null : m.id)}
                        className="p-3.5 flex justify-between items-center cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-neutral-500" />
                          <span className="text-xs font-mono font-bold text-neutral-300">
                            {formatLocalDate(m.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-lime-400">{metricsFilledCount} {metricsFilledCount === 1 ? 'medida' : 'medidas'}</span>
                          {isExpanded ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3.5 pb-4 pt-1.5 border-t border-neutral-850/50 space-y-3.5 bg-neutral-950/20">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Cintura:</span>
                              <span className="font-extrabold text-white">{m.waist_cm ? `${m.waist_cm} cm` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Pecho:</span>
                              <span className="font-extrabold text-white">{m.chest_cm ? `${m.chest_cm} cm` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Brazo Izq:</span>
                              <span className="font-extrabold text-white">{m.arm_left_cm ? `${m.arm_left_cm} cm` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Brazo Der:</span>
                              <span className="font-extrabold text-white">{m.arm_right_cm ? `${m.arm_right_cm} cm` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Muslo Izq:</span>
                              <span className="font-extrabold text-white">{m.thigh_left_cm ? `${m.thigh_left_cm} cm` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Muslo Der:</span>
                              <span className="font-extrabold text-white">{m.thigh_right_cm ? `${m.thigh_right_cm} cm` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Cadera:</span>
                              <span className="font-extrabold text-white">{m.hip_cm ? `${m.hip_cm} cm` : '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-850/30 pb-1 text-neutral-400">
                              <span>Cuello:</span>
                              <span className="font-extrabold text-white">{m.neck_cm ? `${m.neck_cm} cm` : '—'}</span>
                            </div>
                          </div>

                          {m.notes && (
                            <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-850 text-[10px] text-neutral-400 leading-relaxed italic">
                              {m.notes}
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeasurement(m.id);
                              }}
                              className="text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-1 py-1 px-2.5 rounded bg-red-950/10 border border-red-950/20"
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-6">No hay registros de medidas en tu historial.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FOTOS */}
      {activeTab === 'fotos' && (
        <BodyPhotosSection user={user} />
      )}

      {/* TAB 4: OBJETIVOS */}
      {activeTab === 'objetivos' && (
        <div className="space-y-6">
          {/* Active Goals list */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block">Objetivos Activos</h3>
            
            {loading ? (
              <div className="py-6 flex justify-center text-lime-400">
                <Loader className="animate-spin" size={20} />
              </div>
            ) : goals.filter(g => g.is_active).length > 0 ? (
              <div className="space-y-3.5">
                {goals.filter(g => g.is_active).map((goal) => {
                  const now = new Date().getTime();
                  const start = new Date(goal.start_date).getTime();
                  const target = goal.target_date ? new Date(goal.target_date).getTime() : null;
                  let percentage = 0;
                  
                  if (target && target > start) {
                    percentage = Math.min(100, Math.max(0, ((now - start) / (target - start)) * 100));
                  }

                  return (
                    <div key={goal.id} className="bg-neutral-900 border border-neutral-850 rounded-2xl p-4.5 space-y-3 shadow-lg relative group">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase bg-lime-400 text-black tracking-wider">
                            {GOAL_TYPE_LABELS[goal.goal_type] || goal.goal_type}
                          </span>
                          <h4 className="text-sm font-extrabold text-white mt-1.5">{goal.title}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-neutral-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {goal.description && (
                        <p className="text-xs text-neutral-400 leading-relaxed font-medium">{goal.description}</p>
                      )}

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] font-semibold text-neutral-400">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {goal.start_date}</span>
                          {goal.target_date && <span className="flex items-center gap-1"><Target size={12} /> {goal.target_date}</span>}
                        </div>
                        
                        {/* Time period visual bar */}
                        {target && (
                          <div className="relative pt-1.5">
                            <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-850">
                              <div 
                                className="bg-gradient-to-r from-emerald-500 to-lime-400 h-full rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] text-neutral-500 mt-1 font-mono">
                              <span>Progreso del periodo:</span>
                              <span>{percentage.toFixed(0)}% de días transcurridos</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 border border-dashed border-neutral-800 rounded-2xl text-center space-y-2">
                <p className="text-xs text-neutral-500">No tienes ningún objetivo fijado actualmente.</p>
              </div>
            )}
          </div>

          {/* "+ Nuevo" Trigger Button */}
          <button
            onClick={() => setShowGoalForm(!showGoalForm)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-lime-400 hover:bg-lime-500 text-black font-extrabold rounded-xl text-xs transition-colors shadow-md"
          >
            <Plus size={16} />
            Fijar nuevo objetivo
          </button>

          {/* Goal registration Form */}
          {showGoalForm && (
            <form onSubmit={handleGoalSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 animate-slideDown">
              <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target size={14} /> Fijar Objetivo Atleta
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tipo de Objetivo</label>
                  <select
                    value={goalForm.goal_type}
                    onChange={(e) => setGoalForm({ ...goalForm, goal_type: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2.5 px-3 text-xs text-white font-bold focus:outline-none"
                    style={{ minHeight: '38px' }}
                  >
                    <option value="muscle_gain">Ganancia muscular</option>
                    <option value="strength">Fuerza</option>
                    <option value="fat_loss">Pérdida de grasa</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Título del Objetivo *</label>
                  <input
                    type="text"
                    placeholder="Ej. Bajar a 12% grasa o alcanzar 80kg prensa"
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Descripción / Detalles</label>
                  <textarea
                    rows={2.5}
                    placeholder="Notas específicas, estrategias de déficit o ganancia..."
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha Inicio</label>
                    <input
                      type="date"
                      value={goalForm.start_date}
                      onChange={(e) => setGoalForm({ ...goalForm, start_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha Límite</label>
                    <input
                      type="date"
                      value={goalForm.target_date}
                      onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 font-bold rounded-lg text-xs transition-colors border border-neutral-850"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-lime-400 hover:bg-lime-50 text-black font-extrabold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader className="animate-spin text-black" size={14} /> : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          {/* Inactive Goals / Historical list */}
          {goals.filter(g => !g.is_active).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block">Historial de Objetivos</h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {goals.filter(g => !g.is_active).map((goal) => (
                  <div key={goal.id} className="bg-neutral-900/40 p-3.5 border border-neutral-850 rounded-xl flex justify-between items-center opacity-70">
                    <div>
                      <span className="text-[8px] font-extrabold text-neutral-400 uppercase bg-neutral-800 px-1.5 py-0.5 rounded tracking-wider">
                        {GOAL_TYPE_LABELS[goal.goal_type] || goal.goal_type}
                      </span>
                      <h5 className="text-xs font-bold text-neutral-300 mt-1">{goal.title}</h5>
                      <span className="text-[9px] text-neutral-500 mt-1 block">Finalizó el: {goal.target_date || 'Sin fecha'}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-neutral-500 hover:text-red-400 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
