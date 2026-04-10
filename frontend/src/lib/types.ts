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

export type Clan = 'Volcanic' | 'Raibolt' | 'Seavell' | 'Orebound' | 'Naturia' | 'Gardestrike' | 'Ironhard' | 'Wingeon' | 'Psycraft' | 'Malefic' |'None';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';
export type QuestCategory = 'kanto' | 'special';
export type RoomStatus = 'waiting' | 'full' | 'in-progress' | 'completed';

export interface Player {
  id: string;
  characterName: string;
  world: World;
  level: number;
  clan: Clan;
  socketId: string;
  joinedAt: string;
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
  // enriched by API
  activeRooms?: number;
  playersInQueue?: number;
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
  timestamp: string;
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
  createdAt: string;
  updatedAt: string;
}

export const WORLDS: World[] = [
  'Gold', 'Aurora', 'Omega', 'Emerald', 'Cosmic', 'Steel', 'Wind',
  'Lunar', 'Ocean', 'Obsidian', 'Flame', 'Rainbow', 'Soul', 'Unite',
];

export const CLANS: Clan[] = ['Volcanic','Raibolt','Seavell','Orebound','Naturia','Gardestrike','Ironhard','Wingeon','Psycraft','Malefic','None'];

export const DIFFICULTY_COLORS: Record<QuestDifficulty, string> = {
  easy: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  hard: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  extreme: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export const CATEGORY_COLORS: Record<QuestCategory, string> = {
  kanto:   'text-amber-400 bg-amber-400/10',
  special: 'text-pink-400 bg-pink-400/10',
};

export const WORLD_COLORS: Record<World, string> = {
  Gold:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Aurora:   'bg-purple-400/20 text-purple-300 border-purple-400/30',
  Omega:    'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  Emerald:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Cosmic:   'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Steel:    'bg-slate-400/20 text-slate-300 border-slate-400/30',
  Wind:     'bg-sky-400/20 text-sky-300 border-sky-400/30',
  Lunar:    'bg-blue-300/20 text-blue-200 border-blue-300/30',
  Ocean:    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  Obsidian: 'bg-gray-800/40 text-gray-300 border-gray-600/30',
  Flame:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Rainbow:  'bg-pink-400/20 text-pink-300 border-pink-400/30',
  Soul:     'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  Unite:    'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

export const CLAN_COLORS: Record<Clan, string> = {
  Volcanic:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Raibolt:    'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
  Seavell:    'bg-teal-500/20 text-teal-300 border-teal-500/30',
  Orebound:   'bg-stone-500/20 text-stone-300 border-stone-500/30',
  Naturia:    'bg-green-500/20 text-green-300 border-green-500/30',
  Gardestrike:'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  Ironhard:   'bg-slate-500/20 text-slate-300 border-slate-500/30',
  Wingeon:    'bg-sky-400/20 text-sky-300 border-sky-400/30',
  Psycraft:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Malefic:    'bg-red-800/20 text-red-400 border-red-800/30',
  None:       'bg-gray-700/20 text-gray-400 border-gray-700/30',
};
