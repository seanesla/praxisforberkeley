'use client';

import { useState } from 'react';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { Flashcard } from '@/types';

interface FlashcardListProps {
  flashcards: Flashcard[];
  onStartStudy: (flashcards: Flashcard[]) => void;
  onRefresh: () => void;
}

export default function FlashcardList({ flashcards, onStartStudy, onRefresh }: FlashcardListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const filteredFlashcards = flashcards.filter(card => 
    card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCard = (id: string) => {
    setSelectedCards(prev => 
      prev.includes(id) 
        ? prev.filter(cardId => cardId !== id)
        : [...prev, id]
    );
  };

  const handleStudySelected = () => {
    const cardsToStudy = selectedCards.length > 0
      ? flashcards.filter(card => selectedCards.includes(card.id))
      : filteredFlashcards;
    onStartStudy(cardsToStudy);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'hard': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getCardStats = () => {
    const total = flashcards.length;
    const dueCount = flashcards.filter(card => 
      new Date(card.next_review || '') <= new Date()
    ).length;
    const reviewedCount = flashcards.filter(card => card.last_reviewed).length;
    const avgReviews = flashcards.reduce((acc, card) => acc + (card.review_count || 0), 0) / total || 0;
    
    return { total, dueCount, reviewedCount, avgReviews };
  };

  const stats = getCardStats();

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search flashcards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleStudySelected}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
        >
          Study {selectedCards.length > 0 ? `${selectedCards.length} Selected` : 'All Cards'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Cards</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.dueCount}</div>
          <div className="text-sm text-gray-400">Due for Review</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.reviewedCount}</div>
          <div className="text-sm text-gray-400">Reviewed</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.avgReviews.toFixed(1)}</div>
          <div className="text-sm text-gray-400">Avg Reviews</div>
        </div>
      </div>

      {/* Flashcard List */}
      <div className="space-y-3">
        {filteredFlashcards.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {searchQuery ? 'No flashcards match your search.' : 'No flashcards yet.'}
          </div>
        ) : (
          filteredFlashcards.map((flashcard) => (
            <div
              key={flashcard.id}
              className={`p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${
                selectedCards.includes(flashcard.id) ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => handleSelectCard(flashcard.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="checkbox"
                      checked={selectedCards.includes(flashcard.id)}
                      onChange={() => handleSelectCard(flashcard.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-700"
                    />
                    {flashcard.difficulty && (
                      <span className={`px-2 py-1 text-xs rounded-lg ${getDifficultyColor(flashcard.difficulty)}`}>
                        {flashcard.difficulty}
                      </span>
                    )}
                    {flashcard.tags?.map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-purple-500/20 rounded-lg">
                        {tag}
                      </span>
                    ))}
                    {new Date(flashcard.next_review || '') <= new Date() && (
                      <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg">
                        Due
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <div className="font-medium">{flashcard.question}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {flashcard.answer.length > 100 
                        ? flashcard.answer.substring(0, 100) + '...' 
                        : flashcard.answer}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Created {new Date(flashcard.created_at).toLocaleDateString()}</span>
                    {flashcard.last_reviewed && (
                      <span>Last reviewed {new Date(flashcard.last_reviewed).toLocaleDateString()}</span>
                    )}
                    {flashcard.review_count !== undefined && flashcard.review_count > 0 && (
                      <span>Reviewed {flashcard.review_count} times</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Edit flashcard:', flashcard.id);
                    }}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Delete this flashcard?')) {
                        try {
                          const response = await fetch(`/api/flashcards/${flashcard.id}`, {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                            }
                          });
                          if (response.ok) {
                            onRefresh();
                          }
                        } catch (error) {
                          console.error('Error deleting flashcard:', error);
                        }
                      }
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}