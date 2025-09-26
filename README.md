# AI Interviewer

A comprehensive face-to-face AI interviewer application designed for conducting SDE Intern interviews. The system uses Google's Gemini AI to generate dynamic questions and provide intelligent evaluations of candidate responses.

## 🚀 Features

- **Dynamic Question Generation**: AI-powered questions covering technical, behavioral, problem-solving, and communication aspects
- **Real-time Interview Flow**: Interactive Q&A interface with progress tracking
- **Intelligent Evaluation**: AI-based scoring and feedback for Technical Knowledge, Problem-Solving, and Communication
- **Session Management**: Persistent interview sessions with MongoDB support
- **Responsive UI**: Modern, clean interface built with React and Vite
- **Fallback System**: Works without API keys using predefined questions and heuristic evaluation

## 🛠️ Tech Stack

### Backend
- **Express.js**: RESTful API server
- **MongoDB**: Session storage (optional - falls back to in-memory)
- **Google Gemini AI**: Question generation and evaluation
- **Zod**: Input validation
- **CORS**: Cross-origin resource sharing

### Frontend
- **React 18**: Modern UI framework
- **Vite**: Fast build tool and dev server
- **CSS3**: Custom styling with dark theme

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (optional - for persistent sessions)
- Google AI API key (optional - for AI features)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/sasaurabh11/Ai-interviewer.git
cd AI-interviewer
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Configuration

Create environment files:

**Server Environment** (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_interviewer
GOOGLE_API_KEY=your-google-gemini-api-key-here
CLIENT_ORIGIN=http://localhost:5173
```

**Client Environment** (`client/.env`):
```env
VITE_API_BASE=http://localhost:5000/api
```

### 4. Get Google Gemini API Key (Optional)

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `server/.env` file

*Note: Without an API key, the system uses fallback questions and heuristic evaluation.*

## 🚀 Running the Application

### Development Mode

Open two terminal windows:

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
```
Server will start at: `http://localhost:5000`

**Terminal 2 - Frontend Client:**
```bash
cd client
npm run dev
```
Client will start at: `http://localhost:5173`

### Production Mode

**Build and serve client from server:**
```bash
# Build the client
cd client
npm run build

# Start production server
cd ../server
npm start
```
Application will be available at: `http://localhost:5000`

## 📡 API Endpoints

### Interview Session Management

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `POST` | `/api/interview/session/start` | Start new interview session | None | `{ sessionId, role, questions }` |
| `POST` | `/api/interview/session/:sessionId/answer` | Submit answer for current question | `{ questionId, questionText, responseText, startedAt, answeredAt }` | `{ ok: true }` |
| `GET` | `/api/interview/session/:sessionId` | Get session details | None | Session object |
| `POST` | `/api/interview/session/:sessionId/complete` | Complete interview and get evaluation | None | `{ evaluation }` |

### Health Check
| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/api/health` | Server health check | `{ ok: true }` |

## 🎯 Usage Guide

### Starting an Interview

1. Open the application in your browser
2. Click "Start Interview"
3. The AI will generate 6 relevant questions for the SDE Intern role
4. Answer each question in the text area
5. Click "Submit Answer" to proceed to the next question
6. After the last question, click "Finish & Evaluate" to get your results

---

**Happy Interviewing! 🎉**