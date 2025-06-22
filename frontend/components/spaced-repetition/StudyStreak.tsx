'use client';

import { useState, useEffect } from 'react';
import { FireIcon, CalendarIcon, TrophyIcon } from '@heroicons/react/24/outline';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
}

export function StudyStreak() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const response = await fetch('/api/spaced-repetition/streak', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load streak');

      const data = await response.json();
      setStreak(data);
    } catch (error) {
      console.error('Error loading streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-800 rounded-lg p-4 h-24" />
    );
  }

  if (!streak) return null;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="glass-card text-center">
        <FireIcon className={`w-8 h-8 mx-auto mb-2 ${
          streak.currentStreak > 0 ? 'text-orange-500' : 'text-gray-500'
        }`} />
        <p className="text-2xl font-bold text-white">{streak.currentStreak}</p>
        <p className="text-sm text-gray-400">Current Streak</p>
      </div>

      <div className="glass-card text-center">
        <TrophyIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-2xl font-bold text-white">{streak.longestStreak}</p>
        <p className="text-sm text-gray-400">Best Streak</p>
      </div>

      <div className="glass-card text-center">
        <CalendarIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
        <p className="text-2xl font-bold text-white">{streak.totalDaysStudied}</p>
        <p className="text-sm text-gray-400">Days Studied</p>
      </div>
    </div>
  );
}