'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardList from '@/components/flashcards/FlashcardList';
import FlashcardStudy from '@/components/flashcards/FlashcardStudy';
import FlashcardGenerator from '@/components/flashcards/FlashcardGenerator';
import FlashcardStats from '@/components/flashcards/FlashcardStats';
import { ArrowLeftIcon, BookOpenIcon, ChartBarIcon, SparklesIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import type { Flashcard, Document } from '@/types';

type ViewMode = 'list' | 'study' | 'generate' | 'stats';

export default function FlashcardsRealTestPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyFlashcards, setStudyFlashcards] = useState<Flashcard[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Set a test token for authentication
  useEffect(() => {
    // Create a test token to bypass auth
    const testToken = 'test-token-' + Date.now();
    localStorage.setItem('token', testToken);
    console.log('Set test token:', testToken);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('Loading flashcards and documents...');
    setLoading(true);
    setError(null);
    
    try {
      // Fetch flashcards
      const flashcardsResponse = await fetch('http://localhost:5001/api/flashcards', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (flashcardsResponse.ok) {
        const flashcardsData = await flashcardsResponse.json();
        console.log('Loaded flashcards:', flashcardsData);
        setFlashcards(flashcardsData.flashcards || []);
      } else {
        console.error('Failed to fetch flashcards:', flashcardsResponse.status);
      }

      // Fetch documents
      const documentsResponse = await fetch('http://localhost:5001/api/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        console.log('Loaded documents:', documentsData);
        setDocuments(documentsData.documents || []);
      } else {
        console.error('Failed to fetch documents:', documentsResponse.status);
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Make sure the backend is running on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  const createTestDocument = async () => {
    console.log('Creating test document...');
    setUploadingDoc(true);
    
    try {
      const response = await fetch('http://localhost:5001/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: 'React Hooks Guide',
          content: `
            React Hooks Complete Guide

            Introduction to Hooks:
            React Hooks are functions that let you use state and other React features without writing a class. They were introduced in React 16.8 and have become the standard way to write React components.

            useState Hook:
            The useState Hook lets you add state to functional components. It returns an array with two elements: the current state value and a function to update it.
            Example: const [count, setCount] = useState(0);

            useEffect Hook:
            useEffect lets you perform side effects in functional components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount combined.
            The effect runs after every render by default, but you can control when it runs by passing a dependency array.

            useContext Hook:
            useContext lets you subscribe to React context without nesting Consumer components. It accepts a context object and returns the current context value.

            useReducer Hook:
            useReducer is an alternative to useState for managing complex state logic. It accepts a reducer function and returns the current state and a dispatch function.

            useMemo Hook:
            useMemo lets you memoize expensive calculations. It only recalculates the memoized value when one of the dependencies has changed.

            useCallback Hook:
            useCallback returns a memoized callback function. It's useful when passing callbacks to optimized child components that rely on reference equality.

            Custom Hooks:
            You can create your own Hooks to extract component logic into reusable functions. Custom Hooks are JavaScript functions whose name starts with "use".

            Rules of Hooks:
            1. Only call Hooks at the top level of your function
            2. Only call Hooks from React function components or custom Hooks
            3. Don't call Hooks inside loops, conditions, or nested functions

            Best Practices:
            - Use the ESLint plugin for Hooks to catch mistakes
            - Keep effects focused and split them when needed
            - Use the dependency array correctly to avoid bugs
            - Extract complex logic into custom Hooks for reusability
          `,
          file_type: 'text/plain'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Created document:', data);
        await loadData(); // Reload to show new document
        alert('Test document created successfully!');
      } else {
        const error = await response.json();
        console.error('Failed to create document:', error);
        alert('Failed to create document: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error creating document:', err);
      alert('Error creating document. Check console.');
    } finally {
      setUploadingDoc(false);
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
              <div>
                <h1 className="text-2xl font-semibold">Flashcards - Real Backend Test</h1>
                <p className="text-gray-400 mt-1">Testing with actual API endpoints</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={createTestDocument}
                  disabled={uploadingDoc}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 
                           disabled:bg-green-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <CloudArrowUpIcon className="h-5 w-5" />
                  {uploadingDoc ? 'Creating...' : 'Create Test Document'}
                </button>
                
                <button
                  onClick={() => setViewMode('generate')}
                  disabled={documents.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 
                           hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700
                           disabled:cursor-not-allowed rounded-lg transition-all duration-200"
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

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Backend Status */}
            <div className="mb-6 p-4 glass rounded-lg">
              <h3 className="font-semibold mb-2">Backend Status</h3>
              <div className="space-y-1 text-sm">
                <p>Documents: {documents.length} loaded</p>
                <p>Flashcards: {flashcards.length} loaded</p>
                <p>Backend URL: http://localhost:5001</p>
                <p>Token: {localStorage.getItem('token') ? 'Set' : 'Not set'}</p>
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
                    No cards due for review. {flashcards.length === 0 ? 'Create some flashcards first!' : 'Great job! 🎉'}
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
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : flashcards.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">
                      No flashcards yet. {documents.length === 0 ? 'Create a test document first!' : 'Generate some from your documents!'}
                    </p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}