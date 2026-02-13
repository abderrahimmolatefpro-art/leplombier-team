'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useClientAuth } from '@/hooks/useClientAuth';

const DEBUG = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

export function RegisterFcmTokenClient() {
  const { client, token } = useClientAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!client || !token || registered.current) return;

    const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
    if (!cap?.isNativePlatform?.() || !cap.Plugins?.PushNotifications) return;

    const PushNotifications = cap.Plugins.PushNotifications;
    let listenerRemove: (() => Promise<void>) | undefined;

    const registerToken = async (fcmToken: string) => {
      try {
        const res = await fetch('/api/espace-client/register-fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fcmToken }),
        });
        if (DEBUG) console.log('[FCM Client] register-fcm-token:', res.status, res.ok ? 'OK' : await res.text());
        if (res.ok) registered.current = true;
      } catch (err) {
        console.error('[FCM Client] Error:', err);
      }
    };

    PushNotifications.addListener?.('registrationError', (e: unknown) => {
      console.error('[FCM Client] registrationError:', e);
    });

    PushNotifications.requestPermissions?.()
      .then(() => PushNotifications.register?.())
      .catch((err: unknown) => console.error('[FCM Client] register error:', err));

    PushNotifications.addListener?.('registration', (e: { value: string }) => {
      if (DEBUG) console.log('[FCM Client] Token reçu, envoi au serveur...');
      registerToken(e.value);
    }).then((r) => {
      listenerRemove = r.remove;
    });

    return () => {
      if (listenerRemove) void listenerRemove();
    };
  }, [client, token]);

  return null;
}
