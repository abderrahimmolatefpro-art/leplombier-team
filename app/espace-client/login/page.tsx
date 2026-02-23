'use client';

import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useClientAuth } from '@/hooks/useClientAuth';

const MIN_PHONE_DIGITS = 9;

const ALLOWED_REDIRECTS = [
  '/espace-client/commander',
  '/espace-client/dashboard',
  '/espace-client/commandes',
  '/espace-client/documents',
  '/espace-client/codes-promo',
  '/espace-client/parametres',
  '/espace-client/profil',
];

function getRedirectPath(searchParams: URLSearchParams | null): string {
  const next = searchParams?.get('next') || searchParams?.get('redirect');
  if (!next || !next.startsWith('/')) return '/espace-client/commander';
  const path = next.split('?')[0];
  return ALLOWED_REDIRECTS.includes(path) ? path : '/espace-client/commander';
}

function isEmbedMode(searchParams: URLSearchParams | null): boolean {
  return searchParams?.get('embed') === '1' || searchParams?.get('embed') === 'true';
}

type CodeSentStatus = 'idle' | 'checking' | 'sent' | 'not_sent';

function ClientLoginContent() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSentStatus, setCodeSentStatus] = useState<CodeSentStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login } = useClientAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const embed = isEmbedMode(searchParams);

  const checkCodeSent = useCallback(async (phoneToCheck: string) => {
    const digits = phoneToCheck.replace(/\D/g, '');
    if (digits.length < MIN_PHONE_DIGITS) {
      setCodeSentStatus('idle');
      return;
    }
    setCodeSentStatus('checking');
    try {
      const res = await fetch('/api/espace-client/check-code-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToCheck }),
      });
      const data = await res.json();
      setCodeSentStatus(data.codeSent ? 'sent' : 'not_sent');
    } catch {
      setCodeSentStatus('not_sent');
    }
  }, []);

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < MIN_PHONE_DIGITS) {
      setCodeSentStatus('idle');
      return;
    }
    debounceRef.current = setTimeout(() => checkCodeSent(phone), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [phone, checkCodeSent]);

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
        if (data.codeAlreadySent) {
          setCodeSentStatus('sent');
        } else {
          setError(data.error || 'Erreur lors de l\'envoi du code');
        }
      } else {
        setError('');
        setCodeSentStatus('sent');
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
          const sep = redirectPath.includes('?') ? '&' : '?';
          const urlWithToken = `${redirectPath}${sep}espace_client_token=${encodeURIComponent(data.token)}`;
          window.top!.location.href = `${window.location.origin}${urlWithToken}`;
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
              : 'bg-white rounded-xl shadow-lg p-6'
          }
        >
          <div className={embed ? 'text-center mb-4' : 'text-center mb-6'}>
            {!embed && (
              <div className="flex justify-center mb-4">
                <Image
                  src="/logo.png"
                  alt="Le Plombier"
                  width={160}
                  height={53}
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
                  width={90}
                  height={30}
                  className="h-8 w-auto object-contain opacity-90"
                  priority
                />
              </div>
            )}
            <h1 className={embed ? 'text-base font-semibold text-gray-800' : 'text-lg font-bold text-gray-900'}>
              {embed ? 'Connexion' : 'Espace Client'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Nouveau ? Votre compte sera créé automatiquement.
            </p>
          </div>

          <form onSubmit={handleVerify} className={embed ? 'space-y-3' : 'space-y-5'}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError('');
                }}
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
                Code SMS
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
              <div className="mt-1 min-h-[1.25rem]">
                {codeSentStatus === 'checking' && (
                  <span className="text-xs text-gray-500">Vérification...</span>
                )}
                {codeSentStatus === 'not_sent' && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || !phone.trim()}
                    className="text-xs text-primary-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingCode ? 'Envoi...' : 'Envoyer le code'}
                  </button>
                )}
                {codeSentStatus === 'sent' && (
                  <p className="text-xs text-gray-600">
                    Consultez vos SMS pour retrouver le code envoyé.{' '}
                    <a href="https://leplombier.ma/contact" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      Code oublié ? Contactez-nous
                    </a>
                  </p>
                )}
              </div>
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
