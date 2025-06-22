'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { Flashcard } from '@/types';

interface FlashcardStatsProps {
  flashcards: Flashcard[];
  onBack: () => void;
}

export default function FlashcardStats({ flashcards, onBack }: FlashcardStatsProps) {
  // Calculate statistics
  const totalCards = flashcards.length;
  const reviewedCards = flashcards.filter(card => card.last_reviewed).length;
  const totalReviews = flashcards.reduce((sum, card) => sum + (card.review_count || 0), 0);
  const avgReviewsPerCard = totalCards > 0 ? totalReviews / totalCards : 0;
  
  const dueToday = flashcards.filter(card => 
    new Date(card.next_review || '') <= new Date()
  ).length;
  
  const difficultyBreakdown = {
    easy: flashcards.filter(card => card.difficulty === 'easy').length,
    medium: flashcards.filter(card => card.difficulty === 'medium').length,
    hard: flashcards.filter(card => card.difficulty === 'hard').length,
    unrated: flashcards.filter(card => !card.difficulty).length
  };

  const masteryLevels = {
    new: flashcards.filter(card => !card.review_count || card.review_count === 0).length,
    learning: flashcards.filter(card => card.review_count && card.review_count < 3).length,
    reviewing: flashcards.filter(card => card.review_count && card.review_count >= 3 && card.review_count < 10).length,
    mastered: flashcards.filter(card => card.review_count && card.review_count >= 10).length
  };

  // Calculate streak (simplified version)
  const reviewDates = flashcards
    .filter(card => card.last_reviewed)
    .map(card => new Date(card.last_reviewed!).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = 0;
  const today = new Date();
  for (let i = 0; i < reviewDates.length; i++) {
    const reviewDate = new Date(reviewDates[i]);
    const diffDays = Math.floor((today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === i) {
      currentStreak++;
    } else {
      break;
    }
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
          <h2 className="text-2xl font-bold">Study Statistics</h2>
          <p className="text-gray-400 mt-1">Track your progress and performance</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-purple-400">{totalCards}</div>
          <div className="text-sm text-gray-400 mt-1">Total Cards</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-yellow-400">{dueToday}</div>
          <div className="text-sm text-gray-400 mt-1">Due Today</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-green-400">{reviewedCards}</div>
          <div className="text-sm text-gray-400 mt-1">Reviewed</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-blue-400">{currentStreak}</div>
          <div className="text-sm text-gray-400 mt-1">Day Streak</div>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Difficulty Distribution</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              Easy
            </span>
            <span className="font-medium">{difficultyBreakdown.easy}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-green-400 h-2 rounded-full"
              style={{ width: `${totalCards > 0 ? (difficultyBreakdown.easy / totalCards) * 100 : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              Medium
            </span>
            <span className="font-medium">{difficultyBreakdown.medium}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-yellow-400 h-2 rounded-full"
              style={{ width: `${totalCards > 0 ? (difficultyBreakdown.medium / totalCards) * 100 : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              Hard
            </span>
            <span className="font-medium">{difficultyBreakdown.hard}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-red-400 h-2 rounded-full"
              style={{ width: `${totalCards > 0 ? (difficultyBreakdown.hard / totalCards) * 100 : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              Unrated
            </span>
            <span className="font-medium">{difficultyBreakdown.unrated}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gray-400 h-2 rounded-full"
              style={{ width: `${totalCards > 0 ? (difficultyBreakdown.unrated / totalCards) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mastery Levels */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Mastery Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">{masteryLevels.new}</div>
            <div className="text-sm text-gray-500 mt-1">New</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{masteryLevels.learning}</div>
            <div className="text-sm text-gray-500 mt-1">Learning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{masteryLevels.reviewing}</div>
            <div className="text-sm text-gray-500 mt-1">Reviewing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{masteryLevels.mastered}</div>
            <div className="text-sm text-gray-500 mt-1">Mastered</div>
          </div>
        </div>
      </div>

      {/* Review Statistics */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Review Statistics</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-gray-400 text-sm">Total Reviews</p>
            <p className="text-2xl font-bold">{totalReviews}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg Reviews per Card</p>
            <p className="text-2xl font-bold">{avgReviewsPerCard.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Study Tips */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Study Tips</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          {dueToday > 0 && (
            <li>• You have {dueToday} cards due for review. Keep up the momentum!</li>
          )}
          {currentStreak > 0 && (
            <li>• Great job! You've studied {currentStreak} days in a row.</li>
          )}
          {masteryLevels.new > 5 && (
            <li>• You have {masteryLevels.new} new cards. Consider reviewing them soon.</li>
          )}
          {difficultyBreakdown.hard > totalCards * 0.3 && (
            <li>• Many cards are marked as hard. Take your time with these.</li>
          )}
        </ul>
      </div>
    </div>
  );
}