import { Quest, Room } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const api = {
  quests: {
    list: () => apiFetch<{ quests: Quest[] }>('/api/quests').then((r) => r.quests),
    get: (id: string) => apiFetch<{ quest: Quest }>(`/api/quests/${id}`).then((r) => r.quest),
  },
  rooms: {
    list: () => apiFetch<{ rooms: Room[] }>('/api/rooms').then((r) => r.rooms),
    get: (id: string) => apiFetch<{ room: Room }>(`/api/rooms/${id}`).then((r) => r.room),
  },
  push: {
    getVapidKey: () =>
      apiFetch<{ vapidPublicKey: string }>('/api/push/vapid-public-key').then(
        (r) => r.vapidPublicKey
      ),
  },
};
