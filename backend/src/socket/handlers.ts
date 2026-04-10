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
  SendMessagePayload,
  SubscribePushPayload,
} from '../types';

// In-memory player registry: socketId → Player
const connectedPlayers = new Map<string, Player>();

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
  socket.on('player:setup', (payload: PlayerSetupPayload) => {
    const player: Player = {
      id: uuidv4(),
      characterName: payload.characterName,
      world: payload.world,
      level: payload.level,
      clan: payload.clan,
      socketId: socket.id,
      joinedAt: new Date(),
    };

    connectedPlayers.set(socket.id, player);

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

    const result = queueService.joinQueue(player, payload.questId);

    socket.emit('queue:joined', { questId: payload.questId });
    broadcastQueueUpdate(io, payload.questId);

    if (result.matched && result.room) {
      const room = result.room;

      // Put all matched players into a socket.io room
      for (const member of room.members) {
        const memberSocket = io.sockets.sockets.get(member.socketId);
        if (memberSocket) {
          await memberSocket.join(room.id);
          memberSocket.emit('room:matched', { room });
        }
      }

      // Notify via push
      await notificationService.notifyRoomFormed(room);
      broadcastRoomsUpdate(io);

      console.log(
        `[Queue] Auto-matched ${room.members.length} players for "${room.quest.name}"`
      );
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

    const room = queueService.createRoom(payload.questId, player, payload.filters);
    if (!room) {
      socket.emit('error', { message: 'Quest not found' });
      return;
    }

    await socket.join(room.id);
    socket.emit('room:created', { room });
    broadcastRoomsUpdate(io);

    // Notify interested subscribers
    await notificationService.notifyNewRoomCreated(room);

    console.log(`[Room] Created: "${room.quest.name}" by ${player.characterName}`);
  });

  socket.on('room:join', async (payload: JoinRoomPayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Set up your profile first' });
      return;
    }

    const result = queueService.joinRoom(payload.roomId, player);
    if (!result.success || !result.room) {
      socket.emit('error', { message: result.error ?? 'Cannot join room' });
      return;
    }

    const room = result.room;
    await socket.join(room.id);
    socket.emit('room:joined', { room });

    // Notify others in the room
    socket.to(room.id).emit('room:updated', { room });

    if (room.status === 'full') {
      io.to(room.id).emit('room:full', { room });
      await notificationService.notifyRoomFormed(room);
    }

    broadcastRoomsUpdate(io);
    console.log(`[Room] ${player.characterName} joined room "${room.quest.name}"`);
  });

  socket.on('room:leave', (payload: LeaveRoomPayload) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    const updatedRoom = queueService.leaveRoom(payload.roomId, player.id);
    socket.leave(payload.roomId);
    socket.emit('room:left', { roomId: payload.roomId });

    if (updatedRoom) {
      io.to(payload.roomId).emit('room:updated', { room: updatedRoom });
    }

    broadcastRoomsUpdate(io);
    console.log(`[Room] ${player.characterName} left room ${payload.roomId}`);
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

    const updatedRoom = queueService.addMessage(payload.roomId, message);
    if (!updatedRoom) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Broadcast to all in room (including sender)
    io.to(payload.roomId).emit('chat:message', { roomId: payload.roomId, message });

    // Push notification to offline/background members
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

    const { leftRoom, leftQuestId } = queueService.handlePlayerDisconnect(player.id);

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
    connectedPlayers.delete(socket.id);

    console.log(`[Socket] Client disconnected: ${player.characterName}`);
  });
}
