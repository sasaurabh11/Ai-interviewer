import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function useInterview() {
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/interview/session/start`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setAnswers({});
      setCurrentIndex(0);
      setEvaluation(null);
    } catch (e) {
      setError('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const submitCurrentAnswer = async (text) => {
    if (!sessionId) return;
    const q = questions[currentIndex];
    const payload = {
      questionId: q.id,
      questionText: q.text,
      responseText: text,
      startedAt: new Date().toISOString(),
      answeredAt: new Date().toISOString()
    };
    await fetch(`${API_BASE}/interview/session/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setAnswers((prev) => ({ ...prev, [q.id]: text }));
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  };

  const complete = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/interview/session/${sessionId}/complete`, { method: 'POST' });
      const data = await res.json();
      setEvaluation(data.evaluation);
    } finally {
      setLoading(false);
    }
  };

  return { sessionId, questions, answers, currentIndex, evaluation, start, submitCurrentAnswer, complete, loading, error };
}

export function App() {
  const interview = useInterview();
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!interview.sessionId) return;
    setInput('');
  }, [interview.currentIndex]);

  const currentQuestion = useMemo(() => interview.questions[interview.currentIndex], [interview.questions, interview.currentIndex]);

  return (
    <div className="container">
      <header>
        <h1>AI Interviewer</h1>
        <p>Hi, I’m your AI interviewer for the SDE Intern role.</p>
      </header>

      {!interview.sessionId && (
        <div className="card">
          <button className="primary" onClick={interview.start} disabled={interview.loading}>Start Interview</button>
          {interview.error && <p className="error">{interview.error}</p>}
        </div>
      )}

      {interview.sessionId && !interview.evaluation && (
        <div className="card">
          <div className="qmeta">
            <span>Question {interview.currentIndex + 1} of {interview.questions.length}</span>
          </div>
          <h3>{currentQuestion?.text}</h3>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer here..."
            rows={6}
          />
          <div className="actions">
            <button onClick={() => interview.submitCurrentAnswer(input)} disabled={!input.trim()}>Submit Answer</button>
            {interview.currentIndex === interview.questions.length - 1 && (
              <button className="primary" onClick={interview.complete}>Finish & Evaluate</button>
            )}
          </div>
        </div>
      )}

      {interview.evaluation && (
        <div className="card">
          <h2>Evaluation</h2>
          <p className="summary">{interview.evaluation.summary}</p>
          <div className="scores">
            <div>Technical Knowledge: <strong>{interview.evaluation.scores.technical}/10</strong></div>
            <div>Problem-Solving: <strong>{interview.evaluation.scores.problemSolving}/10</strong></div>
            <div>Communication: <strong>{interview.evaluation.scores.communication}/10</strong></div>
          </div>
          <h4>Feedback</h4>
          <ul>
            <li><strong>Technical:</strong> {interview.evaluation.feedback.technical}</li>
            <li><strong>Problem-Solving:</strong> {interview.evaluation.feedback.problemSolving}</li>
            <li><strong>Communication:</strong> {interview.evaluation.feedback.communication}</li>
          </ul>
          <button onClick={interview.start}>Start New Interview</button>
        </div>
      )}
    </div>
  );
}

