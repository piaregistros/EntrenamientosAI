import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, readTheme, type ThemeName } from '../lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(() => readTheme());

  const set = (next: ThemeName) => {
    applyTheme(next);
    setTheme(next);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-3">
      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Apariencia</h3>
      <p className="text-[11px] text-neutral-500">Cambia Inicio, dieta, historial, entreno y el resto.</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => set('light')}
          className={`rounded-xl border py-3 text-xs font-bold flex items-center justify-center gap-2 ${
            theme === 'light'
              ? 'border-lime-400 bg-lime-400/10 text-lime-500'
              : 'border-neutral-800 text-neutral-400'
          }`}
        >
          <Sun size={16} /> Día
        </button>
        <button
          type="button"
          onClick={() => set('dark')}
          className={`rounded-xl border py-3 text-xs font-bold flex items-center justify-center gap-2 ${
            theme === 'dark'
              ? 'border-lime-400 bg-lime-400/10 text-lime-400'
              : 'border-neutral-800 text-neutral-400'
          }`}
        >
          <Moon size={16} /> Noche
        </button>
      </div>
    </div>
  );
}
