import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectToDatabase } from './db.js';
import interviewRouter from './routes/interview.js';


const app = express();
app.use(express.json({ limit: '1mb' }));

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: clientOrigin }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/interview', interviewRouter);

const port = process.env.PORT || 5000;

async function start() {
  await connectToDatabase();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

