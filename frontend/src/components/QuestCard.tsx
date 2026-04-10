'use client';
import { Users, Clock, ExternalLink, Star, ChevronRight, Loader2 } from 'lucide-react';
import { Quest, DIFFICULTY_COLORS, CATEGORY_COLORS } from '@/lib/types';

interface QuestCardProps {
  quest: Quest;
  inQueue: boolean;
  currentRoomQuestId: string | null;
  onJoinQueue: (quest: Quest) => void;
  onLeaveQueue: (questId: string) => void;
  onCreateRoom: (quest: Quest) => void;
  playerLevel: number | null;
}

export function QuestCard({
  quest,
  inQueue,
  currentRoomQuestId,
  onJoinQueue,
  onLeaveQueue,
  onCreateRoom,
  playerLevel,
}: QuestCardProps) {
  const meetsLevel = playerLevel !== null && playerLevel >= quest.minLevel;
  const hasPlayer = playerLevel !== null;
  const inRoom = currentRoomQuestId !== null;

  return (
    <div
      className={`card hover:border-pxg-dark-border/80 transition-all duration-200 flex flex-col gap-3 ${
        inQueue ? 'border-pxg-gold/40 glow-red' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge ${CATEGORY_COLORS[quest.category]}`}>
              {quest.category}
            </span>
            <span className={`badge border ${DIFFICULTY_COLORS[quest.difficulty]}`}>
              {quest.difficulty}
            </span>
          </div>
          <h3 className="font-bold text-white text-base leading-snug">{quest.name}</h3>
        </div>

        <a
          href={quest.wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open Wiki"
          className="shrink-0 btn-ghost p-1.5 text-gray-500 hover:text-gray-300"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{quest.description}</p>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {quest.minPlayers}–{quest.maxPlayers} players
        </span>
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5" />
          Lv {quest.minLevel}+
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {quest.estimatedDuration}
        </span>
      </div>

      {/* Live stats */}
      <div className="flex items-center gap-3 text-xs">
        {(quest.activeRooms ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {quest.activeRooms} room{quest.activeRooms !== 1 ? 's' : ''} open
          </span>
        )}
        {(quest.playersInQueue ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-pxg-gold">
            <Loader2 className="w-3 h-3 animate-spin" />
            {quest.playersInQueue} in queue
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 mt-auto">
        {inQueue ? (
          <button
            onClick={() => onLeaveQueue(quest.id)}
            className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-pxg-gold" />
            Leave Queue
          </button>
        ) : (
          <button
            onClick={() => onJoinQueue(quest)}
            disabled={!hasPlayer || !meetsLevel || inRoom}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
            title={!hasPlayer ? 'Set up profile first' : !meetsLevel ? `Requires level ${quest.minLevel}` : ''}
          >
            Join Queue
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onCreateRoom(quest)}
          disabled={!hasPlayer || !meetsLevel || inRoom || inQueue}
          className="btn-secondary text-sm"
          title="Create a manual room"
        >
          + Room
        </button>
      </div>

      {/* Level warning */}
      {hasPlayer && !meetsLevel && (
        <p className="text-xs text-pxg-red/70 -mt-1">
          Requires level {quest.minLevel} (you are {playerLevel})
        </p>
      )}
    </div>
  );
}
