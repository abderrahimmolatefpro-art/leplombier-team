'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { usePlombierLocation } from '@/hooks/usePlombierLocation';
import { Phone, MapPin, CheckCircle, MapPinned, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { haversineDistance } from '@/lib/geo';
import InstantRequestCard from '@/components/InstantRequestCard';
import InstantRequestDetail from '@/components/InstantRequestDetail';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface InstantRequestDoc {
  id: string;
  clientId: string;
  address: string;
  description: string;
  clientProposedAmount?: number;
  status: string;
  plombierId?: string;
  photoRequested?: boolean;
  photos?: string[];
  etaMinutes?: number;
  etaAt?: { toDate: () => Date };
  arrivedAt?: { toDate: () => Date };
  clientReadyAt?: { toDate: () => Date };
  createdAt: { toDate: () => Date };
  expiresAt: { toDate: () => Date };
}

interface ClientDoc {
  name: string;
  phone: string;
  address?: string;
}

export default function PlombierInstantPage() {
  const { plombier, loading: authLoading } = usePlombierAuth();
  const { location: plombierLocation, loading: locationLoading, error: locationError, requestLocation, openAppSettings, isNativeAndroid } = usePlombierLocation();
  const router = useRouter();
  const [available, setAvailable] = useState(false);
  const [requests, setRequests] = useState<InstantRequestDoc[]>([]);
  const [myMission, setMyMission] = useState<InstantRequestDoc | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientDoc | null>(null);
  const [sendingOfferRequestId, setSendingOfferRequestId] = useState<string | null>(null);
  const [markingDoneId, setMarkingDoneId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [myOfferRequestIds, setMyOfferRequestIds] = useState<Set<string>>(new Set());
  const [clientsMap, setClientsMap] = useState<Record<string, { name: string }>>({});
  const [distancesMap, setDistancesMap] = useState<Record<string, number>>({});
  const geocodeCacheRef = useRef<Record<string, { lat: number; lng: number }>>({});
  const [selectedRequest, setSelectedRequest] = useState<InstantRequestDoc | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewClientId, setReviewClientId] = useState<string | null>(null);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [requestingPhotosId, setRequestingPhotosId] = useState<string | null>(null);
  const [settingEtaId, setSettingEtaId] = useState<string | null>(null);
  const [settingArrivedId, setSettingArrivedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRequest) return;
    const stillAvailable = requests.some((r) => r.id === selectedRequest.id);
    if (!stillAvailable) {
      setSelectedRequest(null);
    }
  }, [requests, selectedRequest]);

  useEffect(() => {
    if (!authLoading && !plombier) {
      router.replace('/espace-plombier/login');
    }
  }, [authLoading, plombier, router]);

  useEffect(() => {
    if (!plombier?.id) return;

    const userRef = doc(db, 'users', plombier.id);
    const unsub = onSnapshot(userRef, (snap) => {
      setAvailable(!!(snap.exists() && snap.data()?.availableForInstant));
    });
    return () => unsub();
  }, [plombier?.id]);

  useEffect(() => {
    if (!plombier?.id) return;
    const plombierCity = plombier.city?.trim();
    const constraints = [
      where('status', '==', 'en_attente'),
      ...(plombierCity ? [where('city', '==', plombierCity)] : []),
    ];
    const q = query(collection(db, 'instantRequests'), ...constraints);

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const now = new Date();
        const list: InstantRequestDoc[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const exp = data.expiresAt?.toDate?.();
          const included = !!(exp && exp > now);
          if (included) {
            list.push({
              id: d.id,
              ...data,
              createdAt: data.createdAt,
              expiresAt: data.expiresAt,
            } as InstantRequestDoc);
          }
        });
        setRequests(list);
      },
      (err) => {
        console.error('Instant requests snapshot error:', err);
      }
    );

    return () => unsub();
  }, [plombier?.id, plombier?.city]);

  useEffect(() => {
    if (!plombier?.id) return;
    const q = query(
      collection(db, 'instantOffers'),
      where('plombierId', '==', plombier.id)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const ids = new Set<string>();
      snapshot.docs.forEach((d) => {
        const requestId = d.data()?.requestId;
        if (requestId) ids.add(requestId);
      });
      setMyOfferRequestIds(ids);
    });
    return () => unsub();
  }, [plombier?.id]);

  useEffect(() => {
    if (!plombier?.id) return;

    const q = query(
      collection(db, 'instantRequests'),
      where('plombierId', '==', plombier.id),
      where('status', '==', 'accepte')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setMyMission(null);
        setClientInfo(null);
        return;
      }
      const reqDoc = snapshot.docs[0];
      const data = reqDoc.data();
      const req: InstantRequestDoc = {
        id: reqDoc.id,
        ...data,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      } as InstantRequestDoc;
      setMyMission(req);

      getDoc(doc(db, 'clients', req.clientId)).then((clientSnap) => {
        if (clientSnap.exists()) {
          const c = clientSnap.data();
          setClientInfo({
            name: c.name || '',
            phone: c.phone || '',
            address: c.address,
          });
        } else {
          setClientInfo(null);
        }
      });
    });

    return () => unsub();
  }, [plombier?.id]);

  useEffect(() => {
    if (!myMission?.id) return;
    const locationRef = doc(db, 'instantRequests', myMission.id, 'plombierLocation', 'current');
    const sendPosition = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDoc(locationRef, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            updatedAt: Timestamp.now(),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 60000 }
      );
    };
    sendPosition();
    const interval = setInterval(sendPosition, 15000);
    return () => clearInterval(interval);
  }, [myMission?.id]);

  useEffect(() => {
    if (requests.length === 0) return;
    const clientIds = [...new Set(requests.map((r) => r.clientId))];
    const loadClients = async () => {
      const map: Record<string, { name: string }> = {};
      for (const cid of clientIds) {
        const snap = await getDoc(doc(db, 'clients', cid));
        if (snap.exists()) {
          map[cid] = { name: snap.data().name || 'Client' };
        } else {
          map[cid] = { name: 'Client' };
        }
      }
      setClientsMap(map);
    };
    loadClients();
  }, [requests]);

  useEffect(() => {
    if (!plombierLocation || requests.length === 0) return;

    const fetchDistances = async () => {
      const updates: Record<string, number> = {};
      for (const req of requests) {
        const cached = geocodeCacheRef.current[req.address];
        let lat: number;
        let lng: number;
        if (cached) {
          lat = cached.lat;
          lng = cached.lng;
        } else {
          try {
            const res = await fetch(`/api/geocode?address=${encodeURIComponent(req.address)}`);
            const data = await res.json();
            if (data.lat != null && data.lng != null) {
              lat = data.lat;
              lng = data.lng;
              geocodeCacheRef.current[req.address] = { lat, lng };
            } else {
              continue;
            }
          } catch {
            continue;
          }
        }
        const km = haversineDistance(
          plombierLocation.lat,
          plombierLocation.lng,
          lat,
          lng
        );
        updates[req.id] = km;
      }
      setDistancesMap((prev) => ({ ...prev, ...updates }));
    };

    fetchDistances();
  }, [plombierLocation, requests]);

  const submitOffer = useCallback(
    async (requestId: string, proposedAmount: number, message?: string) => {
      const user = auth.currentUser;
      if (!user || !plombier?.id) return;
      setSendingOfferRequestId(requestId);
      setError('');
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/espace-plombier/instant-offer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ requestId, proposedAmount, message: message || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erreur lors de l\'envoi de l\'offre');
          return;
        }
        setMyOfferRequestIds((prev) => new Set(prev).add(requestId));
        setSelectedRequest(null);
      } catch (err) {
        setError('Erreur de connexion');
      } finally {
        setSendingOfferRequestId(null);
      }
    },
    [plombier?.id]
  );

  const handleAcceptPrice = (req: InstantRequestDoc) => {
    const amount = req.clientProposedAmount ?? 0;
    submitOffer(req.id, amount);
  };

  const handleRequestPhotos = useCallback(
    async (requestId: string) => {
      const user = auth.currentUser;
      if (!user) return;
      setRequestingPhotosId(requestId);
      setError('');
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(
          `/api/espace-plombier/instant-request/${requestId}/request-photos`,
          { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } }
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erreur lors de la demande');
          return;
        }
        setSelectedRequest(null);
      } catch (err) {
        setError('Erreur de connexion');
      } finally {
        setRequestingPhotosId(null);
      }
    },
    []
  );

  const handleSetEta = useCallback(
    async (requestId: string, etaMinutes: number) => {
      const user = auth.currentUser;
      if (!user) return;
      setSettingEtaId(requestId);
      setError('');
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/espace-plombier/instant-request/${requestId}/set-eta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ etaMinutes }),
        });
        const data = await res.json();
        if (!res.ok) setError(data.error || 'Erreur');
      } catch {
        setError('Erreur de connexion');
      } finally {
        setSettingEtaId(null);
      }
    },
    []
  );

  const handleArrived = useCallback(async (requestId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    setSettingArrivedId(requestId);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/espace-plombier/instant-request/${requestId}/arrived`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Erreur');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSettingArrivedId(null);
    }
  }, []);

  const handleMarkMissionDone = async () => {
    if (!myMission?.id || !plombier?.id) return;
    const user = auth.currentUser;
    if (!user) return;
    const missionId = myMission.id;
    const clientId = myMission.clientId;
    setMarkingDoneId(missionId);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/espace-plombier/instant-request/${missionId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible de marquer la mission comme terminée');
        return;
      }
      setShowReviewModal(true);
      setReviewClientId(clientId);
      setReviewRequestId(missionId);
    } catch (err) {
      console.error(err);
      setError('Impossible de marquer la mission comme terminée');
    } finally {
      setMarkingDoneId(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRequestId || !reviewClientId || !plombier?.id || reviewRating < 1) return;
    const user = auth.currentUser;
    if (!user) return;
    setReviewSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          instantRequestId: reviewRequestId,
          toUserId: reviewClientId,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowReviewModal(false);
        setReviewClientId(null);
        setReviewRequestId(null);
        setReviewRating(0);
        setReviewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (authLoading || !plombier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {error && (
        <div className="max-w-4xl mx-auto px-4 pt-2">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {available && !myMission && (locationLoading || locationError) && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <MapPinned className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              {locationLoading ? 'Localisation en cours...' : 'Activez la localisation'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {locationLoading
                ? 'Nous calculons les distances et temps de trajet vers les demandes.'
                : isNativeAndroid
                ? 'Ouvrez les paramètres de l\'app pour activer la localisation et voir les distances vers chaque intervention.'
                : 'Autorisez la localisation pour voir les distances et temps de déplacement vers chaque intervention.'}
            </p>
            {locationError && (
              <button
                type="button"
                onClick={isNativeAndroid ? openAppSettings : requestLocation}
                className="py-2.5 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
              >
                {isNativeAndroid ? 'Ouvrir les paramètres' : 'Réessayer'}
              </button>
            )}
          </div>
        )}

        {myMission && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 text-green-700 mb-4">
              <CheckCircle className="w-10 h-10" />
              <div>
                <h3 className="font-semibold">Mission en cours</h3>
                <p className="text-sm">Déplacez-vous immédiatement chez le client.</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{myMission.address}</p>
                  <p className="text-sm text-gray-600">{myMission.description}</p>
                </div>
              </div>
              {clientInfo && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm text-gray-600">{clientInfo.name}</span>
                  {clientInfo.phone && (
                    <a
                      href={`tel:${clientInfo.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-1 text-primary-600 font-medium hover:underline"
                    >
                      <Phone size={16} />
                      {clientInfo.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
            {myMission.clientReadyAt && (
              <div className="mt-3 py-2 px-3 rounded-lg bg-blue-50 text-blue-800 text-sm font-medium">
                ✓ Le client est chez lui et vous attend
              </div>
            )}
            {(!myMission.etaMinutes || (myMission.etaAt && myMission.etaAt.toDate().getTime() < Date.now())) && !myMission.arrivedAt && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {myMission.etaAt && myMission.etaAt.toDate().getTime() < Date.now()
                    ? 'Mettez à jour votre heure d\'arrivée'
                    : 'Indiquez votre heure d\'arrivée au client'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSetEta(myMission.id, m)}
                      disabled={settingEtaId === myMission.id}
                      className="py-2 px-3 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      {settingEtaId === myMission.id ? '...' : `${m} min`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {myMission.etaMinutes && !myMission.arrivedAt && (
              <div className={`mt-3 py-2 px-3 rounded-lg text-sm ${
                myMission.etaAt && myMission.etaAt.toDate().getTime() < Date.now()
                  ? 'bg-amber-100 text-amber-900 font-medium'
                  : 'bg-amber-50 text-amber-800'
              }`}>
                {myMission.etaAt && myMission.etaAt.toDate().getTime() < Date.now() ? (
                  <>L&apos;heure indiquée est dépassée. Mettez à jour ou confirmez votre arrivée.</>
                ) : (
                  <>Arrivée indiquée : dans {myMission.etaMinutes} min</>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {clientInfo?.phone && (
                <a
                  href={`tel:${clientInfo.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                >
                  <Phone size={20} />
                  Appeler
                </a>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(myMission.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] bg-white border border-green-600 text-green-700 font-medium rounded-lg hover:bg-green-50"
              >
                <MapPin size={20} />
                Itinéraire
              </a>
              {!myMission.arrivedAt && (
                <button
                  type="button"
                  onClick={() => handleArrived(myMission.id)}
                  disabled={settingArrivedId === myMission.id}
                  className="py-3 px-4 min-h-[44px] bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {settingArrivedId === myMission.id ? 'Envoi...' : 'Je suis arrivé'}
                </button>
              )}
              {myMission.arrivedAt && (
                <span className="py-3 px-4 min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-green-100 text-green-800 font-medium">
                  <CheckCircle size={20} />
                  Arrivé
                </span>
              )}
              <button
                type="button"
                onClick={handleMarkMissionDone}
                disabled={!!markingDoneId}
                className="py-3 px-4 min-h-[44px] bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {markingDoneId ? 'Enregistrement...' : 'Marquer comme terminée'}
              </button>
            </div>
          </div>
        )}

        {available && !myMission && !plombier.city && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <MapPin className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Renseignez votre ville</p>
              <p className="text-sm text-amber-800 mt-1">
                Indiquez votre ville dans Paramètres pour voir uniquement les demandes de votre zone.
              </p>
              <Link
                href="/espace-plombier/parametres"
                className="inline-block mt-2 text-sm font-medium text-primary-600 hover:underline"
              >
                Aller aux paramètres →
              </Link>
            </div>
          </div>
        )}

        {available && !myMission && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Demandes disponibles ({requests.length})
            </h3>
            {requests.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
                Aucune demande pour le moment. Les nouvelles demandes apparaîtront ici en temps réel.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => {
                  const hasOffered = myOfferRequestIds.has(req.id);
                  const clientBudget = req.clientProposedAmount ?? 0;
                  const clientName = clientsMap[req.clientId]?.name ?? 'Client';
                  const timeAgo = formatDistanceToNow(req.createdAt.toDate(), {
                    addSuffix: false,
                    locale: fr,
                  });
                  const distanceKm = distancesMap[req.id] ?? null;

                  return (
                    <InstantRequestCard
                      key={req.id}
                      clientName={clientName}
                      address={req.address}
                      distanceKm={distanceKm}
                      priceMad={clientBudget}
                      timeAgo={timeAgo}
                      hasOffered={hasOffered}
                      onPress={() => setSelectedRequest(req)}
                      itineraryUrl={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(req.address)}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!available && !myMission && (
          <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-500">
            Activez votre disponibilité pour voir les demandes des clients.
          </div>
        )}

        {selectedRequest && (
          <InstantRequestDetail
            key={selectedRequest.id}
            clientName={clientsMap[selectedRequest.clientId]?.name ?? 'Client'}
            address={selectedRequest.address}
            description={selectedRequest.description}
            distanceKm={distancesMap[selectedRequest.id] ?? null}
            priceMad={selectedRequest.clientProposedAmount ?? 0}
            timeAgo={formatDistanceToNow(selectedRequest.createdAt.toDate(), {
              addSuffix: false,
              locale: fr,
            })}
            hasOffered={myOfferRequestIds.has(selectedRequest.id)}
            sendingOffer={sendingOfferRequestId === selectedRequest.id}
            plombierLocation={plombierLocation}
            requestId={selectedRequest.id}
            photoRequested={selectedRequest.photoRequested}
            photos={selectedRequest.photos}
            onRequestPhotos={() => handleRequestPhotos(selectedRequest.id)}
            requestingPhotos={requestingPhotosId === selectedRequest.id}
            onAccept={() => handleAcceptPrice(selectedRequest)}
            onCounterOffer={(amount, message) =>
              submitOffer(selectedRequest.id, amount, message)
            }
            onClose={() => setSelectedRequest(null)}
          />
        )}

        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="font-bold text-gray-900 mb-2">Mission terminée !</h3>
              <p className="text-sm text-gray-500 mb-4">Noter le client (optionnel)</p>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      className="p-2 rounded-lg hover:bg-gray-50"
                    >
                      <Star
                        size={28}
                        className={reviewRating >= n ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Votre avis (optionnel)"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      setReviewClientId(null);
                      setReviewRequestId(null);
                      setReviewRating(0);
                      setReviewComment('');
                    }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium"
                  >
                    Passer
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting || reviewRating < 1}
                    className="flex-1 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50"
                  >
                    {reviewSubmitting ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
