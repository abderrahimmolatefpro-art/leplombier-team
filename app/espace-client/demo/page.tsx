'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Zap } from 'lucide-react';
import AddressInput from '@/components/AddressInput';

const MIN_PHONE_DIGITS = 9;
const ANIMATION_SEND_MS = 1500;

type DemoStep = 1 | 2 | 3 | 4;
type CodeSentStatus = 'idle' | 'checking' | 'sent' | 'not_sent';

function isEmbedMode(searchParams: URLSearchParams | null): boolean {
  return searchParams?.get('embed') === '1' || searchParams?.get('embed') === 'true';
}

function DemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const embed = isEmbedMode(searchParams);
  const { token, login } = useClientAuth();

  const [step, setStep] = useState<DemoStep>(1);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [codeSentStatus, setCodeSentStatus] = useState<CodeSentStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Step 2: auto-advance after animation (connect if not logged in, else create request)
  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => {
      setStep(token ? 4 : 3);
    }, ANIMATION_SEND_MS);
    return () => clearTimeout(t);
  }, [step, token]);

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
    if (step !== 3) return;
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
  }, [step, phone, checkCodeSent]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !description.trim()) return;
    setStep(2);
  };

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
    setVerifying(true);
    try {
      const res = await fetch('/api/espace-client/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (data.success) {
        await login(data.token);
        setStep(4);
      } else {
        setError(data.error || 'Code incorrect');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setVerifying(false);
    }
  };

  const createRealRequest = useCallback(async () => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('espace_client_token') : null;
    if (!authToken) {
      setError('Session expirée. Reconnectez-vous.');
      return;
    }
    setCreatingRequest(true);
    setError('');
    try {
      const res = await fetch('/api/espace-client/instant-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          address: address.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création de la demande');
        return;
      }
      const next = searchParams?.get('next') || `/espace-client/commander?requestId=${data.id}`;
      const path = next.startsWith('/') ? next : `/espace-client/commander?requestId=${data.id}`;
      if (embed && typeof window !== 'undefined' && window.top) {
        window.top.location.href = `${window.location.origin}${path}`;
      } else {
        router.push(path);
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setCreatingRequest(false);
    }
  }, [address, description, embed, router, searchParams]);

  useEffect(() => {
    if (step === 4) {
      createRealRequest();
    }
  }, [step, createRealRequest]);

  const containerClass = embed
    ? 'w-full max-w-md mx-auto py-4 px-2 bg-transparent'
    : 'min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4';

  const cardClass = embed ? 'bg-transparent' : 'bg-white rounded-xl shadow-lg p-6 max-w-md w-full';

  return (
    <div className={containerClass}>
      <div className={cardClass}>
        {!embed && (
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Le Plombier" width={140} height={47} className="h-auto object-contain" priority />
          </div>
        )}
        {embed && (
          <div className="flex justify-center mb-3">
            <Image src="/logo.png" alt="Le Plombier" width={90} height={30} className="h-8 w-auto object-contain opacity-90" priority />
          </div>
        )}

        <div className="mb-3">
          <p className="text-xs font-medium text-primary-600">Étape {step}/4</p>
          <h1 className={`font-bold text-gray-900 ${embed ? 'text-base' : 'text-lg'}`}>
            {step === 1 && 'Décrivez votre besoin'}
            {step === 2 && 'Demande envoyée'}
            {step === 3 && 'Connectez-vous'}
            {step === 4 && 'Création de votre demande'}
          </h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Address + description */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <AddressInput
              value={address}
              onChange={setAddress}
              placeholder="Commencez à taper une adresse..."
              required
              label="Adresse"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Fuite d'eau sous l'évier de la cuisine"
                className="input w-full min-h-[80px]"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full flex items-center justify-center gap-2">
              <Zap size={18} />
              Envoyer ma demande
            </button>
          </form>
        )}

        {/* Step 2: Animation (1,5 s, skippable) */}
        {step === 2 && (
          <div className="py-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
            <p className="text-gray-600 text-center mb-4">Votre demande est envoyée aux plombiers...</p>
            <button
              type="button"
              onClick={() => setStep(token ? 4 : 3)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium underline"
            >
              Passer
            </button>
          </div>
        )}

        {/* Step 3: Connectez-vous (phone + code, même logique que login) */}
        {step === 3 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-gray-600">
              Créez votre compte pour recevoir les offres des plombiers en temps réel. Nouveau ? Votre compte sera créé automatiquement.
            </p>
            <div>
              <label htmlFor="demo-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                id="demo-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError('');
                }}
                placeholder="06 12 34 56 78"
                className="input w-full"
                required
              />
            </div>
            <div>
              <label htmlFor="demo-code" className="block text-sm font-medium text-gray-700 mb-1">
                Code SMS
              </label>
              <input
                id="demo-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="input w-full text-center text-lg tracking-widest"
                required
              />
              <div className="mt-1 min-h-[1.25rem]">
                {codeSentStatus === 'checking' && (
                  <span className="text-xs text-gray-500">Vérification...</span>
                )}
                {codeSentStatus === 'not_sent' && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS}
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
            <button type="submit" disabled={verifying} className="btn btn-primary w-full">
              {verifying ? 'Vérification...' : 'Se connecter'}
            </button>
          </form>
        )}

        {/* Step 4: Creating request */}
        {step === 4 && (
          <div className="py-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
            <p className="text-gray-600 text-center">
              {creatingRequest ? 'Création de votre demande...' : 'Redirection...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      }
    >
      <DemoContent />
    </Suspense>
  );
}
