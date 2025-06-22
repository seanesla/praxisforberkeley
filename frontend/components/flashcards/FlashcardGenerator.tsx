'use client';

import { useState } from 'react';
import { SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { Document, Flashcard } from '@/types';

interface FlashcardGeneratorProps {
  documents: Document[];
  onComplete: (flashcards: Flashcard[]) => void;
  onBack: () => void;
}

export default function FlashcardGenerator({ documents, onComplete, onBack }: FlashcardGeneratorProps) {
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [numCards, setNumCards] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);

  console.log('FlashcardGenerator - documents:', documents);

  const handleGenerate = async () => {
    if (!selectedDocument) {
      setError('Please select a document');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    console.log('Generating flashcards for document:', selectedDocument);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flashcards/generate/${selectedDocument}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          numCards,
          difficulty: difficulty === 'mixed' ? undefined : difficulty
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 503) {
          throw new Error(errorData.error || 'AI service is currently unavailable. Please try again later.');
        }
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }

      const data = await response.json();
      console.log('Generated flashcards:', data);
      
      setGeneratedCards(data.flashcards || []);
    } catch (err) {
      console.error('Error generating flashcards:', err);
      setError('Failed to generate flashcards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    onComplete(generatedCards);
  };

  if (generatedCards.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Generated Flashcards</h2>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-green-400">
            Successfully generated {generatedCards.length} flashcards!
          </p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {generatedCards.map((card, index) => (
            <div key={index} className="glass rounded-lg p-4 space-y-2">
              <div className="font-medium">Q: {card.question}</div>
              <div className="text-gray-400">A: {card.answer}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setGeneratedCards([]);
              setSelectedDocument('');
            }}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Generate More
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
          >
            Save & Start Studying
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold">Generate Flashcards</h2>
          <p className="text-gray-400 mt-1">Create study cards from your documents using AI</p>
        </div>
      </div>

      <div className="glass rounded-xl p-6 space-y-6">
        {/* Document Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Select Document {documents.length > 0 && `(${documents.length} available)`}
          </label>
          <div className="relative">
            <select
              value={selectedDocument}
              onChange={(e) => setSelectedDocument(e.target.value)}
              className="w-full px-4 py-2 pr-10 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white appearance-none cursor-pointer"
              style={{ WebkitAppearance: 'none' }}
            >
              <option value="" className="bg-gray-800 text-gray-300">Choose a document...</option>
              {documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <option key={doc.id} value={doc.id} className="bg-gray-800 text-white">
                    {doc.title || 'Untitled Document'}
                  </option>
                ))
              ) : (
                <option value="" disabled className="bg-gray-800 text-gray-500">
                  No documents available
                </option>
              )}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Number of Cards */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Number of Flashcards</label>
          <input
            type="range"
            min="5"
            max="30"
            value={numCards}
            onChange={(e) => setNumCards(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>5</span>
            <span className="text-white font-medium">{numCards} cards</span>
            <span>30</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty Level</label>
          <div className="grid grid-cols-4 gap-2">
            {(['easy', 'medium', 'hard', 'mixed'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-3 py-2 rounded-lg capitalize transition-colors ${
                  difficulty === level
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedDocument}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 
                   hover:from-purple-600 hover:to-blue-600 rounded-lg transition-all 
                   duration-200 font-medium flex items-center justify-center gap-2
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="h-5 w-5" />
              Generate Flashcards
            </>
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-3">Tips for Better Flashcards</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Choose documents with clear concepts and definitions</li>
          <li>• Start with 10-15 cards and gradually increase</li>
          <li>• Mix difficulty levels for better learning retention</li>
          <li>• Review generated cards before starting your study session</li>
        </ul>
      </div>
    </div>
  );
}