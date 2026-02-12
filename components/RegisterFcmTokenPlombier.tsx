'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { auth } from '@/lib/firebase';
import { getToken, getMessaging, isSupported } from 'firebase/messaging';

const DEBUG = true;

function waitForCapacitor(maxMs = 10000): Promise<{ push: unknown } | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const cap = typeof window !== 'undefined' ? (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { PushNotifications?: unknown } } }).Capacitor : undefined;
      const push = cap?.Plugins?.PushNotifications;
      const isNative = cap?.isNativePlatform?.();
      if (cap && isNative && push) {
        resolve({ push });
        return;
      }
      if (Date.now() - start > maxMs) {
        if (DEBUG) console.log('[FCM Plombier] Timeout. Capacitor:', !!cap, 'isNative:', isNative, 'Push:', !!push);
        resolve(null);
        return;
      }
      setTimeout(check, 500);
    };
    check();
  });
}

export function RegisterFcmTokenPlombier() {
  const { plombier } = usePlombierAuth();
  const registered = useRef(false);

  const getAuthToken = useCallback(
    () => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)),
    []
  );

  const registerToken = useCallback(
    async (fcmToken: string) => {
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
    },
    [getAuthToken]
  );

  useEffect(() => {
    if (!plombier || registered.current) return;

    let cancelled = false;
    let listenerRemove: (() => Promise<void>) | undefined;

    waitForCapacitor().then((result) => {
      if (cancelled) return;

      if (result) {
        const PushNotifications = result.push as {
          requestPermissions?: () => Promise<{ value: string }>;
          register?: () => Promise<void>;
          addListener?: (event: string, cb: (e: { value: string }) => void) => Promise<{ remove: () => Promise<void> }>;
        };

        PushNotifications.addListener?.('registrationError', (e: unknown) => {
          console.error('[FCM Plombier] registrationError:', e);
        });

        PushNotifications.requestPermissions?.()
          .then(() => PushNotifications.register?.())
          .catch((err: unknown) => console.error('[FCM Plombier] register error:', err));

        PushNotifications.addListener?.('registration', (e: { value: string }) => {
          if (DEBUG) console.log('[FCM Plombier] Token reçu (Capacitor), envoi au serveur...');
          registerToken(e.value);
        }).then((r) => {
          listenerRemove = r.remove;
        });
        return;
      }

      if (typeof window === 'undefined') return;

      isSupported().then((supported) => {
        if (cancelled || !supported) return;
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          if (DEBUG) console.log('[FCM Plombier] Pas de VAPID key pour web push');
          return;
        }
        const messaging = getMessaging();
        getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: undefined,
        })
          .then((token) => {
            if (cancelled || !token) return;
            if (DEBUG) console.log('[FCM Plombier] Token web reçu, envoi au serveur...');
            registerToken(token);
          })
          .catch((err: unknown) => {
            const code = (err as { code?: string })?.code;
            if (code === 'messaging/permission-blocked') {
              if (DEBUG) console.log('[FCM Plombier] Notifications refusées par l\'utilisateur');
            } else {
              console.error('[FCM Plombier] getToken error:', err);
            }
          });
      });
    });

    return () => {
      cancelled = true;
      if (listenerRemove) void listenerRemove();
    };
  }, [plombier, registerToken]);

  return null;
}
