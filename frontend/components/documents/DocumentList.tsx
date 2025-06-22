'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DocumentTextIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  SparklesIcon,
  ChartBarIcon,
  ShareIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Document {
  id: string;
  title: string;
  content: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  embeddings_generated: boolean;
}

interface DocumentListProps {
  documents: Document[];
  viewMode: 'grid' | 'list';
  onRefresh: () => void;
}

export function DocumentList({ documents, viewMode, onRefresh }: DocumentListProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);

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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setDeleteModalOpen(null);
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleAction = async (action: string, document: Document) => {
    setMenuOpen(null);
    
    switch (action) {
      case 'view':
        router.push(`/documents/${document.id}`);
        break;
      case 'summarize':
        router.push(`/documents/${document.id}?action=summarize`);
        break;
      case 'flashcards':
        router.push(`/flashcards/generate?document=${document.id}`);
        break;
      case 'mindmap':
        router.push(`/mindmaps/new?document=${document.id}`);
        break;
      case 'download':
        // TODO: Implement download
        break;
      case 'share':
        // TODO: Implement share
        break;
      case 'delete':
        setDeleteModalOpen(document.id);
        break;
    }
  };

  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="glass-card hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group"
              onClick={() => router.push(`/documents/${doc.id}`)}
            >
              {/* Document Icon & Type */}
              <div className="flex items-start justify-between mb-4">
                <div className={`${getFileIcon(doc.file_type)}`}>
                  <DocumentTextIcon className="w-12 h-12" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {getFileExtension(doc.file_name)}
                  </span>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === doc.id ? null : doc.id);
                      }}
                      className="p-1 rounded hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
                    </button>

                    {/* Action Menu */}
                    {menuOpen === doc.id && (
                      <DocumentActionMenu
                        document={doc}
                        onAction={handleAction}
                        onClose={() => setMenuOpen(null)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-2 truncate">
                {doc.title}
              </h3>

              {/* Preview */}
              <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                {doc.content.substring(0, 150)}...
              </p>

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatFileSize(doc.file_size)}</span>
                <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
              </div>

              {/* AI Status */}
              {doc.embeddings_generated && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <SparklesIcon className="w-4 h-4" />
                    <span>AI-Ready</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <DeleteConfirmationModal
            onConfirm={() => handleDelete(deleteModalOpen)}
            onCancel={() => setDeleteModalOpen(null)}
          />
        )}
      </>
    );
  }

  // List View
  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="glass-card hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group"
            onClick={() => router.push(`/documents/${doc.id}`)}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 ${getFileIcon(doc.file_type)}`}>
                <DocumentTextIcon className="w-10 h-10" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white truncate">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    {doc.embeddings_generated && (
                      <SparklesIcon className="w-4 h-4 text-green-400" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === doc.id ? null : doc.id);
                      }}
                      className="p-1 rounded hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                  <span>{getFileExtension(doc.file_name)}</span>
                  <span>•</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Action Menu */}
              {menuOpen === doc.id && (
                <DocumentActionMenu
                  document={doc}
                  onAction={handleAction}
                  onClose={() => setMenuOpen(null)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <DeleteConfirmationModal
          onConfirm={() => handleDelete(deleteModalOpen)}
          onCancel={() => setDeleteModalOpen(null)}
        />
      )}
    </>
  );
}

// Action Menu Component
function DocumentActionMenu({ document, onAction, onClose }: {
  document: Document;
  onAction: (action: string, document: Document) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-10">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction('view', document);
        }}
        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
      >
        <EyeIcon className="w-4 h-4" />
        View Document
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction('summarize', document);
        }}
        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
      >
        <SparklesIcon className="w-4 h-4" />
        Generate Summary
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction('flashcards', document);
        }}
        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
      >
        <ChartBarIcon className="w-4 h-4" />
        Create Flashcards
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction('mindmap', document);
        }}
        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
      >
        <ShareIcon className="w-4 h-4" />
        Generate Mind Map
      </button>
      <hr className="my-1 border-gray-700" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction('download', document);
        }}
        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        Download
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction('delete', document);
        }}
        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
      >
        <TrashIcon className="w-4 h-4" />
        Delete
      </button>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmationModal({ onConfirm, onCancel }: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-800 rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-white mb-2">Delete Document?</h3>
        <p className="text-gray-400 mb-6">
          This action cannot be undone. The document and all associated data will be permanently deleted.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}