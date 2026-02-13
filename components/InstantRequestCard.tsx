'use client';

import { MapPin, MoreVertical } from 'lucide-react';
import { formatTimeAndDistance } from '@/lib/geo';

interface InstantRequestCardProps {
  clientName: string;
  address: string;
  distanceKm: number | null;
  priceMad: number; // 0 = non précisé
  timeAgo: string;
  hasOffered: boolean;
  onPress: () => void;
  itineraryUrl?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

export default function InstantRequestCard({
  clientName,
  address,
  distanceKm,
  priceMad,
  timeAgo,
  hasOffered,
  onPress,
  itineraryUrl,
}: InstantRequestCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={(e) => e.key === 'Enter' && onPress()}
      className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm active:bg-gray-50 flex items-stretch gap-3"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
        {getInitials(clientName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900 truncate">{clientName}</p>
            <p className="text-sm text-gray-500">{timeAgo}</p>
          </div>
          {distanceKm != null && (
            <span className="text-sm text-gray-600 flex-shrink-0">{formatTimeAndDistance(distanceKm)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <MapPin size={14} className="flex-shrink-0 text-gray-400" />
          <p className="text-sm text-gray-600 truncate">{address}</p>
        </div>
        {hasOffered && (
          <p className="text-sm text-green-600 font-medium mt-2">Offre envoyée</p>
        )}
      </div>
      <div className="flex flex-col items-end justify-between flex-shrink-0 gap-2">
        <div className="bg-primary-50 border border-primary-200/60 rounded-lg px-3 py-2 text-center min-w-[72px]">
          <p className="text-xl font-bold text-primary-700 leading-tight">
            {priceMad > 0 ? priceMad : '—'}
          </p>
          <p className="text-xs font-medium text-primary-600">{priceMad > 0 ? 'MAD' : ''}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          {itineraryUrl && (
            <a
              href={itineraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary-600 hover:underline font-medium"
            >
              Itinéraire
            </a>
          )}
          <MoreVertical size={16} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
