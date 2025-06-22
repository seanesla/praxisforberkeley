'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { StudySession } from '@/components/spaced-repetition/StudySession';
import { StudyStreak } from '@/components/spaced-repetition/StudyStreak';
import { 
  ChevronLeftIcon,
  AcademicCapIcon,
  FireIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function StudyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isStudying, setIsStudying] = useState(false);
  const [dueFlashcards, setDueFlashcards] = useState<any[]>([]);
  const [studyStats, setStudyStats] = useState({
    cardsStudiedToday: 0,
    averageAccuracy: 0,
    currentStreak: 0,
    longestStreak: 0
  });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchStudyData();
  }, [user, router]);

  const fetchStudyData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch due flashcards
      const dueResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spaced-repetition/due`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch study stats
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spaced-repetition/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch performance history
      const performanceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spaced-repetition/performance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (dueResponse.ok) {
        const dueData = await dueResponse.json();
        setDueFlashcards(dueData.flashcards || []);
      }
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStudyStats(statsData);
      }
      
      if (performanceResponse.ok) {
        const perfData = await performanceResponse.json();
        setPerformanceData(perfData.history || []);
      }
    } catch (error) {
      console.error('Error fetching study data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartStudy = () => {
    setIsStudying(true);
  };

  const handleStudyComplete = async (results: any) => {
    setIsStudying(false);
    // Refresh data after study session
    await fetchStudyData();
  };

  const handleExitStudy = () => {
    setIsStudying(false);
  };

  // Generate heatmap data for the last 365 days
  const generateHeatmapData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayData = performanceData.find(d => {
        const perfDate = new Date(d.date);
        return perfDate.toDateString() === date.toDateString();
      });
      
      data.push({
        date: date.toISOString().split('T')[0],
        count: dayData ? dayData.cardsStudied : 0,
        accuracy: dayData ? dayData.accuracy : 0
      });
    }
    
    return data;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading study data...</div>
      </div>
    );
  }

  if (isStudying) {
    return (
      <div className="min-h-screen bg-gray-900">
        <StudySession
          flashcards={dueFlashcards}
          onComplete={handleStudyComplete}
          onExit={handleExitStudy}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <Logo size="sm" />
              <h1 className="text-xl font-semibold text-white">Spaced Repetition Study</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Study Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Cards Due</p>
                  <p className="text-2xl font-bold text-white">{dueFlashcards.length}</p>
                </div>
                <AcademicCapIcon className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Today's Progress</p>
                  <p className="text-2xl font-bold text-white">{studyStats.cardsStudiedToday}</p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Current Streak</p>
                  <p className="text-2xl font-bold text-white">{studyStats.currentStreak} days</p>
                </div>
                <FireIcon className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Average Accuracy</p>
                  <p className="text-2xl font-bold text-white">{Math.round(studyStats.averageAccuracy)}%</p>
                </div>
                <div className="text-2xl">🎯</div>
              </div>
            </div>
          </div>

          {/* Study Action */}
          <div className="text-center">
            {dueFlashcards.length > 0 ? (
              <button
                onClick={handleStartStudy}
                className="glass-button inline-flex items-center gap-2"
              >
                <AcademicCapIcon className="w-5 h-5" />
                Start Study Session ({dueFlashcards.length} cards)
              </button>
            ) : (
              <div className="glass-card text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  All caught up!
                </h3>
                <p className="text-gray-400">
                  No cards are due for review right now. Check back later!
                </p>
              </div>
            )}
          </div>

          {/* Study Streak Calendar */}
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-6">
              <CalendarIcon className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-semibold text-white">Study Calendar</h3>
            </div>
            <StudyStreak heatmapData={generateHeatmapData()} />
          </div>

          {/* Performance Trends */}
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-6">
              <ChartBarIcon className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Performance Trends</h3>
            </div>
            
            <div className="space-y-4">
              {/* Last 7 days performance */}
              <div className="grid grid-cols-7 gap-2">
                {performanceData.slice(-7).map((day, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-gray-400 mb-1">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </div>
                    <div className="h-20 bg-gray-800 rounded relative overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-purple-500/50"
                        style={{ height: `${(day.cardsStudied / 50) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {day.cardsStudied}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-gray-800">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Best Streak:</span>
                    <span className="text-white ml-2">{studyStats.longestStreak} days</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Cards Mastered:</span>
                    <span className="text-white ml-2">{studyStats.cardsStudiedToday * 5}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}