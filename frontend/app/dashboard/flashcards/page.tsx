'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardList from '@/components/flashcards/FlashcardList';
import FlashcardStudy from '@/components/flashcards/FlashcardStudy';
import FlashcardGenerator from '@/components/flashcards/FlashcardGenerator';
import FlashcardStats from '@/components/flashcards/FlashcardStats';
import { flashcardsApi } from '@/lib/api/flashcards';
import { ArrowLeftIcon, BookOpenIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { Flashcard, Document } from '@/types';

// Temporary documents API until we properly integrate it
const documentsApi = {
  getDocuments: async (): Promise<Document[]> => {
    const response = await fetch('/api/documents', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch documents');
    const data = await response.json();
    return data.documents || [];
  }
};

type ViewMode = 'list' | 'study' | 'generate' | 'stats';

export default function FlashcardsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [studyFlashcards, setStudyFlashcards] = useState<Flashcard[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('Loading flashcards data...');
    try {
      const [flashcardsData, documentsData] = await Promise.all([
        flashcardsApi.getFlashcards(),
        documentsApi.getDocuments()
      ]);
      
      console.log('Loaded flashcards:', flashcardsData);
      console.log('Loaded documents:', documentsData);
      
      setFlashcards(flashcardsData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartStudy = (cards: Flashcard[]) => {
    console.log('Starting study session with cards:', cards);
    setStudyFlashcards(cards);
    setViewMode('study');
  };

  const handleGenerateComplete = async (newFlashcards: Flashcard[]) => {
    console.log('Generated new flashcards:', newFlashcards);
    await loadData();
    setViewMode('list');
  };

  const handleStudyComplete = async () => {
    console.log('Study session completed');
    await loadData();
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
            documents={documents}
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
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-semibold">Flashcards</h1>
                  <p className="text-gray-400 mt-1">Master your knowledge with spaced repetition</p>
                </div>
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
                          <p className="text-sm font-medium truncate">{card.front}</p>
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
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : flashcards.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No flashcards yet. Generate some from your documents!</p>
                    <button
                      onClick={() => setViewMode('generate')}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                    >
                      Generate Flashcards
                    </button>
                  </div>
                ) : (
                  <FlashcardList
                    flashcards={flashcards}
                    onStartStudy={handleStartStudy}
                    onRefresh={loadData}
                  />
                )}
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {renderContent()}
    </div>
  );
}