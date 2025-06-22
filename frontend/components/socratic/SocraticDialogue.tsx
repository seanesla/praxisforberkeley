'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  QuestionMarkCircleIcon,
  LightBulbIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  AcademicCapIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface SocraticDialogueProps {
  document: any;
  topic: string;
  onEnd: () => void;
}

interface Question {
  id: string;
  text: string;
  type: 'open' | 'multiple-choice' | 'reflection' | 'application';
  options?: string[];
  hint?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
}

interface Response {
  questionId: string;
  answer: string;
  correct?: boolean;
  timestamp: Date;
}

export function SocraticDialogue({ document, topic, onEnd }: SocraticDialogueProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionHistory, setQuestionHistory] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    questionsAnswered: 0,
    correctAnswers: 0,
    concepts: new Set<string>(),
    depth: 1
  });
  
  const answerInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/socratic/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: document.id,
          topic,
          documentTitle: document.title
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        setCurrentQuestion(data.firstQuestion);
      }
    } catch (error) {
      console.error('Error starting Socratic session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getNextQuestion = async () => {
    if (!sessionId) return;
    
    try {
      setIsLoading(true);
      setShowHint(false);
      setShowExplanation(false);
      setCurrentAnswer('');
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/socratic/next-question`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          previousResponses: responses,
          topic,
          depth: progress.depth
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.question) {
          setCurrentQuestion(data.question);
          setQuestionHistory([...questionHistory, data.question]);
        } else {
          // No more questions, show summary
          showSessionSummary();
        }
      }
    } catch (error) {
      console.error('Error getting next question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentQuestion || !currentAnswer.trim()) return;
    
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/socratic/evaluate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          answer: currentAnswer,
          questionType: currentQuestion.type
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Record response
        const newResponse: Response = {
          questionId: currentQuestion.id,
          answer: currentAnswer,
          correct: data.correct,
          timestamp: new Date()
        };
        setResponses([...responses, newResponse]);
        
        // Update progress
        setProgress(prev => ({
          questionsAnswered: prev.questionsAnswered + 1,
          correctAnswers: prev.correctAnswers + (data.correct ? 1 : 0),
          concepts: new Set([...prev.concepts, currentQuestion.concept]),
          depth: data.suggestedDepth || prev.depth
        }));
        
        // Show explanation
        if (data.explanation) {
          setCurrentQuestion({
            ...currentQuestion,
            explanation: data.explanation
          });
        }
        setShowExplanation(true);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showSessionSummary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/socratic/summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          responses,
          topic
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Show summary in UI
        setCurrentQuestion(null);
      }
    } catch (error) {
      console.error('Error getting summary:', error);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            <p className="text-lg text-white mb-4">{currentQuestion.text}</p>
            <div className="space-y-2">
              {currentQuestion.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentAnswer(option)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    currentAnswer === option
                      ? 'bg-blue-600/20 border-2 border-blue-500'
                      : 'bg-gray-800 hover:bg-gray-700 border-2 border-transparent'
                  }`}
                  disabled={showExplanation}
                >
                  <span className="text-white">{option}</span>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'open':
      case 'reflection':
      case 'application':
        return (
          <div className="space-y-4">
            <p className="text-lg text-white">{currentQuestion.text}</p>
            <textarea
              ref={answerInputRef}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={
                currentQuestion.type === 'reflection' 
                  ? "Take a moment to reflect and share your thoughts..."
                  : "Type your answer here..."
              }
              disabled={showExplanation}
              className="w-full min-h-[150px] bg-gray-800 text-white placeholder-gray-500 rounded-lg p-4 outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="answer-input"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!currentQuestion && progress.questionsAnswered === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" data-testid="socratic-dialogue">
      {/* Progress Bar */}
      <div className="glass-card mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-300">
              Question {progress.questionsAnswered + 1}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Depth Level: {progress.depth}
            </div>
            <div className="text-sm text-gray-400">
              {progress.concepts.size} concepts explored
            </div>
          </div>
        </div>
        
        {/* Progress indicators */}
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i < progress.questionsAnswered
                  ? responses[i]?.correct
                    ? 'bg-green-500'
                    : 'bg-yellow-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {currentQuestion ? (
        <>
          {/* Question Card */}
          <div className="glass-card mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <QuestionMarkCircleIcon className="w-6 h-6 text-blue-400" />
                <div>
                  <span className="text-sm text-gray-400">
                    {currentQuestion.type.charAt(0).toUpperCase() + currentQuestion.type.slice(1)} Question
                  </span>
                  <span className={`ml-3 text-xs ${getDifficultyColor(currentQuestion.difficulty)}`}>
                    {currentQuestion.difficulty}
                  </span>
                </div>
              </div>
              
              {currentQuestion.hint && !showExplanation && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                  data-testid="hint-button"
                >
                  {showHint ? 'Hide' : 'Show'} Hint
                </button>
              )}
            </div>

            {/* Question Content */}
            {renderQuestion()}

            {/* Hint */}
            {showHint && currentQuestion.hint && !showExplanation && (
              <div className="mt-4 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg" data-testid="hint">
                <div className="flex items-start gap-2">
                  <LightBulbIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-blue-300">{currentQuestion.hint}</p>
                </div>
              </div>
            )}

            {/* Explanation */}
            {showExplanation && currentQuestion.explanation && (
              <div className="mt-6 p-4 bg-gray-800 rounded-lg" data-testid="explanation">
                <div className="flex items-start gap-3 mb-3">
                  {responses[responses.length - 1]?.correct ? (
                    <>
                      <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
                      <h4 className="text-green-400 font-medium">Excellent!</h4>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                      <h4 className="text-yellow-400 font-medium">Let's explore this further</h4>
                    </>
                  )}
                </div>
                <p className="text-gray-300">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between mt-6">
              {!showExplanation ? (
                <>
                  <button
                    onClick={() => setCurrentAnswer('')}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    Clear
                  </button>
                  <button
                    onClick={submitAnswer}
                    disabled={!currentAnswer.trim() || isLoading}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    data-testid="submit-answer"
                  >
                    Submit Answer
                  </button>
                </>
              ) : (
                <button
                  onClick={getNextQuestion}
                  className="ml-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  disabled={isLoading}
                  data-testid="next-question"
                >
                  Next Question
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Learning Tips */}
          <div className="glass-card bg-blue-600/10 border-blue-600/20">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Learning Tip</h4>
            <p className="text-xs text-gray-300">
              {currentQuestion.type === 'reflection' 
                ? "There's no right or wrong answer here. Focus on connecting ideas to your own experience."
                : currentQuestion.type === 'application'
                ? "Think about real-world scenarios where this concept applies."
                : "Take your time to think through the question. Understanding is more important than speed."}
            </p>
          </div>
        </>
      ) : (
        /* Session Summary */
        <div className="glass-card" data-testid="session-summary">
          <div className="text-center py-8">
            <ChartBarIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">
              Great Learning Session!
            </h2>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{progress.questionsAnswered}</p>
                <p className="text-sm text-gray-400">Questions</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">
                  {Math.round((progress.correctAnswers / progress.questionsAnswered) * 100)}%
                </p>
                <p className="text-sm text-gray-400">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{progress.concepts.size}</p>
                <p className="text-sm text-gray-400">Concepts</p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => startSession()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start New Session
              </button>
              <button
                onClick={onEnd}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Back to Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Button */}
      <div className="mt-6 text-center">
        <button
          onClick={onEnd}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  );
}