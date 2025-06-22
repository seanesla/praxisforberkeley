'use client';

import { useState } from 'react';
import FlashcardCard from '@/components/flashcards/FlashcardCard';
import FlashcardList from '@/components/flashcards/FlashcardList';
import FlashcardStudy from '@/components/flashcards/FlashcardStudy';
import FlashcardGenerator from '@/components/flashcards/FlashcardGenerator';
import FlashcardStats from '@/components/flashcards/FlashcardStats';
import { SparklesIcon, ChartBarIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import type { Flashcard, Document } from '@/types';

// Demo data
const demoDocuments: Document[] = [
  {
    id: 'doc1',
    user_id: 'demo',
    title: 'JavaScript Fundamentals',
    content: 'JavaScript content for flashcard generation...',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc2',
    user_id: 'demo',
    title: 'React Best Practices',
    content: 'React patterns and best practices...',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const demoFlashcards: Flashcard[] = [
  {
    id: '1',
    user_id: 'demo',
    question: 'What is the purpose of the useEffect Hook in React?',
    answer: 'useEffect allows you to perform side effects in functional components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount in React class components.',
    difficulty: 'medium' as const,
    tags: ['react', 'hooks', 'side-effects'],
    review_count: 3,
    last_reviewed: new Date(Date.now() - 86400000).toISOString(),
    next_review: new Date(Date.now() - 3600000).toISOString(), // Due now
    created_at: new Date(Date.now() - 604800000).toISOString()
  },
  {
    id: '2',
    user_id: 'demo',
    question: 'Explain the concept of "lifting state up" in React',
    answer: 'Lifting state up means moving state to the closest common ancestor of components that need it. This allows multiple child components to share the same state and stay in sync.',
    difficulty: 'hard' as const,
    tags: ['react', 'state-management', 'patterns'],
    review_count: 2,
    last_reviewed: new Date(Date.now() - 172800000).toISOString(),
    next_review: new Date().toISOString(), // Due now
    created_at: new Date(Date.now() - 1209600000).toISOString()
  },
  {
    id: '3',
    user_id: 'demo',
    question: 'What is JSX?',
    answer: 'JSX is a syntax extension for JavaScript that allows you to write HTML-like code in your JavaScript files. It gets compiled to regular JavaScript function calls.',
    difficulty: 'easy' as const,
    tags: ['react', 'jsx', 'basics'],
    review_count: 5,
    last_reviewed: new Date(Date.now() - 259200000).toISOString(),
    next_review: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date(Date.now() - 1814400000).toISOString()
  },
  {
    id: '4',
    user_id: 'demo',
    question: 'What is the difference between props and state?',
    answer: 'Props are read-only data passed from parent to child components, while state is mutable data managed within a component that can trigger re-renders when changed.',
    difficulty: 'easy' as const,
    tags: ['react', 'props', 'state'],
    review_count: 8,
    last_reviewed: new Date(Date.now() - 345600000).toISOString(),
    next_review: new Date(Date.now() + 604800000).toISOString(),
    created_at: new Date(Date.now() - 2419200000).toISOString()
  },
  {
    id: '5',
    user_id: 'demo',
    question: 'What is the Virtual DOM and why is it important?',
    answer: 'The Virtual DOM is a JavaScript representation of the actual DOM. React uses it to optimize rendering by comparing the virtual DOM with the real DOM and only updating changed elements, improving performance.',
    difficulty: 'medium' as const,
    tags: ['react', 'virtual-dom', 'performance'],
    review_count: 4,
    last_reviewed: new Date(Date.now() - 432000000).toISOString(),
    next_review: new Date(Date.now() + 172800000).toISOString(),
    created_at: new Date(Date.now() - 3024000000).toISOString()
  }
];

type ViewMode = 'overview' | 'study' | 'generate' | 'stats';

export default function FlashcardsFullDemoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [flashcards, setFlashcards] = useState<Flashcard[]>(demoFlashcards);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);

  const dueCards = flashcards.filter(card => new Date(card.next_review || '') <= new Date());

  const handleStartStudy = (cards: Flashcard[]) => {
    setStudyCards(cards);
    setViewMode('study');
  };

  const handleGenerateComplete = (newCards: Flashcard[]) => {
    setFlashcards([...flashcards, ...newCards]);
    setViewMode('overview');
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'study':
        return (
          <FlashcardStudy
            flashcards={studyCards}
            onComplete={() => setViewMode('overview')}
            onBack={() => setViewMode('overview')}
          />
        );

      case 'generate':
        return (
          <FlashcardGenerator
            documents={demoDocuments}
            onComplete={handleGenerateComplete}
            onBack={() => setViewMode('overview')}
          />
        );

      case 'stats':
        return (
          <FlashcardStats
            flashcards={flashcards}
            onBack={() => setViewMode('overview')}
          />
        );

      default:
        return (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Flashcards</h1>
                <p className="text-gray-400 mt-2">Master your knowledge with spaced repetition</p>
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

            {/* Due Cards Section */}
            <div className="glass rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <BookOpenIcon className="h-5 w-5 text-purple-400" />
                  Due for Review
                </h2>
                {dueCards.length > 0 && (
                  <button
                    onClick={() => handleStartStudy(dueCards)}
                    className="text-sm px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                  >
                    Study Now ({dueCards.length} cards)
                  </button>
                )}
              </div>
              
              {dueCards.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No cards due for review. Great job! 🎉
                </p>
              ) : (
                <div className="grid gap-3">
                  {dueCards.slice(0, 3).map(card => (
                    <div key={card.id} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <p className="text-sm font-medium">{card.question}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          card.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                          card.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {card.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">
                          Last reviewed: {new Date(card.last_reviewed || card.created_at).toLocaleDateString()}
                        </span>
                      </div>
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
                onRefresh={() => setFlashcards([...flashcards])}
              />
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