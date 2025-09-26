import { Router } from 'express';
import {
  startSession,
  submitAnswer,
  getSession,
  completeSession
} from '../controllers/interviewController.js';

const router = Router();

router.post('/session/start', startSession);
router.post('/session/:sessionId/answer', submitAnswer);
router.get('/session/:sessionId', getSession);
router.post('/session/:sessionId/complete', completeSession);

export default router;

