'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { SmartNoteEditor } from '@/components/notes/SmartNoteEditor';
import { DocumentSelector } from '@/components/notes/DocumentSelector';
import {
  SparklesIcon,
  DocumentTextIcon,
  BookmarkIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

export default function NewNotePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSmart = searchParams.get('smart') === 'true';
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && content && title) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveNote(true);
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, title, autoSaveEnabled]);

  const saveNote = async (isAutoSave = false) => {
    if (!title.trim()) return;
    
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          content,
          tags,
          documentIds: selectedDocuments,
          isSmartNote: isSmart
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!isAutoSave) {
          router.push(`/notes/${data.note.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Logo size="sm" />
              <nav className="flex items-center gap-6">
                <button
                  onClick={() => router.push('/notes')}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  ← Back to Notes
                </button>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Auto-save indicator */}
              {autoSaveEnabled && content && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CloudArrowUpIcon className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Saved'}</span>
                </div>
              )}
              
              <button
                onClick={() => saveNote(false)}
                disabled={!title.trim() || isSaving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Editor Section */}
          <div className="lg:col-span-2">
            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full text-3xl font-bold bg-transparent text-white placeholder-gray-500 outline-none mb-6"
              autoFocus
            />

            {/* Tags */}
            <div className="mb-6">
              <TagInput
                tags={tags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
              />
            </div>

            {/* Smart Note Indicator */}
            {isSmart && (
              <div className="glass-card mb-6 bg-purple-600/10 border-purple-600/20">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Smart Note Enabled</p>
                    <p className="text-xs text-gray-400">
                      AI will suggest relevant content as you type
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Editor */}
            <SmartNoteEditor
              content={content}
              onChange={setContent}
              selectedDocuments={selectedDocuments}
              isSmartNote={isSmart}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Document Selector */}
            {isSmart && (
              <div className="glass-card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  Link Documents
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Select documents to pull context from
                </p>
                <DocumentSelector
                  selectedDocuments={selectedDocuments}
                  onSelectionChange={setSelectedDocuments}
                />
              </div>
            )}

            {/* Note Settings */}
            <div className="glass-card">
              <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Auto-save</span>
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>

            {/* Tips */}
            <div className="glass-card bg-blue-600/10 border-blue-600/20">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">💡 Tips</h3>
              <ul className="text-xs text-gray-400 space-y-2">
                {isSmart ? (
                  <>
                    <li>• Pause typing to see AI suggestions</li>
                    <li>• Press Tab to accept suggestions</li>
                    <li>• Link documents for better context</li>
                  </>
                ) : (
                  <>
                    <li>• Use ## for headings</li>
                    <li>• Use **text** for bold</li>
                    <li>• Use - for bullet points</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Tag Input Component
function TagInput({ tags, onAddTag, onRemoveTag }: {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onAddTag(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <BookmarkIcon className="w-4 h-4 text-gray-400" />
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
          >
            {tag}
            <button
              onClick={() => onRemoveTag(tag)}
              className="hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          className="flex-1 min-w-[100px] bg-transparent text-sm text-white placeholder-gray-500 outline-none"
        />
      </div>
    </div>
  );
}