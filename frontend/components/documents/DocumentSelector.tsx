'use client';

import { useState, useEffect } from 'react';
import { DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { documentsApi } from '@/lib/api/documents';
import type { Document } from '@/lib/api/documents';

interface DocumentSelectorProps {
  onSelect: (document: Document) => void;
  selectedId?: string;
}

export function DocumentSelector({ onSelect, selectedId }: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await documentsApi.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFileTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'application/pdf': 'text-red-400',
      'text/plain': 'text-gray-400',
      'text/markdown': 'text-green-400',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'text-blue-400',
      'application/json': 'text-yellow-400'
    };
    return colors[type] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Document List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredDocuments.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            {searchTerm ? 'No documents found matching your search.' : 'No documents available.'}
          </p>
        ) : (
          filteredDocuments.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onSelect(doc)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedId === doc.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <DocumentTextIcon className={`h-6 w-6 ${getFileTypeColor(doc.file_type)} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <h4 className="font-medium">{doc.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    {doc.file_type.split('/').pop()} • {formatDate(doc.created_at)}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}