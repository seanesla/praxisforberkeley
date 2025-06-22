'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { mindmapsApi } from '@/lib/api/mindmaps';
import { documentsApi } from '@/lib/api/documents';
import { MindMapData } from '@/types';
import { ArrowLeftIcon, CheckIcon, SparklesIcon, DocumentTextIcon, FolderOpenIcon } from '@heroicons/react/24/outline';
import type { Document } from '@/lib/api/documents';
import { DocumentSelector } from '@/components/documents/DocumentSelector';

export default function NewMindMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams.get('document');
  
  const [title, setTitle] = useState('');
  const [rootNodeText, setRootNodeText] = useState('');
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [generationMode, setGenerationMode] = useState<'manual' | 'ai'>(documentId ? 'ai' : 'manual');
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);

  // Load document if documentId is provided
  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    }
  }, [documentId]);

  const loadDocument = async (docId: string) => {
    setLoadingDocument(true);
    try {
      const doc = await documentsApi.getDocument(docId);
      if (doc) {
        setSelectedDocument(doc);
        setTitle(`Mind Map: ${doc.title}`);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      // If document not found, switch to manual mode
      setGenerationMode('manual');
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!selectedDocument) return;

    setGenerating(true);
    try {
      const generatedMindMap = await mindmapsApi.generateFromDocument(selectedDocument.id);
      
      // Navigate to the generated mind map
      router.push(`/dashboard/mindmaps/${generatedMindMap.id}`);
    } catch (error) {
      console.error('Error generating mind map:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate mind map. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
    setTitle(`Mind Map: ${doc.title}`);
    setGenerationMode('ai');
    setShowDocumentSelector(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !rootNodeText.trim()) return;

    setCreating(true);
    try {
      // Create initial mind map structure with simple format for backend
      const rootId = uuidv4();
      const simpleData = {
        id: rootId,
        text: rootNodeText,
        // Store the full structure as metadata
        metadata: {
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
        }
      };

      const newMindMap = await mindmapsApi.createMindMap(title, simpleData);
      
      // Navigate to the new mind map
      router.push(`/dashboard/mindmaps/${newMindMap.id}`);
    } catch (error) {
      // Using console.error which is allowed by ESLint
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

        {/* Loading Document */}
        {loadingDocument && (
          <div className="glass rounded-xl p-8 mb-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              <span className="ml-3">Loading document...</span>
            </div>
          </div>
        )}

        {/* Document Selection (if document provided) */}
        {selectedDocument && !loadingDocument && (
          <div className="glass rounded-xl p-6 mb-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              Selected Document
            </h2>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-medium">{selectedDocument.title}</h3>
              <p className="text-sm text-gray-400 mt-1">
                {selectedDocument.file_type} • {new Date(selectedDocument.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Generation Mode Selection */}
        {selectedDocument && !loadingDocument && (
          <div className="glass rounded-xl p-6 mb-6">
            <h2 className="font-semibold mb-4">How would you like to create your mind map?</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setGenerationMode('ai')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  generationMode === 'ai'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <SparklesIcon className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                <h3 className="font-medium">Generate with AI</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Let AI analyze your document and create a mind map automatically
                </p>
              </button>
              
              <button
                onClick={() => setGenerationMode('manual')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  generationMode === 'manual'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                <h3 className="font-medium">Create Manually</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Start with a central topic and build your mind map yourself
                </p>
              </button>
            </div>
          </div>
        )}

        {/* AI Generation */}
        {generationMode === 'ai' && selectedDocument && (
          <div className="glass rounded-xl p-8 space-y-6">
            <div className="text-center">
              <SparklesIcon className="h-16 w-16 mx-auto mb-4 text-purple-400" />
              <h2 className="text-xl font-semibold mb-2">Generate Mind Map with AI</h2>
              <p className="text-gray-400 mb-6">
                AI will analyze your document and create a comprehensive mind map with key concepts, 
                relationships, and hierarchical structure.
              </p>
              
              <button
                onClick={handleGenerateWithAI}
                disabled={generating}
                className="inline-flex items-center gap-2 px-8 py-3 
                         bg-gradient-to-r from-purple-500 to-pink-500 
                         hover:from-purple-600 hover:to-pink-600 
                         disabled:from-gray-600 disabled:to-gray-600 
                         disabled:cursor-not-allowed rounded-lg transition-all duration-200"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Generating Mind Map...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Generate Mind Map
                  </>
                )}
              </button>
              
              {generating && (
                <p className="text-sm text-gray-400 mt-4">
                  This may take a few moments as AI analyzes your document...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Document Selector Modal */}
        {showDocumentSelector && (
          <div className="glass rounded-xl p-6 mb-6">
            <h2 className="font-semibold mb-4">Select a Document</h2>
            <DocumentSelector 
              onSelect={handleDocumentSelect}
              selectedId={selectedDocument?.id}
            />
            <button
              onClick={() => setShowDocumentSelector(false)}
              className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Manual Creation Form */}
        {(generationMode === 'manual' || !selectedDocument) && !showDocumentSelector && (
          <div className="glass rounded-xl p-8 space-y-6">
            {/* Option to select document */}
            {!selectedDocument && (
              <div className="text-center pb-6 border-b border-white/10">
                <button
                  onClick={() => setShowDocumentSelector(true)}
                  className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <FolderOpenIcon className="h-5 w-5" />
                  Select a document to generate from
                </button>
              </div>
            )}
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
        )}

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