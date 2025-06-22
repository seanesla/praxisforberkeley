'use client';

import { useRouter } from 'next/navigation';
import { 
  DocumentTextIcon, 
  SparklesIcon, 
  AcademicCapIcon,
  MapIcon,
  CloudArrowUpIcon,
  MicrophoneIcon,
  MagnifyingGlassIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      title: 'Upload Document',
      description: 'Import PDFs, Word docs, and more',
      icon: CloudArrowUpIcon,
      color: 'from-purple-600 to-purple-700',
      onClick: () => router.push('/documents/upload')
    },
    {
      title: 'Create Smart Note',
      description: 'AI-powered note with instant context',
      icon: SparklesIcon,
      color: 'from-pink-600 to-pink-700',
      onClick: () => router.push('/notes/new?smart=true')
    },
    {
      title: 'Generate Flashcards',
      description: 'Create study cards from documents',
      icon: AcademicCapIcon,
      color: 'from-blue-600 to-blue-700',
      onClick: () => router.push('/flashcards/generate')
    },
    {
      title: 'Build Mind Map',
      description: 'Visualize concepts and connections',
      icon: MapIcon,
      color: 'from-green-600 to-green-700',
      onClick: () => router.push('/mindmaps/new')
    },
    {
      title: 'Start Podcast',
      description: 'Have a conversation about your docs',
      icon: MicrophoneIcon,
      color: 'from-indigo-600 to-indigo-700',
      onClick: () => router.push('/podcast')
    },
    {
      title: 'Search Knowledge',
      description: 'Find anything across all content',
      icon: MagnifyingGlassIcon,
      color: 'from-amber-600 to-amber-700',
      onClick: () => router.push('/search')
    }
  ];

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <button
            key={action.title}
            onClick={action.onClick}
            className="group relative overflow-hidden rounded-xl bg-gray-800/50 p-4 transition-all duration-200 hover:scale-105 hover:bg-gray-800"
          >
            {/* Background gradient on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-200`} />
            
            {/* Content */}
            <div className="relative z-10">
              <action.icon className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors mb-2" />
              <h3 className="text-sm font-medium text-white mb-1">{action.title}</h3>
              <p className="text-xs text-gray-400 group-hover:text-gray-300">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}