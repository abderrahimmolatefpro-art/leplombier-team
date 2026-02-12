'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
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
  onAccept,
  onCounterOffer,
  onClose,
}: InstantRequestDetailProps) {
  const baseAmount = priceMad > 0 ? priceMad : 300;
  const [counterAmount, setCounterAmount] = useState(String(baseAmount));
  const [counterMessage, setCounterMessage] = useState('');
  const quickAmounts = getQuickAmounts(priceMad);

  const handleCounterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(counterAmount.replace(',', '.'));
    if (Number.isFinite(amount) && amount >= 0) {
      onCounterOffer(amount, counterMessage.trim() || undefined);
    }
  };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapUrl =
    apiKey && plombierLocation
      ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${plombierLocation.lat},${plombierLocation.lng}&destination=${encodeURIComponent(address)}&mode=driving`
      : apiKey
        ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(address)}`
        : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-[40vh] min-h-[200px] flex-shrink-0 bg-gray-100">
          {mapUrl ? (
            <iframe
              title="Carte adresse"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapUrl}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Ouvrir dans Google Maps
              </a>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-lg flex-shrink-0">
              {getInitials(clientName)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{clientName}</p>
              <p className="text-sm text-gray-500">{timeAgo}</p>
              {distanceKm != null && (
                <p className="text-sm text-gray-600 font-medium">
                  {formatTimeAndDistance(distanceKm)}
                </p>
              )}
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold text-gray-900">
                {priceMad > 0 ? `${priceMad} MAD` : 'Non précisé'}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Adresse</p>
            <p className="text-gray-900 flex items-start gap-2">
              <MapPin size={16} className="flex-shrink-0 mt-0.5" />
              {address}
            </p>
          </div>

          {description && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
              <p className="text-gray-600">{description}</p>
            </div>
          )}

          {hasOffered ? (
            <p className="text-green-600 font-medium mb-6">Offre envoyée</p>
          ) : (
            <>
              {priceMad > 0 && (
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={sendingOffer}
                  className="w-full py-4 min-h-[48px] bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 mb-4"
                >
                  {sendingOffer ? 'Envoi...' : `Accepter pour ${priceMad} MAD`}
                </button>
              )}

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Proposez votre prix</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {quickAmounts.map((amt) => (
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
                <form onSubmit={handleCounterSubmit} className="space-y-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: 350"
                  />
                  <textarea
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Message (optionnel)"
                  />
                  <button
                    type="submit"
                    disabled={sendingOffer}
                    className="w-full py-3 min-h-[44px] bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Envoyer l&apos;offre
                  </button>
                </form>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 min-h-[44px] bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
