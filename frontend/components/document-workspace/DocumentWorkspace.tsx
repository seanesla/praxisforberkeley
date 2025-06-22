'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast';
import { 
  DocumentTextIcon,
  XMarkIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  title: string;
  content: string;
}

interface WorkspaceDocument {
  document: Document;
  position: number;
  scrollPosition: number;
  zoomLevel: number;
}

interface WorkspaceConfig {
  id?: string;
  name: string;
  layout_type: 'split' | 'tabs' | 'grid';
  sync_scrolling: boolean;
  sync_selection: boolean;
  open_documents: WorkspaceDocument[];
  active_document_id?: string;
}

export function DocumentWorkspace() {
  const [config, setConfig] = useState<WorkspaceConfig>({
    name: 'New Workspace',
    layout_type: 'split',
    sync_scrolling: true,
    sync_selection: false,
    open_documents: []
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load documents');

      const data = await response.json();
      setAvailableDocuments(data.documents);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const addDocument = (doc: Document) => {
    if (config.open_documents.find(d => d.document.id === doc.id)) {
      toast.error('Document already open');
      return;
    }

    const workspaceDoc: WorkspaceDocument = {
      document: doc,
      position: config.open_documents.length,
      scrollPosition: 0,
      zoomLevel: 100
    };

    setConfig({
      ...config,
      open_documents: [...config.open_documents, workspaceDoc],
      active_document_id: doc.id
    });
  };

  const removeDocument = (docId: string) => {
    setConfig({
      ...config,
      open_documents: config.open_documents.filter(d => d.document.id !== docId)
    });
  };

  const handleScroll = (docId: string, event: React.UIEvent<HTMLDivElement>) => {
    if (!config.sync_scrolling) return;

    const scrollTop = event.currentTarget.scrollTop;
    const scrollPercentage = scrollTop / event.currentTarget.scrollHeight;

    // Sync scroll to other documents
    config.open_documents.forEach(doc => {
      if (doc.document.id !== docId) {
        const otherRef = scrollRefs.current.get(doc.document.id);
        if (otherRef) {
          otherRef.scrollTop = scrollPercentage * otherRef.scrollHeight;
        }
      }
    });
  };

  const saveWorkspace = async () => {
    try {
      const response = await fetch('/api/document-workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Failed to save workspace');

      const data = await response.json();
      setConfig({ ...config, id: data.workspace.id });
      toast.success('Workspace saved successfully');
    } catch (error) {
      console.error('Error saving workspace:', error);
      toast.error('Failed to save workspace');
    }
  };

  const renderDocument = (workspaceDoc: WorkspaceDocument) => (
    <div
      key={workspaceDoc.document.id}
      className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col ${
        config.layout_type === 'grid' ? 'h-full' : ''
      }`}
    >
      {/* Document Header */}
      <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <DocumentTextIcon className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm text-white font-medium truncate max-w-[200px]">
            {workspaceDoc.document.title}
          </span>
        </div>
        <button
          onClick={() => removeDocument(workspaceDoc.document.id)}
          className="text-gray-400 hover:text-white"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Document Content */}
      <div
        ref={(el) => {
          if (el) scrollRefs.current.set(workspaceDoc.document.id, el);
        }}
        onScroll={(e) => handleScroll(workspaceDoc.document.id, e)}
        className="flex-1 overflow-y-auto p-4"
        style={{ zoom: `${workspaceDoc.zoomLevel}%` }}
      >
        <div className="prose prose-invert max-w-none">
          {workspaceDoc.document.content}
        </div>
      </div>
    </div>
  );

  const renderLayout = () => {
    if (config.open_documents.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p>No documents open</p>
            <p className="text-sm mt-2">Select documents from the sidebar to begin</p>
          </div>
        </div>
      );
    }

    switch (config.layout_type) {
      case 'split':
        return (
          <div className="grid grid-cols-2 gap-4 h-full">
            {config.open_documents.slice(0, 2).map(renderDocument)}
          </div>
        );
      
      case 'tabs':
        const activeDoc = config.open_documents.find(
          d => d.document.id === config.active_document_id
        ) || config.open_documents[0];
        
        return (
          <div className="h-full flex flex-col">
            <div className="flex border-b border-gray-800">
              {config.open_documents.map(doc => (
                <button
                  key={doc.document.id}
                  onClick={() => setConfig({ ...config, active_document_id: doc.document.id })}
                  className={`px-4 py-2 text-sm ${
                    doc.document.id === activeDoc.document.id
                      ? 'bg-gray-800 text-white border-b-2 border-purple-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {doc.document.title}
                </button>
              ))}
            </div>
            <div className="flex-1">
              {renderDocument(activeDoc)}
            </div>
          </div>
        );
      
      case 'grid':
        return (
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
            {config.open_documents.slice(0, 4).map(renderDocument)}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Documents</h3>
        
        {/* Layout Controls */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block">Layout</label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={config.layout_type === 'split' ? 'default' : 'outline'}
              onClick={() => setConfig({ ...config, layout_type: 'split' })}
            >
              <ViewColumnsIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={config.layout_type === 'tabs' ? 'default' : 'outline'}
              onClick={() => setConfig({ ...config, layout_type: 'tabs' })}
            >
              <RectangleStackIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={config.layout_type === 'grid' ? 'default' : 'outline'}
              onClick={() => setConfig({ ...config, layout_type: 'grid' })}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sync Options */}
        <div className="mb-6 space-y-2">
          <button
            onClick={() => setConfig({ ...config, sync_scrolling: !config.sync_scrolling })}
            className={`w-full flex items-center justify-between p-2 rounded text-sm ${
              config.sync_scrolling ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400'
            }`}
          >
            <span className="flex items-center">
              <ArrowsRightLeftIcon className="w-4 h-4 mr-2" />
              Sync Scrolling
            </span>
            {config.sync_scrolling ? (
              <LockClosedIcon className="w-4 h-4" />
            ) : (
              <LockOpenIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Save Workspace */}
        <Button
          size="sm"
          onClick={saveWorkspace}
          className="w-full mb-6"
        >
          Save Workspace
        </Button>

        {/* Document List */}
        <div className="space-y-2">
          {availableDocuments.map(doc => (
            <div
              key={doc.id}
              onClick={() => addDocument(doc)}
              className={`p-2 rounded cursor-pointer transition-colors ${
                config.open_documents.find(d => d.document.id === doc.id)
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <p className="text-sm truncate">{doc.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 p-4">
        {renderLayout()}
      </div>
    </div>
  );
}