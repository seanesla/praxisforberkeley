'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface FlashcardCardProps {
  question: string;
  answer: string;
  type?: 'basic' | 'cloze' | 'multi';
  metadata?: {
    difficulty?: number;
    tags?: string[];
    choices?: string[];
    correctChoices?: number[];
  };
  onRate?: (rating: 'easy' | 'medium' | 'hard') => void;
  showNavigation?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  currentIndex?: number;
  totalCards?: number;
}

export default function FlashcardCard({
  question,
  answer,
  type = 'basic',
  metadata,
  onRate,
  showNavigation = false,
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
  currentIndex,
  totalCards
}: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);

  const handleFlip = () => {
    console.log('Flipping card from', isFlipped, 'to', !isFlipped);
    setIsFlipped(!isFlipped);
  };

  const handleRate = (rating: 'easy' | 'medium' | 'hard') => {
    if (onRate) {
      onRate(rating);
      setIsFlipped(false);
      setSelectedChoices([]);
    }
  };

  const handleChoiceToggle = (index: number) => {
    if (type !== 'multi') return;
    
    setSelectedChoices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const renderContent = () => {
    if (!isFlipped) {
      // Front of card - Question
      if (type === 'cloze') {
        return (
          <div className="text-lg">
            {question}
          </div>
        );
      } else if (type === 'multi' && metadata?.choices) {
        return (
          <div className="space-y-4">
            <div className="text-lg font-medium">{question}</div>
            <div className="space-y-2">
              {metadata.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleChoiceToggle(index)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedChoices.includes(index)
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/20 hover:border-purple-500/50"
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        );
      } else {
        return <div className="text-lg">{question}</div>;
      }
    } else {
      // Back of card - Answer
      if (type === 'multi' && metadata?.choices && metadata?.correctChoices) {
        const isCorrect = 
          selectedChoices.length === metadata.correctChoices.length &&
          selectedChoices.every(choice => metadata.correctChoices!.includes(choice));
        
        return (
          <div className="space-y-4">
            <div className={`text-lg font-medium ${
              isCorrect ? "text-green-400" : "text-red-400"
            }`}>
              {isCorrect ? "Correct!" : "Incorrect"}
            </div>
            <div className="space-y-2">
              {metadata.choices.map((choice, index) => {
                const isCorrectChoice = metadata.correctChoices!.includes(index);
                const isSelected = selectedChoices.includes(index);
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      isCorrectChoice
                        ? "border-green-500 bg-green-500/10"
                        : isSelected
                        ? "border-red-500 bg-red-500/10"
                        : "border-white/20"
                    }`}
                  >
                    {choice}
                  </div>
                );
              })}
            </div>
            <div className="text-sm text-gray-400">
              {answer}
            </div>
          </div>
        );
      } else {
        return <div className="text-lg">{answer}</div>;
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Progress indicator */}
      {showNavigation && currentIndex !== undefined && totalCards !== undefined && (
        <div className="text-center text-sm text-gray-400">
          Card {currentIndex + 1} of {totalCards}
        </div>
      )}

      {/* Main card */}
      <div 
        className={`relative min-h-[300px] p-8 cursor-pointer transition-all duration-300 glass rounded-xl hover:shadow-lg ${
          isFlipped ? 'bg-white/20' : ''
        }`}
        onClick={handleFlip}
      >
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 text-xs border border-white/20 rounded-lg bg-white/10">
            {isFlipped ? 'Answer' : 'Question'}
          </span>
        </div>

        {metadata?.tags && metadata.tags.length > 0 && (
          <div className="absolute top-4 left-4 flex gap-2">
            {metadata.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 text-xs bg-purple-500/20 rounded-lg">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center h-full min-h-[200px]">
          {renderContent()}
        </div>

        <div className="absolute bottom-4 right-4">
          <button
            className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              handleFlip();
            }}
          >
            <ArrowPathIcon className="h-4 w-4" />
            Flip
          </button>
        </div>
      </div>

      {/* Navigation and rating controls */}
      {showNavigation && (
        <div className="flex items-center justify-between">
          <button
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onPrevious}
            disabled={!canGoPrevious}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </button>

          {isFlipped && onRate && (
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 text-sm text-red-400 border border-red-400/50 hover:bg-red-400/10 rounded-lg transition-colors"
                onClick={() => handleRate('hard')}
              >
                Hard
              </button>
              <button
                className="px-3 py-1.5 text-sm text-yellow-400 border border-yellow-400/50 hover:bg-yellow-400/10 rounded-lg transition-colors"
                onClick={() => handleRate('medium')}
              >
                Medium
              </button>
              <button
                className="px-3 py-1.5 text-sm text-green-400 border border-green-400/50 hover:bg-green-400/10 rounded-lg transition-colors"
                onClick={() => handleRate('easy')}
              >
                Easy
              </button>
            </div>
          )}

          <button
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onNext}
            disabled={!canGoNext}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {showNavigation && (
        <div className="text-center text-xs text-gray-400">
          Press <kbd className="px-1 py-0.5 bg-white/10 rounded">Space</kbd> to flip
          {isFlipped && onRate && (
            <>
              {' • '}
              <kbd className="px-1 py-0.5 bg-white/10 rounded">1</kbd> Hard
              {' • '}
              <kbd className="px-1 py-0.5 bg-white/10 rounded">2</kbd> Medium
              {' • '}
              <kbd className="px-1 py-0.5 bg-white/10 rounded">3</kbd> Easy
            </>
          )}
        </div>
      )}
    </div>
  );
}