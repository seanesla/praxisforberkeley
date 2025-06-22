'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon, DocumentTextIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { documentsApi } from '@/lib/api/documents';
import type { Document } from '@/lib/api/documents';

export default function DocumentViewPage() {
  const router = useRouter();
  const params = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      loadDocument(params.id as string);
    }
  }, [params?.id]);

  const loadDocument = async (documentId: string) => {
    try {
      const doc = await documentsApi.getDocument(documentId);
      if (doc) {
        setDocument(doc);
      } else {
        setError('Document not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!document || !document.file_url) return;
    
    // Create a temporary link and click it
    const a = document.createElement('a');
    a.href = document.file_url;
    a.download = document.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async () => {
    if (!document || !confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const success = await documentsApi.deleteDocument(document.id);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Failed to delete document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Dashboard
          </button>
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
            <p className="text-red-400">{error || 'Document not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3">
            {document.file_url && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
              Delete
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-start gap-4 mb-6">
            <DocumentTextIcon className="h-8 w-8 text-purple-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{document.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Type: {document.file_type}</span>
                {document.file_size && (
                  <span>Size: {formatFileSize(document.file_size)}</span>
                )}
                <span>Created: {new Date(document.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Document Content/Preview */}
          <div className="border-t border-gray-700 pt-6">
            {document.content ? (
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-300">
                  {document.content}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No content preview available</p>
                {document.file_url && (
                  <p className="text-sm mt-2">Download the file to view its contents</p>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t border-gray-700 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Document ID:</span>
              <p className="font-mono text-xs mt-1">{document.id}</p>
            </div>
            <div>
              <span className="text-gray-400">Last Updated:</span>
              <p className="mt-1">{new Date(document.updated_at).toLocaleString()}</p>
            </div>
            {document.embeddings_generated !== undefined && (
              <div>
                <span className="text-gray-400">Embeddings:</span>
                <p className="mt-1">
                  {document.embeddings_generated ? (
                    <span className="text-green-400">✓ Generated</span>
                  ) : (
                    <span className="text-yellow-400">⚠ Not generated</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Create from this document</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/dashboard/flashcards?documentId=${document.id}`)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-sm"
              >
                Generate Flashcards
              </button>
              <button
                onClick={() => router.push(`/notes/new?documentId=${document.id}`)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-sm"
              >
                Create Note
              </button>
              <button
                onClick={() => router.push(`/dashboard/mindmaps/new?documentId=${document.id}`)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-sm"
              >
                Create Mind Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}