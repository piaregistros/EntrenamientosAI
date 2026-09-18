import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Brain, ChevronRight, Clock3, Dumbbell, MessageSquare, Plus, Send, Sparkles, Trash2, X } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Message { id?: string; role: 'user' | 'assistant'; content: string; created_at?: string; }
interface Conversation { id: string; title: string; mode: string; created_at: string; updated_at: string; }
interface Memory { id: string; content: string; }

type Mode = 'coach' | 'plan' | 'nutrition' | 'recovery';

const modes: { id: Mode; label: string; description: string }[] = [
  { id: 'coach', label: 'Coach', description: 'Qué hacer hoy' },
  { id: 'plan', label: 'Plan', description: 'Rutina y progresión' },
  { id: 'nutrition', label: 'Nutrición', description: 'Hábitos y alimentación' },
  { id: 'recovery', label: 'Recuperación', description: 'Fatiga y descanso' },
];

const starters = [
  '¿Qué debería hacer hoy según mi entrenamiento reciente?',
  'Analiza mi progreso y dime qué cambiarías.',
  'Quiero mejorar mi fuerza sin aumentar demasiado el volumen.',
  '¿Cómo puedo recuperar mejor esta semana?',
];

export default function CoachView({ user }: { user: any }) {
  const [mode, setMode] = useState<Mode>('coach');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationIds, setConversationIds] = useState<Record<Mode, string | null>>({
    coach: null, plan: null, nutrition: null, recovery: null,
  });
  const [messagesByMode, setMessagesByMode] = useState<Record<Mode, Message[]>>({
    coach: [], plan: [], nutrition: [], recovery: [],
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const conversationId = conversationIds[mode];
  const messages = messagesByMode[mode] || [];
  const currentConversation = useMemo(
    () => conversations.find(c => c.id === conversationId),
    [conversations, conversationId]
  );

  useEffect(() => { loadConversations(); loadMemories(); }, []);
  useEffect(() => {
    const id = window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 20);
    return () => window.clearTimeout(id);
  }, [messages, loading]);

  async function loadConversations() {
    setLoadingHistory(true);
    try {
      const res = await apiFetch('/api/coach/conversations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo cargar el historial');
      setConversations(data.conversations || []);
    } catch (e: any) { setError(e.message); } finally { setLoadingHistory(false); }
  }

  async function loadMemories() {
    try {
      const res = await apiFetch('/api/coach/memories');
      if (res.ok) setMemories((await res.json()).memories || []);
    } catch { /* panel opcional */ }
  }

  async function openConversation(id: string) {
    setError(null);
    try {
      const res = await apiFetch(`/api/coach/conversations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo abrir');
      const openedMode = (data.conversation?.mode || 'coach') as Mode;
      setConversationIds(prev => ({ ...prev, [openedMode]: id }));
      setMessagesByMode(prev => ({ ...prev, [openedMode]: data.messages || [] }));
      setMode(openedMode);
      setShowHistory(false);
    } catch (e: any) { setError(e.message); }
  }

  function newConversation() {
    setConversationIds(prev => ({ ...prev, [mode]: null }));
    setMessagesByMode(prev => ({ ...prev, [mode]: [] }));
    setInput('');
    setError(null);
    setShowHistory(false);
  }

  function switchMode(nextMode: Mode) {
    if (loading) return;
    setMode(nextMode);
    setInput('');
    setError(null);
  }

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || loading) return;
    setInput(''); setError(null);
    const optimistic: Message = { role: 'user', content: message };
    const startedAt = Date.now();
    setMessagesByMode(prev => ({ ...prev, [mode]: [...prev[mode], optimistic] }));
    setLoading(true);
    // Give React one paint so "Pensando…" is visible even when the local model answers quickly.
    await new Promise(resolve => setTimeout(resolve, 60));
    try {
      const res = await apiFetch('/api/coach/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversation_id: conversationId, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'El Coach no ha podido responder');

      // Keep the thinking indicator visible briefly even when Qwen answers very fast.
      const remaining = 900 - (Date.now() - startedAt);
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));

      setConversationIds(prev => ({ ...prev, [mode]: data.conversation_id }));
      setMessagesByMode(prev => ({
        ...prev,
        [mode]: [...prev[mode], { role: 'assistant', content: data.answer }],
      }));
      await loadConversations();
    } catch (e: any) {
      setMessagesByMode(prev => ({ ...prev, [mode]: prev[mode].slice(0, -1) }));
      setError(e.message || 'Error conectando con el Coach');
    } finally { setLoading(false); }
  }

  async function deleteConversation(id: string) {
    try {
      const res = await apiFetch(`/api/coach/conversations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo eliminar');
      const affectedMode = (Object.keys(conversationIds) as Mode[]).find(m => conversationIds[m] === id);
      if (affectedMode) {
        setConversationIds(prev => ({ ...prev, [affectedMode]: null }));
        setMessagesByMode(prev => ({ ...prev, [affectedMode]: [] }));
      }
      await loadConversations();
    } catch (e: any) { setError(e.message); }
  }

  async function addMemory() {
    const value = newMemory.trim(); if (!value) return;
    try {
      const res = await apiFetch('/api/coach/memories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: value }) });
      if (!res.ok) throw new Error('No se pudo guardar');
      setNewMemory(''); await loadMemories();
    } catch (e: any) { setError(e.message); }
  }

  async function deleteMemory(id: string) {
    try { await apiFetch(`/api/coach/memories/${id}`, { method: 'DELETE' }); await loadMemories(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-20">
      <header className="sticky top-0 z-30 border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-lime-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-lime-400/10"><Brain size={23} /></div>
              <div>
                <div className="flex items-center gap-2"><h1 className="text-xl font-black tracking-tight">Coach</h1><span className="text-[10px] uppercase tracking-widest text-lime-400 font-bold border border-lime-400/30 rounded-full px-2 py-0.5">Qwen</span></div>
                <p className="text-xs text-neutral-400">Cada área tiene su propia conversación y su historial.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowMemory(true)} className="h-10 w-10 rounded-xl border border-neutral-800 bg-neutral-900 flex items-center justify-center text-neutral-300 hover:text-lime-400" title="Memoria"><Brain size={18}/></button>
              <button onClick={() => setShowHistory(true)} className="h-10 w-10 rounded-xl border border-neutral-800 bg-neutral-900 flex items-center justify-center text-neutral-300 hover:text-lime-400" title="Historial"><Clock3 size={18}/></button>
              <button onClick={newConversation} className="h-10 w-10 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center hover:bg-lime-300" title="Nueva conversación"><Plus size={19}/></button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-neutral-900 p-1 border border-neutral-800">
            {modes.map(item => <button key={item.id} onClick={() => switchMode(item.id)} className={`rounded-xl px-2 py-2 text-[11px] font-bold transition ${mode === item.id ? 'bg-neutral-700 text-lime-400' : 'text-neutral-500 hover:text-neutral-200'}`}>{item.label}</button>)}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-5 pb-44">
        {error && <div className="mb-4 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

        {messages.length === 0 ? (
          <section className="pt-5">
            <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4"><Sparkles className="text-lime-400" size={22}/><span className="text-xs font-bold uppercase tracking-widest text-lime-400">{modes.find(m => m.id === mode)?.description}</span></div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">Hola {user?.name || ''}.<br/>¿Qué quieres conseguir hoy?</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-400">El Coach puede consultar tus entrenamientos, objetivos, métricas y memorias para darte recomendaciones adaptadas a ti.</p>
              <div className="mt-6 grid gap-2">
                {starters.map(s => <button key={s} onClick={() => sendMessage(s)} className="text-left rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-300 hover:border-lime-400/40 hover:text-white transition flex items-center justify-between gap-3"><span>{s}</span><ChevronRight size={16} className="shrink-0 text-neutral-600"/></button>)}
              </div>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            {currentConversation && <div className="text-center text-[10px] uppercase tracking-widest text-neutral-600">{currentConversation.title}</div>}
            {messages.map((m, i) => <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`${m.role === 'user' ? 'bg-lime-400 text-neutral-950 rounded-2xl rounded-br-md max-w-[88%]' : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-2xl rounded-bl-md max-w-[94%]'} px-4 py-3.5 text-sm leading-6 whitespace-pre-wrap`}>{m.content}</div></div>)}
            {loading && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-500 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse"/><span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse [animation-delay:150ms]"/><span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse [animation-delay:300ms]"/>Pensando…</div></div>}
            <div ref={endRef} style={{ scrollMarginBottom: '180px' }}/>
          </div>
        )}
      </main>

      <div className="fixed bottom-16 left-0 right-0 z-20 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent pt-8 pb-3">
        <div className="max-w-3xl mx-auto px-4">
          <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl shadow-black/40 flex items-end gap-2 p-2">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Pregunta al Coach…" rows={1} className="min-h-11 max-h-28 flex-1 resize-none bg-transparent outline-none px-3 py-3 text-sm text-white placeholder:text-neutral-600" />
            <button disabled={!input.trim() || loading} className="h-11 w-11 shrink-0 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"><Send size={18}/></button>
          </form>
        </div>
      </div>

      {showHistory && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setShowHistory(false)}><aside className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-neutral-950 border-l border-neutral-800 p-5 overflow-y-auto" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Conversaciones</h2><p className="text-xs text-neutral-500 mt-1">Tu historial privado</p></div><button onClick={() => setShowHistory(false)}><X/></button></div><button onClick={newConversation} className="mt-5 w-full rounded-xl bg-lime-400 text-neutral-950 py-3 text-sm font-black flex items-center justify-center gap-2"><Plus size={17}/> Nueva conversación</button><div className="mt-4 space-y-2">{loadingHistory ? <p className="text-sm text-neutral-500">Cargando…</p> : conversations.length === 0 ? <p className="text-sm text-neutral-500 py-6 text-center">Todavía no hay conversaciones.</p> : conversations.map(c => <div key={c.id} className={`group rounded-2xl border p-3 flex items-center gap-2 ${c.id === conversationId ? 'border-lime-400/40 bg-lime-400/5' : 'border-neutral-800 bg-neutral-900'}`}><button onClick={() => openConversation(c.id)} className="text-left flex-1 min-w-0"><div className="text-sm font-semibold truncate">{c.title}</div><div className="text-[10px] uppercase tracking-widest text-neutral-600 mt-1">{c.mode}</div></button><button onClick={() => deleteConversation(c.id)} className="p-2 text-neutral-600 hover:text-red-400"><Trash2 size={15}/></button></div>)}</div></aside></div>}

      {showMemory && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setShowMemory(false)}><aside className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-neutral-950 border-l border-neutral-800 p-5 overflow-y-auto" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Memoria del Coach</h2><p className="text-xs text-neutral-500 mt-1">Datos que quieres que recuerde</p></div><button onClick={() => setShowMemory(false)}><X/></button></div><div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-3"><textarea value={newMemory} onChange={e => setNewMemory(e.target.value)} placeholder="Ej.: Mi objetivo es ganar fuerza y entreno 4 días por semana." maxLength={500} className="w-full min-h-24 resize-none bg-transparent outline-none text-sm leading-6 placeholder:text-neutral-600"/><button onClick={addMemory} className="mt-2 w-full rounded-xl bg-lime-400 text-neutral-950 py-2.5 text-sm font-black">Guardar memoria</button></div><div className="mt-5 space-y-2">{memories.map(m => <div key={m.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3 flex gap-3"><p className="flex-1 text-sm leading-5 text-neutral-300">{m.content}</p><button onClick={() => deleteMemory(m.id)} className="text-neutral-600 hover:text-red-400 shrink-0"><Trash2 size={15}/></button></div>)}{memories.length === 0 && <p className="text-sm text-neutral-500 text-center py-6">Aún no has guardado ninguna memoria.</p>}</div></aside></div>}
    </div>
  );
}
