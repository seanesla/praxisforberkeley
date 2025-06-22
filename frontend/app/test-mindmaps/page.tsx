'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MindMapData } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

// Dynamically import to avoid SSR issues
const MindMapCanvas = dynamic(
  () => import('@/components/mindmaps/MindMapCanvas'),
  { ssr: false }
);

const MindMapControls = dynamic(
  () => import('@/components/mindmaps/MindMapControls'),
  { ssr: false }
);

// Sample mind map data
const sampleMindMapData: MindMapData = {
  nodes: [
    {
      id: '1',
      text: 'Web Development',
      type: 'root',
      position: { x: 0, y: 0 },
      expanded: true,
      metadata: { hasChildren: true }
    },
    {
      id: '2',
      text: 'Frontend',
      type: 'main',
      position: { x: -200, y: 150 },
      expanded: true,
      metadata: { hasChildren: true }
    },
    {
      id: '3',
      text: 'Backend',
      type: 'main',
      position: { x: 200, y: 150 },
      expanded: true,
      metadata: { hasChildren: true }
    },
    {
      id: '4',
      text: 'React',
      type: 'sub',
      position: { x: -300, y: 300 },
      icon: 'document'
    },
    {
      id: '5',
      text: 'Vue',
      type: 'sub',
      position: { x: -200, y: 350 },
      icon: 'document'
    },
    {
      id: '6',
      text: 'Angular',
      type: 'sub',
      position: { x: -100, y: 300 },
      icon: 'document'
    },
    {
      id: '7',
      text: 'Node.js',
      type: 'sub',
      position: { x: 100, y: 300 },
      icon: 'research'
    },
    {
      id: '8',
      text: 'Python',
      type: 'sub',
      position: { x: 200, y: 350 },
      icon: 'research'
    },
    {
      id: '9',
      text: 'Database',
      type: 'sub',
      position: { x: 300, y: 300 },
      icon: 'research'
    },
    {
      id: '10',
      text: 'Hooks',
      type: 'detail',
      position: { x: -350, y: 450 }
    },
    {
      id: '11',
      text: 'Components',
      type: 'detail',
      position: { x: -250, y: 450 }
    }
  ],
  connections: [
    { source: '1', target: '2', type: 'hierarchy' },
    { source: '1', target: '3', type: 'hierarchy' },
    { source: '2', target: '4', type: 'hierarchy' },
    { source: '2', target: '5', type: 'hierarchy' },
    { source: '2', target: '6', type: 'hierarchy' },
    { source: '3', target: '7', type: 'hierarchy' },
    { source: '3', target: '8', type: 'hierarchy' },
    { source: '3', target: '9', type: 'hierarchy' },
    { source: '4', target: '10', type: 'hierarchy' },
    { source: '4', target: '11', type: 'hierarchy' },
    // Cross-connections
    { source: '4', target: '7', type: 'association', label: 'Full Stack', style: { dashArray: '5 5', color: '#999' } },
    { source: '9', target: '7', type: 'association', style: { dashArray: '5 5', color: '#999' } }
  ],
  layout: {
    type: 'tree',
    direction: 'TB',
    spacing: { x: 150, y: 150 }
  },
  theme: {
    name: 'default',
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14
  }
};

export default function TestMindMapsPage() {
  const router = useRouter();
  const [mindMapData, setMindMapData] = useState<MindMapData>(sampleMindMapData);
  const [selectedLayout, setSelectedLayout] = useState<'radial' | 'tree' | 'organic' | 'force'>('tree');

  const handleDataChange = (newData: MindMapData) => {
    setMindMapData(newData);
    console.log('Mind map data changed:', newData);
  };

  const handleLayoutChange = (layout: 'radial' | 'tree' | 'organic' | 'force') => {
    setSelectedLayout(layout);
    setMindMapData({
      ...mindMapData,
      layout: {
        ...mindMapData.layout,
        type: layout
      }
    });
  };

  const handleExport = (format: 'json' | 'mermaid' | 'svg' | 'png') => {
    console.log(`Exporting as ${format}...`);
    if (format === 'json') {
      const dataStr = JSON.stringify(mindMapData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = 'mindmap.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Mind Maps Test</h1>
              <p className="text-sm text-gray-400">Testing the mind map components</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            Layout: <span className="text-purple-400 font-medium">{selectedLayout}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative h-[calc(100vh-80px)]">
        <MindMapCanvas
          data={mindMapData}
          onDataChange={handleDataChange}
          editable={true}
        />
        
        <MindMapControls
          onLayoutChange={handleLayoutChange}
          onZoomIn={() => console.log('Zoom in')}
          onZoomOut={() => console.log('Zoom out')}
          onFitView={() => console.log('Fit view')}
          onExport={handleExport}
          onAddNode={() => console.log('Add node')}
          onDeleteSelected={() => console.log('Delete selected')}
          onAutoArrange={() => console.log('Auto arrange')}
          canEdit={true}
        />
      </div>

      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg p-4 max-w-sm">
        <h3 className="font-semibold mb-2">Interactive Features:</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Click and drag nodes to move them</li>
          <li>• Click on nodes with arrows to expand/collapse</li>
          <li>• Use controls to change layout</li>
          <li>• Export to JSON or Mermaid format</li>
          <li>• Scroll to pan, Ctrl+Scroll to zoom</li>
        </ul>
      </div>
    </div>
  );
}