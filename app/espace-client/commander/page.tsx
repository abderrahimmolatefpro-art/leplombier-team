'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Zap, Phone, CheckCircle, XCircle, BadgeCheck } from 'lucide-react';
import AddressInput from '@/components/AddressInput';

const POLL_INTERVAL_MS = 2500;
const PLOMBIER_LOCATION_POLL_MS = 15000;
const FALLBACK_PHONE = '06 71 05 23 71';
const FALLBACK_PHONE_DELAY_MS = 90 * 1000; // 1min30 sans plombier → afficher le standard

type RequestState = 'idle' | 'submitting' | 'waiting' | 'accepted' | 'expired' | 'cancelled' | 'error';

interface OfferItem {
  id: string;
  plombierId: string;
  plombierName: string;
  proposedAmount: number;
  message?: string;
  status: string;
  certified?: boolean;
}

interface RequestData {
  id: string;
  status: string;
  address: string;
  description: string;
  clientProposedAmount?: number;
  plombier?: { id: string; name: string; phone?: string; certified?: boolean };
  offers?: OfferItem[];
  expiresAt: string | null;
  createdAt?: string | null;
}

export default function CommanderPage() {
  const { client, loading: authLoading, token } = useClientAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [state, setState] = useState<RequestState>('idle');
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [clientProposedAmount, setClientProposedAmount] = useState<string>('');
  const [clientCoords, setClientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [plombierCoords, setPlombierCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [showFallbackPhone, setShowFallbackPhone] = useState(false);
  const waitingStartedAtRef = useRef<number | null>(null);

  // Restaurer l'état depuis l'URL (ex: depuis Mes commandes)
  useEffect(() => {
    const idFromUrl = searchParams.get('requestId');
    if (!idFromUrl || !token || requestId) return;
    let cancelled = false;
    fetch(`/api/espace-client/instant-request/${idFromUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setRequestId(data.id);
        setRequestData({
          id: data.id,
          status: data.status,
          address: data.address,
          description: data.description,
          clientProposedAmount: data.clientProposedAmount,
          plombier: data.plombier,
          offers: data.offers,
          expiresAt: data.expiresAt || null,
          createdAt: data.createdAt || null,
        });
        if (data.status === 'accepte') {
          setState('accepted');
        } else if (data.status === 'annule') {
          setState('cancelled');
        } else if (data.status === 'expire' || (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now())) {
          setState('expired');
        } else {
          setState('waiting');
          const created = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
          if (Date.now() - created >= FALLBACK_PHONE_DELAY_MS) {
            setShowFallbackPhone(true);
          }
          waitingStartedAtRef.current = created;
        }
        router.replace('/espace-client/commander', { scroll: false });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [searchParams, token, router]);

  useEffect(() => {
    if (state !== 'accepted' || !requestData?.address) return;
    let cancelled = false;
    fetch(`/api/geocode?address=${encodeURIComponent(requestData.address)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.lat || !data.lng) return;
        setClientCoords({ lat: data.lat, lng: data.lng });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state, requestData?.address]);

  useEffect(() => {
    if (state !== 'accepted' || !requestId || !token) return;
    const fetchLocation = () => {
      fetch(`/api/espace-client/instant-request/${requestId}/plombier-location`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.lat != null && data.lng != null) {
            setPlombierCoords({ lat: data.lat, lng: data.lng });
          }
        })
        .catch(() => {});
    };
    fetchLocation();
    const t = setInterval(fetchLocation, PLOMBIER_LOCATION_POLL_MS);
    return () => clearInterval(t);
  }, [state, requestId, token]);

  useEffect(() => {
    if (state !== 'accepted' || !mapRef.current || !clientCoords) return;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    const initMap = () => {
      const g = (window as unknown as { google?: typeof google }).google;
      if (!g || !mapRef.current) return;
      if (mapInstanceRef.current) return;
      const center = plombierCoords || clientCoords;
      const map = new g.maps.Map(mapRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: 14,
      });
      mapInstanceRef.current = map;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      const clientMarker = new g.maps.Marker({
        position: clientCoords,
        map,
        title: 'Vous',
      });
      markersRef.current.push(clientMarker);
      if (plombierCoords) {
        const plombierMarker = new g.maps.Marker({
          position: plombierCoords,
          map,
          title: 'Plombier',
        });
        markersRef.current.push(plombierMarker);
        const bounds = new g.maps.LatLngBounds();
        bounds.extend(clientCoords);
        bounds.extend(plombierCoords);
        map.fitBounds(bounds);
      }
    };

    if ((window as unknown as { google?: unknown }).google) {
      initMap();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
    return () => {
      mapInstanceRef.current = null;
      markersRef.current = [];
    };
  }, [state, clientCoords, plombierCoords]);

  useEffect(() => {
    if (state !== 'accepted' || !mapInstanceRef.current || !(window as unknown as { google?: typeof google }).google) return;
    const g = (window as unknown as { google: typeof google }).google;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (clientCoords) {
      const m1 = new g.maps.Marker({ position: clientCoords, map: mapInstanceRef.current, title: 'Vous' });
      markersRef.current.push(m1);
    }
    if (plombierCoords) {
      const m2 = new g.maps.Marker({ position: plombierCoords, map: mapInstanceRef.current, title: 'Plombier' });
      markersRef.current.push(m2);
      const bounds = new g.maps.LatLngBounds();
      if (clientCoords) bounds.extend(clientCoords);
      bounds.extend(plombierCoords);
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [state, clientCoords, plombierCoords]);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/espace-client/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/espace-client/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (client) {
      const parts = [client.address, client.postalCode, client.city].filter(Boolean);
      if (parts.length) setAddress(parts.join(', '));
    }
  }, [client]);

  const pollStatus = useCallback(
    async (id: string) => {
      if (!token) return;
      const res = await fetch(`/api/espace-client/instant-request/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data as RequestData;
    },
    [token]
  );

  useEffect(() => {
    if (!requestId || !token || state !== 'waiting') return;

    const check = async () => {
      const data = await pollStatus(requestId);
      if (!data) return;

      setRequestData((prev) => ({
        ...data,
        createdAt: data.createdAt ?? prev?.createdAt ?? new Date().toISOString(),
      }));

      if (data.status === 'accepte') {
        setState('accepted');
        return;
      }
      if (data.status === 'expire' || data.status === 'annule') {
        setState(data.status === 'expire' ? 'expired' : 'cancelled');
        return;
      }
      if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
        setState('expired');
        return;
      }
    };

    const t = setInterval(check, POLL_INTERVAL_MS);
    check();
    return () => clearInterval(t);
  }, [requestId, token, state, pollStatus]);

  // Après 1min30 sans plombier, afficher le numéro du standard
  useEffect(() => {
    if (state !== 'waiting' || !requestData) return;
    const start =
      requestData.createdAt
        ? new Date(requestData.createdAt).getTime()
        : waitingStartedAtRef.current ?? Date.now();
    const elapsed = Date.now() - start;
    if (elapsed >= FALLBACK_PHONE_DELAY_MS) {
      setShowFallbackPhone(true);
      return;
    }
    const remaining = FALLBACK_PHONE_DELAY_MS - elapsed;
    const t = setTimeout(() => setShowFallbackPhone(true), remaining);
    return () => clearTimeout(t);
  }, [state, requestData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!address.trim() || !description.trim()) {
      setErrorMsg('Adresse et description requises');
      return;
    }
    if (!token) return;

    setState('submitting');
    try {
      const res = await fetch('/api/espace-client/instant-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: address.trim(),
          description: description.trim(),
          clientProposedAmount: clientProposedAmount.trim() ? parseFloat(clientProposedAmount) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur lors de l\'envoi');
        setState('idle');
        return;
      }

      setRequestId(data.id);
      setRequestData({
        id: data.id,
        status: 'en_attente',
        address: address.trim(),
        description: description.trim(),
        clientProposedAmount: data.clientProposedAmount,
        offers: [],
        expiresAt: data.expiresAt || null,
        createdAt: new Date().toISOString(),
      });
      setState('waiting');
      setShowFallbackPhone(false);
      waitingStartedAtRef.current = Date.now();
    } catch {
      setErrorMsg('Erreur de connexion');
      setState('idle');
    }
  };

  const handleNewRequest = () => {
    setRequestId(null);
    setRequestData(null);
    setState('idle');
    setShowFallbackPhone(false);
    waitingStartedAtRef.current = null;
    setDescription('');
    setClientProposedAmount('');
    setClientCoords(null);
    setPlombierCoords(null);
    mapInstanceRef.current = null;
    markersRef.current = [];
  };

  const handleCancelRequest = async () => {
    if (!token || !requestId) return;
    setCancelling(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/espace-client/instant-request/${requestId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur');
        return;
      }
      setState('cancelled');
    } catch {
      setErrorMsg('Erreur de connexion');
    } finally {
      setCancelling(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!token || !requestId) return;
    setAcceptingOfferId(offerId);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/espace-client/instant-request/${requestId}/accept-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur');
        return;
      }
      if (data.plombier && requestData) {
        setRequestData({
          ...requestData,
          status: 'accepte',
          plombier: data.plombier,
          offers: undefined,
        });
        setState('accepted');
      }
    } catch {
      setErrorMsg('Erreur de connexion');
    } finally {
      setAcceptingOfferId(null);
    }
  };

  if (authLoading || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || '?';
  };

  const sortedOffers = [...(requestData?.offers || [])].sort((a, b) => {
    if (a.certified && !b.certified) return -1;
    if (!a.certified && b.certified) return 1;
    return a.proposedAmount - b.proposedAmount;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Commander un plombier</h1>
            <p className="text-xs text-slate-500">Intervention immédiate</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {(state === 'idle' || state === 'submitting') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Intervention immédiate</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Décrivez votre urgence. Les plombiers disponibles acceptent en temps réel.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AddressInput
                value={address}
                onChange={setAddress}
                placeholder="Commencez à taper une adresse..."
                required
                active={state === 'idle' || state === 'submitting'}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Budget proposé (MAD) <span className="text-slate-400 font-normal">optionnel</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[200, 300, 400, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setClientProposedAmount(String(amt))}
                      className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                        clientProposedAmount === String(amt)
                          ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {amt} MAD
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={clientProposedAmount}
                  onChange={(e) => setClientProposedAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ex: 500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description du problème</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-slate-400"
                  placeholder="Ex: Fuite sous l'évier, robinet qui goutte..."
                  required
                />
              </div>
              {errorMsg && (
                <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={state === 'submitting'}
                className="w-full py-4 px-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 transition-all"
              >
                {state === 'submitting' ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi en cours...
                  </span>
                ) : (
                  'Envoyer ma demande'
                )}
              </button>
            </form>
          </div>
        )}

        {state === 'waiting' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">En attente d&apos;offres</h2>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Les plombiers disponibles peuvent accepter votre tarif ou vous faire une contre-offre. Choisissez l&apos;offre qui vous convient.
                  </p>
                  {requestData?.clientProposedAmount != null && requestData.clientProposedAmount > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
                      Votre budget : {requestData.clientProposedAmount} MAD
                    </div>
                  )}
                </div>
              </div>
            </div>

            {sortedOffers.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Choisir un plombier</h3>
                  <span className="text-sm text-slate-500">{sortedOffers.length} offre{sortedOffers.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-4">
                  {sortedOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="group bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden hover:shadow-lg hover:border-primary-200/80 transition-all duration-200"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0 ${
                            offer.certified ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-200/50' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {getInitials(offer.plombierName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-lg">{offer.plombierName}</p>
                            <div className="mt-1.5">
                              {offer.certified ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-100 text-primary-700">
                                  <BadgeCheck className="w-4 h-4" />
                                  Plombier certifié leplombier.ma
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                                  Plombier partenaire
                                </span>
                              )}
                            </div>
                            {offer.message && (
                              <p className="text-sm text-slate-500 mt-2 line-clamp-2 italic">&quot;{offer.message}&quot;</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-primary-600">{offer.proposedAmount}</span>
                            <span className="text-sm font-medium text-slate-500">MAD</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAcceptOffer(offer.id)}
                            disabled={!!acceptingOfferId}
                            className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-primary-600 text-white font-bold text-base hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/25"
                          >
                            {acceptingOfferId === offer.id ? (
                              <span className="inline-flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                En cours...
                              </span>
                            ) : (
                              'Choisir ce plombier'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/60 border-dashed p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-medium text-slate-700 mb-1">Aucune offre pour le moment</p>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Les offres des plombiers disponibles apparaîtront ici. Restez sur cette page.
                </p>
                <div className="mt-4 flex justify-center">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                    En attente...
                  </span>
                </div>
              </div>
            )}
            {showFallbackPhone && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">Aucun plombier disponible ?</p>
                <p className="text-sm text-amber-700 mb-4">
                  Appelez le standard pour une prise en charge immédiate.
                </p>
                <a
                  href={`tel:${FALLBACK_PHONE.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 py-3 px-6 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all"
                >
                  <Phone size={20} />
                  {FALLBACK_PHONE}
                </a>
              </div>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="text-sm text-slate-500 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                {cancelling ? 'Annulation...' : 'Annuler la demande'}
              </button>
            </div>
          </div>
        )}

        {state === 'accepted' && requestData?.plombier && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200/80 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Un plombier arrive</h2>
                  <p className="text-sm text-slate-600 mt-0.5">Votre demande a été acceptée. Le plombier se déplace.</p>
                </div>
              </div>
              <div className="mt-6 bg-slate-50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                    requestData.plombier.certified ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {getInitials(requestData.plombier.name)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{requestData.plombier.name}</p>
                    {requestData.plombier.certified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-primary-100 text-primary-700">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Certifié
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-200 text-slate-600">
                        Standard
                      </span>
                    )}
                  </div>
                </div>
                {requestData.plombier.phone && (
                  <a
                    href={`tel:${requestData.plombier.phone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 py-2.5 px-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
                  >
                    <Phone size={18} />
                    {requestData.plombier.phone}
                  </a>
                )}
                <p className="text-sm text-slate-500">Adresse : {requestData.address}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
              <h3 className="font-bold text-slate-900 mb-2">Suivi du trajet</h3>
              <p className="text-sm text-slate-500 mb-3">
                Vous : adresse d&apos;intervention. Le plombier partage sa position.
              </p>
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                <div ref={mapRef} className="w-full h-[280px] sm:h-[320px] rounded-xl bg-slate-100 overflow-hidden" />
              ) : (
                <div className="rounded-lg bg-gray-100 p-4 space-y-2">
                  <p className="text-sm text-gray-600">
                    {plombierCoords
                      ? 'Position du plombier reçue. Ajoutez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY pour afficher la carte.'
                      : 'En attente de la position du plombier (il doit rester sur la page Interventions instantanées).'}
                  </p>
                  {requestData?.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(requestData.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Ouvrir mon adresse dans Google Maps
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {(state === 'expired' || state === 'cancelled') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {state === 'expired' ? 'Aucun plombier disponible' : 'Demande annulée'}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  {state === 'expired'
                    ? 'Aucun plombier n\'a pu accepter dans le délai. Prenez rendez-vous en nous appelant :'
                    : 'Votre demande a été annulée.'}
                </p>
              </div>
            </div>
            {state === 'expired' && (
              <a
                href={`tel:${FALLBACK_PHONE.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 py-3 px-6 mt-6 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/25"
              >
                <Phone size={20} />
                {FALLBACK_PHONE}
              </a>
            )}
            <button
              onClick={handleNewRequest}
              className="block mt-6 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Faire une nouvelle demande
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200/80 p-8 text-center">
            <p className="text-red-600 font-medium mb-6">{errorMsg || 'Une erreur est survenue.'}</p>
            <button
              onClick={handleNewRequest}
              className="py-3 px-6 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
            >
              Réessayer
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
