'use client';

import { useState, useEffect, useCallback } from 'react';
import FlashcardCard from './FlashcardCard';
import { ClockIcon, CheckCircleIcon, XCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import type { Flashcard } from '@/types';

interface FlashcardStudyProps {
  flashcards: Flashcard[];
  onComplete: () => void;
  onBack: () => void;
}

interface StudyStats {
  totalCards: number;
  completed: number;
  ratings: {
    easy: number;
    medium: number;
    hard: number;
  };
  timeSpent: number;
  accuracy: number;
}

export default function FlashcardStudy({ flashcards, onComplete, onBack }: FlashcardStudyProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [stats, setStats] = useState<StudyStats>({
    totalCards: flashcards.length,
    completed: 0,
    ratings: { easy: 0, medium: 0, hard: 0 },
    timeSpent: 0,
    accuracy: 0
  });
  const [showResults, setShowResults] = useState(false);

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case '1':
          handleRate('hard');
          break;
        case '2':
          handleRate('medium');
          break;
        case '3':
          handleRate('easy');
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
          break;
        case 'Escape':
          onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, flashcards.length, onBack]);

  const handleRate = useCallback(async (rating: 'easy' | 'medium' | 'hard') => {
    const timeSpentOnCard = (Date.now() - cardStartTime) / 1000;
    
    console.log(`Rating card ${currentCard.id} as ${rating}`);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      completed: prev.completed + 1,
      ratings: {
        ...prev.ratings,
        [rating]: prev.ratings[rating] + 1
      },
      timeSpent: prev.timeSpent + timeSpentOnCard,
      accuracy: rating === 'easy' 
        ? ((prev.completed * prev.accuracy + 100) / (prev.completed + 1))
        : rating === 'medium'
        ? ((prev.completed * prev.accuracy + 50) / (prev.completed + 1))
        : ((prev.completed * prev.accuracy + 0) / (prev.completed + 1))
    }));

    // Update flashcard progress via API
    try {
      const response = await fetch(`/api/flashcards/${currentCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ difficulty_rating: rating })
      });
      
      if (!response.ok) {
        console.error('Failed to update flashcard progress');
      }
    } catch (error) {
      console.error('Error updating flashcard:', error);
    }

    // Move to next card or complete
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCardStartTime(Date.now());
    } else {
      // Study session complete
      setShowResults(true);
    }
  }, [currentIndex, flashcards.length, currentCard, cardStartTime]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCardStartTime(Date.now());
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCardStartTime(Date.now());
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResults) {
    const totalTime = (Date.now() - startTime) / 1000;
    const avgTimePerCard = totalTime / stats.totalCards;
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-center">Study Session Complete! 🎉</h2>
        
        <div className="glass rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Your Results</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-gray-400">Total Cards</p>
              <p className="text-2xl font-bold">{stats.totalCards}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Time Spent</p>
              <p className="text-2xl font-bold">{formatTime(totalTime)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Average per Card</p>
              <p className="text-2xl font-bold">{avgTimePerCard.toFixed(1)}s</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Accuracy</p>
              <p className="text-2xl font-bold">{Math.round(stats.accuracy)}%</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
              <span className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                Easy
              </span>
              <span className="font-bold">{stats.ratings.easy}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
              <span className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-yellow-400" />
                Medium
              </span>
              <span className="font-bold">{stats.ratings.medium}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
              <span className="flex items-center gap-2">
                <XCircleIcon className="h-5 w-5 text-red-400" />
                Hard
              </span>
              <span className="font-bold">{stats.ratings.hard}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={onComplete}
          className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors font-medium"
        >
          Back to Flashcards
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Study Session</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          Exit Study
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progress</span>
          <span>{currentIndex + 1} / {flashcards.length}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-sm text-gray-400">Time</div>
              <div className="font-semibold">
                {formatTime((Date.now() - startTime) / 1000)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
            <div>
              <div className="text-sm text-gray-400">Easy</div>
              <div className="font-semibold">{stats.ratings.easy}</div>
            </div>
          </div>
        </div>
        
        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-4 w-4 text-yellow-400" />
            <div>
              <div className="text-sm text-gray-400">Medium</div>
              <div className="font-semibold">{stats.ratings.medium}</div>
            </div>
          </div>
        </div>
        
        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-4 w-4 text-red-400" />
            <div>
              <div className="text-sm text-gray-400">Hard</div>
              <div className="font-semibold">{stats.ratings.hard}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Current flashcard */}
      {currentCard && (
        <FlashcardCard
          question={currentCard.question}
          answer={currentCard.answer}
          metadata={{
            difficulty: currentCard.difficulty ? Number(currentCard.difficulty) : undefined,
            tags: currentCard.tags
          }}
          onRate={handleRate}
          showNavigation={true}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoPrevious={currentIndex > 0}
          canGoNext={currentIndex < flashcards.length - 1}
          currentIndex={currentIndex}
          totalCards={flashcards.length}
        />
      )}
    </div>
  );
}