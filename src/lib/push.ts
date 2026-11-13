/** Avisos de descanso con Web Push (Fase 10). */
import { apiFetch } from './api';

export const PUSH_PREF_KEY = 'entreno-push-rest';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isPushPrefOn(): boolean {
  try {
    return localStorage.getItem(PUSH_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPushPref(on: boolean): void {
  try {
    localStorage.setItem(PUSH_PREF_KEY, on ? '1' : '0');
  } catch {
    // almacenamiento lleno o modo privado
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Este navegador no admite avisos en segundo plano.');
  }
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return navigator.serviceWorker.ready;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

async function fetchPublicKey(): Promise<string> {
  const res = await apiFetch('/api/push/vapid-public-key');
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.public_key) {
    if (res.status === 503) {
      throw new Error('Los avisos no están configurados en el servidor.');
    }
    throw new Error(data.detail || 'No se pudo obtener la clave de avisos.');
  }
  return data.public_key as string;
}

async function postSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const res = await apiFetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'No se pudo guardar la suscripción.');
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await getRegistration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function enablePush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Este navegador no admite avisos push.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      'Has bloqueado las notificaciones. En Chrome, toca el candado de la barra de direcciones y permite las notificaciones.'
    );
  }
  const reg = await getRegistration();
  const publicKey = await fetchPublicKey();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }
  await postSubscription(sub);
  setPushPref(true);
}

export async function disablePush(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (sub) {
    try {
      await apiFetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch {
      // Seguimos desuscribiendo en el navegador aunque el servidor falle.
    }
    try {
      await sub.unsubscribe();
    } catch {
      // ya no existía
    }
  }
  setPushPref(false);
}

/** Si la preferencia está activa, revalida o recupera la suscripción. */
export async function ensurePushReady(): Promise<boolean> {
  if (!isPushPrefOn() || !isPushSupported()) return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const reg = await getRegistration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const publicKey = await fetchPublicKey();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }
    await postSubscription(sub);
    return true;
  } catch {
    return false;
  }
}

async function silent(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch {
    // El temporizador de entreno no debe fallar por un aviso.
  }
}

export async function scheduleRestPush(seconds: number, exerciseName?: string): Promise<void> {
  if (!isPushPrefOn() || !seconds || seconds <= 0) return;
  await silent(() =>
    apiFetch('/api/push/rest-timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seconds: Math.max(1, Math.round(seconds)),
        exercise_name: exerciseName || '',
      }),
    })
  );
}

export async function cancelRestPush(): Promise<void> {
  if (!isPushPrefOn()) return;
  await silent(() => apiFetch('/api/push/rest-timer', { method: 'DELETE' }));
}

export async function testPush(seconds: number = 5): Promise<void> {
  const res = await apiFetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seconds }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || 'No se pudo enviar el aviso de prueba.');
  }
}
