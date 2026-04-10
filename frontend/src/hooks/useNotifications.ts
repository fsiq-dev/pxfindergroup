'use client';
import { useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes.buffer;
}

export function useNotifications(vapidPublicKey: string | null, interestedQuestIds: string[]) {
  const subscribe = useCallback(async () => {
    if (!vapidPublicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

      getSocket().emit('push:subscribe', {
        subscription: sub.toJSON(),
        interestedQuestIds,
      });
    } catch (err) {
      console.warn('[Push] Subscription failed:', err);
    }
  }, [vapidPublicKey, interestedQuestIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') subscribe();
    });
  }, [subscribe]);
}
