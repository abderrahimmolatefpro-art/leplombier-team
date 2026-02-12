/**
 * Calcule la distance en km entre deux points (formule de Haversine).
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Formate une distance en km pour l'affichage : "~1,9 km" ou "~500 m"
 */
export function formatDistance(km: number): string {
  if (km < 0.1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `~${km.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/**
 * Estime le temps de trajet en minutes (ville, ~28 km/h).
 */
export function estimateTravelTimeMinutes(distanceKm: number): number {
  const avgSpeedKmh = 28;
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

/**
 * Formate temps + distance pour affichage InDrive : "5 min · 1,9 km"
 */
export function formatTimeAndDistance(distanceKm: number): string {
  const min = estimateTravelTimeMinutes(distanceKm);
  const distStr =
    distanceKm < 0.1
      ? `${Math.round(distanceKm * 1000)} m`
      : `${distanceKm.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
  return `${min} min · ${distStr}`;
}
