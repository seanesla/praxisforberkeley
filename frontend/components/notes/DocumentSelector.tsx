'use client';

import { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  title: string;
  file_type: string;
}

interface DocumentSelectorProps {
  selectedDocuments: string[];
  onSelectionChange: (selected: string[]) => void;
}

export function DocumentSelector({ selectedDocuments, onSelectionChange }: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDocument = (documentId: string) => {
    if (selectedDocuments.includes(documentId)) {
      onSelectionChange(selectedDocuments.filter(id => id !== documentId));
    } else {
      onSelectionChange([...selectedDocuments, documentId]);
    }
  };

  const getFileIcon = (type: string) => {
    const colors: Record<string, string> = {
      'application/pdf': 'text-red-400',
      'text/plain': 'text-gray-400',
      'text/markdown': 'text-green-400',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'text-blue-400',
      'application/json': 'text-yellow-400'
    };
    return colors[type] || 'text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-4">
        <DocumentTextIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No documents available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => toggleDocument(doc.id)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
            selectedDocuments.includes(doc.id)
              ? 'bg-purple-600/20 border border-purple-600/50'
              : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
          }`}
        >
          <DocumentTextIcon className={`w-5 h-5 ${getFileIcon(doc.file_type)} flex-shrink-0`} />
          <span className="flex-1 text-left text-sm text-white truncate">
            {doc.title}
          </span>
          {selectedDocuments.includes(doc.id) && (
            <CheckIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}