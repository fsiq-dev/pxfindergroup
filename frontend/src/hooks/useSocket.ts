'use client';
import { useEffect, useRef, useCallback } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { Room, ChatMessage, Player } from '@/lib/types';
import { PlayerProfile } from './usePlayer';

export interface SocketCallbacks {
  onPlayerReady?: (player: Player) => void;
  onRoomsUpdate?: (rooms: Room[]) => void;
  onRoomMatched?: (room: Room) => void;
  onRoomCreated?: (room: Room) => void;
  onRoomJoined?: (room: Room) => void;
  onRoomUpdated?: (room: Room) => void;
  onRoomFull?: (room: Room) => void;
  onRoomLeft?: (roomId: string) => void;
  onChatMessage?: (roomId: string, message: ChatMessage) => void;
  onQueueJoined?: (questId: string) => void;
  onQueueLeft?: (questId: string) => void;
  onQueueUpdate?: (questId: string, count: number) => void;
  onQueueSnapshot?: (snapshot: Record<string, number>) => void;
  onRoomClosed?: (roomId: string) => void;
  onError?: (message: string) => void;
}

export function useSocket(callbacks: SocketCallbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    const socket = connectSocket();

    socket.on('player:ready', ({ player }: { player: Player }) =>
      cbRef.current.onPlayerReady?.(player)
    );
    socket.on('rooms:update', ({ rooms }: { rooms: Room[] }) =>
      cbRef.current.onRoomsUpdate?.(rooms)
    );
    socket.on('room:matched', ({ room }: { room: Room }) =>
      cbRef.current.onRoomMatched?.(room)
    );
    socket.on('room:created', ({ room }: { room: Room }) =>
      cbRef.current.onRoomCreated?.(room)
    );
    socket.on('room:joined', ({ room }: { room: Room }) =>
      cbRef.current.onRoomJoined?.(room)
    );
    socket.on('room:updated', ({ room }: { room: Room }) =>
      cbRef.current.onRoomUpdated?.(room)
    );
    socket.on('room:full', ({ room }: { room: Room }) =>
      cbRef.current.onRoomFull?.(room)
    );
    socket.on('room:left', ({ roomId }: { roomId: string }) =>
      cbRef.current.onRoomLeft?.(roomId)
    );
    socket.on('chat:message', ({ roomId, message }: { roomId: string; message: ChatMessage }) =>
      cbRef.current.onChatMessage?.(roomId, message)
    );
    socket.on('queue:joined', ({ questId }: { questId: string }) =>
      cbRef.current.onQueueJoined?.(questId)
    );
    socket.on('queue:left', ({ questId }: { questId: string }) =>
      cbRef.current.onQueueLeft?.(questId)
    );
    socket.on('queue:update', ({ questId, playersInQueue }: { questId: string; playersInQueue: number }) =>
      cbRef.current.onQueueUpdate?.(questId, playersInQueue)
    );
    socket.on('queue:snapshot', (snapshot: Record<string, number>) =>
      cbRef.current.onQueueSnapshot?.(snapshot)
    );
    socket.on('room:closed', ({ roomId }: { roomId: string }) =>
      cbRef.current.onRoomClosed?.(roomId)
    );
    socket.on('error', ({ message }: { message: string }) =>
      cbRef.current.onError?.(message)
    );

    return () => {
      socket.off('player:ready');
      socket.off('rooms:update');
      socket.off('room:matched');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:updated');
      socket.off('room:full');
      socket.off('room:left');
      socket.off('chat:message');
      socket.off('queue:joined');
      socket.off('queue:left');
      socket.off('queue:update');
      socket.off('queue:snapshot');
      socket.off('room:closed');
      socket.off('error');
    };
  }, []);

  const setupPlayer = useCallback((profile: PlayerProfile, existingId?: string) => {
    getSocket().emit('player:setup', { ...profile, existingId });
  }, []);

  const joinQueue = useCallback((questId: string) => {
    getSocket().emit('queue:join', { questId });
  }, []);

  const leaveQueue = useCallback((questId: string) => {
    getSocket().emit('queue:leave', { questId });
  }, []);

  const createRoom = useCallback(
    (questId: string, filters: { minLevel: number; world?: string; clan?: string }) => {
      getSocket().emit('room:create', { questId, filters });
    },
    []
  );

  const joinRoom = useCallback((roomId: string) => {
    getSocket().emit('room:join', { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    getSocket().emit('room:leave', { roomId });
  }, []);

  const closeRoom = useCallback((roomId: string) => {
    getSocket().emit('room:close', { roomId });
  }, []);

  const sendMessage = useCallback((roomId: string, content: string) => {
    getSocket().emit('chat:message', { roomId, content });
  }, []);

  return { setupPlayer, joinQueue, leaveQueue, createRoom, joinRoom, leaveRoom, closeRoom, sendMessage };
}
