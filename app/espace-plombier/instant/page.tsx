'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { usePlombierLocation } from '@/hooks/usePlombierLocation';
import { Phone, MapPin, CheckCircle, MapPinned } from 'lucide-react';
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
  const { location: plombierLocation, loading: locationLoading, error: locationError, requestLocation } = usePlombierLocation();
  const router = useRouter();
  const [available, setAvailable] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
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
    getDoc(userRef).then((snap) => {
      const availableForInstant = !!snap.exists() && !!snap.data()?.availableForInstant;
      setAvailable(availableForInstant);
    });
  }, [plombier?.id]);

  const handleToggleAvailability = async () => {
    if (!plombier?.id) return;
    setLoadingToggle(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', plombier.id), {
        availableForInstant: !available,
        updatedAt: Timestamp.now(),
      });
      setAvailable(!available);
    } catch (err) {
      console.error(err);
      setError('Impossible de modifier la disponibilité');
    } finally {
      setLoadingToggle(false);
    }
  };

  useEffect(() => {
    if (!plombier?.id) return;
    const q = query(
      collection(db, 'instantRequests'),
      where('status', '==', 'en_attente')
    );

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
  }, [plombier?.id]);

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

  const handleMarkMissionDone = async () => {
    if (!myMission?.id || !plombier?.id) return;
    const user = auth.currentUser;
    if (!user) return;
    setMarkingDoneId(myMission.id);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/espace-plombier/instant-request/${myMission.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible de marquer la mission comme terminée');
        return;
      }
    } catch (err) {
      console.error(err);
      setError('Impossible de marquer la mission comme terminée');
    } finally {
      setMarkingDoneId(null);
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
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="w-10 flex-shrink-0" />
          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={loadingToggle}
            className={`flex-1 max-w-[200px] py-2.5 px-4 rounded-full font-medium text-sm transition-colors ${
              available
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {available ? 'En ligne' : 'Hors ligne'}
          </button>
          <div className="w-10 flex-shrink-0" />
        </div>
        {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
      </header>

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
                : 'Autorisez la localisation pour voir les distances et temps de déplacement vers chaque intervention.'}
            </p>
            {locationError && (
              <button
                type="button"
                onClick={requestLocation}
                className="py-2.5 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
              >
                Réessayer
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
            onAccept={() => handleAcceptPrice(selectedRequest)}
            onCounterOffer={(amount, message) =>
              submitOffer(selectedRequest.id, amount, message)
            }
            onClose={() => setSelectedRequest(null)}
          />
        )}
      </main>
    </div>
  );
}
