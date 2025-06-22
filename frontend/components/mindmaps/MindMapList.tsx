'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MindMap } from '@/types';
import { 
  MapIcon, 
  CalendarIcon, 
  DocumentTextIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface MindMapListProps {
  mindMaps: MindMap[];
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}

export default function MindMapList({ mindMaps, onDelete, onRefresh }: MindMapListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredMindMaps = mindMaps.filter(map => 
    map.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getNodeCount = (map: MindMap) => {
    return map.data?.nodes?.length || 0;
  };

  const handleView = (id: string) => {
    router.push(`/dashboard/mindmaps/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this mind map?')) {
      onDelete?.(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search mind maps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-500' : 'bg-white/10'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" 
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-500' : 'bg-white/10'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mind Maps Display */}
      {filteredMindMaps.length === 0 ? (
        <div className="text-center py-12">
          <MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">
            {searchTerm ? 'No mind maps found matching your search.' : 'No mind maps yet.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMindMaps.map((map) => (
            <div
              key={map.id}
              className="glass rounded-xl p-6 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <MapIcon className="h-8 w-8 text-purple-400" />
                <span className="text-xs text-gray-400">
                  {getNodeCount(map)} nodes
                </span>
              </div>
              
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {map.title}
              </h3>
              
              {map.document_id && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                  <DocumentTextIcon className="h-3 w-3" />
                  <span>From document</span>
                </div>
              )}
              
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                <CalendarIcon className="h-3 w-3" />
                <span>{formatDate(map.updated_at)}</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(map.id)}
                  className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg 
                           transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <EyeIcon className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={() => handleDelete(map.id)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg 
                           transition-colors text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMindMaps.map((map) => (
            <div
              key={map.id}
              className="glass rounded-lg p-4 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <MapIcon className="h-6 w-6 text-purple-400" />
                  <div>
                    <h3 className="font-semibold">{map.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      <span>{getNodeCount(map)} nodes</span>
                      {map.document_id && (
                        <>
                          <span>•</span>
                          <span>From document</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(map.updated_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(map.id)}
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded 
                             transition-colors text-sm flex items-center gap-2"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(map.id)}
                    className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded 
                             transition-colors text-red-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}