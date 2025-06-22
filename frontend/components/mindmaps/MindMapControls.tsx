'use client';

import { useState } from 'react';
import { 
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowDownTrayIcon,
  CogIcon,
  ViewColumnsIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { MindMapLayout } from '@/types';

interface MindMapControlsProps {
  onLayoutChange: (layout: MindMapLayout['type']) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onExport: (format: 'json' | 'mermaid' | 'svg' | 'png') => void;
  onAddNode?: () => void;
  onDeleteSelected?: () => void;
  onAutoArrange?: () => void;
  canEdit?: boolean;
}

export default function MindMapControls({
  onLayoutChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onExport,
  onAddNode,
  onDeleteSelected,
  onAutoArrange,
  canEdit = true
}: MindMapControlsProps) {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const layouts: { type: MindMapLayout['type']; label: string; icon: string }[] = [
    { type: 'radial', label: 'Radial', icon: '⭕' },
    { type: 'tree', label: 'Tree', icon: '🌳' },
    { type: 'organic', label: 'Organic', icon: '🌿' },
    { type: 'force', label: 'Force', icon: '⚡' }
  ];

  const exportFormats = [
    { format: 'json' as const, label: 'JSON', icon: '📄' },
    { format: 'mermaid' as const, label: 'Mermaid', icon: '🧜' },
    { format: 'svg' as const, label: 'SVG', icon: '🖼️' },
    { format: 'png' as const, label: 'PNG', icon: '🏞️' }
  ];

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      {/* Main Controls */}
      <div className="flex gap-2 p-2 bg-gray-800/90 backdrop-blur rounded-lg border border-gray-700">
        {/* Zoom Controls */}
        <div className="flex gap-1 border-r border-gray-700 pr-2">
          <button
            onClick={onZoomIn}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Zoom In"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Zoom Out"
          >
            <ArrowsPointingInIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onFitView}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Fit to View"
          >
            <ViewColumnsIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Edit Controls */}
        {canEdit && (
          <div className="flex gap-1 border-r border-gray-700 pr-2">
            <button
              onClick={onAddNode}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              title="Add Node"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onDeleteSelected}
              className="p-2 hover:bg-white/10 rounded transition-colors text-red-400"
              title="Delete Selected"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Layout Menu */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Change Layout"
          >
            <CogIcon className="h-4 w-4" />
          </button>
          
          {showLayoutMenu && (
            <div className="absolute top-full right-0 mt-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Layouts</div>
              {layouts.map(layout => (
                <button
                  key={layout.type}
                  onClick={() => {
                    onLayoutChange(layout.type);
                    setShowLayoutMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-white/10 rounded text-sm"
                >
                  <span>{layout.icon}</span>
                  <span>{layout.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auto Arrange */}
        {canEdit && onAutoArrange && (
          <button
            onClick={onAutoArrange}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Auto Arrange"
          >
            <SparklesIcon className="h-4 w-4" />
          </button>
        )}

        {/* Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Export"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Export as</div>
              {exportFormats.map(format => (
                <button
                  key={format.format}
                  onClick={() => {
                    onExport(format.format);
                    setShowExportMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-white/10 rounded text-sm"
                >
                  <span>{format.icon}</span>
                  <span>{format.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-400 bg-gray-800/90 backdrop-blur rounded px-3 py-2">
        <div>Scroll: Pan</div>
        <div>Ctrl + Scroll: Zoom</div>
        <div>Click + Drag: Move nodes</div>
      </div>
    </div>
  );
}