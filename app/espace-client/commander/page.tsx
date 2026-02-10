'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ArrowLeft, Zap, Phone, CheckCircle, XCircle } from 'lucide-react';

const POLL_INTERVAL_MS = 2500;
const PLOMBIER_LOCATION_POLL_MS = 15000;
const FALLBACK_PHONE = '06 71 05 23 71';

type RequestState = 'idle' | 'submitting' | 'waiting' | 'accepted' | 'expired' | 'cancelled' | 'error';

interface OfferItem {
  id: string;
  plombierId: string;
  plombierName: string;
  proposedAmount: number;
  message?: string;
  status: string;
}

interface RequestData {
  id: string;
  status: string;
  address: string;
  description: string;
  clientProposedAmount?: number;
  plombier?: { id: string; name: string; phone?: string };
  offers?: OfferItem[];
  expiresAt: string | null;
}

export default function CommanderPage() {
  const { client, loading: authLoading, token } = useClientAuth();
  const router = useRouter();
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
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

      setRequestData(data);

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
      });
      setState('waiting');
    } catch {
      setErrorMsg('Erreur de connexion');
      setState('idle');
    }
  };

  const handleNewRequest = () => {
    setRequestId(null);
    setRequestData(null);
    setState('idle');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/espace-client/dashboard"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Commander un plombier</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {(state === 'idle' || state === 'submitting') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-10 h-10 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Intervention immédiate</h2>
                <p className="text-sm text-gray-500">
                  Décrivez votre urgence. Les plombiers disponibles acceptent en temps réel.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Adresse d'intervention"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget proposé (MAD) <span className="text-gray-400 font-normal">optionnel</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={clientProposedAmount}
                  onChange={(e) => setClientProposedAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ex: 500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description du problème</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ex: Fuite sous l'évier, robinet qui goutte..."
                  required
                />
              </div>
              {errorMsg && (
                <p className="text-sm text-red-600">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={state === 'submitting'}
                className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state === 'submitting' ? 'Envoi en cours...' : 'Envoyer ma demande'}
              </button>
            </form>
          </div>
        )}

        {state === 'waiting' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">En attente d&apos;offres</h2>
              <p className="text-gray-600 text-sm mb-4">
                Les plombiers disponibles peuvent accepter votre tarif ou vous faire une contre-offre. Vous choisirez l&apos;offre qui vous convient.
              </p>
              {requestData?.clientProposedAmount != null && requestData.clientProposedAmount > 0 && (
                <p className="text-sm text-gray-500">
                  Votre budget : {requestData.clientProposedAmount} MAD
                </p>
              )}
            </div>
            {requestData?.offers && requestData.offers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Offres reçues ({requestData.offers.length})</h3>
                <div className="space-y-4">
                  {requestData.offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 border border-gray-100 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{offer.plombierName}</p>
                        <p className="text-primary-600 font-semibold">{offer.proposedAmount} MAD</p>
                        {offer.message && (
                          <p className="text-sm text-gray-500 mt-1">{offer.message}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={!!acceptingOfferId}
                        className="py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {acceptingOfferId === offer.id ? 'Choisi...' : 'Choisir'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {requestData?.offers?.length === 0 && (
              <p className="text-center text-gray-500 text-sm">Aucune offre pour le moment. Les offres apparaîtront ici.</p>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
              >
                {cancelling ? 'Annulation...' : 'Annuler la demande'}
              </button>
            </div>
          </div>
        )}

        {state === 'accepted' && requestData?.plombier && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-green-200 p-8">
              <div className="flex items-center gap-3 text-green-700 mb-4">
                <CheckCircle className="w-12 h-12" />
                <div>
                  <h2 className="text-lg font-semibold">Un plombier arrive</h2>
                  <p className="text-sm">Votre demande a été acceptée. Le plombier se déplace.</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-900">{requestData.plombier.name}</p>
                {requestData.plombier.phone && (
                  <a
                    href={`tel:${requestData.plombier.phone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 text-primary-600 hover:underline"
                  >
                    <Phone size={16} />
                    {requestData.plombier.phone}
                  </a>
                )}
                <p className="text-sm text-gray-500">Adresse : {requestData.address}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Suivi du trajet</h3>
              <p className="text-sm text-gray-500 mb-3">
                Vous : adresse d&apos;intervention. Le plombier partage sa position.
              </p>
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                <div ref={mapRef} className="w-full h-[300px] rounded-lg bg-gray-100" />
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <XCircle className="w-12 h-12" />
              <div>
                <h2 className="text-lg font-semibold">
                  {state === 'expired' ? 'Aucun plombier disponible' : 'Demande annulée'}
                </h2>
                <p className="text-sm text-gray-600">
                  {state === 'expired'
                    ? 'Aucun plombier n\'a pu accepter dans le délai. Prenez rendez-vous en nous appelant :'
                    : 'Votre demande a été annulée.'}
                </p>
              </div>
            </div>
            {state === 'expired' && (
              <a
                href={`tel:${FALLBACK_PHONE.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 py-3 px-6 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
              >
                <Phone size={20} />
                {FALLBACK_PHONE}
              </a>
            )}
            <button
              onClick={handleNewRequest}
              className="block mt-4 text-sm text-primary-600 hover:underline"
            >
              Faire une nouvelle demande
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
            <p className="text-red-600 mb-4">{errorMsg || 'Une erreur est survenue.'}</p>
            <button
              onClick={handleNewRequest}
              className="text-primary-600 hover:underline"
            >
              Réessayer
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
