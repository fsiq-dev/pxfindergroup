import { Quest } from '../types';

export const QUESTS: Quest[] = [
  // ─── SARKIES QUEST ──────────────────────────────────────────────────────────
  {
    id: 'sarkies-mansion',
    name: 'Sarkies Quest — Mansão',
    description:
      'Investigue os planos do Dr. Sarkies na sua mansão. O grupo deve coordenar a ativação simultânea de alavancas em três andares e derrotar guardas antes que as barreiras laser se fechem.',
    minPlayers: 6,
    maxPlayers: 9,
    minLevel: 400,
    category: 'special',
    difficulty: 'hard',
    wikiUrl: 'https://wiki.pokexgames.com/index.php/Sarkies_Quest',
    estimatedDuration: '30-60 min',
    rewards: [
      '80 kk EXP',
      'X-Attack Held Item',
      'Palladium Ore',
      'Shiny Celebi Toy',
    ],
    tags: ['sarkies', 'mansion', 'group', 'coordination'],
  },
  {
    id: 'sarkies-dungeons',
    name: 'Sarkies Quest — Dungeons',
    description:
      'Adentre as Cyborg Dungeons de 4 andares e derrote 72 inimigos ciborgues. Atenção: apenas magias do elemento correspondente causam dano. Limite de 90 minutos e 2 tentativas diárias.',
    minPlayers: 3,
    maxPlayers: 6,
    minLevel: 500,
    category: 'special',
    difficulty: 'extreme',
    wikiUrl: 'https://wiki.pokexgames.com/index.php/Sarkies_Quest',
    estimatedDuration: '60-90 min',
    rewards: [
      '80 kk EXP',
      '2 kk Nightmare EXP',
      'Golden Gauntlet',
      'Girl Dress',
      '100 Sarkies Advanced Stones',
      'Deoxys Pokédex',
    ],
    tags: ['sarkies', 'dungeons', 'cyborgs', 'endgame', 'timed'],
  },
  {
    id: 'outland-main',
    name: 'Outland Main (Kanto)',
    description:
      'Reúna um grupo de 6 a 9 jogadores de clãs diferentes para selar um portal que ameaça a humanidade. Complete tarefas nas três regiões do Outland, colete 15 peças de artefatos e vença a batalha final contra os Outland Spectres em 4 rounds épicos.',
    minPlayers: 6,
    maxPlayers: 9,
    minLevel: 150,
    category: 'kanto',
    difficulty: 'extreme',
    wikiUrl: 'https://wiki.pokexgames.com/index.php/Outland_Main',
    estimatedDuration: '90-180 min',
    rewards: [
      '22.000.000 EXP',
      '800.000 Cash',
      'Outfit Outland do Clã',
      'Elemental Egg',
      '32 Evolution Stones',
      'Metal/Crystal/Ancient Stone',
      'Cartoon Box',
      'Halloween Box',
      'Clan Doll',
    ],
    tags: ['outland', 'kanto', 'multi-clan', 'endgame', 'boss'],
  },
];

export const getQuestById = (id: string): Quest | undefined =>
  QUESTS.find((q) => q.id === id);

export const getQuestsByCategory = (category: string): Quest[] =>
  QUESTS.filter((q) => q.category === category);

/** Quests que exigem clãs diferentes entre todos os membros */
export const requiresUniqueClan = (questId: string): boolean =>
  QUESTS.find((q) => q.id === questId)?.tags.includes('multi-clan') ?? false;
