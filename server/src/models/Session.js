import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema(
  {
    questionId: String,
    questionText: String,
    responseText: String,
    startedAt: Date,
    answeredAt: Date
  },
  { _id: false }
);

const SessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, index: true, unique: true },
    role: { type: String, default: 'SDE Intern' },
    questions: [
      {
        id: String,
        text: String,
        category: String
      }
    ],
    answers: [AnswerSchema],
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);

