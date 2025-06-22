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

const MindMapCanvasPhysics = dynamic(
  () => import('@/components/mindmaps/MindMapCanvasPhysics'),
  { ssr: false }
);

const MindMapControls = dynamic(
  () => import('@/components/mindmaps/MindMapControls'),
  { ssr: false }
);

export default function MindMapViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [physicsPreset, setPhysicsPreset] = useState<'forceDirected' | 'gravity' | 'space' | 'molecular' | 'network'>('forceDirected');
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  useEffect(() => {
    params.then(p => setResolvedParams(p));
  }, [params]);

  const loadMindMap = useCallback(async () => {
    if (!resolvedParams?.id) return;
    try {
      const data = await mindmapsApi.getMindMap(resolvedParams.id);
      setMindMap(data);
      setError(null);
    } catch (error) {
      console.error('Error loading mind map:', error);
      setError('Failed to load mind map');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams]);

  useEffect(() => {
    if (resolvedParams?.id) {
      loadMindMap();
    }
  }, [resolvedParams, loadMindMap]);

  const handleDataChange = useCallback((newData: MindMapData) => {
    if (mindMap) {
      // Update the metadata with the new full structure
      const updatedData = {
        ...mindMap.data,
        metadata: newData
      };
      setMindMap({ ...mindMap, data: updatedData });
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

    const currentMetadata = mindMap.data?.metadata || { nodes: [{ id: mindMap.data.id, text: mindMap.data.text, type: 'root', position: { x: 0, y: 0 }, expanded: true }], connections: [] };
    const updatedData: MindMapData = {
      ...currentMetadata,
      layout: {
        ...currentMetadata.layout,
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
                {mindMap.data?.metadata?.nodes?.length || 1} nodes • {mindMap.data?.metadata?.connections?.length || 0} connections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Physics Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={physicsEnabled}
                  onChange={(e) => setPhysicsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                <span className="text-sm">Physics</span>
              </label>
              
              {physicsEnabled && (
                <select
                  value={physicsPreset}
                  onChange={(e) => setPhysicsPreset(e.target.value as any)}
                  className="px-2 py-1 bg-white/10 border border-white/10 rounded text-sm"
                >
                  <option value="forceDirected">Force Directed</option>
                  <option value="gravity">Gravity</option>
                  <option value="space">Space</option>
                  <option value="molecular">Molecular</option>
                  <option value="network">Network</option>
                </select>
              )}
            </div>
            
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
      <div className="flex-1 relative bg-gray-950" style={{ minHeight: '500px' }}>
        {physicsEnabled ? (
          <MindMapCanvasPhysics
            data={mindMap.data?.metadata || { nodes: [{ id: mindMap.data.id, text: mindMap.data.text, type: 'root', position: { x: 0, y: 0 }, expanded: true }], connections: [] }}
            onDataChange={handleDataChange}
            editable={true}
            physicsEnabled={physicsEnabled}
            physicsPreset={physicsPreset}
          />
        ) : (
          <MindMapCanvas
            data={mindMap.data?.metadata || { nodes: [{ id: mindMap.data.id, text: mindMap.data.text, type: 'root', position: { x: 0, y: 0 }, expanded: true }], connections: [] }}
            onDataChange={handleDataChange}
            editable={true}
          />
        )}
        
        {!physicsEnabled && (
          <MindMapControls
            onLayoutChange={handleLayoutChange}
            onZoomIn={() => {}} // These will be handled by ReactFlow internally
            onZoomOut={() => {}}
            onFitView={() => {}}
            onExport={handleExport}
            canEdit={true}
          />
        )}
      </div>
    </div>
  );
}