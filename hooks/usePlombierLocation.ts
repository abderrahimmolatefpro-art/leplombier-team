'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface Location {
  lat: number;
  lng: number;
}

function isNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  return !!(cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'android');
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

  const openedSettingsRef = useRef(false);

  const openAppSettings = useCallback(async () => {
    if (!isNativeAndroid()) {
      requestLocation();
      return;
    }
    try {
      openedSettingsRef.current = true;
      const { NativeSettings, AndroidSettings } = await import('capacitor-native-settings');
      const result = await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
      if (!result.status) {
        requestLocation();
      }
    } catch {
      requestLocation();
    }
  }, [requestLocation]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!isNativeAndroid()) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && openedSettingsRef.current) {
        openedSettingsRef.current = false;
        requestLocation();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [requestLocation]);

  return { location, loading, error, requestLocation, openAppSettings, isNativeAndroid: isNativeAndroid() };
}
