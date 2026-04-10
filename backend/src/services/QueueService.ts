import { v4 as uuidv4 } from 'uuid';
import {
  Player,
  Quest,
  Room,
  RoomFilters,
  ChatMessage,
  QueueEntry,
} from '../types';
import { getQuestById, requiresUniqueClan } from '../data/quests';
import { prisma } from '../lib/prisma';

export interface MatchResult {
  matched: boolean;
  room?: Room;
  /** true = room nova criada; false = player adicionado a room existente */
  isNewRoom?: boolean;
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

  async joinQueue(player: Player, questId: string): Promise<MatchResult> {
    const quest = getQuestById(questId);
    if (!quest) return { matched: false };

    // Remove from any existing queue first
    this.leaveQueueByPlayerId(player.id);

    // ── Verifica se já existe uma room aberta compatível ──────────────────────
    const suitableRoom = this.findSuitableRoom(questId, player);
    if (suitableRoom) {
      const result = await this.joinRoom(suitableRoom.id, player);
      if (result.success && result.room) {
        return { matched: true, room: result.room, isNewRoom: false };
      }
    }

    // ── Adiciona à fila ───────────────────────────────────────────────────────
    if (!this.queues.has(questId)) {
      this.queues.set(questId, []);
    }

    const queue = this.queues.get(questId)!;
    queue.push({ player, questId, joinedAt: new Date() });
    this.playerQueueIndex.set(player.id, questId);

    // ── Tenta auto-match entre os da fila ─────────────────────────────────────
    if (requiresUniqueClan(questId)) {
      const uniqueClans = new Set(queue.map((e) => e.player.clan));
      if (uniqueClans.size >= quest.minPlayers) {
        return { ...(await this.autoMatch(quest, queue)), isNewRoom: true };
      }
    } else if (queue.length >= quest.minPlayers) {
      return { ...(await this.autoMatch(quest, queue)), isNewRoom: true };
    }

    return { matched: false };
  }

  /** Encontra a primeira room aberta da quest onde o player atende todos os requisitos */
  private findSuitableRoom(questId: string, player: Player): Room | undefined {
    return Array.from(this.rooms.values()).find((room) => {
      if (room.questId !== questId) return false;
      if (room.status !== 'waiting') return false;
      if (player.level < room.filters.minLevel) return false;
      if (room.filters.world && player.world !== room.filters.world) return false;
      if (room.filters.clan && room.filters.clan !== 'None' && player.clan !== room.filters.clan) return false;
      if (requiresUniqueClan(questId) && room.members.some((m) => m.clan === player.clan)) return false;
      return true;
    });
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

  private async autoMatch(quest: Quest, queue: QueueEntry[]): Promise<MatchResult> {
    let playersToMatch: QueueEntry[];

    if (requiresUniqueClan(quest.id)) {
      const seenClans = new Set<string>();
      const selected: QueueEntry[] = [];

      for (const entry of queue) {
        if (!seenClans.has(entry.player.clan)) {
          seenClans.add(entry.player.clan);
          selected.push(entry);
          if (selected.length === quest.minPlayers) break;
        }
      }
      playersToMatch = selected;

      for (const entry of playersToMatch) {
        const idx = queue.findIndex((e) => e.player.id === entry.player.id);
        if (idx !== -1) queue.splice(idx, 1);
      }
    } else {
      playersToMatch = queue.splice(0, quest.minPlayers);
    }

    // Remove from index
    for (const entry of playersToMatch) {
      this.playerQueueIndex.delete(entry.player.id);
    }

    const [leader, ...rest] = playersToMatch.map((e) => e.player);
    const room = await this.buildRoom(quest, leader, rest, {
      minLevel: quest.minLevel,
    });

    return { matched: true, room };
  }

  // ─── Room management ───────────────────────────────────────────────────────

  async createRoom(
    questId: string,
    leader: Player,
    filters: RoomFilters
  ): Promise<Room | null> {
    const quest = getQuestById(questId);
    if (!quest) return null;

    this.leaveQueueByPlayerId(leader.id);

    const room = await this.buildRoom(quest, leader, [], filters);
    return room;
  }

  private async buildRoom(
    quest: Quest,
    leader: Player,
    additionalMembers: Player[],
    filters: RoomFilters
  ): Promise<Room> {
    const roomId = uuidv4();
    const allMembers = [leader, ...additionalMembers];
    const status = allMembers.length >= quest.maxPlayers ? 'full' : 'waiting';

    const room: Room = {
      id: roomId,
      questId: quest.id,
      quest,
      leader,
      members: allMembers,
      status,
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

    // Persist to DB
    try {
      await prisma.room.create({
        data: {
          id: roomId,
          questId: quest.id,
          leaderId: leader.id,
          status,
          maxPlayers: quest.maxPlayers,
          filterMinLevel: filters.minLevel,
          filterWorld: filters.world ?? null,
          filterClan: filters.clan ?? null,
          members: {
            create: allMembers.map((m) => ({ playerId: m.id })),
          },
        },
      });
    } catch (err) {
      console.error('[DB] Failed to persist room:', err);
    }

    return room;
  }

  async joinRoom(roomId: string, player: Player): Promise<{ success: boolean; room?: Room; error?: string }> {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status === 'full') return { success: false, error: 'Room is full' };
    if (room.status === 'in-progress') return { success: false, error: 'Quest already in progress' };
    if (room.members.some((m) => m.id === player.id)) return { success: false, error: 'Already in room' };

    if (requiresUniqueClan(room.questId)) {
      const clanAlreadyInRoom = room.members.some((m) => m.clan === player.clan);
      if (clanAlreadyInRoom) {
        return {
          success: false,
          error: `Clan ${player.clan} já está na sala. Esta quest exige clãs diferentes.`,
        };
      }
    }

    if (player.level < room.filters.minLevel) {
      return { success: false, error: `Minimum level required: ${room.filters.minLevel}` };
    }
    if (room.filters.world && player.world !== room.filters.world) {
      return { success: false, error: `This room requires World: ${room.filters.world}` };
    }
    if (room.filters.clan && room.filters.clan !== 'None' && player.clan !== room.filters.clan) {
      return { success: false, error: `This room requires Clan: ${room.filters.clan}` };
    }

    this.leaveQueueByPlayerId(player.id);

    room.members.push(player);
    room.updatedAt = new Date();

    if (room.members.length >= room.maxPlayers) {
      room.status = 'full';
    }

    this.playerRoomIndex.set(player.id, roomId);

    // Persist to DB
    try {
      await prisma.roomMember.create({ data: { roomId, playerId: player.id } });
      if (room.status === 'full') {
        await prisma.room.update({ where: { id: roomId }, data: { status: 'full' } });
      }
    } catch (err) {
      console.error('[DB] Failed to persist room member:', err);
    }

    return { success: true, room };
  }

  async leaveRoom(roomId: string, playerId: string): Promise<Room | null> {
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
      try {
        await prisma.room.delete({ where: { id: roomId } });
      } catch (err) {
        console.error('[DB] Failed to delete empty room:', err);
      }
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

    // Persist to DB
    try {
      await prisma.roomMember.delete({ where: { roomId_playerId: { roomId, playerId } } });
      await prisma.room.update({
        where: { id: roomId },
        data: { status: room.status, leaderId: room.leader.id },
      });
    } catch (err) {
      console.error('[DB] Failed to update room after leave:', err);
    }

    return room;
  }

  async closeRoom(roomId: string, requesterId: string): Promise<{ success: boolean; memberIds?: string[]; error?: string }> {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.leader.id !== requesterId) return { success: false, error: 'Only the leader can close the room' };

    const memberIds = room.members.map((m) => m.id);

    for (const id of memberIds) {
      this.playerRoomIndex.delete(id);
    }

    this.rooms.delete(roomId);

    // Persist to DB (cascade deletes members and messages)
    try {
      await prisma.room.delete({ where: { id: roomId } });
    } catch (err) {
      console.error('[DB] Failed to delete room:', err);
    }

    return { success: true, memberIds };
  }

  async addMessage(roomId: string, message: ChatMessage): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    room.messages.push(message);
    room.updatedAt = new Date();

    // Persist to DB
    try {
      await prisma.message.create({
        data: {
          id: message.id,
          roomId,
          playerId: message.playerId,
          playerName: message.playerName,
          content: message.content,
          timestamp: message.timestamp,
        },
      });
    } catch (err) {
      console.error('[DB] Failed to persist message:', err);
    }

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

  async handlePlayerDisconnect(playerId: string): Promise<{ leftRoom?: Room | null; leftQuestId?: string }> {
    const result: { leftRoom?: Room | null; leftQuestId?: string } = {};

    const questId = this.playerQueueIndex.get(playerId);
    if (questId) {
      this.leaveQueue(playerId, questId);
      result.leftQuestId = questId;
    }

    const roomId = this.playerRoomIndex.get(playerId);
    if (roomId) {
      result.leftRoom = await this.leaveRoom(roomId, playerId);
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
