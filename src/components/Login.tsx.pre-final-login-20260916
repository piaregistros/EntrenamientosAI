import React, { useState } from 'react';
import { Dumbbell, Lock, Mail, AlertCircle, Loader, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../lib/api';


function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function arrayBufferToBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'PublicKeyCredential' in window &&
    !!navigator.credentials
  );
}

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyUser, setPasskeyUser] = useState<'pablo' | 'estefi' | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrName.trim() || !password.trim()) {
      setError('Por favor, rellena todos los campos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body = {
        name: emailOrName.trim(),
        password,
      };

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

  const handlePasskeyLogin = async (userType: 'pablo' | 'estefi') => {
    setError(null);
    setLoading(true);
    setPasskeyUser(userType);

    const userNames = {
      pablo: 'Pablo',
      estefi: 'Estefi',
    };

    try {
      if (!isWebAuthnSupported()) {
        throw new Error(
          'Este dispositivo o navegador no permite el acceso mediante Passkeys. Usa la contraseña.'
        );
      }

      // El backend localiza directamente al usuario por su nombre
      // e inicia la ceremonia WebAuthn para sus Passkeys registradas.
      const optionsResponse = await apiFetch(
        '/api/auth/webauthn/login/options',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: userNames[userType],
          }),
        }
      );

      const optionsData = await optionsResponse.json();

      if (!optionsResponse.ok) {
        throw new Error(
          optionsData.detail ||
          optionsData.error ||
          'Esta cuenta no tiene una Passkey registrada.'
        );
      }

      const publicKey: PublicKeyCredentialRequestOptions = {
        ...optionsData,
        challenge: base64UrlToArrayBuffer(optionsData.challenge),
        allowCredentials: (optionsData.allowCredentials || []).map(
          (credential: {
            id: string;
            type: string;
            transports?: string[];
          }) => ({
            ...credential,
            id: base64UrlToArrayBuffer(credential.id),
          })
        ),
      };

      const credential = await navigator.credentials.get({ publicKey });

      if (!credential || credential.type !== 'public-key') {
        throw new Error('No se ha podido obtener la Passkey.');
      }

      const publicKeyCredential = credential as PublicKeyCredential;
      const assertion =
        publicKeyCredential.response as AuthenticatorAssertionResponse;

      const credentialPayload = {
        id: publicKeyCredential.id,
        rawId: arrayBufferToBase64Url(publicKeyCredential.rawId),
        type: publicKeyCredential.type,
        response: {
          clientDataJSON: arrayBufferToBase64Url(
            assertion.clientDataJSON
          ),
          authenticatorData: arrayBufferToBase64Url(
            assertion.authenticatorData
          ),
          signature: arrayBufferToBase64Url(
            assertion.signature
          ),
          userHandle: assertion.userHandle
            ? arrayBufferToBase64Url(assertion.userHandle)
            : null,
        },
      };

      const verifyResponse = await apiFetch(
        '/api/auth/webauthn/login/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credential: credentialPayload,
          }),
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(
          verifyData.detail ||
          verifyData.error ||
          'No se ha podido verificar la Passkey.'
        );
      }

      onLoginSuccess(verifyData);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setError(
          'La autenticación biométrica fue cancelada o no se completó.'
        );
      } else {
        setError(
          err?.message ||
          'No se ha podido iniciar sesión mediante Passkey.'
        );
      }
    } finally {
      setLoading(false);
      setPasskeyUser(null);
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
          {/* Mensaje de error */}
          {error && (
            <div
              id="login-error"
              className="flex items-start gap-3 bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-sm"
            >
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Acceso biométrico */}
          <div>
            <div className="mb-4">
              <h2 className="text-white font-bold text-lg">
                ¿Quién eres?
              </h2>
              <p className="text-neutral-500 text-sm mt-1">
                Accede rápidamente con la seguridad de tu dispositivo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="quick-login-pablo"
                type="button"
                onClick={() => handlePasskeyLogin('pablo')}
                disabled={loading}
                className="group relative flex flex-col items-center justify-center min-h-[132px] px-4 py-5 bg-neutral-950/70 border border-neutral-800 hover:border-lime-500/60 hover:bg-neutral-900 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center mb-3 group-hover:bg-lime-500/15 transition-colors">
                  {loading && passkeyUser === 'pablo' ? (
                    <Loader className="animate-spin text-lime-400" size={22} />
                  ) : (
                    <Fingerprint className="text-lime-400" size={23} />
                  )}
                </div>

                <span className="text-white font-bold text-base">
                  Pablo
                </span>

                <span className="text-neutral-500 text-xs mt-1">
                  Administrador
                </span>

                <span className="text-lime-400/80 text-[10px] font-semibold mt-2">
                  Huella · Face ID · PIN
                </span>
              </button>

              <button
                id="quick-login-estefi"
                type="button"
                onClick={() => handlePasskeyLogin('estefi')}
                disabled={loading}
                className="group relative flex flex-col items-center justify-center min-h-[132px] px-4 py-5 bg-neutral-950/70 border border-neutral-800 hover:border-lime-500/60 hover:bg-neutral-900 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center mb-3 group-hover:bg-lime-500/15 transition-colors">
                  {loading && passkeyUser === 'estefi' ? (
                    <Loader className="animate-spin text-lime-400" size={22} />
                  ) : (
                    <Fingerprint className="text-lime-400" size={23} />
                  )}
                </div>

                <span className="text-white font-bold text-base">
                  Estefi
                </span>

                <span className="text-neutral-500 text-xs mt-1">
                  Usuario
                </span>

                <span className="text-lime-400/80 text-[10px] font-semibold mt-2">
                  Huella · Face ID · PIN
                </span>
              </button>
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex-1 border-t border-neutral-800" />
            <span className="text-neutral-600 text-[10px] font-bold uppercase tracking-widest">
              Acceso con contraseña
            </span>
            <div className="flex-1 border-t border-neutral-800" />
          </div>

          {/* Acceso mediante contraseña */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2"
              >
                Usuario o email
              </label>

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
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2"
              >
                Contraseña
              </label>

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

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ minHeight: '46px' }}
            >
              {loading ? (
                <Loader className="animate-spin" size={17} />
              ) : (
                <>
                  <Lock size={16} />
                  Entrar con contraseña
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
