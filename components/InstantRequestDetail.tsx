'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Camera, ImageIcon, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatTimeAndDistance } from '@/lib/geo';

interface InstantRequestDetailProps {
  clientName: string;
  address: string;
  description: string;
  distanceKm: number | null;
  priceMad: number;
  timeAgo: string;
  hasOffered: boolean;
  sendingOffer: boolean;
  plombierLocation: { lat: number; lng: number } | null;
  requestId?: string;
  photoRequested?: boolean;
  photos?: string[];
  onRequestPhotos?: () => Promise<void>;
  requestingPhotos?: boolean;
  onAccept: () => void;
  onCounterOffer: (amount: number, message?: string) => void;
  onClose: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function getQuickAmounts(priceMad: number): number[] {
  if (priceMad <= 0) return [200, 300, 400, 500];
  if (priceMad < 100) return [2, 5, 10, 20].map((o) => priceMad + o);
  return [50, 100, 150, 200].map((o) => priceMad + o);
}

export default function InstantRequestDetail({
  clientName,
  address,
  description,
  distanceKm,
  priceMad,
  timeAgo,
  hasOffered,
  sendingOffer,
  plombierLocation,
  requestId,
  photoRequested,
  photos = [],
  onRequestPhotos,
  requestingPhotos,
  onAccept,
  onCounterOffer,
  onClose,
}: InstantRequestDetailProps) {
  const baseAmount = priceMad > 0 ? priceMad : 300;
  const [counterAmount, setCounterAmount] = useState(String(baseAmount));
  const [counterMessage, setCounterMessage] = useState('');
  const [showCustomOffer, setShowCustomOffer] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxScale, setLightboxScale] = useState(1);
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const quickAmounts = getQuickAmounts(priceMad);

  const openLightbox = useCallback((i: number) => {
    setLightboxIndex(i);
    setLightboxScale(1);
  }, []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const zoomLightbox = useCallback((delta: number) => {
    setLightboxScale((s) => Math.max(0.5, Math.min(4, s + delta)));
  }, []);

  useEffect(() => {
    if (lightboxIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, closeLightbox]);

  useEffect(() => {
    const el = lightboxRef.current;
    if (!el || lightboxIndex == null) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setLightboxScale((s) => Math.max(0.5, Math.min(4, s + (e.deltaY > 0 ? -0.2 : 0.2))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [lightboxIndex]);

  const handleCounterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(counterAmount.replace(',', '.'));
    if (Number.isFinite(amount) && amount >= 0) {
      onCounterOffer(amount, counterMessage.trim() || undefined);
    }
  };

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [clientCoords, setClientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.lat && data.lng) {
          setClientCoords({ lat: data.lat, lng: data.lng });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key || !mapRef.current) return;

    const center = clientCoords || plombierLocation || { lat: 33.5731, lng: -7.5898 };

    const initMap = () => {
      const g = (window as unknown as { google?: typeof google }).google;
      if (!g?.maps?.Map || !mapRef.current) return;

      if (!mapInstanceRef.current) {
        const map = new g.maps.Map(mapRef.current, {
          center,
          zoom: 14,
          gestureHandling: 'greedy',
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current = null;

      if (clientCoords) {
        const clientMarker = new g.maps.Marker({
          position: clientCoords,
          map,
          title: 'Client',
        });
        markersRef.current.push(clientMarker);
      }
      if (plombierLocation) {
        const plombierMarker = new g.maps.Marker({
          position: plombierLocation,
          map,
          title: 'Vous',
        });
        markersRef.current.push(plombierMarker);
      }

      if (clientCoords && plombierLocation) {
        const directionsService = new g.maps.DirectionsService();
        const directionsRenderer = new g.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
        });
        directionsRendererRef.current = directionsRenderer;
        directionsService.route(
          {
            origin: plombierLocation,
            destination: clientCoords,
            travelMode: g.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === g.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);
              const leg = result.routes[0]?.legs[0];
              if (leg) {
                const distKm = leg.distance?.value ? leg.distance.value / 1000 : 0;
                const durMin = leg.duration?.value ? Math.round(leg.duration.value / 60) : 0;
                setRouteInfo({ distanceKm: distKm, durationMin: durMin });
              }
              const bounds = new g.maps.LatLngBounds();
              result.routes[0]?.legs.forEach((leg) => {
                bounds.extend(leg.start_location);
                bounds.extend(leg.end_location);
              });
              map.fitBounds(bounds);
            } else {
              setRouteInfo(null);
              const bounds = new g.maps.LatLngBounds();
              bounds.extend(clientCoords);
              bounds.extend(plombierLocation);
              map.fitBounds(bounds);
            }
          }
        );
      } else if (clientCoords) {
        map.setCenter(clientCoords);
        map.setZoom(16);
        setRouteInfo(null);
      } else if (plombierLocation) {
        map.setCenter(plombierLocation);
        map.setZoom(14);
        setRouteInfo(null);
      }
    };

    const run = () => {
      const g = (window as unknown as { google?: typeof google }).google;
      if (g?.maps?.Map) {
        initMap();
        return;
      }
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) {
        const check = () => {
          const g2 = (window as unknown as { google?: typeof google }).google;
          if (g2?.maps?.Map) {
            initMap();
            return;
          }
          setTimeout(check, 100);
        };
        check();
        return;
      }

      const cbName = `__instantMapInit_${Date.now()}`;
      (window as unknown as Record<string, () => void>)[cbName] = () => {
        initMap();
        delete (window as unknown as Record<string, unknown>)[cbName];
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${cbName}`;
      script.async = true;
      document.head.appendChild(script);
    };

    run();

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current = null;
      mapInstanceRef.current = null;
      setRouteInfo(null);
    };
  }, [address, clientCoords, plombierLocation]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleQuickOffer = (amt: number) => {
    onCounterOffer(amt);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white h-dvh">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <span className="text-sm font-medium text-gray-600">Détail de la demande</span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -m-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Fermer"
        >
          <X size={22} />
        </button>
      </header>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="h-[32vh] min-h-[160px] flex-shrink-0 bg-gray-100 relative">
          {apiKey ? (
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline text-sm"
              >
                Ouvrir dans Google Maps
              </a>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-6">
          <div className="flex flex-col gap-3">
            {(routeInfo || distanceKm != null) && (
              <div className="p-2.5 rounded-lg bg-primary-50 border border-primary-100 flex-shrink-0">
                <p className="text-xs text-primary-600 font-medium">Distance jusqu&apos;au client</p>
                <p className="text-base font-bold text-primary-800">
                  {routeInfo
                    ? `${routeInfo.durationMin} min · ${routeInfo.distanceKm < 0.1 ? `${Math.round(routeInfo.distanceKm * 1000)} m` : `${routeInfo.distanceKm.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`}`
                    : formatTimeAndDistance(distanceKm!)}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                {getInitials(clientName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">{clientName}</p>
                <p className="text-xs text-gray-500">{timeAgo}</p>
              </div>
              <p className="text-xl font-bold text-gray-900 flex-shrink-0">
                {priceMad > 0 ? `${priceMad} MAD` : '—'}
              </p>
            </div>

            <div className="flex items-start gap-2 flex-shrink-0 min-w-0">
              <MapPin size={14} className="flex-shrink-0 mt-0.5 text-gray-400" />
              <p className="text-sm text-gray-700 line-clamp-2">{address}</p>
            </div>

            {description ? (
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Description</p>
                <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
              </div>
            ) : null}

            {photos.length > 0 && (
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-gray-500 mb-1">Photos du client</p>
                <div className="flex gap-2 flex-wrap">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openLightbox(i)}
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:ring-2 hover:ring-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lightboxIndex != null && photos[lightboxIndex] && (
              <div
                ref={lightboxRef}
                className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
                onClick={closeLightbox}
                role="dialog"
                aria-modal="true"
                aria-label="Photo agrandie"
              >
                <div
                  className="absolute top-4 right-4 flex items-center gap-2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => zoomLightbox(-0.25)}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                    aria-label="Réduire"
                  >
                    <ZoomOut size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomLightbox(0.25)}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                    aria-label="Agrandir"
                  >
                    <ZoomIn size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={closeLightbox}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                    aria-label="Fermer"
                  >
                    <X size={24} />
                  </button>
                </div>
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = lightboxIndex ?? 0;
                        setLightboxIndex(idx > 0 ? idx - 1 : photos.length - 1);
                        setLightboxScale(1);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 z-10"
                      aria-label="Photo précédente"
                    >
                      <ChevronLeft size={28} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = lightboxIndex ?? 0;
                        setLightboxIndex(idx < photos.length - 1 ? idx + 1 : 0);
                        setLightboxScale(1);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 z-10"
                      aria-label="Photo suivante"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </>
                )}
                <img
                  src={photos[lightboxIndex]}
                  alt={`Photo ${lightboxIndex + 1}`}
                  className="max-w-[95vw] max-h-[90vh] object-contain cursor-zoom-in transition-transform duration-150"
                  style={{ transform: `scale(${lightboxScale})` }}
                  onClick={(e) => e.stopPropagation()}
                  draggable={false}
                />
              </div>
            )}

            {requestId && onRequestPhotos && !photoRequested && (
              <button
                type="button"
                onClick={onRequestPhotos}
                disabled={requestingPhotos}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-primary-300 bg-primary-50/50 text-primary-700 text-sm font-medium hover:bg-primary-50 disabled:opacity-50"
              >
                <Camera size={18} />
                {requestingPhotos ? 'Envoi...' : 'Demander des photos au client'}
              </button>
            )}
            {photoRequested && photos.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
                <ImageIcon size={16} />
                Photos demandées – en attente du client
              </p>
            )}

            {hasOffered ? (
              <p className="text-green-600 font-medium text-sm py-2">Offre envoyée</p>
            ) : (
              <div className="flex flex-col gap-3 flex-shrink-0">
                {priceMad > 0 && (
                  <button
                    type="button"
                    onClick={onAccept}
                    disabled={sendingOffer}
                    className="w-full py-3.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    {sendingOffer ? 'Envoi...' : `Accepter pour ${priceMad} MAD`}
                  </button>
                )}

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Proposez votre prix</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickOffer(amt)}
                        disabled={sendingOffer}
                        className="flex-shrink-0 py-2 px-3.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                      >
                        {amt} MAD
                      </button>
                    ))}
                  </div>
                  {!showCustomOffer ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomOffer(true)}
                      className="mt-2 text-sm text-primary-600 hover:underline"
                    >
                      Proposer un autre montant
                    </button>
                  ) : (
                    <form onSubmit={handleCounterSubmit} className="mt-2 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={counterAmount}
                          onChange={(e) => setCounterAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="Ex: 350"
                        />
                        <button
                          type="submit"
                          disabled={sendingOffer}
                          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                          Envoyer
                        </button>
                      </div>
                      <input
                        type="text"
                        value={counterMessage}
                        onChange={(e) => setCounterMessage(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Message (optionnel)"
                      />
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
