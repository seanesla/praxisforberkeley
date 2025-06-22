'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { ExerciseGenerator } from '@/components/exercises/ExerciseGenerator';
import { ExerciseSession } from '@/components/exercises/ExerciseSession';
import { 
  ChevronLeftIcon,
  PencilSquareIcon,
  ChartBarIcon,
  TrophyIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function ExercisesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'practice' | 'generate'>('practice');
  const [isInSession, setIsInSession] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [exerciseStats, setExerciseStats] = useState({
    totalCompleted: 0,
    averageScore: 0,
    streakDays: 0,
    timeSpent: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchExercises();
  }, [user, router]);

  const fetchExercises = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch available exercises
      const exercisesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exercises`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch progress stats
      const progressResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exercises/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (exercisesResponse.ok) {
        const data = await exercisesResponse.json();
        setExercises(data.exercises || []);
      }
      
      if (progressResponse.ok) {
        const data = await progressResponse.json();
        setExerciseStats(data);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = (exercises: any[]) => {
    setSelectedExercises(exercises);
    setIsInSession(true);
  };

  const handleSessionComplete = async (results: any) => {
    setIsInSession(false);
    setSelectedExercises([]);
    // Refresh data
    await fetchExercises();
  };

  const handleExitSession = () => {
    setIsInSession(false);
    setSelectedExercises([]);
  };

  const handleGenerateSuccess = async () => {
    await fetchExercises();
    setActiveTab('practice');
  };

  const groupExercisesByTopic = () => {
    const grouped: { [key: string]: any[] } = {};
    exercises.forEach(exercise => {
      const topic = exercise.topic || 'General';
      if (!grouped[topic]) {
        grouped[topic] = [];
      }
      grouped[topic].push(exercise);
    });
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading exercises...</div>
      </div>
    );
  }

  if (isInSession) {
    return (
      <div className="min-h-screen bg-gray-900">
        <ExerciseSession
          exercises={selectedExercises}
          onComplete={handleSessionComplete}
          onExit={handleExitSession}
        />
      </div>
    );
  }

  const groupedExercises = groupExercisesByTopic();

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
              <h1 className="text-xl font-semibold text-white">Practice Exercises</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-white">{exerciseStats.totalCompleted}</p>
                </div>
                <PencilSquareIcon className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Average Score</p>
                  <p className="text-2xl font-bold text-white">{Math.round(exerciseStats.averageScore)}%</p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Practice Streak</p>
                  <p className="text-2xl font-bold text-white">{exerciseStats.streakDays} days</p>
                </div>
                <TrophyIcon className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Time Spent</p>
                  <p className="text-2xl font-bold text-white">{Math.round(exerciseStats.timeSpent / 60)}h</p>
                </div>
                <ClockIcon className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('practice')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'practice' 
                  ? 'text-purple-400 border-b-2 border-purple-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Practice Exercises
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'generate' 
                  ? 'text-purple-400 border-b-2 border-purple-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Generate New
            </button>
          </div>

          {/* Content */}
          {activeTab === 'practice' ? (
            <div className="space-y-6">
              {Object.keys(groupedExercises).length > 0 ? (
                Object.entries(groupedExercises).map(([topic, topicExercises]) => (
                  <div key={topic} className="glass-card">
                    <h3 className="text-lg font-semibold text-white mb-4">{topic}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {topicExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                          onClick={() => handleStartSession([exercise])}
                        >
                          <h4 className="font-medium text-white mb-2">{exercise.title}</h4>
                          <p className="text-sm text-gray-400 mb-3">{exercise.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                              {exercise.difficulty}
                            </span>
                            <span className="text-purple-400">
                              {exercise.questions?.length || 0} questions
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {topicExercises.length > 1 && (
                      <button
                        onClick={() => handleStartSession(topicExercises)}
                        className="mt-4 text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Practice all {topic} exercises →
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="glass-card text-center py-12">
                  <PencilSquareIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No exercises available yet</p>
                  <button
                    onClick={() => setActiveTab('generate')}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Generate some exercises to get started
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card">
              <ExerciseGenerator onSuccess={handleGenerateSuccess} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}