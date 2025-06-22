'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { 
  ChevronLeftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('7d');
  const [metrics, setMetrics] = useState<any>({
    overview: {},
    studyMetrics: {},
    documentMetrics: {},
    knowledgeMetrics: {},
    activityMetrics: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState([
    'overview', 'studyProgress', 'documentActivity', 'knowledgeGrowth'
  ]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [user, router, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics-v2?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics-v2/export?format=${format}&range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const timeRanges = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  const availableWidgets = [
    { id: 'overview', name: 'Overview Stats', icon: ChartBarIcon },
    { id: 'studyProgress', name: 'Study Progress', icon: AcademicCapIcon },
    { id: 'documentActivity', name: 'Document Activity', icon: DocumentTextIcon },
    { id: 'knowledgeGrowth', name: 'Knowledge Growth', icon: LightBulbIcon },
    { id: 'flashcardPerformance', name: 'Flashcard Performance', icon: AcademicCapIcon },
    { id: 'topTopics', name: 'Top Topics', icon: TagIcon },
    { id: 'learningVelocity', name: 'Learning Velocity', icon: ArrowTrendingUpIcon },
    { id: 'collaborationMetrics', name: 'Collaboration', icon: UserGroupIcon }
  ];

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets(prev => 
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
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
              <h1 className="text-xl font-semibold text-white">Analytics Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="glass-input py-2 px-3"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => setShowCustomizer(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>
              
              <div className="relative group">
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
                <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={() => exportData('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => exportData('json')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Export as JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Overview Stats */}
          {selectedWidgets.includes('overview') && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Documents</p>
                    <p className="text-2xl font-bold text-white">{metrics.overview.totalDocuments || 0}</p>
                    <p className="text-xs text-green-400 mt-1">
                      +{metrics.overview.documentsAddedThisPeriod || 0} this period
                    </p>
                  </div>
                  <DocumentTextIcon className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              
              <div className="glass-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Study Sessions</p>
                    <p className="text-2xl font-bold text-white">{metrics.overview.studySessions || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {metrics.overview.avgSessionDuration || 0} min avg
                    </p>
                  </div>
                  <AcademicCapIcon className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              
              <div className="glass-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Knowledge Score</p>
                    <p className="text-2xl font-bold text-white">{metrics.overview.knowledgeScore || 0}%</p>
                    <p className="text-xs text-green-400 mt-1">
                      +{metrics.overview.knowledgeGrowth || 0}% growth
                    </p>
                  </div>
                  <ArrowTrendingUpIcon className="w-8 h-8 text-green-400" />
                </div>
              </div>
              
              <div className="glass-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Streak</p>
                    <p className="text-2xl font-bold text-white">{metrics.overview.currentStreak || 0} days</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Best: {metrics.overview.longestStreak || 0} days
                    </p>
                  </div>
                  <div className="text-2xl">🔥</div>
                </div>
              </div>
            </div>
          )}

          {/* Study Progress */}
          {selectedWidgets.includes('studyProgress') && metrics.studyMetrics && (
            <div className="glass-card">
              <h3 className="text-lg font-semibold text-white mb-4">Study Progress</h3>
              
              <div className="grid grid-cols-7 gap-2 mb-6">
                {Array.from({ length: 7 }, (_, i) => {
                  const dayData = metrics.studyMetrics.dailyProgress?.[i] || { cards: 0, accuracy: 0 };
                  return (
                    <div key={i} className="text-center">
                      <div className="text-xs text-gray-400 mb-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                      </div>
                      <div className="h-24 bg-gray-800 rounded relative overflow-hidden">
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-500 to-purple-400"
                          style={{ height: `${(dayData.cards / 50) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {dayData.cards}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Cards Studied:</span>
                  <span className="text-white ml-2">{metrics.studyMetrics.totalCards || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Average Accuracy:</span>
                  <span className="text-white ml-2">{metrics.studyMetrics.avgAccuracy || 0}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Study Time:</span>
                  <span className="text-white ml-2">{metrics.studyMetrics.totalTime || 0} hours</span>
                </div>
              </div>
            </div>
          )}

          {/* Document Activity */}
          {selectedWidgets.includes('documentActivity') && metrics.documentMetrics && (
            <div className="glass-card">
              <h3 className="text-lg font-semibold text-white mb-4">Document Activity</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Most Active Documents</p>
                    <div className="space-y-2">
                      {metrics.documentMetrics.mostActive?.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-white truncate">{doc.title}</span>
                          <span className="text-xs text-gray-400">{doc.views} views</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Recent Uploads</p>
                    <div className="space-y-2">
                      {metrics.documentMetrics.recentUploads?.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-white truncate">{doc.title}</span>
                          <span className="text-xs text-gray-400">{doc.timeAgo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                  <div>
                    <span className="text-gray-400">Total Pages:</span>
                    <span className="text-white ml-2">{metrics.documentMetrics.totalPages || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Avg. Doc Size:</span>
                    <span className="text-white ml-2">{metrics.documentMetrics.avgSize || 0} pages</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Knowledge Growth */}
          {selectedWidgets.includes('knowledgeGrowth') && metrics.knowledgeMetrics && (
            <div className="glass-card">
              <h3 className="text-lg font-semibold text-white mb-4">Knowledge Growth</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Topics Mastered</span>
                  <span className="text-2xl font-bold text-white">{metrics.knowledgeMetrics.topicsMastered || 0}</span>
                </div>
                
                <div className="space-y-2">
                  {metrics.knowledgeMetrics.topTopics?.map((topic: any, index: number) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white">{topic.name}</span>
                        <span className="text-gray-400">{topic.mastery}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: `${topic.mastery}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Widget Customizer Modal */}
      {showCustomizer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Customize Dashboard</h3>
              <button
                onClick={() => setShowCustomizer(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {availableWidgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <label
                    key={widget.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedWidgets.includes(widget.id)
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWidgets.includes(widget.id)}
                      onChange={() => toggleWidget(widget.id)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-white">{widget.name}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            
            <button
              onClick={() => setShowCustomizer(false)}
              className="glass-button mt-6 w-full"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Import missing icons
import { 
  AcademicCapIcon,
  DocumentTextIcon,
  LightBulbIcon,
  TagIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';