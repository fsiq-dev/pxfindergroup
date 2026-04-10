import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import questsRouter from './routes/quests';
import roomsRouter from './routes/rooms';
import { registerSocketHandlers } from './socket/handlers';
import { redis, redisSub } from './lib/redis';

const PORT = process.env.PORT ?? 4000;

// Aceita múltiplas origens separadas por vírgula
// Ex: CLIENT_URL=https://meusite.vercel.app,http://localhost:3000
const ALLOWED_ORIGINS = (process.env.CLIENT_URL ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

const app = express();
const httpServer = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/ping', (_req, res) => res.json({ pong: true }));
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
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Redis adapter: permite múltiplas instâncias do backend compartilharem eventos
io.adapter(createAdapter(redis, redisSub));

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// ─── Start ───────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🎮 Poke Party Finder Backend`);
  console.log(`   HTTP  → http://localhost:${PORT}`);
  console.log(`   WS    → ws://localhost:${PORT}`);
  console.log(`   CORS  → ${ALLOWED_ORIGINS.join(', ')}\n`);
});

export { io };
