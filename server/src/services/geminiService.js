import { GoogleGenerativeAI } from '@google/generative-ai';

const client = (() => {
  const key = process.env.GOOGLE_API_KEY || "AIzaSyC5916s3EsHq61J93baOliTYzxCJEBko3A";
  if (!key) return null;
  return new GoogleGenerativeAI(key);
})();

const FALLBACK_QUESTIONS = [
  { id: 'q1', text: 'Hi, I\'m your AI interviewer for the SDE Intern role. Please tell me about yourself, your background, and why you are interested in this position.', category: 'behavioral' },
  { id: 'q2', text: 'Explain the time and space complexity of a HashMap and a Linked List.', category: 'technical' },
  { id: 'q3', text: 'Given an array of integers, find two numbers that add up to a target.', category: 'problem-solving' },
  { id: 'q4', text: 'Describe a time you faced a challenging bug and how you resolved it.', category: 'behavioral' },
  { id: 'q5', text: 'What are the differences between processes and threads?', category: 'technical' },
  { id: 'q6', text: 'How would you design a URL shortener at a high level?', category: 'system-design' }
];

export async function generateInterviewQuestions(role) {
  try {
    if (!client) return FALLBACK_QUESTIONS;

    const model = client.getGenerativeModel({ model: 'gemma-3-27b-it' });
    
    const randomSeed = Math.floor(Math.random() * 10000);
    const timestamp = Date.now();
    
    const prompt = `Generate exactly 6 unique interview questions for a ${role} position. Use this random seed: ${randomSeed} and timestamp: ${timestamp} to ensure variety.
    
    IMPORTANT: The first question MUST start with "Hi, I'm your AI interviewer for the ${role} role." and should be an introduction question asking about the candidate's background and interest in the position.
    
    Return ONLY a valid JSON array in this exact format:
    [
      {"id": "q1", "text": "Hi, I'm your AI interviewer for the ${role} role. [introduction question here]", "category": "behavioral"},
      {"id": "q2", "text": "question text here", "category": "technical"},
      {"id": "q3", "text": "question text here", "category": "problem-solving"},
      {"id": "q4", "text": "question text here", "category": "behavioral"},
      {"id": "q5", "text": "question text here", "category": "system-design"},
      {"id": "q6", "text": "question text here", "category": "technical"}
    ]
    
    Requirements:
    - Generate completely new and varied questions each time
    - Categories must be one of: technical, behavioral, problem-solving, communication, system-design
    - Questions should be concise, role-appropriate, and different from common interview questions
    - Mix different difficulty levels and topics
    - Avoid repetitive or overly similar questions
    - The first question must always be an introduction with the specified greeting
    
    Do not include any explanation or additional text - only the JSON array.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    
    const questions = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(questions) || questions.length !== 6) {
      throw new Error('Invalid questions format');
    }
    
    const validQuestions = questions.every(q => 
      q.id && q.text && q.category && 
      typeof q.text === 'string' && q.text.length > 10
    );
    
    if (!validQuestions) throw new Error('Invalid question structure');
    
    if (!questions[0].text.startsWith(`Hi, I'm your AI interviewer for the ${role} role`)) {
      questions[0].text = `Hi, I'm your AI interviewer for the ${role} role. Please tell me about yourself, your background, and why you are interested in this position.`;
      questions[0].category = 'behavioral';
    }
    
    return questions;
    
  } catch (e) {
    console.warn('Gemini questions fallback used:', e.message);
    const fallbackWithGreeting = [...FALLBACK_QUESTIONS];
    fallbackWithGreeting[0] = { 
      ...fallbackWithGreeting[0], 
      text: `Hi, I'm your AI interviewer for the ${role} role. Please tell me about yourself, your background, and why you are interested in this position.`
    };
    return fallbackWithGreeting;
  }
}

export async function evaluateInterview(session) {
  const { questions, answers, role } = session;
  
  const qaList = questions.map((q) => ({
    id: q.id,
    question: q.text,
    answer: answers.find((a) => a.questionId === q.id)?.responseText || 'No answer provided'
  }));

  try {
    if (!client) return getLocalEvaluation(qaList);

    const model = client.getGenerativeModel({ model: 'gemma-3-27b-it' });
    
    const qaText = qaList.map((qa, i) => 
      `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`
    ).join('\n\n');
    
    const prompt = `You are evaluating a candidate for ${role} position based on their interview responses.

    Interview Q&A:
    ${qaText}

    Provide your evaluation in this EXACT JSON format (no additional text):
    {
      "scores": {
        "technical": 7,
        "problemSolving": 6,
        "communication": 8
      },
      "summary": "Brief 2-3 sentence overall assessment of the candidate",
      "feedback": {
        "technical": "Brief technical feedback",
        "problemSolving": "Brief problem-solving feedback", 
        "communication": "Brief communication feedback"
      }
    }

    Scoring Guidelines:
    - Each score should be 0-10 (integers only)
    - Technical: Knowledge of CS fundamentals, algorithms, data structures
    - Problem-solving: Logical thinking, approach to problems, creativity
    - Communication: Clarity, structure, explanation quality
    
    Keep feedback concise (1-2 sentences each).
    Return ONLY the JSON object.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const evaluation = JSON.parse(jsonMatch[0]);
    
    if (!evaluation.scores || !evaluation.summary || !evaluation.feedback) {
      throw new Error('Invalid evaluation structure');
    }
    
    const scores = evaluation.scores;
    ['technical', 'problemSolving', 'communication'].forEach(key => {
      if (typeof scores[key] !== 'number' || scores[key] < 0 || scores[key] > 10) {
        scores[key] = Math.max(0, Math.min(10, Math.round(scores[key] || 5)));
      }
    });
    
    return evaluation;
    
  } catch (e) {
    console.warn('Gemini evaluation fallback used:', e.message);
    return getLocalEvaluation(qaList);
  }
}

function getLocalEvaluation(qaList) {
  const totalAnswers = qaList.filter(qa => qa.answer && qa.answer !== 'No answer provided').length;
  const avgLength = qaList.reduce((sum, qa) => sum + (qa.answer?.split(/\s+/).length || 0), 0) / qaList.length;
  const hasStructure = qaList.some(qa => qa.answer?.includes('.') || qa.answer?.includes(','));
  
  const completionRate = totalAnswers / qaList.length;
  
  const technical = Math.min(10, Math.max(1, Math.round(3 + (completionRate * 5) + (avgLength / 20))));
  const problemSolving = Math.min(10, Math.max(1, Math.round(2 + (completionRate * 6) + (avgLength / 25))));
  const communication = Math.min(10, Math.max(1, Math.round(3 + (completionRate * 4) + (hasStructure ? 3 : 1))));

  return {
    scores: {
      technical,
      problemSolving, 
      communication
    },
    summary: `Candidate provided ${totalAnswers}/${qaList.length} responses with ${avgLength < 15 ? 'brief' : avgLength > 40 ? 'detailed' : 'moderate'} explanations. ${technical >= 7 ? 'Strong' : 'Developing'} technical foundation observed.`,
    feedback: {
      technical: totalAnswers < qaList.length * 0.5 ? 'Provide more complete responses to technical questions.' : 'Demonstrate deeper CS fundamentals knowledge.',
      problemSolving: avgLength < 20 ? 'Elaborate on your problem-solving approach with more detail.' : 'Structure your solutions with clear steps.',
      communication: hasStructure ? 'Good communication structure. Practice explaining complex concepts simply.' : 'Use better sentence structure and organization in responses.'
    }
  };
}