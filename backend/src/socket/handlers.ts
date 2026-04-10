import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { queueService } from '../services/QueueService';
import { notificationService } from '../services/NotificationService';
import { Player } from '../types';
import {
  PlayerSetupPayload,
  JoinQueuePayload,
  LeaveQueuePayload,
  CreateRoomPayload,
  JoinRoomPayload,
  LeaveRoomPayload,
  CloseRoomPayload,
  SendMessagePayload,
  SubscribePushPayload,
} from '../types';
import { prisma } from '../lib/prisma';

// In-memory player registry: socketId → Player
const connectedPlayers = new Map<string, Player>();

// Grace period: playerId → timeout handle
// Gives players 15s to reconnect before being removed from room/queue
const disconnectTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const DISCONNECT_GRACE_MS = 15_000;

function broadcastRoomsUpdate(io: Server): void {
  io.emit('rooms:update', { rooms: queueService.getRooms() });
}

function broadcastQueueUpdate(io: Server, questId: string): void {
  io.emit('queue:update', {
    questId,
    playersInQueue: queueService.getQueueLength(questId),
  });
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ─── Player Setup ──────────────────────────────────────────────────────────
  socket.on('player:setup', async (payload: PlayerSetupPayload) => {
    const player: Player = {
      id: payload.existingId ?? uuidv4(),
      characterName: payload.characterName,
      world: payload.world,
      level: payload.level,
      clan: payload.clan,
      socketId: socket.id,
      joinedAt: new Date(),
    };

    connectedPlayers.set(socket.id, player);

    // Cancel any pending disconnect timeout for this player
    if (payload.existingId) {
      const pending = disconnectTimeouts.get(payload.existingId);
      if (pending) {
        clearTimeout(pending);
        disconnectTimeouts.delete(payload.existingId);
        console.log(`[Socket] Reconnect within grace period: ${player.characterName}`);
      }
    }

    // If reconnecting with an existing ID, update socketId in any room they're in
    if (payload.existingId) {
      const room = queueService.getPlayerRoom(payload.existingId);
      if (room) {
        const member = room.members.find((m) => m.id === payload.existingId);
        if (member) {
          member.socketId = socket.id;
        }
        await socket.join(room.id);
      }
    }

    // Upsert player in DB
    try {
      await prisma.player.upsert({
        where: { id: player.id },
        update: {
          characterName: player.characterName,
          world: player.world,
          level: player.level,
          clan: player.clan,
          socketId: socket.id,
        },
        create: {
          id: player.id,
          characterName: player.characterName,
          world: player.world,
          level: player.level,
          clan: player.clan,
          socketId: socket.id,
        },
      });
    } catch (err) {
      console.error('[DB] Failed to upsert player:', err);
    }

    socket.emit('player:ready', {
      player,
      vapidPublicKey: notificationService.getVapidPublicKey(),
    });

    // Send current state
    socket.emit('rooms:update', { rooms: queueService.getRooms() });
    socket.emit('queue:snapshot', queueService.getQueueSnapshot());

    console.log(`[Socket] Player setup: ${player.characterName} (Lvl ${player.level}, ${player.world})`);
  });

  // ─── Push Subscription ────────────────────────────────────────────────────
  socket.on('push:subscribe', (payload: SubscribePushPayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    notificationService.register(player.id, payload.subscription, payload.interestedQuestIds);
    console.log(`[Notification] ${player.characterName} subscribed to push`);
  });

  // ─── Queue Management ──────────────────────────────────────────────────────
  socket.on('queue:join', async (payload: JoinQueuePayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Set up your profile first' });
      return;
    }

    const result = await queueService.joinQueue(player, payload.questId);

    socket.emit('queue:joined', { questId: payload.questId });
    broadcastQueueUpdate(io, payload.questId);

    if (result.matched && result.room) {
      const room = result.room;

      if (result.isNewRoom) {
        for (const member of room.members) {
          const memberSocket = io.sockets.sockets.get(member.socketId);
          if (memberSocket) {
            await memberSocket.join(room.id);
            memberSocket.emit('room:matched', { room });
          }
        }
        await notificationService.notifyRoomFormed(room);
        console.log(`[Queue] Auto-matched ${room.members.length} players for "${room.quest.name}"`);
      } else {
        await socket.join(room.id);
        socket.emit('room:matched', { room });
        socket.to(room.id).emit('room:updated', { room });

        if (room.status === 'full') {
          io.to(room.id).emit('room:full', { room });
          await notificationService.notifyRoomFormed(room);
        }
        console.log(`[Queue] ${player.characterName} auto-joined existing room "${room.quest.name}"`);
      }

      broadcastRoomsUpdate(io);
    }
  });

  socket.on('queue:leave', (payload: LeaveQueuePayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    queueService.leaveQueue(player.id, payload.questId);
    socket.emit('queue:left', { questId: payload.questId });
    broadcastQueueUpdate(io, payload.questId);
  });

  // ─── Room Management ───────────────────────────────────────────────────────
  socket.on('room:create', async (payload: CreateRoomPayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Set up your profile first' });
      return;
    }

    const room = await queueService.createRoom(payload.questId, player, payload.filters);
    if (!room) {
      socket.emit('error', { message: 'Quest not found' });
      return;
    }

    await socket.join(room.id);
    socket.emit('room:created', { room });
    broadcastRoomsUpdate(io);

    await notificationService.notifyNewRoomCreated(room);

    console.log(`[Room] Created: "${room.quest.name}" by ${player.characterName}`);
  });

  socket.on('room:join', async (payload: JoinRoomPayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Set up your profile first' });
      return;
    }

    const result = await queueService.joinRoom(payload.roomId, player);
    if (!result.success || !result.room) {
      socket.emit('error', { message: result.error ?? 'Cannot join room' });
      return;
    }

    const room = result.room;
    await socket.join(room.id);
    socket.emit('room:joined', { room });

    socket.to(room.id).emit('room:updated', { room });

    if (room.status === 'full') {
      io.to(room.id).emit('room:full', { room });
      await notificationService.notifyRoomFormed(room);
    }

    broadcastRoomsUpdate(io);
    console.log(`[Room] ${player.characterName} joined room "${room.quest.name}"`);
  });

  socket.on('room:leave', async (payload: LeaveRoomPayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    const updatedRoom = await queueService.leaveRoom(payload.roomId, player.id);
    socket.leave(payload.roomId);
    socket.emit('room:left', { roomId: payload.roomId });

    if (updatedRoom) {
      io.to(payload.roomId).emit('room:updated', { room: updatedRoom });
    }

    broadcastRoomsUpdate(io);
    console.log(`[Room] ${player.characterName} left room ${payload.roomId}`);
  });

  socket.on('room:close', async (payload: CloseRoomPayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    const result = await queueService.closeRoom(payload.roomId, player.id);
    if (!result.success) {
      socket.emit('error', { message: result.error ?? 'Cannot close room' });
      return;
    }

    io.to(payload.roomId).emit('room:closed', { roomId: payload.roomId });

    const socketsInRoom = io.sockets.adapter.rooms.get(payload.roomId);
    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        io.sockets.sockets.get(socketId)?.leave(payload.roomId);
      }
    }

    broadcastRoomsUpdate(io);
    console.log(`[Room] ${player.characterName} closed room ${payload.roomId}`);
  });

  // ─── Chat ──────────────────────────────────────────────────────────────────
  socket.on('chat:message', async (payload: SendMessagePayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    const content = payload.content.trim().slice(0, 500);
    if (!content) return;

    const message = {
      id: uuidv4(),
      playerId: player.id,
      playerName: player.characterName,
      content,
      timestamp: new Date(),
    };

    const updatedRoom = await queueService.addMessage(payload.roomId, message);
    if (!updatedRoom) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    io.to(payload.roomId).emit('chat:message', { roomId: payload.roomId, message });

    const memberIds = updatedRoom.members.map((m) => m.id);
    await notificationService.notifyChatMessage(
      payload.roomId,
      player.characterName,
      content,
      memberIds,
      player.id
    );
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    connectedPlayers.delete(socket.id);
    console.log(`[Socket] Client disconnected: ${player.characterName} (grace period started)`);

    // Wait before removing from room/queue — allows reconnection during navigation
    const timeout = setTimeout(async () => {
      disconnectTimeouts.delete(player.id);

      const { leftRoom, leftQuestId } = await queueService.handlePlayerDisconnect(player.id);

      if (leftRoom) {
        io.to(leftRoom.id).emit('room:updated', { room: leftRoom });
      }
      if (leftQuestId) {
        broadcastQueueUpdate(io, leftQuestId);
      }
      if (leftRoom || leftQuestId) {
        broadcastRoomsUpdate(io);
      }

      notificationService.unregister(player.id);
      console.log(`[Socket] Grace period expired: ${player.characterName} removed from room/queue`);
    }, DISCONNECT_GRACE_MS);

    disconnectTimeouts.set(player.id, timeout);
  });
}
