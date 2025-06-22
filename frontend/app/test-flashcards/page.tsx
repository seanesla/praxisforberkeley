'use client';

import { useState } from 'react';
import FlashcardCard from '@/components/flashcards/FlashcardCard';
import { SparklesIcon, ChartBarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

// Sample flashcards for testing
const sampleFlashcards = [
  {
    id: '1',
    user_id: 'test',
    question: 'What is React?',
    answer: 'React is a JavaScript library for building user interfaces, particularly single-page applications where you need a fast, interactive user experience.',
    difficulty: 'easy' as const,
    tags: ['react', 'javascript'],
    created_at: new Date().toISOString()
  },
  {
    id: '2', 
    user_id: 'test',
    question: 'Explain the useState Hook',
    answer: 'useState is a React Hook that lets you add state to functional components. It returns an array with two elements: the current state value and a setter function to update it.',
    difficulty: 'medium' as const,
    tags: ['react', 'hooks'],
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    user_id: 'test',
    question: 'What is the Virtual DOM?',
    answer: 'The Virtual DOM is a JavaScript representation of the actual DOM. React uses it to optimize rendering by comparing the virtual DOM with the real DOM and only updating changed elements.',
    difficulty: 'hard' as const,
    tags: ['react', 'performance'],
    created_at: new Date().toISOString()
  }
];

export default function TestFlashcardsPage() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [ratings, setRatings] = useState({ easy: 0, medium: 0, hard: 0 });

  const currentCard = sampleFlashcards[currentCardIndex];

  const handleRate = (rating: 'easy' | 'medium' | 'hard') => {
    console.log(`Rated card as ${rating}`);
    setRatings(prev => ({ ...prev, [rating]: prev[rating] + 1 }));
    
    // Move to next card
    if (currentCardIndex < sampleFlashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setShowStats(true);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentCardIndex < sampleFlashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  if (showStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Study Session Complete! 🎉</h1>
          
          <div className="glass rounded-xl p-8 space-y-6">
            <h2 className="text-xl font-semibold">Your Results</h2>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-500/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{ratings.easy}</div>
                <div className="text-sm text-gray-400">Easy</div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400">{ratings.medium}</div>
                <div className="text-sm text-gray-400">Medium</div>
              </div>
              <div className="bg-red-500/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-400">{ratings.hard}</div>
                <div className="text-sm text-gray-400">Hard</div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setCurrentCardIndex(0);
                setShowStats(false);
                setRatings({ easy: 0, medium: 0, hard: 0 });
              }}
              className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
            >
              Study Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Flashcards Test</h1>
            <p className="text-gray-400 mt-2">Testing the flashcard components</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
              <SparklesIcon className="h-5 w-5" />
              Generate Cards
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <ChartBarIcon className="h-5 w-5" />
              Statistics
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{currentCardIndex + 1} / {sampleFlashcards.length}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentCardIndex + 1) / sampleFlashcards.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Card */}
        <FlashcardCard
          question={currentCard.question}
          answer={currentCard.answer}
          metadata={{
            difficulty: currentCard.difficulty === 'easy' ? 1 : currentCard.difficulty === 'medium' ? 2 : 3,
            tags: currentCard.tags
          }}
          onRate={handleRate}
          showNavigation={true}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoPrevious={currentCardIndex > 0}
          canGoNext={currentCardIndex < sampleFlashcards.length - 1}
          currentIndex={currentCardIndex}
          totalCards={sampleFlashcards.length}
        />
        
        {/* Sample Cards List */}
        <div className="mt-12 glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">All Cards in this Demo</h2>
          <div className="space-y-3">
            {sampleFlashcards.map((card, index) => (
              <div 
                key={card.id} 
                className={`p-4 bg-white/5 rounded-lg ${index === currentCardIndex ? 'ring-2 ring-purple-500' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{card.question}</p>
                    <p className="text-sm text-gray-400 mt-1">{card.answer.substring(0, 80)}...</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-lg ${
                    card.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                    card.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {card.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}