'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DocumentTextIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Document {
  id: string;
  title: string;
  type: string;
  size: string;
  updatedAt: Date;
  preview?: string;
}

export function RecentDocuments() {
  const router = useRouter();
  const [documents] = useState<Document[]>([
    {
      id: '1',
      title: 'Machine Learning Fundamentals.pdf',
      type: 'PDF',
      size: '2.4 MB',
      updatedAt: new Date(Date.now() - 1000 * 60 * 30),
      preview: 'Introduction to neural networks and deep learning concepts...'
    },
    {
      id: '2',
      title: 'Project Proposal.docx',
      type: 'DOCX',
      size: '156 KB',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      preview: 'Proposal for implementing AI-driven analytics platform...'
    },
    {
      id: '3',
      title: 'Research Notes.md',
      type: 'Markdown',
      size: '45 KB',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      preview: 'Key findings from literature review on transformer models...'
    },
    {
      id: '4',
      title: 'Data Analysis Results.json',
      type: 'JSON',
      size: '890 KB',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      preview: 'Statistical analysis of user behavior patterns...'
    }
  ]);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const getFileIcon = (type: string) => {
    const colors: Record<string, string> = {
      PDF: 'text-red-400',
      DOCX: 'text-blue-400',
      Markdown: 'text-green-400',
      JSON: 'text-yellow-400'
    };
    return colors[type] || 'text-gray-400';
  };

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Recent Documents</h2>
        <button
          onClick={() => router.push('/documents')}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          View all
        </button>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="group relative bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => router.push(`/documents/${doc.id}`)}
          >
            <div className="flex items-start gap-4">
              {/* File icon */}
              <div className={`flex-shrink-0 ${getFileIcon(doc.type)}`}>
                <DocumentTextIcon className="w-10 h-10" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white truncate">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{doc.type}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(doc.updatedAt, { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Actions menu */}
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

                    {menuOpen === doc.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Generate summary');
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <SparklesIcon className="w-4 h-4" />
                          Generate Summary
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Edit');
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Download');
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          Download
                        </button>
                        <hr className="my-1 border-gray-700" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Delete');
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {doc.preview && (
                  <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                    {doc.preview}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}