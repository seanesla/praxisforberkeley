'use client';

import { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  SparklesIcon, 
  AcademicCapIcon,
  MapIcon,
  ChatBubbleLeftIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date;
  icon: any;
  iconColor: string;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      type: 'document_upload',
      title: 'Uploaded "Research Paper.pdf"',
      description: 'Added to your document library',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      icon: DocumentTextIcon,
      iconColor: 'text-purple-400'
    },
    {
      id: '2',
      type: 'note_created',
      title: 'Created "Meeting Notes"',
      description: 'Smart note with AI suggestions',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      icon: SparklesIcon,
      iconColor: 'text-pink-400'
    },
    {
      id: '3',
      type: 'flashcard_studied',
      title: 'Studied 25 flashcards',
      description: 'Machine Learning Concepts',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      icon: AcademicCapIcon,
      iconColor: 'text-blue-400'
    },
    {
      id: '4',
      type: 'mindmap_created',
      title: 'Generated mind map',
      description: 'From "Project Overview" document',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      icon: MapIcon,
      iconColor: 'text-green-400'
    },
    {
      id: '5',
      type: 'ai_chat',
      title: 'Asked AI about quantum computing',
      description: 'Got detailed explanation with sources',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      icon: ChatBubbleLeftIcon,
      iconColor: 'text-indigo-400'
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);

  // Simulated real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly add a new activity
      if (Math.random() > 0.8) {
        const newActivities = [
          {
            id: Date.now().toString(),
            type: 'ai_suggestion',
            title: 'AI found related content',
            description: 'In "Advanced Topics" document',
            timestamp: new Date(),
            icon: SparklesIcon,
            iconColor: 'text-purple-400'
          }
        ];
        
        setActivities(prev => [...newActivities, ...prev].slice(0, 10));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Activity Feed</h2>
        <ClockIcon className="w-5 h-5 text-gray-400" />
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="relative"
          >
            {/* Timeline connector */}
            {index < activities.length - 1 && (
              <div className="absolute left-5 top-10 -bottom-2 w-0.5 bg-gray-700" />
            )}

            <div className="flex gap-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                  <activity.icon className={`w-5 h-5 ${activity.iconColor}`} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {activity.title}
                </p>
                {activity.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {activity.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      <button className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
        View all activity
      </button>
    </div>
  );
}