'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { SocraticDialogue } from '@/components/socratic/SocraticDialogue';
import { 
  AcademicCapIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

export default function SocraticPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialogue, setShowDialogue] = useState(false);
  
  const topics = [
    { id: 'understand', name: 'Deep Understanding', description: 'Explore concepts through questions' },
    { id: 'apply', name: 'Application', description: 'Learn how to apply knowledge' },
    { id: 'analyze', name: 'Critical Analysis', description: 'Analyze and evaluate ideas' },
    { id: 'connect', name: 'Make Connections', description: 'Connect ideas across topics' },
    { id: 'create', name: 'Creative Thinking', description: 'Generate new ideas and solutions' }
  ];

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

  const handleStartDialogue = () => {
    if (selectedDocument && selectedTopic) {
      setShowDialogue(true);
    }
  };

  const handleBack = () => {
    if (showDialogue) {
      setShowDialogue(false);
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
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <Logo size="sm" />
              <h1 className="text-xl font-semibold text-white">Socratic Dialogue Method</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showDialogue ? (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <QuestionMarkCircleIcon className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Learn Through Guided Questions
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                The Socratic method helps you understand concepts deeply through a series of 
                thoughtful questions. Select a document and learning goal to begin your journey.
              </p>
            </div>

            {/* Document Selection */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                1. Select a Document to Study
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className={`glass-card hover:bg-gray-700 transition-all text-left group ${
                        selectedDocument?.id === doc.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      data-testid={`document-${doc.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <DocumentTextIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{doc.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedDocument?.id === doc.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <DocumentTextIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No documents found</p>
                    <button
                      onClick={() => router.push('/dashboard/documents/upload')}
                      className="mt-4 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Upload a document
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Topic Selection */}
            {selectedDocument && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-semibold text-white mb-4">
                  2. Choose Your Learning Goal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`glass-card hover:bg-gray-700 transition-all text-left ${
                        selectedTopic === topic.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      data-testid={`topic-${topic.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <AcademicCapIcon className="w-6 h-6 text-blue-400 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-white">{topic.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
                        </div>
                        {selectedTopic === topic.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Button */}
            {selectedDocument && selectedTopic && (
              <div className="text-center animate-fade-in">
                <button
                  onClick={handleStartDialogue}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105"
                  data-testid="start-dialogue"
                >
                  Start Socratic Dialogue
                </button>
              </div>
            )}
          </div>
        ) : (
          <SocraticDialogue
            document={selectedDocument}
            topic={selectedTopic}
            onEnd={handleBack}
          />
        )}
      </main>
    </div>
  );
}