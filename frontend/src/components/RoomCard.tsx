'use client';
import { Users, Crown, Lock, Unlock, ExternalLink } from 'lucide-react';
import { Room, Player, WORLD_COLORS, CLAN_COLORS } from '@/lib/types';

interface RoomCardProps {
  room: Room;
  currentPlayer: Player | null;
  onJoin: (roomId: string) => void;
  onEnter: (roomId: string) => void;
}

export function RoomCard({ room, currentPlayer, onJoin, onEnter }: RoomCardProps) {
  const isMember = currentPlayer && room.members.some(
    (m) => m.id === currentPlayer.id || m.characterName === currentPlayer.characterName
  );
  const isFull = room.status === 'full';
  const meetsLevel = currentPlayer && currentPlayer.level >= room.filters.minLevel;
  const meetsWorld = !room.filters.world || (currentPlayer?.world === room.filters.world);
  const meetsClan = !room.filters.clan || room.filters.clan === 'None' || (currentPlayer?.clan === room.filters.clan);
  const canJoin = currentPlayer && meetsLevel && meetsWorld && meetsClan && !isFull && !isMember;

  return (
    <div
      className={`card transition-all duration-200 ${
        isMember ? 'border-pxg-red/40 glow-red' : 'hover:border-gray-700'
      } ${isFull ? 'opacity-75' : ''}`}
    >
      {/* Quest name + status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">{room.quest.category}</p>
          <h3 className="font-semibold text-white text-sm truncate">{room.quest.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {isFull ? (
            <span className="badge bg-red-500/10 text-red-400 border-red-500/20">
              <Lock className="w-3 h-3" /> Full
            </span>
          ) : (
            <span className="badge bg-green-500/10 text-green-400 border-green-500/20">
              <Unlock className="w-3 h-3" /> Open
            </span>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {room.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-1.5 bg-pxg-dark rounded-lg px-2 py-1"
            title={`${member.characterName} | Lv ${member.level} | ${member.world} | ${member.clan}`}
          >
            {member.id === room.leader.id && (
              <Crown className="w-3 h-3 text-pxg-gold shrink-0" />
            )}
            <span className="text-xs font-medium text-gray-200 truncate max-w-[80px]">
              {member.characterName}
            </span>
            <span className="text-xs text-gray-500">Lv {member.level}</span>
          </div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: room.maxPlayers - room.members.length }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-1.5 bg-pxg-dark/50 border border-dashed border-pxg-dark-border rounded-lg px-2 py-1">
            <Users className="w-3 h-3 text-gray-700" />
            <span className="text-xs text-gray-700">Empty</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-3 text-xs text-gray-500">
        <span>Lv {room.filters.minLevel}+</span>
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
      </div>

      {/* Slots indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {Array.from({ length: room.maxPlayers }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < room.members.length ? 'bg-pxg-red' : 'bg-pxg-dark-border'
              }`}
              style={{ minWidth: '16px' }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-2 shrink-0">
          {room.members.length}/{room.maxPlayers}
        </span>
      </div>

      {/* Actions */}
      {isMember ? (
        <button
          onClick={() => onEnter(room.id)}
          className="btn-primary w-full text-sm"
        >
          Enter Room
        </button>
      ) : (
        <button
          onClick={() => onJoin(room.id)}
          disabled={!canJoin}
          className="btn-secondary w-full text-sm"
          title={
            !currentPlayer
              ? 'Set up profile first'
              : !meetsLevel
              ? `Requires level ${room.filters.minLevel}`
              : !meetsWorld
              ? `Requires world ${room.filters.world}`
              : !meetsClan
              ? `Requires clan ${room.filters.clan}`
              : isFull
              ? 'Room is full'
              : undefined
          }
        >
          {isFull ? 'Full' : 'Join Room'}
        </button>
      )}
    </div>
  );
}
