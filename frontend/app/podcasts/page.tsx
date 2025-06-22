'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { 
  MicrophoneIcon,
  PlayIcon,
  ClockIcon,
  DocumentTextIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

export default function PodcastsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPodcasts();
  }, [user]);

  const fetchPodcasts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/podcast/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPodcasts(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching podcasts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const viewTranscript = async (sessionId: string) => {
    router.push(`/podcast/transcript/${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
              <h1 className="text-xl font-semibold text-white">Saved Podcasts</h1>
            </div>
            
            <button
              onClick={() => router.push('/podcast')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <MicrophoneIcon className="w-5 h-5" />
              Start New Podcast
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {podcasts.length === 0 ? (
          <div className="text-center py-12">
            <MicrophoneIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No podcasts yet</h2>
            <p className="text-gray-400 mb-6">
              Start your first voice conversation to see it here
            </p>
            <button
              onClick={() => router.push('/podcast')}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Start Your First Podcast
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="podcast-list">
            {podcasts.map((podcast) => (
              <div
                key={podcast.id}
                className="glass-card hover:bg-gray-700 transition-all cursor-pointer"
                onClick={() => viewTranscript(podcast.id)}
                data-testid="podcast-item"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <MicrophoneIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-white mb-1">
                        {podcast.documents?.title || 'General Conversation'}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {formatDuration(podcast.duration || 0)}
                        </div>
                        
                        {podcast.documents && (
                          <div className="flex items-center gap-1">
                            <DocumentTextIcon className="w-4 h-4" />
                            Document-based
                          </div>
                        )}
                        
                        <span>
                          {new Date(podcast.started_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {podcast.summary && (
                        <p className="text-gray-300 mt-2 line-clamp-2">
                          {podcast.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewTranscript(podcast.id);
                    }}
                  >
                    <PlayIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Analytics Summary */}
        {podcasts.length > 0 && (
          <div className="mt-12 glass-card" data-testid="podcast-stats">
            <h3 className="text-lg font-semibold text-white mb-4">Your Podcast Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total Conversations</p>
                <p className="text-2xl font-bold text-white">{podcasts.length}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Duration</p>
                <p className="text-2xl font-bold text-white" data-testid="podcast-duration">
                  {Math.round(podcasts.reduce((acc, p) => acc + (p.duration || 0), 0) / 60000)} min
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg. Duration</p>
                <p className="text-2xl font-bold text-white">
                  {Math.round(podcasts.reduce((acc, p) => acc + (p.duration || 0), 0) / podcasts.length / 60000)} min
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}