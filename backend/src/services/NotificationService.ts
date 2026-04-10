import webpush from 'web-push';
import { PushSubscriptionData, Room } from '../types';

interface PlayerSubscription {
  subscription: PushSubscriptionData;
  interestedQuestIds: Set<string>;
}

export class NotificationService {
  private subscriptions = new Map<string, PlayerSubscription>(); // playerId → sub

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL ?? 'admin@pokepartyfinder.com';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    } else {
      console.warn(
        '[NotificationService] VAPID keys not set. Push notifications disabled.'
      );
    }
  }

  register(playerId: string, subscription: PushSubscriptionData, interestedQuestIds: string[]): void {
    this.subscriptions.set(playerId, {
      subscription,
      interestedQuestIds: new Set(interestedQuestIds),
    });
  }

  unregister(playerId: string): void {
    this.subscriptions.delete(playerId);
  }

  updateInterests(playerId: string, questIds: string[]): void {
    const sub = this.subscriptions.get(playerId);
    if (sub) {
      sub.interestedQuestIds = new Set(questIds);
    }
  }

  async notifyRoomFormed(room: Room): Promise<void> {
    const payload = JSON.stringify({
      title: '🎮 Party Formed!',
      body: `Your group for "${room.quest.name}" is ready! ${room.members.length}/${room.maxPlayers} players joined.`,
      icon: '/icon-192x192.png',
      data: { type: 'room_formed', roomId: room.id },
    });

    const promises = room.members.map((member) =>
      this.sendToPlayer(member.id, payload)
    );
    await Promise.allSettled(promises);
  }

  async notifyChatMessage(
    roomId: string,
    senderName: string,
    content: string,
    memberIds: string[],
    senderId: string
  ): Promise<void> {
    const payload = JSON.stringify({
      title: `💬 ${senderName}`,
      body: content.length > 80 ? content.slice(0, 77) + '...' : content,
      icon: '/icon-192x192.png',
      data: { type: 'chat_message', roomId },
    });

    const promises = memberIds
      .filter((id) => id !== senderId)
      .map((id) => this.sendToPlayer(id, payload));

    await Promise.allSettled(promises);
  }

  async notifyNewRoomCreated(room: Room): Promise<void> {
    const payload = JSON.stringify({
      title: '🆕 New Room Available',
      body: `A room for "${room.quest.name}" was just created. Join now!`,
      icon: '/icon-192x192.png',
      data: { type: 'new_room', roomId: room.id, questId: room.questId },
    });

    const promises: Promise<void>[] = [];
    for (const [playerId, sub] of this.subscriptions.entries()) {
      if (sub.interestedQuestIds.has(room.questId) && playerId !== room.leader.id) {
        promises.push(this.sendToPlayer(playerId, payload));
      }
    }
    await Promise.allSettled(promises);
  }

  private async sendToPlayer(playerId: string, payload: string): Promise<void> {
    const sub = this.subscriptions.get(playerId);
    if (!sub) return;

    try {
      await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload);
    } catch (err: unknown) {
      if ((err as { statusCode?: number })?.statusCode === 410) {
        // Subscription expired
        this.subscriptions.delete(playerId);
      }
    }
  }

  getVapidPublicKey(): string | undefined {
    return process.env.VAPID_PUBLIC_KEY;
  }
}

export const notificationService = new NotificationService();
