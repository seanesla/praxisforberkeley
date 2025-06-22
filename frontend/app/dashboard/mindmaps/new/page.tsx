'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { mindmapsApi } from '@/lib/api/mindmaps';
import { MindMapData } from '@/types';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function NewMindMapPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [rootNodeText, setRootNodeText] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !rootNodeText.trim()) return;

    setCreating(true);
    try {
      // Create initial mind map structure
      const rootId = uuidv4();
      const initialData: MindMapData = {
        nodes: [
          {
            id: rootId,
            text: rootNodeText,
            type: 'root',
            position: { x: 0, y: 0 },
            expanded: true
          }
        ],
        connections: [],
        layout: {
          type: 'radial',
          direction: 'TB',
          spacing: { x: 150, y: 100 }
        },
        theme: {
          name: 'default',
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14
        }
      };

      const newMindMap = await mindmapsApi.createMindMap(title, initialData);
      console.log('Created mind map:', newMindMap);
      
      // Navigate to the new mind map
      router.push(`/dashboard/mindmaps/${newMindMap.id}`);
    } catch (error) {
      console.error('Error creating mind map:', error);
      alert('Failed to create mind map. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard/mindmaps')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold">Create New Mind Map</h1>
        </div>

        {/* Form */}
        <div className="glass rounded-xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Mind Map Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Project Ideas, Study Notes, Business Plan..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Central Topic
            </label>
            <input
              type="text"
              value={rootNodeText}
              onChange={(e) => setRootNodeText(e.target.value)}
              placeholder="e.g., Web Development, Marketing Strategy, Physics..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-2">
              This will be the central node of your mind map
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !rootNodeText.trim() || creating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 
                       bg-gradient-to-r from-purple-500 to-blue-500 
                       hover:from-purple-600 hover:to-blue-600 
                       disabled:from-gray-600 disabled:to-gray-600 
                       disabled:cursor-not-allowed rounded-lg transition-all duration-200"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5" />
                  Create Mind Map
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 glass rounded-xl p-6">
          <h2 className="font-semibold mb-3">Tips for effective mind maps:</h2>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>Start with a clear central concept that summarizes your topic</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>Use short phrases or single words for nodes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>Group related ideas with colors or proximity</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>Add connections between related concepts across branches</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}