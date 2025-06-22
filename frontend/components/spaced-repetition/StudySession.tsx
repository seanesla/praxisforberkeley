'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { FlashcardCard } from '../flashcards/FlashcardCard';
import { toast } from 'react-hot-toast';
import { announceToScreenReader } from '@/utils/accessibility';
import { 
  ChartBarIcon, 
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

interface StudyCard {
  id: string;
  flashcard: {
    id: string;
    front: string;
    back: string;
    set: {
      title: string;
    };
  };
  repetitions: number;
  ease_factor: number;
  interval: number;
  next_review_date: string;
}

interface StudyStats {
  cardsStudied: number;
  cardsMastered: number;
  cardsLearning: number;
  cardsRelearning: number;
  accuracyRate: number;
  averageEase: number;
  duration: number;
}

export function StudySession({ setId }: { setId?: string }) {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [cardStartTime, setCardStartTime] = useState<number>(0);
  const [stats, setStats] = useState<StudyStats>({
    cardsStudied: 0,
    cardsMastered: 0,
    cardsLearning: 0,
    cardsRelearning: 0,
    accuracyRate: 0,
    averageEase: 0,
    duration: 0
  });
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const firstRatingButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadDueCards();
  }, [setId]);

  const loadDueCards = async () => {
    try {
      const params = new URLSearchParams();
      if (setId) params.append('set_id', setId);
      
      const response = await fetch(`/api/spaced-repetition/due?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load due cards');

      const data = await response.json();
      setCards(data.cards);
      
      if (data.cards.length > 0) {
        await startSession();
      }
    } catch (error) {
      console.error('Error loading due cards:', error);
      toast.error('Failed to load study cards');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    try {
      const response = await fetch('/api/spaced-repetition/session/start', {
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
      setCardStartTime(Date.now());
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start study session');
    }
  };

  const handleRating = async (quality: number) => {
    if (!sessionId || !cards[currentIndex]) return;

    const responseTime = Date.now() - cardStartTime;
    const card = cards[currentIndex];

    try {
      const response = await fetch('/api/spaced-repetition/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          study_card_id: card.id,
          quality,
          response_time: responseTime,
          session_id: sessionId
        })
      });

      if (!response.ok) throw new Error('Failed to record review');

      const data = await response.json();

      // Update stats
      setStats(prev => ({
        cardsStudied: prev.cardsStudied + 1,
        cardsMastered: quality >= 4 ? prev.cardsMastered + 1 : prev.cardsMastered,
        cardsLearning: card.repetitions === 0 ? prev.cardsLearning + 1 : prev.cardsLearning,
        cardsRelearning: card.repetitions > 0 && quality < 3 ? prev.cardsRelearning + 1 : prev.cardsRelearning,
        accuracyRate: ((prev.cardsStudied * prev.accuracyRate) + (quality >= 3 ? 100 : 0)) / (prev.cardsStudied + 1),
        averageEase: ((prev.cardsStudied * prev.averageEase) + data.result.easeFactor) / (prev.cardsStudied + 1),
        duration: Math.floor((Date.now() - startTime) / 1000)
      }));

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        setCardStartTime(Date.now());
      } else {
        await completeSession();
      }
    } catch (error) {
      console.error('Error recording review:', error);
      toast.error('Failed to record review');
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      await fetch('/api/spaced-repetition/session/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          stats
        })
      });

      setSessionComplete(true);
      toast.success('Study session completed!');
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete session');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No cards due!</h3>
        <p className="text-gray-400">Great job! All your cards are up to date.</p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="glass-card max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
          <p className="text-gray-400">Great work on your study session</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="w-5 h-5 text-purple-400 mr-2" />
              <span className="text-gray-400">Cards Studied</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.cardsStudied}</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FireIcon className="w-5 h-5 text-orange-400 mr-2" />
              <span className="text-gray-400">Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-white">{Math.round(stats.accuracyRate)}%</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ClockIcon className="w-5 h-5 text-blue-400 mr-2" />
              <span className="text-gray-400">Time Spent</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {Math.floor(stats.duration / 60)}m {stats.duration % 60}s
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <LightBulbIcon className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-gray-400">Mastered</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.cardsMastered}</p>
          </div>
        </div>

        <Button
          onClick={() => window.location.reload()}
          className="w-full"
        >
          Start Another Session
        </Button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card */}
      <div className="glass-card min-h-[400px] flex flex-col">
        <div className="text-sm text-gray-400 mb-4">
          {currentCard.flashcard.set.title}
        </div>

        <div className="flex-1 flex items-center justify-center">
          {!showAnswer ? (
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-white mb-8">
                {currentCard.flashcard.front}
              </h3>
              <Button
                onClick={() => {
                  setShowAnswer(true);
                  // Focus on first rating button after showing answer
                  setTimeout(() => {
                    firstRatingButtonRef.current?.focus();
                    announceToScreenReader('Answer shown. Please rate how well you knew this.');
                  }, 100);
                }}
                size="lg"
                aria-label="Show answer for current flashcard"
              >
                Show Answer
              </Button>
            </div>
          ) : (
            <div className="w-full">
              <div className="text-center mb-8">
                <h3 className="text-xl text-gray-400 mb-4">
                  {currentCard.flashcard.front}
                </h3>
                <div className="text-2xl font-semibold text-white">
                  {currentCard.flashcard.back}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <p className="text-center text-gray-400 mb-4">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Rating options">
                  <Button
                    ref={firstRatingButtonRef}
                    variant="outline"
                    onClick={() => handleRating(1)}
                    className="flex flex-col items-center py-3 border-red-500 hover:bg-red-500/20 focus:ring-2 focus:ring-red-500"
                    aria-label="Rate as difficult - Again (1)"
                  >
                    <XCircleIcon className="w-5 h-5 mb-1" />
                    <span className="text-xs">Again</span>
                    <span className="text-xs text-gray-500">1</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRating(2)}
                    className="flex flex-col items-center py-3 border-orange-500 hover:bg-orange-500/20 focus:ring-2 focus:ring-orange-500"
                    aria-label="Rate as hard (2)"
                  >
                    <span className="text-lg mb-1">😕</span>
                    <span className="text-xs">Hard</span>
                    <span className="text-xs text-gray-500">2</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRating(3)}
                    className="flex flex-col items-center py-3 border-blue-500 hover:bg-blue-500/20 focus:ring-2 focus:ring-blue-500"
                    aria-label="Rate as good (3)"
                  >
                    <span className="text-lg mb-1">🙂</span>
                    <span className="text-xs">Good</span>
                    <span className="text-xs text-gray-500">3</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRating(4)}
                    className="flex flex-col items-center py-3 border-green-500 hover:bg-green-500/20 focus:ring-2 focus:ring-green-500"
                    aria-label="Rate as easy (4)"
                  >
                    <CheckCircleIcon className="w-5 h-5 mb-1" />
                    <span className="text-xs">Easy</span>
                    <span className="text-xs text-gray-500">4</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="flex justify-between text-xs text-gray-500 mt-4 pt-4 border-t border-gray-700">
          <span>Reviews: {currentCard.repetitions}</span>
          <span>Ease: {currentCard.ease_factor.toFixed(1)}</span>
          <span>Interval: {currentCard.interval} days</span>
        </div>
      </div>
    </div>
  );
}