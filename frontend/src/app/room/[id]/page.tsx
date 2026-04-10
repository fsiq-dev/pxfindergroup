'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from '@/components/Chat';
import { ToastContainer, ToastItem } from '@/components/Toast';
import { usePlayer } from '@/hooks/usePlayer';
import { useSocket } from '@/hooks/useSocket';
import { Room, ChatMessage, Player } from '@/lib/types';
import { api } from '@/lib/api';
import {
  ArrowLeft, ExternalLink, Lock, Unlock, Crown, Users, Clock, Star
} from 'lucide-react';
import { WORLD_COLORS, CLAN_COLORS, DIFFICULTY_COLORS } from '@/lib/types';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const { profile, player, setPlayer } = usePlayer();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loading, setLoading] = useState(true);

  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  // Load room data
  useEffect(() => {
    api.rooms.get(roomId).then((r) => {
      setRoom(r);
      setMessages(r.messages ?? []);
      setLoading(false);
    }).catch(() => {
      addToast('error', 'Room not found');
      setLoading(false);
    });
  }, [roomId, addToast]);

  const { setupPlayer, sendMessage, leaveRoom } = useSocket({
    onPlayerReady: (p: Player) => setPlayer(p),
    onRoomUpdated: (updatedRoom: Room) => {
      if (updatedRoom.id === roomId) setRoom(updatedRoom);
    },
    onRoomFull: (fullRoom: Room) => {
      if (fullRoom.id === roomId) {
        setRoom(fullRoom);
        addToast('success', 'Party is full! Quest can begin!');
      }
    },
    onRoomLeft: (leftRoomId: string) => {
      if (leftRoomId === roomId) router.push('/');
    },
    onChatMessage: (msgRoomId: string, message: ChatMessage) => {
      if (msgRoomId === roomId) {
        setMessages((prev) => [...prev, message]);
      }
    },
    onError: (msg: string) => addToast('error', msg),
  });

  // Re-setup player if needed
  useEffect(() => {
    if (profile && !player) setupPlayer(profile);
  }, [profile, player, setupPlayer]);

  function handleLeave() {
    leaveRoom(roomId);
    router.push('/');
  }

  function handleSend(content: string) {
    sendMessage(roomId, content);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pxg-dark flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Loading room...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-pxg-dark flex items-center justify-center flex-col gap-4">
        <p className="text-gray-400">Room not found or has ended.</p>
        <button onClick={() => router.push('/')} className="btn-primary">
          Back to Finder
        </button>
      </div>
    );
  }

  const isFull = room.status === 'full';

  return (
    <div className="min-h-screen bg-pxg-dark flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-pxg-dark-border bg-pxg-dark/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/')} className="btn-ghost p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-white truncate">{room.quest.name}</h1>
              <span className={`badge border ${DIFFICULTY_COLORS[room.quest.difficulty]}`}>
                {room.quest.difficulty}
              </span>
              {isFull ? (
                <span className="badge bg-red-500/10 text-red-400 border-red-500/20">
                  <Lock className="w-3 h-3" /> Full
                </span>
              ) : (
                <span className="badge bg-green-500/10 text-green-400 border-green-500/20 animate-pulse-slow">
                  <Unlock className="w-3 h-3" /> Waiting
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={room.quest.wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Wiki
            </a>
            <button onClick={handleLeave} className="btn-secondary text-sm text-red-400 border-red-500/30 hover:bg-red-500/10">
              Leave
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left: Quest info + slots */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Quest details */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quest Info</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">{room.quest.description}</p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Star className="w-4 h-4 text-pxg-gold" />
                Level {room.quest.minLevel}+ required
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="w-4 h-4 text-pxg-red" />
                {room.quest.minPlayers}–{room.quest.maxPlayers} players
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4 text-blue-400" />
                ~{room.quest.estimatedDuration}
              </div>
            </div>
          </div>

          {/* Room filters */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Room Filters</h2>
            <div className="flex flex-wrap gap-2">
              <span className="badge border border-gray-700 text-gray-300">
                Lv {room.filters.minLevel}+
              </span>
              {room.filters.world && (
                <span className={`badge ${WORLD_COLORS[room.filters.world]}`}>
                  {room.filters.world}
                </span>
              )}
              {room.filters.clan && room.filters.clan !== 'None' && (
                <span className={`badge ${CLAN_COLORS[room.filters.clan]}`}>
                  {room.filters.clan}
                </span>
              )}
              {!room.filters.world && !room.filters.clan && (
                <span className="text-xs text-gray-600">No world/clan filter</span>
              )}
            </div>
          </div>

          {/* Slots */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Party ({room.members.length}/{room.maxPlayers})
            </h2>

            {/* Progress bar */}
            <div className="flex gap-1 mb-4">
              {Array.from({ length: room.maxPlayers }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    i < room.members.length ? 'bg-pxg-red' : 'bg-pxg-dark-border'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {room.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-pxg-dark">
                  <div className="w-8 h-8 rounded-full bg-pxg-red/20 flex items-center justify-center text-pxg-red font-bold text-sm shrink-0">
                    {member.characterName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {member.id === room.leader.id && (
                        <Crown className="w-3 h-3 text-pxg-gold shrink-0" />
                      )}
                      <p className="text-sm font-semibold text-white truncate">
                        {member.characterName}
                        {member.id === player?.id && (
                          <span className="text-pxg-red/70 ml-1 font-normal">(you)</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-gray-500">Lv {member.level}</span>
                      <span className={`badge text-xs ${WORLD_COLORS[member.world]}`}>{member.world}</span>
                      {member.clan !== 'None' && (
                        <span className={`badge text-xs ${CLAN_COLORS[member.clan]}`}>{member.clan}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: room.maxPlayers - room.members.length }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-dashed border-pxg-dark-border">
                  <div className="w-8 h-8 rounded-full bg-pxg-dark-border flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-gray-700" />
                  </div>
                  <p className="text-sm text-gray-700">Waiting for player...</p>
                </div>
              ))}
            </div>

            {isFull && (
              <div className="mt-4 py-3 px-4 rounded-xl bg-pxg-red/10 border border-pxg-red/20 text-center">
                <p className="text-pxg-red font-semibold text-sm">Party is full!</p>
                <p className="text-gray-400 text-xs mt-1">Coordinate with your team and start the quest!</p>
              </div>
            )}
          </div>

          {/* Rewards */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Rewards</h2>
            <div className="flex flex-wrap gap-1.5">
              {room.quest.rewards.map((reward) => (
                <span key={reward} className="badge bg-pxg-gold/10 text-pxg-gold border-pxg-gold/20">
                  {reward}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Chat */}
        <div className="lg:col-span-2 card flex flex-col min-h-[500px] lg:min-h-0 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-pxg-dark-border">
            <h2 className="font-semibold text-white text-sm">Party Chat</h2>
          </div>
          {player ? (
            <Chat
              room={room}
              messages={messages}
              currentPlayerId={player.id}
              onSendMessage={handleSend}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
              Set up your profile to use chat
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
