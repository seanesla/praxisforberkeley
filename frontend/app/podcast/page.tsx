'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { PodcastInterface } from '@/components/podcast/PodcastInterface';
import { 
  MicrophoneIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

export default function PodcastPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInterface, setShowInterface] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDocument = (doc: any) => {
    setSelectedDocument(doc);
    setShowInterface(true);
  };

  const handleBack = () => {
    if (showInterface) {
      setShowInterface(false);
      setSelectedDocument(null);
    } else {
      router.push('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                data-testid="back-button"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <Logo size="sm" />
              <h1 className="text-xl font-semibold text-white">Interactive Podcast Mode</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showInterface ? (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center py-12">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <MicrophoneIcon className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Start a Voice Conversation
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Select a document to discuss with AI in a natural, conversational way. 
                Use voice or text input to explore topics, ask questions, and deepen your understanding.
              </p>
            </div>

            {/* Document Selection */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Select a Document to Discuss
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc)}
                      className="glass-card hover:bg-gray-700 transition-all text-left group"
                      data-testid="document-option"
                    >
                      <div className="flex items-start gap-3">
                        <DocumentTextIcon className="w-6 h-6 text-gray-400 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{doc.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <DocumentTextIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No documents found</p>
                    <button
                      onClick={() => router.push('/dashboard/documents/upload')}
                      className="mt-4 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Upload a document
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Start Without Document */}
            <div className="text-center">
              <button
                onClick={() => setShowInterface(true)}
                className="text-gray-400 hover:text-white transition-colors"
                data-testid="start-without-document"
              >
                Or start a general conversation →
              </button>
            </div>
          </div>
        ) : (
          <PodcastInterface
            document={selectedDocument}
            onEnd={() => handleBack()}
          />
        )}
      </main>
    </div>
  );
}