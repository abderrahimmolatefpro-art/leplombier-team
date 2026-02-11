'use client';

import { useEffect, useRef } from 'react';

/**
 * Enregistre le token FCM côté serveur quand l'app tourne dans Capacitor (mobile).
 * Pour le plombier : getAuthToken doit retourner le Firebase ID token.
 * Pour le client : getAuthToken doit retourner le JWT client.
 */
export function useRegisterFcmToken(
  getAuthToken: (() => Promise<string | null>) | null,
  apiUrl: string
) {
  const registered = useRef(false);

  useEffect(() => {
    if (!getAuthToken || registered.current) return;

    const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
    if (!cap?.isNativePlatform?.() || !cap.Plugins?.PushNotifications) return;

    const PushNotifications = cap.Plugins.PushNotifications;
    let listenerRemove: (() => Promise<void>) | undefined;

    const registerToken = async (fcmToken: string) => {
      try {
        const authToken = await getAuthToken();
        if (!authToken) return;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ fcmToken }),
        });
        registered.current = true;
      } catch (err) {
        console.error('[useRegisterFcmToken] Error:', err);
      }
    };

    PushNotifications.requestPermissions?.()
      .then(() => PushNotifications.register?.())
      .catch((err: unknown) => console.error('[useRegisterFcmToken] register error:', err));

    PushNotifications.addListener?.('registration', (e: { value: string }) => {
      registerToken(e.value);
    }).then((r) => {
      listenerRemove = r.remove;
    });

    return () => {
      listenerRemove?.();
    };
  }, [getAuthToken, apiUrl]);
}
