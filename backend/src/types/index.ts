export type World =
  | 'Gold'
  | 'Aurora'
  | 'Omega'
  | 'Emerald'
  | 'Cosmic'
  | 'Steel'
  | 'Wind'
  | 'Lunar'
  | 'Ocean'
  | 'Obsidian'
  | 'Flame'
  | 'Rainbow'
  | 'Soul'
  | 'Unite';

export type Clan =
  | 'Volcanic'
  | 'Raibolt'
  | 'Seavell'
  | 'Orebound'
  | 'Naturia'
  | 'Gardestrike'
  | 'Ironhard'
  | 'Wingeon'
  | 'Psycraft'
  | 'Malefic'
  | 'None';

export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export type QuestCategory = 'kanto';

export type RoomStatus = 'waiting' | 'full' | 'in-progress' | 'completed';

export interface Player {
  id: string;
  characterName: string;
  world: World;
  level: number;
  clan: Clan;
  socketId: string;
  pushSubscription?: PushSubscriptionData;
  joinedAt: Date;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  minLevel: number;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  wikiUrl: string;
  estimatedDuration: string;
  rewards: string[];
  tags: string[];
}

export interface RoomFilters {
  minLevel: number;
  world?: World;
  clan?: Clan;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: Date;
}

export interface Room {
  id: string;
  questId: string;
  quest: Quest;
  leader: Player;
  members: Player[];
  status: RoomStatus;
  filters: RoomFilters;
  maxPlayers: number;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueEntry {
  player: Player;
  questId: string;
  joinedAt: Date;
}

// Socket event payloads
export interface PlayerSetupPayload {
  characterName: string;
  world: World;
  level: number;
  clan: Clan;
}

export interface JoinQueuePayload {
  questId: string;
}

export interface LeaveQueuePayload {
  questId: string;
}

export interface CreateRoomPayload {
  questId: string;
  filters: RoomFilters;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface SendMessagePayload {
  roomId: string;
  content: string;
}

export interface SubscribePushPayload {
  subscription: PushSubscriptionData;
  interestedQuestIds: string[];
}

// Server → Client events
export interface RoomsUpdateEvent {
  rooms: Room[];
}

export interface RoomMatchedEvent {
  room: Room;
}

export interface RoomFullEvent {
  room: Room;
}

export interface RoomUpdatedEvent {
  room: Room;
}

export interface ChatMessageEvent {
  roomId: string;
  message: ChatMessage;
}

export interface QueueUpdateEvent {
  questId: string;
  playersInQueue: number;
}

export interface ErrorEvent {
  message: string;
}
