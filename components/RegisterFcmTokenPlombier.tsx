'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { auth } from '@/lib/firebase';

const DEBUG = true; // Mettre false en production

export function RegisterFcmTokenPlombier() {
  const { plombier } = usePlombierAuth();
  const registered = useRef(false);

  const getAuthToken = useCallback(
    () => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)),
    []
  );

  useEffect(() => {
    if (!plombier || registered.current) return;

    const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
    if (!cap?.isNativePlatform?.() || !cap.Plugins?.PushNotifications) {
      if (DEBUG) console.log('[FCM Plombier] Pas Capacitor ou PushNotifications absent');
      return;
    }

    const PushNotifications = cap.Plugins.PushNotifications;
    let listenerRemove: (() => Promise<void>) | undefined;

    const registerToken = async (fcmToken: string) => {
      try {
        const authToken = await getAuthToken();
        if (!authToken) {
          if (DEBUG) console.log('[FCM Plombier] Pas de token auth');
          return;
        }
        const res = await fetch('/api/espace-plombier/register-fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ fcmToken }),
        });
        if (DEBUG) console.log('[FCM Plombier] register-fcm-token:', res.status, res.ok ? 'OK' : await res.text());
        if (res.ok) registered.current = true;
      } catch (err) {
        console.error('[FCM Plombier] Error:', err);
      }
    };

    PushNotifications.addListener?.('registrationError', (e: unknown) => {
      console.error('[FCM Plombier] registrationError:', e);
    });

    PushNotifications.requestPermissions?.()
      .then(() => PushNotifications.register?.())
      .catch((err: unknown) => console.error('[FCM Plombier] register error:', err));

    PushNotifications.addListener?.('registration', (e: { value: string }) => {
      if (DEBUG) console.log('[FCM Plombier] Token reçu, envoi au serveur...');
      registerToken(e.value);
    }).then((r) => {
      listenerRemove = r.remove;
    });

    return () => {
      if (listenerRemove) void listenerRemove();
    };
  }, [plombier, getAuthToken]);

  return null;
}
