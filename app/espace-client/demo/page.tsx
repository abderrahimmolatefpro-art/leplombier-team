'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Zap } from 'lucide-react';

const MIN_PHONE_DIGITS = 9;
const ANIMATION_SEND_MS = 2500;

type DemoStep = 1 | 2 | 3 | 4 | 5;

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
      setStep(token ? 5 : 3);
    }, ANIMATION_SEND_MS);
    return () => clearTimeout(t);
  }, [step, token]);

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
      if (data.success || data.codeAlreadySent) {
        setStep(4);
      } else {
        setError(data.error || "Erreur lors de l'envoi du code");
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
        setStep(5);
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
    if (step === 5) {
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

        <h1 className={`font-bold text-gray-900 ${embed ? 'text-base mb-1' : 'text-lg mb-2'}`}>
          {step === 1 && 'Décrivez votre besoin'}
          {step === 2 && 'Demande envoyée'}
          {step === 3 && 'Connectez-vous'}
          {step === 4 && 'Code de vérification'}
          {step === 5 && 'Création de votre demande'}
        </h1>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Address + description */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: 12 rue Mohammed V, Casablanca"
                className="input w-full"
                required
              />
            </div>
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

        {/* Step 2: Animation */}
        {step === 2 && (
          <div className="py-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
            <p className="text-gray-600 text-center">Votre demande est envoyée aux plombiers...</p>
          </div>
        )}

        {/* Step 3: Phone (Connectez-vous) */}
        {step === 3 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <p className="text-sm text-gray-600">
              Créez votre compte pour recevoir les offres des plombiers en temps réel. Entrez votre numéro, recevez un code par SMS, et c'est parti !
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
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
            <button type="submit" disabled={sendingCode || phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS} className="btn btn-primary w-full">
              {sendingCode ? 'Envoi...' : 'Envoyer le code SMS'}
            </button>
          </form>
        )}

        {/* Step 4: Code */}
        {step === 4 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-gray-600">Entrez le code reçu par SMS au {phone}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code à 6 chiffres</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="input w-full text-center text-lg tracking-widest"
                required
              />
            </div>
            <button type="submit" disabled={verifying} className="btn btn-primary w-full">
              {verifying ? 'Vérification...' : 'Se connecter'}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Changer de numéro
            </button>
          </form>
        )}

        {/* Step 5: Creating request */}
        {step === 5 && (
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
