import { Router } from 'express';
import { QUESTS, getQuestsByCategory } from '../data/quests';
import { queueService } from '../services/QueueService';

const router = Router();

router.get('/', (_req, res) => {
  const rooms = queueService.getRooms();
  const queues = queueService.getQueueSnapshot();

  const questsWithStats = QUESTS.map((quest) => ({
    ...quest,
    activeRooms: rooms.filter((r) => r.questId === quest.id && r.status === 'waiting').length,
    playersInQueue: queues[quest.id] ?? 0,
  }));

  res.json({ quests: questsWithStats });
});

router.get('/category/:category', (req, res) => {
  const quests = getQuestsByCategory(req.params.category);
  res.json({ quests });
});

router.get('/:id', (req, res) => {
  const quest = QUESTS.find((q) => q.id === req.params.id);
  if (!quest) {
    res.status(404).json({ error: 'Quest not found' });
    return;
  }
  res.json({ quest });
});

export default router;
