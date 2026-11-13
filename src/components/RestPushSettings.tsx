import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader } from 'lucide-react';
import {
  disablePush,
  enablePush,
  getCurrentSubscription,
  isPushPrefOn,
  isPushSupported,
  testPush,
} from '../lib/push';

export default function RestPushSettings() {
  const supported = isPushSupported();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      if (!supported) return;
      const sub = await getCurrentSubscription();
      if (!mounted) return;
      setEnabled(!!sub && isPushPrefOn());
    };
    sync();
    return () => {
      mounted = false;
    };
  }, [supported]);

  const onToggle = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        setMessage('Avisos desactivados.');
      } else {
        await enablePush();
        setEnabled(true);
        setMessage('Avisos activados. Prueba uno con la pantalla apagada.');
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo cambiar la preferencia.');
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    setError(null);
    setMessage(null);
    setTesting(true);
    try {
      await testPush(5);
      setMessage('El aviso llegará en 5 segundos. Puedes apagar la pantalla para comprobarlo.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el aviso de prueba.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-3">
      <div className="flex items-center gap-2">
        {enabled ? <Bell size={16} className="text-lime-400" /> : <BellOff size={16} className="text-neutral-500" />}
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
          Avisos de descanso con pantalla apagada
        </h3>
      </div>
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Te avisa con una notificación cuando termina el descanso, aunque la pantalla esté apagada o
        la app cerrada. En Android, instala la app en la pantalla de inicio (menú de Chrome →
        «Añadir a la pantalla de inicio») y, si no llega el aviso, revisa que Chrome no esté en el
        ahorro de batería.
      </p>
      {!supported ? (
        <p className="text-xs text-amber-400">Este navegador no admite avisos push.</p>
      ) : (
        <>
          <button
            type="button"
            id="btn-push-rest-toggle"
            onClick={onToggle}
            disabled={busy}
            className={`w-full rounded-xl border py-3 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
              enabled
                ? 'border-lime-400 bg-lime-400/10 text-lime-400'
                : 'border-neutral-800 text-neutral-300'
            }`}
            style={{ minHeight: '44px' }}
          >
            {busy ? <Loader className="animate-spin" size={14} /> : enabled ? 'Avisos activados' : 'Activar avisos'}
          </button>
          {enabled && (
            <button
              type="button"
              id="btn-push-rest-test"
              onClick={onTest}
              disabled={testing || busy}
              className="w-full rounded-xl border border-neutral-800 py-3 text-xs font-bold text-neutral-300 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              {testing ? <Loader className="animate-spin" size={14} /> : 'Probar aviso'}
            </button>
          )}
        </>
      )}
      {message && <p className="text-xs text-lime-400">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
