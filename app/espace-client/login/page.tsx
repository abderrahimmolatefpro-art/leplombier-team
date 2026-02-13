'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useClientAuth } from '@/hooks/useClientAuth';

const ALLOWED_REDIRECTS = [
  '/espace-client/commander',
  '/espace-client/dashboard',
  '/espace-client/commandes',
  '/espace-client/documents',
  '/espace-client/codes-promo',
];

function getRedirectPath(searchParams: URLSearchParams | null): string {
  const next = searchParams?.get('next') || searchParams?.get('redirect');
  if (!next || !next.startsWith('/')) return '/espace-client/dashboard';
  const path = next.split('?')[0];
  return ALLOWED_REDIRECTS.includes(path) ? path : '/espace-client/dashboard';
}

function isEmbedMode(searchParams: URLSearchParams | null): boolean {
  return searchParams?.get('embed') === '1' || searchParams?.get('embed') === 'true';
}

function ClientLoginContent() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const { login } = useClientAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const embed = isEmbedMode(searchParams);

  useEffect(() => {
    if (!embed) return;
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    return () => {
      document.body.style.background = prevBody;
      document.documentElement.style.background = prevHtml;
    };
  }, [embed]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSendingCode(true);
    try {
      const res = await fetch('/api/espace-client/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Erreur lors de l\'envoi du code');
      } else {
        setError('');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/espace-client/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (data.success) {
        await login(data.token);
        const redirectPath = getRedirectPath(searchParams);
        if (embed) {
          window.top!.location.href = `${window.location.origin}${redirectPath}`;
        } else {
          router.push(redirectPath);
        }
      } else {
        setError(data.error || 'Code incorrect');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        embed
          ? 'w-full max-w-md mx-auto py-4 px-2 bg-transparent'
          : 'min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4'
      }
    >
      <div className={embed ? 'w-full' : 'max-w-md w-full'}>
        <div
          className={
            embed
              ? 'bg-transparent'
              : 'bg-white rounded-xl shadow-lg p-8'
          }
        >
          <div className={embed ? 'text-center mb-4' : 'text-center mb-8'}>
            {!embed && (
              <div className="flex justify-center mb-4">
                <Image
                  src="/logo.png"
                  alt="Le Plombier"
                  width={180}
                  height={60}
                  className="h-auto object-contain"
                  priority
                />
              </div>
            )}
            {embed && (
              <div className="flex justify-center mb-2">
                <Image
                  src="/logo.png"
                  alt="Le Plombier"
                  width={100}
                  height={34}
                  className="h-8 w-auto object-contain opacity-90"
                  priority
                />
              </div>
            )}
            <h1 className={embed ? 'text-base font-semibold text-gray-800 mb-1' : 'text-xl font-bold text-gray-900'}>
              {embed ? 'Connectez-vous pour commander' : 'Espace Client'}
            </h1>
            <p className="text-sm text-gray-600">
              Nouveau ou déjà client ? Entrez votre numéro pour recevoir un code d&apos;accès par SMS.
            </p>
          </div>

          <form onSubmit={handleVerify} className={embed ? 'space-y-3' : 'space-y-6'}>
            {error && (
              <div className="bg-red-50/90 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de téléphone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={
                  embed
                    ? 'w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500'
                    : 'input'
                }
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Code reçu par SMS
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className={
                  embed
                    ? 'w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white/80 backdrop-blur-sm text-gray-900 text-center text-lg tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500'
                    : 'input text-center text-lg tracking-widest'
                }
                placeholder="123456"
              />
              <p className="text-xs text-gray-600 mt-1">
                Pas encore de code ?{' '}
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || !phone.trim()}
                  className="text-primary-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingCode ? 'Envoi en cours...' : 'Envoyer le code'}
                </button>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={
                embed
                  ? 'w-full py-2.5 px-4 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-60 transition-colors'
                  : 'btn btn-primary w-full'
              }
            >
              {loading ? 'Vérification...' : 'Se connecter'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">
          {embed
            ? 'En cliquant sur Envoyer le code, un compte sera créé automatiquement si vous êtes nouveau.'
            : 'Nouveau ? Entrez votre numéro et cliquez sur Envoyer le code pour créer votre compte.'}
        </p>
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    }>
      <ClientLoginContent />
    </Suspense>
  );
}
