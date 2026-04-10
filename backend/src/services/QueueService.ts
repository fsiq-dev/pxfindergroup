import { v4 as uuidv4 } from 'uuid';
import {
  Player,
  Quest,
  Room,
  RoomFilters,
  RoomStatus,
  ChatMessage,
  QueueEntry,
} from '../types';
import { getQuestById } from '../data/quests';

interface MatchResult {
  matched: boolean;
  room?: Room;
}

export class QueueService {
  /** questId → players waiting in queue */
  private queues = new Map<string, QueueEntry[]>();

  /** roomId → room */
  private rooms = new Map<string, Room>();

  /** playerId → roomId (for quick lookup) */
  private playerRoomIndex = new Map<string, string>();

  /** playerId → questId (for queue lookup) */
  private playerQueueIndex = new Map<string, string>();

  // ─── Queue management ──────────────────────────────────────────────────────

  joinQueue(player: Player, questId: string): MatchResult {
    const quest = getQuestById(questId);
    if (!quest) return { matched: false };

    // Remove from any existing queue first
    this.leaveQueueByPlayerId(player.id);

    if (!this.queues.has(questId)) {
      this.queues.set(questId, []);
    }

    const queue = this.queues.get(questId)!;
    queue.push({ player, questId, joinedAt: new Date() });
    this.playerQueueIndex.set(player.id, questId);

    // Check if we have enough players for auto-match
    if (queue.length >= quest.minPlayers) {
      return this.autoMatch(quest, queue);
    }

    return { matched: false };
  }

  leaveQueue(playerId: string, questId: string): boolean {
    const queue = this.queues.get(questId);
    if (!queue) return false;

    const idx = queue.findIndex((e) => e.player.id === playerId);
    if (idx === -1) return false;

    queue.splice(idx, 1);
    this.playerQueueIndex.delete(playerId);
    return true;
  }

  leaveQueueByPlayerId(playerId: string): void {
    const questId = this.playerQueueIndex.get(playerId);
    if (questId) {
      this.leaveQueue(playerId, questId);
    }
  }

  getQueueLength(questId: string): number {
    return this.queues.get(questId)?.length ?? 0;
  }

  getPlayerQuestId(playerId: string): string | undefined {
    return this.playerQueueIndex.get(playerId);
  }

  private autoMatch(quest: Quest, queue: QueueEntry[]): MatchResult {
    const playersToMatch = queue.splice(0, quest.minPlayers);

    // Remove from index
    for (const entry of playersToMatch) {
      this.playerQueueIndex.delete(entry.player.id);
    }

    const [leader, ...rest] = playersToMatch.map((e) => e.player);
    const room = this.buildRoom(quest, leader, rest, {
      minLevel: quest.minLevel,
    });

    return { matched: true, room };
  }

  // ─── Room management ───────────────────────────────────────────────────────

  createRoom(
    questId: string,
    leader: Player,
    filters: RoomFilters
  ): Room | null {
    const quest = getQuestById(questId);
    if (!quest) return null;

    // Remove leader from any queue
    this.leaveQueueByPlayerId(leader.id);

    const room = this.buildRoom(quest, leader, [], filters);
    return room;
  }

  private buildRoom(
    quest: Quest,
    leader: Player,
    additionalMembers: Player[],
    filters: RoomFilters
  ): Room {
    const roomId = uuidv4();
    const allMembers = [leader, ...additionalMembers];

    const room: Room = {
      id: roomId,
      questId: quest.id,
      quest,
      leader,
      members: allMembers,
      status: allMembers.length >= quest.maxPlayers ? 'full' : 'waiting',
      filters,
      maxPlayers: quest.maxPlayers,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rooms.set(roomId, room);
    for (const member of allMembers) {
      this.playerRoomIndex.set(member.id, roomId);
    }

    return room;
  }

  joinRoom(roomId: string, player: Player): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status === 'full') return { success: false, error: 'Room is full' };
    if (room.status === 'in-progress') return { success: false, error: 'Quest already in progress' };
    if (room.members.some((m) => m.id === player.id)) return { success: false, error: 'Already in room' };

    // Check filters
    if (player.level < room.filters.minLevel) {
      return {
        success: false,
        error: `Minimum level required: ${room.filters.minLevel}`,
      };
    }
    if (room.filters.world && player.world !== room.filters.world) {
      return {
        success: false,
        error: `This room requires World: ${room.filters.world}`,
      };
    }
    if (room.filters.clan && room.filters.clan !== 'None' && player.clan !== room.filters.clan) {
      return {
        success: false,
        error: `This room requires Clan: ${room.filters.clan}`,
      };
    }

    // Remove player from queue if they were in one
    this.leaveQueueByPlayerId(player.id);

    room.members.push(player);
    room.updatedAt = new Date();

    if (room.members.length >= room.maxPlayers) {
      room.status = 'full';
    }

    this.playerRoomIndex.set(player.id, roomId);
    return { success: true, room };
  }

  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const memberIdx = room.members.findIndex((m) => m.id === playerId);
    if (memberIdx === -1) return null;

    room.members.splice(memberIdx, 1);
    this.playerRoomIndex.delete(playerId);
    room.updatedAt = new Date();

    // If room is now empty, remove it
    if (room.members.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    // Transfer leadership if leader left
    if (room.leader.id === playerId && room.members.length > 0) {
      room.leader = room.members[0];
    }

    // Re-open room if it was full
    if (room.status === 'full') {
      room.status = 'waiting';
    }

    return room;
  }

  addMessage(roomId: string, message: ChatMessage): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    room.messages.push(message);
    room.updatedAt = new Date();
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getPlayerRoom(playerId: string): Room | undefined {
    const roomId = this.playerRoomIndex.get(playerId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  handlePlayerDisconnect(playerId: string): { leftRoom?: Room | null; leftQuestId?: string } {
    const result: { leftRoom?: Room | null; leftQuestId?: string } = {};

    // Remove from queue
    const questId = this.playerQueueIndex.get(playerId);
    if (questId) {
      this.leaveQueue(playerId, questId);
      result.leftQuestId = questId;
    }

    // Remove from room
    const roomId = this.playerRoomIndex.get(playerId);
    if (roomId) {
      result.leftRoom = this.leaveRoom(roomId, playerId);
    }

    return result;
  }

  getQueueSnapshot(): Record<string, number> {
    const snapshot: Record<string, number> = {};
    for (const [questId, entries] of this.queues.entries()) {
      snapshot[questId] = entries.length;
    }
    return snapshot;
  }
}

export const queueService = new QueueService();
