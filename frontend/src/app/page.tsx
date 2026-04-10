'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Navbar } from '@/components/Navbar';
import { PlayerSetup } from '@/components/PlayerSetup';
import { QuestCard } from '@/components/QuestCard';
import { RoomCard } from '@/components/RoomCard';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { ToastContainer, ToastItem } from '@/components/Toast';
import { usePlayer, PlayerProfile } from '@/hooks/usePlayer';
import { useSocket } from '@/hooks/useSocket';
import { useNotifications } from '@/hooks/useNotifications';
import { Quest, Room, Player, World, Clan } from '@/lib/types';
import { api } from '@/lib/api';
import { Search, LayoutGrid, List } from 'lucide-react';

type Filter = 'all' | 'kanto';

export default function HomePage() {
  const router = useRouter();
  const { profile, player, setPlayer, saveProfile } = usePlayer();

  const [quests, setQuests] = useState<Quest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [queuedQuestId, setQueuedQuestId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [createRoomQuest, setCreateRoomQuest] = useState<Quest | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load initial data
  useEffect(() => {
    api.quests.list().then(setQuests).catch(() => {});
    api.push.getVapidKey().then(setVapidKey).catch(() => {});
  }, []);

  // Socket
  const { setupPlayer, joinQueue, leaveQueue, createRoom, joinRoom } = useSocket({
    onPlayerReady: (p: Player) => {
      setPlayer(p);
    },
    onRoomsUpdate: (updatedRooms: Room[]) => {
      setRooms(updatedRooms);
      // Update quest stats
      setQuests((prev) =>
        prev.map((q) => ({
          ...q,
          activeRooms: updatedRooms.filter((r) => r.questId === q.id && r.status === 'waiting').length,
        }))
      );
      // Keep current room in sync
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return updatedRooms.find((r) => r.id === prev.id) ?? null;
      });
    },
    onRoomMatched: (room: Room) => {
      setCurrentRoom(room);
      setQueuedQuestId(null);
      addToast('success', `Matched! Your party for "${room.quest.name}" is ready!`);
      router.push(`/room/${room.id}`);
    },
    onRoomCreated: (room: Room) => {
      setCurrentRoom(room);
      addToast('success', `Room created for "${room.quest.name}"`);
      router.push(`/room/${room.id}`);
    },
    onRoomJoined: (room: Room) => {
      setCurrentRoom(room);
      addToast('info', `Joined room for "${room.quest.name}"`);
      router.push(`/room/${room.id}`);
    },
    onRoomUpdated: (room: Room) => {
      setCurrentRoom((prev) => (prev?.id === room.id ? room : prev));
    },
    onRoomFull: (room: Room) => {
      addToast('success', `Party full! ${room.quest.name} quest can begin!`);
    },
    onQueueJoined: (questId: string) => {
      setQueuedQuestId(questId);
      const quest = quests.find((q) => q.id === questId);
      addToast('info', `Joined queue for "${quest?.name ?? questId}"`);
    },
    onQueueLeft: (questId: string) => {
      if (queuedQuestId === questId) setQueuedQuestId(null);
    },
    onQueueUpdate: (questId: string, count: number) => {
      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, playersInQueue: count } : q))
      );
    },
    onError: (message: string) => {
      addToast('error', message);
    },
  });

  // Push notifications
  useNotifications(vapidKey, quests.map((q) => q.id));

  // Auto-setup player when profile exists
  useEffect(() => {
    if (profile && !player) {
      setupPlayer(profile);
    }
  }, [profile, player, setupPlayer]);

  // Open setup if no profile on first visit
  useEffect(() => {
    if (quests.length > 0 && !profile) {
      setShowSetup(true);
    }
  }, [quests.length, profile]);

  function handleSaveProfile(p: PlayerProfile) {
    saveProfile(p);
    setupPlayer(p);
  }

  function handleJoinQueue(quest: Quest) {
    if (!player) { setShowSetup(true); return; }
    joinQueue(quest.id);
  }

  function handleCreateRoom(quest: Quest) {
    if (!player) { setShowSetup(true); return; }
    setCreateRoomQuest(quest);
  }

  function handleConfirmCreateRoom(
    questId: string,
    filters: { minLevel: number; world?: World; clan?: Clan }
  ) {
    createRoom(questId, filters);
  }

  function handleJoinRoom(roomId: string) {
    if (!player) { setShowSetup(true); return; }
    joinRoom(roomId);
  }

  function handleEnterRoom(roomId: string) {
    router.push(`/room/${roomId}`);
  }

  const categories: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'kanto', label: 'Kanto' },
  ];

  const filteredQuests = quests.filter((q) => {
    const matchesFilter = filter === 'all' || q.category === filter;
    const matchesSearch = !search || q.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const waitingRooms = rooms.filter((r) => r.status === 'waiting');

  return (
    <div className="min-h-screen bg-pxg-dark">
      <Navbar
        player={player}
        onSetupProfile={() => setShowSetup(true)}
        activeQueueCount={queuedQuestId ? 1 : 0}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Find Your <span className="text-pxg-red">Party</span>
          </h1>
          <p className="text-gray-400">
            Join or create groups for PXG quests. Real-time matchmaking — no refreshing needed.
          </p>
        </div>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              className="input pl-9"
              placeholder="Search quests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border transition-colors ${viewMode === 'grid' ? 'border-pxg-red text-pxg-red bg-pxg-red/10' : 'border-pxg-dark-border text-gray-500 hover:text-gray-300'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border transition-colors ${viewMode === 'list' ? 'border-pxg-red text-pxg-red bg-pxg-red/10' : 'border-pxg-dark-border text-gray-500 hover:text-gray-300'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filter === cat.value
                  ? 'bg-pxg-red border-pxg-red text-white'
                  : 'border-pxg-dark-border text-gray-400 hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quests panel */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Quests ({filteredQuests.length})
            </h2>
            {filteredQuests.length === 0 ? (
              <div className="card text-center py-12 text-gray-600">
                <p>No quests found.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                : 'flex flex-col gap-3'
              }>
                {filteredQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    inQueue={queuedQuestId === quest.id}
                    currentRoomQuestId={currentRoom?.questId ?? null}
                    onJoinQueue={handleJoinQueue}
                    onLeaveQueue={leaveQueue}
                    onCreateRoom={handleCreateRoom}
                    playerLevel={player?.level ?? null}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Rooms panel */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Open Rooms ({waitingRooms.length})
            </h2>
            {waitingRooms.length === 0 ? (
              <div className="card text-center py-10 text-gray-600 text-sm">
                <p>No open rooms right now.</p>
                <p className="text-xs mt-1">Create one or join a queue!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {waitingRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    currentPlayer={player}
                    onJoin={handleJoinRoom}
                    onEnter={handleEnterRoom}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showSetup && (
        <PlayerSetup
          initialProfile={profile}
          onSave={handleSaveProfile}
          onClose={() => setShowSetup(false)}
        />
      )}

      {createRoomQuest && (
        <CreateRoomModal
          quest={createRoomQuest}
          playerLevel={player?.level ?? createRoomQuest.minLevel}
          onConfirm={handleConfirmCreateRoom}
          onClose={() => setCreateRoomQuest(null)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
