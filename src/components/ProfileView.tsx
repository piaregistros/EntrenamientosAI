import React, { useState, useEffect } from 'react';
import { User, Lock, Trash2, KeyRound, Loader, AlertCircle, CheckCircle2, LogOut, Scale, Plus } from 'lucide-react';
import { BodyMetric } from '../types';
import { apiFetch } from '../lib/api';

interface ProfileViewProps {
  user: any;
  onLogout: () => void;
}

export default function ProfileView({ user, onLogout }: ProfileViewProps) {
  // Passwords
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Metrics list
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);

  // Loading / State
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [submittingWeight, setSubmittingWeight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [user.id]);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await apiFetch(`/api/body-metrics?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || []);
      }
    } catch (e) {
      console.error('Error fetching metrics', e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      setError('Introduce un peso válido.');
      return;
    }

    setSubmittingWeight(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch('/api/body-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          weight_kg: weight,
          date: dateInput,
          notes: 'Registrado desde perfil'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar el peso.');

      setSuccess('¡Métrica de peso guardada con éxito!');
      setWeightInput('');
      setMetrics([data, ...metrics]);
    } catch (err: any) {
      setError(err.message || 'Error al guardar métrica.');
    } finally {
      setSubmittingWeight(false);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta métrica de peso?')) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch(`/api/body-metrics/${metricId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar la métrica');
      }

      setSuccess('Métrica eliminada.');
      setMetrics(prev => prev.filter(m => m.id !== metricId));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Por favor, rellena todos los campos de contraseña.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    setSubmittingPassword(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar la contraseña');

      setSuccess('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar contraseña.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      onLogout();
    }
  };

  return (
    <div id="profile-panel-container" className="min-h-screen bg-neutral-950 text-neutral-100 pb-24 px-4 pt-6 max-w-md mx-auto select-none space-y-6">
      
      {/* Header Profile Title */}
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Ajustes</span>
          <h2 id="profile-header-title" className="text-2xl font-black text-white mt-1">Tu Perfil</h2>
        </div>
        <button
          id="btn-logout"
          onClick={handleLogoutClick}
          className="bg-red-550/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95"
          style={{ minHeight: '38px' }}
        >
          <LogOut size={14} />
          <span>Salir</span>
        </button>
      </div>

      {error && (
        <div id="profile-error" className="bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs flex gap-3">
          <AlertCircle className="shrink-0 mt-0.5 text-red-400" size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="profile-success" className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 p-4 rounded-xl text-xs flex gap-3">
          <CheckCircle2 size={16} className="text-lime-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* User Information Display */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
        <div className="w-14 h-14 bg-lime-500/10 border border-lime-500/20 text-lime-400 rounded-full flex items-center justify-center font-black text-xl shadow-inner">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 id="profile-user-name" className="text-lg font-black text-white leading-tight">{user.name}</h3>
          <p className="text-xs text-neutral-400 mt-1">{user.email || 'Sin correo asociado'}</p>
          <span className="text-[9px] bg-neutral-950 border border-neutral-850 px-2 py-0.5 rounded text-neutral-500 font-bold uppercase mt-1.5 inline-block">
            {user.role}
          </span>
        </div>
      </div>

      {/* Weight History Logging Area */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-lime-400" />
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Control de Peso Corporal</h3>
        </div>

        <form onSubmit={handleLogWeight} className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Peso (kg)</label>
            <input
              id="profile-weight-input"
              type="number"
              step="0.1"
              placeholder="Ej: 71.8"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-700 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Fecha</label>
            <input
              id="profile-weight-date"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
              style={{ minHeight: '34px' }}
            />
          </div>
          <button
            id="profile-weight-submit"
            type="submit"
            disabled={submittingWeight}
            className="col-span-2 bg-neutral-950 border border-neutral-800 hover:border-lime-500 hover:text-lime-400 text-neutral-300 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 mt-1.5"
            style={{ minHeight: '38px' }}
          >
            {submittingWeight ? (
              <Loader className="animate-spin" size={14} />
            ) : (
              <>
                <Plus size={14} />
                <span>Registrar Entrada</span>
              </>
            )}
          </button>
        </form>

        <div className="space-y-2 pt-2 border-t border-neutral-800/60">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block">Registro Histórico</span>
          {loadingMetrics ? (
            <div className="py-4 flex justify-center text-lime-400">
              <Loader className="animate-spin" size={16} />
            </div>
          ) : metrics.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {metrics.map((m) => (
                <div key={m.id} className="bg-neutral-950/50 p-2.5 rounded-xl border border-neutral-850 flex justify-between items-center text-xs">
                  <span className="font-mono text-neutral-400">
                    {new Date(m.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-white">{m.weight_kg} kg</span>
                    <button
                      id={`btn-delete-weight-${m.id}`}
                      onClick={() => handleDeleteMetric(m.id)}
                      className="text-neutral-600 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-neutral-600 text-center py-2">No has registrado tu peso corporal todavía.</p>
          )}
        </div>
      </div>

      {/* Change Password Panel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-lime-400" />
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Cambiar Contraseña</h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Contraseña Actual</label>
            <input
              id="change-pass-current"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-lime-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Nueva Contraseña</label>
            <input
              id="change-pass-new"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-lime-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Confirmar Contraseña</label>
            <input
              id="change-pass-confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-lime-500"
            />
          </div>
          <button
            id="change-pass-submit"
            type="submit"
            disabled={submittingPassword}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-lime-400 font-extrabold py-3 rounded-xl text-xs border border-neutral-700/50 transition-all flex items-center justify-center gap-1.5"
            style={{ minHeight: '44px' }}
          >
            {submittingPassword ? (
              <Loader className="animate-spin" size={14} />
            ) : (
              <span>Actualizar Contraseña</span>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
