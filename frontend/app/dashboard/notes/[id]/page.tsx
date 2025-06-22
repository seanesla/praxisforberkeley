'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  document_ids: string[];
  is_smart_note: boolean;
  created_at: string;
  updated_at: string;
  linked_documents?: Array<{ id: string; title: string }>;
}

export default function NoteViewPage() {
  const router = useRouter();
  const params = useParams();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (params?.id) {
      loadNote(params.id as string);
    }
  }, [params?.id]);

  const loadNote = async (noteId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/notes/${noteId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load note');
      }

      const data = await response.json();
      setNote(data.note);
      setTitle(data.note.title);
      setContent(data.note.content);
      setTags(data.note.tags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!note) return;
    
    setIsSaving(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/notes/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          title,
          content,
          tags
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      const data = await response.json();
      setNote(data.note);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/notes/${note.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
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
            <p className="text-red-400">{error || 'Note not found'}</p>
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
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Note Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {isEditing ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-2xl font-bold bg-gray-700 rounded-lg px-4 py-2 mb-4"
                placeholder="Note title..."
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[400px] bg-gray-700 rounded-lg px-4 py-2 resize-y"
                placeholder="Write your note..."
              />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-4">{note.title}</h1>
              {note.is_smart_note && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm mb-4">
                  <span className="text-xs">✨</span>
                  Smart Note
                </div>
              )}
              <div className="whitespace-pre-wrap text-gray-300">{note.content}</div>
            </>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Linked Documents */}
          {note.linked_documents && note.linked_documents.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Linked Documents</h3>
              <div className="space-y-2">
                {note.linked_documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => router.push(`/dashboard/documents/${doc.id}`)}
                    className="block w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {doc.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Metadata */}
          <div className="mt-6 pt-6 border-t border-gray-700 text-sm text-gray-400">
            <p>Created: {new Date(note.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(note.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}