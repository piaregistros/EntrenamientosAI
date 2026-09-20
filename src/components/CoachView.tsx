import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { Bot, Send } from 'lucide-react';

export default function CoachView({ user }: { user: any }) {
  const [input, setInput] = useState('');
  const [cid, setCid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([
    { role: 'assistant', text: 'Pregunta con datos reales. Ej: ¿Puedo hacer B hoy? ¿Hay solapamiento?' },
  ]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setError('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    try {
      const res = await apiFetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_id: cid, mode: 'coach' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || 'El Coach no respondió');
        setBusy(false);
        return;
      }
      setCid(data.conversation_id);
      setMsgs((m) => [...m, { role: 'assistant', text: data.answer }]);
    } catch {
      setError('No hay conexión con el Coach');
    }
    setBusy(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28 text-neutral-100 flex flex-col min-h-screen">
      <p className="text-lime-400 text-xs uppercase tracking-[0.2em] font-semibold">Coach</p>
      <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
        <Bot size={22} className="text-lime-400" /> Qwen
      </h1>
      <p className="text-neutral-500 text-xs mt-1">Hechos de tu diario. No inventa entrenos.</p>

      <div className="flex-1 mt-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-2xl p-3 text-sm whitespace-pre-wrap ${
            m.role === 'user' ? 'bg-lime-400/15 ml-8' : 'bg-neutral-900 mr-4 border border-neutral-800'
          }`}>{m.text}</div>
        ))}
        {busy && <p className="text-neutral-500 text-xs">Pensando…</p>}
        {error && <p className="text-red-300 text-sm">{error}</p>}
      </div>

      <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe al Coach"
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-3 text-sm"
        />
        <button onClick={send} disabled={busy} className="bg-lime-400 text-neutral-950 rounded-xl px-3">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
