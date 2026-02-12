'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { Zap, Phone, MapPin, CheckCircle } from 'lucide-react';
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

function formatRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return 'Expiré';
  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${min} min ${sec} s`;
}

export default function PlombierInstantPage() {
  const { plombier, loading: authLoading } = usePlombierAuth();
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
  const [counterOfferRequestId, setCounterOfferRequestId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [selectedRequestForMap, setSelectedRequestForMap] = useState<InstantRequestDoc | null>(null);

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
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1e4b6d28-5f5e-432f-850b-6a10e26e4bd1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instant/page.tsx:available',message:'Plombier availability',data:{available:availableForInstant},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/1e4b6d28-5f5e-432f-850b-6a10e26e4bd1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instant/page.tsx:onSnapshot_doc',message:'Request doc',data:{id:d.id,status:data.status,expiresAt:exp?exp.toISOString():null,included},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          if (included) {
            list.push({
              id: d.id,
              ...data,
              createdAt: data.createdAt,
              expiresAt: data.expiresAt,
            } as InstantRequestDoc);
          }
        });
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1e4b6d28-5f5e-432f-850b-6a10e26e4bd1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instant/page.tsx:onSnapshot_done',message:'Requests list',data:{totalDocs:snapshot.docs.length,listLength:list.length},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        setRequests(list);
      },
      (err) => {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1e4b6d28-5f5e-432f-850b-6a10e26e4bd1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instant/page.tsx:onSnapshot_error',message:'Snapshot error',data:{error:(err as Error)?.message,code:(err as {code?:string})?.code},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
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
      } catch (err) {
        setError('Erreur de connexion');
      } finally {
        setSendingOfferRequestId(null);
        setCounterOfferRequestId(null);
        setCounterAmount('');
        setCounterMessage('');
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

  const handleCounterOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = counterOfferRequestId;
    if (!requestId) return;
    const amount = parseFloat(counterAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Montant invalide');
      return;
    }
    submitOffer(requestId, amount, counterMessage.trim() || undefined);
  };

  useEffect(() => {
    if (authLoading || !plombier) return;
    const showList = available && !myMission;
    fetch('http://127.0.0.1:7247/ingest/1e4b6d28-5f5e-432f-850b-6a10e26e4bd1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instant/page.tsx:visibility',message:'List visibility',data:{available,myMissionId:myMission?.id ?? null,requestsCount:requests.length,showList},timestamp:Date.now(),hypothesisId:'H6'})}).catch(()=>{});
  }, [authLoading, plombier, available, myMission, requests.length]);

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">Interventions instantanées</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-10 h-10 text-primary-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Disponibilité</h2>
                <p className="text-sm text-gray-500">
                  Activez pour recevoir les demandes. Faites une offre ou acceptez le tarif du client ; le client choisit.
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleAvailability}
              disabled={loadingToggle}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${
                available ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition ${
                  available ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

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
              <div className="space-y-4">
                {requests.map((req) => {
                  const hasOffered = myOfferRequestIds.has(req.id);
                  const clientBudget = req.clientProposedAmount ?? 0;
                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-gray-500 text-sm min-w-0">
                            <MapPin size={14} className="flex-shrink-0" />
                            <span className="truncate">{req.address}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(req.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 py-2 px-3 text-primary-600 font-medium text-sm rounded-lg border border-primary-200 hover:bg-primary-50"
                            >
                              <MapPin size={14} />
                              Itinéraire
                            </a>
                            <button
                              type="button"
                              onClick={() => setSelectedRequestForMap(req)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Voir sur la carte
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-900">{req.description}</p>
                        {clientBudget > 0 && (
                          <p className="text-sm text-primary-600 font-medium">
                            Budget client : {clientBudget} MAD
                          </p>
                        )}
                        <p className="text-xs text-amber-600">
                          Expire dans {formatRemaining(req.expiresAt.toDate())}
                        </p>
                        {hasOffered ? (
                          <p className="text-sm text-green-600 font-medium">Offre envoyée</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {clientBudget > 0 && (
                              <button
                                type="button"
                                onClick={() => handleAcceptPrice(req)}
                                disabled={!!sendingOfferRequestId}
                                className="py-3 px-4 min-h-[44px] bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {sendingOfferRequestId === req.id ? 'Envoi...' : 'Accepter ce tarif'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setCounterOfferRequestId(req.id);
                                setCounterAmount(clientBudget > 0 ? String(clientBudget) : '');
                                setCounterMessage('');
                              }}
                              disabled={!!sendingOfferRequestId}
                              className="py-3 px-4 min-h-[44px] bg-white border border-primary-600 text-primary-600 text-sm font-medium rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Faire une contre-offre
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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

        {selectedRequestForMap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Adresse client</h3>
                <button
                  type="button"
                  onClick={() => setSelectedRequestForMap(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Fermer
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-2">{selectedRequestForMap.address}</p>
              <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden bg-gray-100">
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                  <iframe
                    title="Carte adresse client"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: 300 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(selectedRequestForMap.address)}`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full p-4 text-center text-gray-500">
                    <div>
                      <p className="mb-2">Clé Google Maps non configurée.</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRequestForMap.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        Ouvrir dans Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {counterOfferRequestId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contre-offre</h3>
              <form onSubmit={handleCounterOfferSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (MAD)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[200, 300, 400, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCounterAmount(String(amt))}
                        className="py-2 px-4 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                      >
                        {amt} MAD
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ex: 350"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (optionnel)</label>
                  <textarea
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ex: Je peux intervenir dans l'heure"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!!sendingOfferRequestId}
                    className="flex-1 py-3 px-4 min-h-[44px] bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Envoyer l&apos;offre
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCounterOfferRequestId(null);
                      setCounterAmount('');
                      setCounterMessage('');
                      setError('');
                    }}
                    className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
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
