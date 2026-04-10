import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import questsRouter from './routes/quests';
import roomsRouter from './routes/rooms';
import { registerSocketHandlers } from './socket/handlers';

const PORT = process.env.PORT ?? 4000;
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';

const app = express();
const httpServer = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.use('/api/quests', questsRouter);
app.use('/api/rooms', roomsRouter);

// VAPID public key endpoint (for Web Push setup on client)
app.get('/api/push/vapid-public-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(503).json({ error: 'Push notifications not configured' });
    return;
  }
  res.json({ vapidPublicKey: key });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// ─── Start ───────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🎮 PXG Party Finder Backend`);
  console.log(`   HTTP  → http://localhost:${PORT}`);
  console.log(`   WS    → ws://localhost:${PORT}`);
  console.log(`   CORS  → ${CLIENT_URL}\n`);
});

export { io };
