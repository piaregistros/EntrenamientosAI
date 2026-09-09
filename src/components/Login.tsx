import React, { useState } from 'react';
import { Dumbbell, Lock, Mail, AlertCircle, Loader } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../lib/api';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrName.trim() || !password.trim()) {
      setError('Por favor, rellena todos los campos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isEmail = emailOrName.includes('@');
      const body: any = { password };
      if (isEmail) {
        body.email = emailOrName.trim();
      } else {
        body.name = emailOrName.trim();
      }

      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales incorrectas');
      }

      // Save user profile state
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAccess = async (userType: 'pablo' | 'estefi') => {
    setLoading(true);
    setError(null);
    const credentials = {
      pablo: { name: 'Pablo', password: 'pablo123' },
      estefi: { name: 'Estefi', password: 'estefi123' }
    }[userType];

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Acceso rápido fallido');
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión rápida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex flex-col justify-center items-center bg-neutral-950 px-6 py-12 relative overflow-hidden select-none">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="inline-flex p-4 rounded-3xl bg-neutral-900 border border-neutral-800 text-lime-400 mb-4 shadow-xl"
          >
            <Dumbbell size={36} className="animate-pulse" />
          </motion.div>
          <motion.h1 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-4xl font-extrabold tracking-tight text-white"
          >
            ENTRENAMIENTO
          </motion.h1>
          <motion.p 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-neutral-400 mt-2 text-sm"
          >
            Aplicación privada · Fuerza & Hipertrofia
          </motion.p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-neutral-900/80 backdrop-blur-md rounded-2xl border border-neutral-800 p-6 shadow-2xl space-y-6"
        >
          {/* Demo Info Banner */}
          <div className="bg-lime-950/20 border border-lime-800/40 rounded-xl p-3.5 text-xs text-neutral-300 leading-relaxed space-y-1">
            <div className="font-extrabold text-lime-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <span>💡 Modo Demostración</span>
            </div>
            <p>La aplicación utiliza una base de datos local preinstalada con rutinas, estadísticas e historial.</p>
            <p className="text-neutral-400 mt-1">Usa los botones de acceso rápido o pulsa <strong>Entrar como Invitado</strong> abajo para navegar.</p>
          </div>

          {error && (
            <div id="login-error" className="flex items-start gap-3 bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs animate-shake">
              <AlertCircle className="shrink-0 mt-0.5" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Usuario o Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
                  <Mail size={16} />
                </span>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Pablo o estefi@example.com"
                  value={emailOrName}
                  onChange={(e) => setEmailOrName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-lime-500/80 focus:ring-1 focus:ring-lime-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-lime-500/80 focus:ring-1 focus:ring-lime-500/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3 pt-2">
              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="col-span-2 bg-neutral-800 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all hover:bg-neutral-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ minHeight: '44px' }}
              >
                {loading ? (
                  <Loader className="animate-spin" size={16} />
                ) : (
                  <span>Entrar</span>
                )}
              </button>

              <button
                id="login-guest-btn"
                type="button"
                onClick={() => handleQuickAccess('pablo')}
                disabled={loading}
                className="col-span-3 bg-gradient-to-r from-lime-400 to-emerald-500 text-black font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-lime-500/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ minHeight: '44px' }}
              >
                {loading ? (
                  <Loader className="animate-spin" size={16} />
                ) : (
                  <span>Entrar como Invitado</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Access Area */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-neutral-800"></div>
            <span className="flex-shrink mx-4 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Perfiles de Prueba</span>
            <div className="flex-grow border-t border-neutral-800"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="quick-login-pablo"
              type="button"
              onClick={() => handleQuickAccess('pablo')}
              disabled={loading}
              className="flex flex-col items-center justify-center py-3 px-4 bg-neutral-950/40 border border-neutral-800 hover:border-lime-500/40 rounded-xl text-neutral-300 font-bold transition-all hover:bg-neutral-900 active:scale-95 group text-xs"
              style={{ minHeight: '44px' }}
            >
              <span className="text-lime-400 group-hover:scale-110 transition-transform">Pablo</span>
              <span className="text-[10px] text-neutral-500 font-normal mt-1">Administrador</span>
            </button>
            <button
              id="quick-login-estefi"
              type="button"
              onClick={() => handleQuickAccess('estefi')}
              disabled={loading}
              className="flex flex-col items-center justify-center py-3 px-4 bg-neutral-950/40 border border-neutral-800 hover:border-lime-500/40 rounded-xl text-neutral-300 font-bold transition-all hover:bg-neutral-900 active:scale-95 group text-xs"
              style={{ minHeight: '44px' }}
            >
              <span className="text-lime-400 group-hover:scale-110 transition-transform">Estefi</span>
              <span className="text-[10px] text-neutral-500 font-normal mt-1">Usuario</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
