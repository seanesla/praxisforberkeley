'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { RadioGroup } from '../ui/radio-group';
import { toast } from 'react-hot-toast';
import { 
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface Exercise {
  id: string;
  exercise_type: string;
  question: string;
  correct_answer: any;
  options?: any;
  hints?: string[];
  explanation?: string;
  points: number;
  time_limit?: number;
  difficulty: number;
}

interface ExerciseAttempt {
  exercise_id: string;
  is_correct: boolean;
  points_earned: number;
  time_taken: number;
}

export function ExerciseSession({ setId }: { setId: string }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    loadExercises();
  }, [setId]);

  const loadExercises = async () => {
    try {
      const response = await fetch(`/api/exercises/sets/${setId}/exercises`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load exercises');

      const data = await response.json();
      setExercises(data.exercises);
      
      if (data.exercises.length > 0) {
        await startSession();
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    try {
      const response = await fetch('/api/exercises/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ set_id: setId })
      });

      if (!response.ok) throw new Error('Failed to start session');

      const data = await response.json();
      setSessionId(data.session.id);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start exercise session');
    }
  };

  const handleSubmit = async () => {
    if (!userAnswer || !sessionId) return;

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const exercise = exercises[currentIndex];

    try {
      const response = await fetch('/api/exercises/attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          exercise_id: exercise.id,
          user_answer: userAnswer,
          session_id: sessionId,
          time_taken: timeTaken,
          hints_used: hintsUsed
        })
      });

      if (!response.ok) throw new Error('Failed to submit answer');

      const data = await response.json();
      
      setIsCorrect(data.evaluation.isCorrect);
      setFeedback(data.evaluation.feedback);
      setShowFeedback(true);

      const attempt: ExerciseAttempt = {
        exercise_id: exercise.id,
        is_correct: data.evaluation.isCorrect,
        points_earned: data.evaluation.isCorrect ? exercise.points : 0,
        time_taken: timeTaken
      };

      setAttempts([...attempts, attempt]);
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer(null);
      setShowFeedback(false);
      setHintsUsed(0);
      setStartTime(Date.now());
    } else {
      completeSession();
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      await fetch(`/api/exercises/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      setSessionComplete(true);
      toast.success('Exercise session completed!');
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete session');
    }
  };

  const showHint = () => {
    const exercise = exercises[currentIndex];
    if (exercise.hints && hintsUsed < exercise.hints.length) {
      toast.info(exercise.hints[hintsUsed]);
      setHintsUsed(hintsUsed + 1);
    }
  };

  const renderExercise = () => {
    const exercise = exercises[currentIndex];

    switch (exercise.exercise_type) {
      case 'multiple_choice':
        return (
          <div>
            <h3 className="text-xl font-semibold text-white mb-6">
              {exercise.question}
            </h3>
            <RadioGroup
              value={userAnswer?.index?.toString()}
              onValueChange={(value) => setUserAnswer({ index: parseInt(value) })}
            >
              {exercise.options?.choices?.map((choice: string, index: number) => (
                <label
                  key={index}
                  className={`flex items-center p-4 mb-3 rounded-lg border cursor-pointer transition-all ${
                    showFeedback && index === exercise.correct_answer.index
                      ? 'border-green-500 bg-green-500/10'
                      : showFeedback && userAnswer?.index === index && !isCorrect
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={index}
                    checked={userAnswer?.index === index}
                    onChange={() => setUserAnswer({ index })}
                    disabled={showFeedback}
                    className="mr-3"
                  />
                  <span className="text-gray-200">{choice}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        );

      case 'true_false':
        return (
          <div>
            <h3 className="text-xl font-semibold text-white mb-6">
              {exercise.question}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={userAnswer?.value === true ? 'default' : 'outline'}
                onClick={() => setUserAnswer({ value: true })}
                disabled={showFeedback}
                className={showFeedback && exercise.correct_answer.value === true ? 'border-green-500' : ''}
              >
                True
              </Button>
              <Button
                variant={userAnswer?.value === false ? 'default' : 'outline'}
                onClick={() => setUserAnswer({ value: false })}
                disabled={showFeedback}
                className={showFeedback && exercise.correct_answer.value === false ? 'border-green-500' : ''}
              >
                False
              </Button>
            </div>
          </div>
        );

      case 'fill_blank':
        return (
          <div>
            <h3 className="text-xl font-semibold text-white mb-6">
              {exercise.question}
            </h3>
            <input
              type="text"
              value={userAnswer?.text || ''}
              onChange={(e) => setUserAnswer({ text: e.target.value })}
              disabled={showFeedback}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        );

      case 'short_answer':
        return (
          <div>
            <h3 className="text-xl font-semibold text-white mb-6">
              {exercise.question}
            </h3>
            <textarea
              value={userAnswer?.text || ''}
              onChange={(e) => setUserAnswer({ text: e.target.value })}
              disabled={showFeedback}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        );

      default:
        return <div>Unsupported exercise type</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No exercises found in this set.</p>
      </div>
    );
  }

  if (sessionComplete) {
    const correctCount = attempts.filter(a => a.is_correct).length;
    const totalPoints = attempts.reduce((sum, a) => sum + a.points_earned, 0);
    const percentage = (correctCount / exercises.length) * 100;

    return (
      <div className="glass-card max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
          <p className="text-gray-400">Here's how you did</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="w-5 h-5 text-purple-400 mr-2" />
              <span className="text-gray-400">Score</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {correctCount}/{exercises.length}
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <TrophyIcon className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-gray-400">Percentage</span>
            </div>
            <p className="text-2xl font-bold text-white">{Math.round(percentage)}%</p>
          </div>
        </div>

        <Button
          onClick={() => window.location.href = '/exercises'}
          className="w-full"
        >
          Back to Exercises
        </Button>
      </div>
    );
  }

  const exercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Question {currentIndex + 1} of {exercises.length}</span>
          <span>{exercise.points} points</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Exercise */}
      <div className="glass-card">
        {renderExercise()}

        {/* Feedback */}
        {showFeedback && (
          <div className={`mt-6 p-4 rounded-lg ${
            isCorrect ? 'bg-green-500/10 border border-green-500' : 'bg-red-500/10 border border-red-500'
          }`}>
            <div className="flex items-start">
              {isCorrect ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-white font-medium mb-1">
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </p>
                <p className="text-gray-300 text-sm">{feedback}</p>
                {exercise.explanation && (
                  <p className="text-gray-400 text-sm mt-2">{exercise.explanation}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mt-6">
          <div>
            {exercise.hints && exercise.hints.length > 0 && !showFeedback && (
              <Button
                variant="outline"
                size="sm"
                onClick={showHint}
                disabled={hintsUsed >= exercise.hints.length}
              >
                <LightBulbIcon className="w-4 h-4 mr-2" />
                Hint ({hintsUsed}/{exercise.hints.length})
              </Button>
            )}
          </div>

          <div>
            {!showFeedback ? (
              <Button
                onClick={handleSubmit}
                disabled={!userAnswer}
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {currentIndex < exercises.length - 1 ? 'Next Question' : 'Finish'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Difficulty Indicator */}
      <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
        <span>Difficulty: </span>
        <div className="flex ml-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full mx-0.5 ${
                i < exercise.difficulty * 5 ? 'bg-purple-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}