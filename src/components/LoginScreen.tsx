import { useState } from 'react';
import type { FormEvent } from 'react';
import { Lock, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';
import { BUSINESS_INFO } from '../types';
import { BrandLogo } from './BrandLogo';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña para continuar.');
      return;
    }
    setSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#121212] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-[#1b1d22] border border-[#2e323c] rounded-xl p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <BrandLogo size="lg" className="mb-4 shadow-md" />
          <h1 className="font-brand-serif text-3xl font-bold text-white tracking-tight">
            {BUSINESS_INFO.brandName}
          </h1>
          <p className="mt-1 text-sm text-[#a1a7b3]">
            {BUSINESS_INFO.subtitle} · Cotizaciones y Facturación
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg bg-[#cf6679]/12 border border-[#cf6679]/40 px-3.5 py-3 text-sm text-[#f3a8b5]"
            >
              <AlertCircle className="w-4 h-4 text-[#cf6679] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="login-username"
              className="block text-xs font-medium text-[#c5cad3] mb-1.5"
            >
              Usuario
            </label>
            <div className="relative">
              <UserIcon
                className="w-4 h-4 text-[#7c8391] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Deliziubyrose"
                disabled={submitting}
                className="w-full rounded-lg bg-[#23262d] border border-[#343944] pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1e88e5] focus:ring-2 focus:ring-[#1e88e5]/30 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-[#c5cad3] mb-1.5"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 text-[#7c8391] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                className="w-full rounded-lg bg-[#23262d] border border-[#343944] pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1e88e5] focus:ring-2 focus:ring-[#1e88e5]/30 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e88e5] hover:bg-[#1976d2] disabled:opacity-60 text-white font-semibold text-sm py-2.5 px-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e88e5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1d22] cursor-pointer"
          >
            <span>{submitting ? 'Verificando acceso...' : 'Iniciar sesión'}</span>
            {!submitting && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
          </button>
        </form>

        <div className="mt-7 pt-5 border-t border-[#2a2e37] text-center space-y-1.5">
          <p className="text-xs text-[#8f96a3]">
            Cuenta inicial: <span className="text-[#d4d8e0] font-medium">Deliziubyrose</span> ·{' '}
            <span className="font-mono-num text-[#d4d8e0]">Deliziu2026</span>
          </p>
          <p className="text-xs text-[#6f7684]">
            WhatsApp {BUSINESS_INFO.whatsappDisplay} · {BUSINESS_INFO.instagram}
          </p>
        </div>
      </div>
    </main>
  );
}
