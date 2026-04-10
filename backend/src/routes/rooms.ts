import { Router } from 'express';
import { queueService } from '../services/QueueService';

const router = Router();

router.get('/', (_req, res) => {
  const rooms = queueService.getRooms();
  res.json({ rooms });
});

router.get('/:id', (req, res) => {
  const room = queueService.getRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  // Don't expose push subscriptions
  const sanitized = {
    ...room,
    members: room.members.map(({ pushSubscription: _ps, ...m }) => m),
    leader: (({ pushSubscription: _ps, ...l }) => l)(room.leader),
  };
  res.json({ room: sanitized });
});

export default router;
