import { Quest } from '../types';

export const QUESTS: Quest[] = [
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
