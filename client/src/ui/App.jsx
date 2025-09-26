import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Keyboard,
  MessageSquare,
  Bot,
  Star,
  CheckCircle,
  RefreshCw,
  Loader,
} from "lucide-react";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000/api";

function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + " " + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && isSupported) {
      setTranscript("");
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isSupported) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  }, [isSupported]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}

function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  useEffect(() => {
    const supported = "speechSynthesis" in window;
    setIsSupported(supported);

    if (supported) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback(
    (text) => {
      if (!isSupported || !text || !voicesLoaded) return;

      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice =
          voices.find(
            (voice) => voice.lang.startsWith("en") && voice.localService
          ) ||
          voices.find((voice) => voice.lang.startsWith("en")) ||
          voices[0];

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.rate = 0.85;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = "en-US";

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }, 100);
    },
    [isSupported, voicesLoaded]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported: isSupported && voicesLoaded,
  };
}

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
      const res = await fetch(`${API_BASE}/interview/session/start`, {
        method: "POST",
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setAnswers({});
      setCurrentIndex(0);
      setEvaluation(null);
    } catch (e) {
      setError("Failed to start session");
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
      answeredAt: new Date().toISOString(),
    };
    await fetch(`${API_BASE}/interview/session/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setAnswers((prev) => ({ ...prev, [q.id]: text }));
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  };

  const complete = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/interview/session/${sessionId}/complete`,
        { method: "POST" }
      );
      const data = await res.json();
      setEvaluation(data.evaluation);
    } finally {
      setLoading(false);
    }
  };

  return {
    sessionId,
    questions,
    answers,
    currentIndex,
    evaluation,
    start,
    submitCurrentAnswer,
    complete,
    loading,
    error,
  };
}

export function App() {
  const interview = useInterview();
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState("voice");
  const speechRecognition = useSpeechRecognition();
  const textToSpeech = useTextToSpeech();

  const currentQuestion = useMemo(
    () => interview.questions[interview.currentIndex],
    [interview.questions, interview.currentIndex]
  );

  useEffect(() => {
    if (
      currentQuestion &&
      textToSpeech.isSupported &&
      !textToSpeech.isSpeaking
    ) {
      textToSpeech.stop();
      const timer = setTimeout(() => {
        textToSpeech.speak(currentQuestion.text);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, textToSpeech.isSupported]);

  useEffect(() => {
    if (!interview.sessionId) return;
    setInput("");
    speechRecognition.resetTranscript();
  }, [interview.currentIndex, speechRecognition.resetTranscript]);

  useEffect(() => {
    if (inputMode === "voice" && speechRecognition.transcript) {
      setInput(speechRecognition.transcript.trim());
    }
  }, [speechRecognition.transcript, inputMode]);

  const handleSubmitAnswer = () => {
    const answer = input.trim();
    if (answer) {
      textToSpeech.stop();
      interview.submitCurrentAnswer(answer);
      speechRecognition.stopListening();
    }
  };

  const toggleListening = () => {
    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    } else {
      speechRecognition.startListening();
    }
  };

  const repeatQuestion = () => {
    if (currentQuestion && textToSpeech.isSupported) {
      textToSpeech.stop();
      setTimeout(() => {
        textToSpeech.speak(currentQuestion.text);
      }, 200);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Bot className="h-16 w-16 text-purple-400" />
              <div className="absolute -top-1 -right-1">
                <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="h-3 w-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
            AI Voice Interviewer
          </h1>
          <p className="text-gray-300 text-lg mb-2">
            Hi, I'm your AI interviewer for the SDE Intern role.
          </p>
          <div className="flex justify-center items-center gap-4 text-sm">
            {textToSpeech.isSupported ? (
              <span className="flex items-center text-green-400">
                <CheckCircle className="h-4 w-4 mr-1" />
                Text-to-Speech Ready
              </span>
            ) : (
              <span className="flex items-center text-red-400">
                <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                Text-to-Speech Not Available
              </span>
            )}
            {speechRecognition.isSupported && (
              <span className="flex items-center text-green-400">
                <CheckCircle className="h-4 w-4 mr-1" />
                Speech Recognition Ready
              </span>
            )}
          </div>
        </header>

        {/* Start Interview Section */}
        {!interview.sessionId && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 text-center border border-gray-700/50 shadow-2xl">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Ready to Begin Your Interview?
              </h2>
              <p className="text-gray-300 mb-8">
                Practice your skills with our AI-powered voice interview system. 
                Get instant feedback and improve your performance.
              </p>
              <button
                onClick={interview.start}
                disabled={interview.loading}
                className="relative overflow-hidden group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {interview.loading ? (
                  <div className="flex items-center justify-center">
                    <Loader className="h-5 w-5 animate-spin mr-2" />
                    Starting Interview...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Star className="h-5 w-5 mr-2" />
                    Start Voice Interview
                  </div>
                )}
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
              {interview.error && (
                <p className="text-red-400 mt-4 bg-red-900/20 py-2 px-4 rounded-lg">
                  {interview.error}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Interview Session */}
        {interview.sessionId && !interview.evaluation && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            {/* Question Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-purple-600/20 text-purple-300 py-2 px-4 rounded-full text-sm font-medium">
                  Question {interview.currentIndex + 1} of {interview.questions.length}
                </div>
                <div className="hidden sm:block">
                  <div className="flex gap-1">
                    {interview.questions.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 w-3 rounded-full transition-all duration-300 ${
                          index <= interview.currentIndex
                            ? "bg-purple-500"
                            : "bg-gray-600"
                        } ${
                          index === interview.currentIndex ? "w-6" : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={repeatQuestion}
                disabled={!textToSpeech.isSupported}
                className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed py-2 px-4 rounded-lg transition-all duration-200"
              >
                {textToSpeech.isSpeaking ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                {textToSpeech.isSpeaking ? "Speaking..." : "Repeat Question"}
              </button>
            </div>

            {/* Question Card */}
            <div className="bg-gray-900/50 rounded-xl p-6 mb-6 border border-gray-700/50">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/10 p-2 rounded-lg">
                  <Bot className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Question:</h3>
                  <p className="text-gray-200 text-lg leading-relaxed">
                    {currentQuestion?.text}
                  </p>
                </div>
              </div>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex flex-wrap gap-3 mb-6 justify-center">
              <button
                onClick={() => {
                  setInputMode("voice");
                  speechRecognition.resetTranscript();
                  setInput("");
                }}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl transition-all duration-200 font-medium ${
                  inputMode === "voice"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-700/70"
                } ${!speechRecognition.isSupported ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!speechRecognition.isSupported}
              >
                <MessageSquare className="h-4 w-4" />
                Voice Answer
                {!speechRecognition.isSupported && " (Not Supported)"}
              </button>
              <button
                onClick={() => {
                  setInputMode("text");
                  speechRecognition.stopListening();
                }}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl transition-all duration-200 font-medium ${
                  inputMode === "text"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-700/70"
                }`}
              >
                <Keyboard className="h-4 w-4" />
                Type Answer
              </button>
            </div>

            {/* Voice Input Controls */}
            {inputMode === "voice" && speechRecognition.isSupported && (
              <div className={`mb-6 p-6 rounded-xl border-2 transition-all duration-300 ${
                speechRecognition.isListening
                  ? "bg-yellow-500/10 border-yellow-500/50"
                  : "bg-gray-700/30 border-gray-600/50"
              }`}>
                <div className="text-center">
                  <button
                    onClick={toggleListening}
                    className={`relative overflow-hidden group flex items-center gap-3 mx-auto py-4 px-8 rounded-full text-white font-semibold transition-all duration-300 transform hover:scale-105 ${
                      speechRecognition.isListening
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {speechRecognition.isListening ? (
                      <>
                        <MicOff className="h-6 w-6" />
                        Stop Recording
                        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      </>
                    ) : (
                      <>
                        <Mic className="h-6 w-6" />
                        Start Recording
                      </>
                    )}
                  </button>
                  <p className="mt-4 text-sm text-gray-300">
                    {speechRecognition.isListening ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                        🎤 Listening... Speak your answer clearly
                      </span>
                    ) : (
                      "👆 Click to start recording your answer"
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Answer Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Your Answer:
              </label>
              <textarea
                value={input}
                onChange={(e) => {
                  if (inputMode === "text") {
                    setInput(e.target.value);
                  }
                }}
                placeholder={
                  inputMode === "voice"
                    ? "Your spoken answer will appear here..."
                    : "Type your answer here..."
                }
                rows={6}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-white placeholder-gray-400 ${
                  inputMode === "voice"
                    ? "bg-gray-700/30 border-gray-600 cursor-default"
                    : "bg-gray-700/50 border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                } resize-vertical focus:outline-none`}
                readOnly={inputMode === "voice"}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={handleSubmitAnswer}
                disabled={!input.trim()}
                className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              >
                Submit Answer
              </button>
              {interview.currentIndex === interview.questions.length - 1 && (
                <button
                  onClick={interview.complete}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  Finish & Evaluate
                </button>
              )}
            </div>
          </div>
        )}

        {/* Evaluation Results */}
        {interview.evaluation && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-2">
                📊 Evaluation Complete
              </h2>
              <p className="text-gray-300">Your interview results are ready</p>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 rounded-xl p-6 mb-8 border border-green-500/20">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                Overall Summary
              </h3>
              <p className="text-gray-200 leading-relaxed">
                {interview.evaluation.summary}
              </p>
            </div>

            {/* Scores Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {Object.entries(interview.evaluation.scores).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-200"
                >
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-2 capitalize">
                      {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </div>
                    <div className="relative inline-block">
                      <div className="text-2xl font-bold text-white mb-1">
                        {value}/10
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${(value / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Feedback */}
            <div className="bg-gray-900/30 rounded-xl p-6 border border-gray-700/50">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                💡 Detailed Feedback
              </h4>
              <div className="space-y-4">
                {Object.entries(interview.evaluation.feedback).map(
                  ([key, feedback]) => (
                    <div
                      key={key}
                      className="bg-gray-800/30 rounded-lg p-4 border-l-4 border-purple-500"
                    >
                      <strong className="text-purple-300 capitalize block mb-1">
                        {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                      </strong>
                      <span className="text-gray-200">{feedback}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Restart Button */}
            <div className="text-center mt-8">
              <button
                onClick={interview.start}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Start New Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}