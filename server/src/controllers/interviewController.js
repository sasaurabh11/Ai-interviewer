import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { SessionModel } from '../models/Session.js';
import { generateInterviewQuestions, evaluateInterview } from '../services/geminiService.js';

const inMemorySessions = new Map();

function isDbAvailable() {
  return !!(SessionModel && SessionModel.db && SessionModel.db.readyState === 1);
}

export async function startSession(req, res) {
  try {
    const sessionId = uuidv4();
    const role = 'SDE Intern';
    const questions = await generateInterviewQuestions(role);

    const session = {
      sessionId,
      role,
      questions,
      answers: [],
      status: 'active',
      createdAt: new Date()
    };

    if (isDbAvailable()) {
      await SessionModel.create(session);
    } else {
      inMemorySessions.set(sessionId, session);
    }

    res.json({ sessionId, role, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start session' });
  }
}

const AnswerSchema = z.object({
  questionId: z.string(),
  questionText: z.string(),
  responseText: z.string().min(1),
  startedAt: z.string().datetime().optional(),
  answeredAt: z.string().datetime().optional()
});

export async function submitAnswer(req, res) {
  try {
    const { sessionId } = req.params;
    const parsed = AnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid answer payload' });
    }
    const answer = parsed.data;
    const fetchSession = async () =>
      isDbAvailable()
        ? await SessionModel.findOne({ sessionId })
        : inMemorySessions.get(sessionId);

    const session = await fetchSession();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'completed') return res.status(400).json({ error: 'Session completed' });

    session.answers.push({ ...answer, startedAt: answer.startedAt ? new Date(answer.startedAt) : undefined, answeredAt: answer.answeredAt ? new Date(answer.answeredAt) : undefined });

    if (isDbAvailable()) {
      await SessionModel.updateOne({ sessionId }, { $set: { answers: session.answers } });
    } else {
      inMemorySessions.set(sessionId, session);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
}

export async function getSession(req, res) {
  try {
    const { sessionId } = req.params;
    const session = isDbAvailable()
      ? await SessionModel.findOne({ sessionId })
      : inMemorySessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get session' });
  }
}

export async function completeSession(req, res) {
  try {
    const { sessionId } = req.params;
    const session = isDbAvailable()
      ? await SessionModel.findOne({ sessionId })
      : inMemorySessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const evaluation = await evaluateInterview(session);

    session.status = 'completed';
    session.completedAt = new Date();

    if (isDbAvailable()) {
      await SessionModel.updateOne(
        { sessionId },
        { $set: { status: 'completed', completedAt: session.completedAt } }
      );
    } else {
      inMemorySessions.set(sessionId, session);
    }

    res.json({ evaluation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete session' });
  }
}

