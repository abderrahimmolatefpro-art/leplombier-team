'use client';

import { useEffect, useState, useCallback } from 'react';

interface Location {
  lat: number;
  lng: number;
}

export function usePlombierLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      setError('Géolocalisation non supportée');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        setLoading(false);
        setError(
          err.code === 1 ? 'Localisation refusée' : 'Impossible d\'obtenir la position'
        );
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, loading, error, requestLocation };
}
