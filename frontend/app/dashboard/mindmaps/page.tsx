'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MindMapList from '@/components/mindmaps/MindMapList';
import { mindmapsApi } from '@/lib/api/mindmaps';
import { MindMap, Document } from '@/types';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  SparklesIcon,
  DocumentTextIcon,
  MapIcon
} from '@heroicons/react/24/outline';

export default function MindMapsPage() {
  const router = useRouter();
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('Loading mind maps data...');
    try {
      // Fetch mind maps
      const maps = await mindmapsApi.getMindMaps();
      setMindMaps(maps);
      console.log('Loaded mind maps:', maps);

      // Fetch documents for generation
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await mindmapsApi.deleteMindMap(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting mind map:', error);
    }
  };

  const handleGenerateFromDocument = async () => {
    if (!selectedDocument) return;

    setGenerating(true);
    try {
      const newMindMap = await mindmapsApi.generateFromDocument(selectedDocument);
      console.log('Generated mind map:', newMindMap);
      
      // Navigate to the new mind map
      router.push(`/dashboard/mindmaps/${newMindMap.id}`);
    } catch (error) {
      console.error('Error generating mind map:', error);
      alert('Failed to generate mind map. Please try again.');
    } finally {
      setGenerating(false);
      setShowCreateModal(false);
    }
  };

  const handleCreateBlank = () => {
    router.push('/dashboard/mindmaps/new');
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <MapIcon className="h-7 w-7 text-purple-400" />
              Mind Maps
            </h1>
            <p className="text-gray-400 mt-1">Visualize your ideas and connections</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 
                     hover:from-purple-600 hover:to-blue-600 rounded-lg transition-all duration-200"
        >
          <PlusIcon className="h-5 w-5" />
          Create Mind Map
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Mind Maps</p>
              <p className="text-2xl font-semibold mt-1">{mindMaps.length}</p>
            </div>
            <MapIcon className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Nodes</p>
              <p className="text-2xl font-semibold mt-1">
                {mindMaps.reduce((acc, map) => acc + (map.data?.nodes?.length || 0), 0)}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-blue-500" />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">From Documents</p>
              <p className="text-2xl font-semibold mt-1">
                {mindMaps.filter(m => m.document_id).length}
              </p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Mind Maps List */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-medium mb-4">Your Mind Maps</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <MindMapList
            mindMaps={mindMaps}
            onDelete={handleDelete}
            onRefresh={loadData}
          />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Create New Mind Map</h2>
            
            <div className="space-y-4">
              {/* Generate from Document */}
              <div className="glass rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-purple-400" />
                  Generate from Document
                </h3>
                
                {documents.length > 0 ? (
                  <>
                    <select
                      value={selectedDocument}
                      onChange={(e) => setSelectedDocument(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg mb-3"
                    >
                      <option value="">Select a document...</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.title}
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={handleGenerateFromDocument}
                      disabled={!selectedDocument || generating}
                      className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 
                               disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {generating ? 'Generating...' : 'Generate Mind Map'}
                    </button>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">
                    No documents available. Upload a document first to generate a mind map.
                  </p>
                )}
              </div>

              {/* Create Blank */}
              <div className="glass rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <PlusIcon className="h-5 w-5 text-blue-400" />
                  Start from Scratch
                </h3>
                <button
                  onClick={handleCreateBlank}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                >
                  Create Blank Mind Map
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-6 w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}