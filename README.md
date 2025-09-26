AI Interviewer (MERN)

Setup:
- Server env: copy server/.env.example to server/.env and fill values
- Install: npm install && (cd server && npm install) && (cd client && npm install)
- Run: (cd server && npm run dev) and (cd client && npm run dev)

Endpoints:
- POST /api/interview/session/start
- POST /api/interview/session/:sessionId/answer
- POST /api/interview/session/:sessionId/complete

