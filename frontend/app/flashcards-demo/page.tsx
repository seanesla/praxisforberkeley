'use client';

import { useState } from 'react';
import FlashcardList from '@/components/flashcards/FlashcardList';
import FlashcardStudy from '@/components/flashcards/FlashcardStudy';
import FlashcardGenerator from '@/components/flashcards/FlashcardGenerator';
import FlashcardStats from '@/components/flashcards/FlashcardStats';
import { ArrowLeftIcon, BookOpenIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { Flashcard, Document } from '@/types';

// Sample data for demo
const sampleDocuments: Document[] = [
  {
    id: '1',
    user_id: 'demo',
    title: 'Machine Learning Fundamentals',
    content: 'ML content...',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'demo',
    title: 'React Best Practices',
    content: 'React content...',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const sampleFlashcards: Flashcard[] = [
  {
    id: '1',
    user_id: 'demo',
    question: 'What is supervised learning?',
    answer: 'Supervised learning is a type of machine learning where the model is trained on labeled data, meaning the input data is paired with the correct output.',
    difficulty: 'medium',
    tags: ['machine-learning', 'fundamentals'],
    review_count: 3,
    last_reviewed: new Date(Date.now() - 86400000).toISOString(),
    next_review: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date(Date.now() - 604800000).toISOString()
  },
  {
    id: '2',
    user_id: 'demo',
    question: 'What is the difference between classification and regression?',
    answer: 'Classification predicts discrete labels or categories (e.g., spam/not spam), while regression predicts continuous numerical values (e.g., house prices).',
    difficulty: 'easy',
    tags: ['machine-learning', 'classification', 'regression'],
    review_count: 5,
    last_reviewed: new Date(Date.now() - 172800000).toISOString(),
    next_review: new Date(Date.now() - 3600000).toISOString(), // Due now
    created_at: new Date(Date.now() - 1209600000).toISOString()
  },
  {
    id: '3',
    user_id: 'demo',
    question: 'Explain overfitting in machine learning',
    answer: 'Overfitting occurs when a model learns the training data too well, including noise and outliers, resulting in poor generalization to new, unseen data.',
    difficulty: 'hard',
    tags: ['machine-learning', 'model-evaluation'],
    review_count: 2,
    last_reviewed: new Date(Date.now() - 259200000).toISOString(),
    next_review: new Date().toISOString(), // Due now
    created_at: new Date(Date.now() - 864000000).toISOString()
  },
  {
    id: '4',
    user_id: 'demo',
    question: 'What is a React Hook?',
    answer: 'React Hooks are functions that let you use state and other React features in functional components without writing a class.',
    difficulty: 'easy',
    tags: ['react', 'hooks'],
    review_count: 8,
    last_reviewed: new Date(Date.now() - 86400000).toISOString(),
    next_review: new Date(Date.now() + 604800000).toISOString(),
    created_at: new Date(Date.now() - 2592000000).toISOString()
  },
  {
    id: '5',
    user_id: 'demo',
    question: 'What is the useState hook used for?',
    answer: 'useState is a React Hook that lets you add state to functional components. It returns an array with the current state value and a function to update it.',
    difficulty: 'easy',
    tags: ['react', 'hooks', 'state'],
    review_count: 10,
    last_reviewed: new Date(Date.now() - 172800000).toISOString(),
    next_review: new Date(Date.now() + 1209600000).toISOString(),
    created_at: new Date(Date.now() - 3456000000).toISOString()
  }
];

type ViewMode = 'list' | 'study' | 'generate' | 'stats';

export default function FlashcardsDemoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [flashcards, setFlashcards] = useState<Flashcard[]>(sampleFlashcards);
  const [studyFlashcards, setStudyFlashcards] = useState<Flashcard[]>([]);

  const handleStartStudy = (cards: Flashcard[]) => {
    console.log('Starting study session with cards:', cards);
    setStudyFlashcards(cards);
    setViewMode('study');
  };

  const handleGenerateComplete = (newFlashcards: Flashcard[]) => {
    console.log('Generated new flashcards:', newFlashcards);
    setFlashcards([...flashcards, ...newFlashcards]);
    setViewMode('list');
  };

  const handleStudyComplete = () => {
    console.log('Study session completed');
    setViewMode('list');
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'study':
        return (
          <FlashcardStudy
            flashcards={studyFlashcards}
            onComplete={handleStudyComplete}
            onBack={() => setViewMode('list')}
          />
        );
      
      case 'generate':
        return (
          <FlashcardGenerator
            documents={sampleDocuments}
            onComplete={handleGenerateComplete}
            onBack={() => setViewMode('list')}
          />
        );
      
      case 'stats':
        return (
          <FlashcardStats
            flashcards={flashcards}
            onBack={() => setViewMode('list')}
          />
        );
      
      default:
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold">Flashcards Demo</h1>
                <p className="text-gray-400 mt-1">Master your knowledge with spaced repetition</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode('generate')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 
                           hover:from-purple-600 hover:to-blue-600 rounded-lg transition-all duration-200"
                >
                  <SparklesIcon className="h-5 w-5" />
                  Generate Cards
                </button>
                
                <button
                  onClick={() => setViewMode('stats')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 
                           rounded-lg transition-colors"
                >
                  <ChartBarIcon className="h-5 w-5" />
                  Statistics
                </button>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Due Cards Section */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <BookOpenIcon className="h-5 w-5 text-purple-400" />
                    Due for Review
                  </h2>
                  {flashcards.filter(f => new Date(f.next_review || '') <= new Date()).length > 0 && (
                    <button
                      onClick={() => handleStartStudy(flashcards.filter(f => new Date(f.next_review || '') <= new Date()))}
                      className="text-sm px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                    >
                      Study Now ({flashcards.filter(f => new Date(f.next_review || '') <= new Date()).length} cards)
                    </button>
                  )}
                </div>
                
                {flashcards.filter(f => new Date(f.next_review || '') <= new Date()).length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No cards due for review. Great job staying on top of your studies! 🎉
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {flashcards
                      .filter(f => new Date(f.next_review || '') <= new Date())
                      .slice(0, 5)
                      .map(card => (
                        <div key={card.id} className="p-3 bg-white/5 rounded-lg">
                          <p className="text-sm font-medium truncate">{card.question}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Last reviewed: {new Date(card.last_reviewed || card.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* All Flashcards */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-medium mb-4">All Flashcards</h2>
                <FlashcardList
                  flashcards={flashcards}
                  onStartStudy={handleStartStudy}
                  onRefresh={() => console.log('Refresh called')}
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}