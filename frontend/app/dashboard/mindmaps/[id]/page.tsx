'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { mindmapsApi } from '@/lib/api/mindmaps';
import { MindMap, MindMapData, MindMapLayout } from '@/types';
import { 
  ArrowLeftIcon, 
  CloudArrowUpIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useReactFlow } from 'reactflow';

// Dynamically import ReactFlow components to avoid SSR issues
const MindMapCanvas = dynamic(
  () => import('@/components/mindmaps/MindMapCanvas'),
  { ssr: false }
);

const MindMapControls = dynamic(
  () => import('@/components/mindmaps/MindMapControls'),
  { ssr: false }
);

export default function MindMapViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadMindMap();
  }, [params.id]);

  const loadMindMap = async () => {
    try {
      const data = await mindmapsApi.getMindMap(params.id);
      setMindMap(data);
      setError(null);
    } catch (error) {
      console.error('Error loading mind map:', error);
      setError('Failed to load mind map');
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = useCallback((newData: MindMapData) => {
    if (mindMap) {
      setMindMap({ ...mindMap, data: newData });
      setHasChanges(true);
    }
  }, [mindMap]);

  const handleSave = async () => {
    if (!mindMap || !hasChanges) return;

    setSaving(true);
    try {
      await mindmapsApi.updateMindMap(mindMap.id, {
        data: mindMap.data
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving mind map:', error);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleLayoutChange = (layoutType: MindMapLayout['type']) => {
    if (!mindMap) return;

    const updatedData: MindMapData = {
      ...mindMap.data,
      layout: {
        ...mindMap.data.layout,
        type: layoutType
      }
    };

    handleDataChange(updatedData);
  };

  const handleExport = async (format: 'json' | 'mermaid' | 'svg' | 'png') => {
    if (!mindMap) return;

    try {
      const blob = await mindmapsApi.exportMindMap(mindMap, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mindMap.title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      setError('Export failed: ' + (error as Error).message);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (!hasChanges) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [mindMap?.data, hasChanges]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !mindMap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-400">{error || 'Mind map not found'}</p>
          <button
            onClick={() => router.push('/dashboard/mindmaps')}
            className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg"
          >
            Back to Mind Maps
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/mindmaps')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">{mindMap.title}</h1>
              <p className="text-sm text-gray-400">
                {mindMap.data.nodes.length} nodes • {mindMap.data.connections.length} connections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {hasChanges && (
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-yellow-500">Unsaved changes</span>
              </div>
            )}
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 
                       disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative bg-gray-950">
        <MindMapCanvas
          data={mindMap.data}
          onDataChange={handleDataChange}
          editable={true}
        />
        
        <MindMapControls
          onLayoutChange={handleLayoutChange}
          onZoomIn={() => {}} // These will be handled by ReactFlow internally
          onZoomOut={() => {}}
          onFitView={() => {}}
          onExport={handleExport}
          canEdit={true}
        />
      </div>
    </div>
  );
}