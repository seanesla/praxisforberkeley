'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { CitationNetwork } from '@/components/citation-network/CitationNetwork';
import { 
  ChevronLeftIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function CitationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [networkData, setNetworkData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [pathAnalysis, setPathAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [viewSettings, setViewSettings] = useState({
    showLabels: true,
    nodeSize: 'citations',
    linkStrength: 'medium',
    colorBy: 'type'
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchNetworkData();
  }, [user, router]);

  const fetchNetworkData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/citation-network`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNetworkData(data);
      }
    } catch (error) {
      console.error('Error fetching network data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzePath = async (sourceId: string, targetId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/citation-network/path`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sourceId, targetId })
      });

      if (response.ok) {
        const data = await response.json();
        setPathAnalysis(data);
      }
    } catch (error) {
      console.error('Error analyzing path:', error);
    }
  };

  const exportNetwork = async (format: 'json' | 'graphml' | 'csv') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/citation-network/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `citation-network.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting network:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading citation network...</div>
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
              <h1 className="text-xl font-semibold text-white">Citation Network</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>
              
              <div className="relative group">
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={() => exportNetwork('json')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => exportNetwork('graphml')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Export as GraphML
                  </button>
                  <button
                    onClick={() => exportNetwork('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Export as CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-4rem)] relative">
        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700 p-6 z-20 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Visualization Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Node Size
                </label>
                <select
                  value={viewSettings.nodeSize}
                  onChange={(e) => setViewSettings({ ...viewSettings, nodeSize: e.target.value })}
                  className="glass-input"
                >
                  <option value="uniform">Uniform</option>
                  <option value="citations">By Citations</option>
                  <option value="connections">By Connections</option>
                  <option value="importance">By Importance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Color By
                </label>
                <select
                  value={viewSettings.colorBy}
                  onChange={(e) => setViewSettings({ ...viewSettings, colorBy: e.target.value })}
                  className="glass-input"
                >
                  <option value="type">Document Type</option>
                  <option value="date">Publication Date</option>
                  <option value="cluster">Topic Cluster</option>
                  <option value="author">Author</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Link Strength
                </label>
                <select
                  value={viewSettings.linkStrength}
                  onChange={(e) => setViewSettings({ ...viewSettings, linkStrength: e.target.value })}
                  className="glass-input"
                >
                  <option value="weak">Weak</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewSettings.showLabels}
                    onChange={(e) => setViewSettings({ ...viewSettings, showLabels: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-white">Show Labels</span>
                </label>
              </div>
            </div>
            
            {/* Node Details */}
            {selectedNode && (
              <div className="mt-8 pt-8 border-t border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">Selected Node</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Title</p>
                    <p className="text-white">{selectedNode.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Type</p>
                    <p className="text-white">{selectedNode.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Citations</p>
                    <p className="text-white">{selectedNode.citations || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Connections</p>
                    <p className="text-white">{selectedNode.connections || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Network Visualization */}
        <div className={`h-full ${showSettings ? 'mr-80' : ''}`}>
          {networkData ? (
            <CitationNetwork
              data={networkData}
              settings={viewSettings}
              onNodeSelect={setSelectedNode}
              onPathAnalyze={analyzePath}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <DocumentTextIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No citation data available</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Path Analysis Modal */}
        {pathAnalysis && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
            <div className="glass-card max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Path Analysis</h3>
                <button
                  onClick={() => setPathAnalysis(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Shortest Path Length</p>
                  <p className="text-2xl font-bold text-white">{pathAnalysis.length} steps</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 mb-2">Path</p>
                  <div className="space-y-2">
                    {pathAnalysis.path?.map((node: any, index: number) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-xs text-purple-400">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-white">{node.title}</p>
                          <p className="text-xs text-gray-400">{node.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 mb-2">Key Connections</p>
                  <div className="flex flex-wrap gap-2">
                    {pathAnalysis.keyConnections?.map((conn: string, index: number) => (
                      <span key={index} className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-300">
                        {conn}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}