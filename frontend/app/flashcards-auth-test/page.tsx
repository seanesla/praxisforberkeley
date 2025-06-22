'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function FlashcardsAuthTestPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('testuser@example.com');
  const [password, setPassword] = useState('testpass123');
  const [documents, setDocuments] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Login function
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      const authToken = data.token;
      
      localStorage.setItem('auth_token', authToken);
      setToken(authToken);
      setIsAuthenticated(true);
      
      console.log('Login successful:', data);
    } catch (err: any) {
      setError(err.message);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const handleRegister = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          name: 'Test User'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      console.log('Registration successful:', data);
      
      // Auto-login after registration
      await handleLogin();
    } catch (err: any) {
      setError(err.message);
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create test document
  const createTestDocument = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'React Fundamentals',
          content: `React is a JavaScript library for building user interfaces. 
          
Key Concepts:
1. Components: Reusable pieces of UI that can be functional or class-based
2. Props: Data passed from parent to child components
3. State: Internal data managed by a component
4. Hooks: Functions that let you use state and other React features in functional components
5. Virtual DOM: React's representation of the UI in memory
6. JSX: Syntax extension that allows writing HTML-like code in JavaScript
7. Event Handling: Managing user interactions with onClick, onChange, etc.
8. Conditional Rendering: Showing different UI based on conditions
9. Lists and Keys: Rendering multiple elements efficiently
10. Lifecycle Methods: Methods that run at specific times in a component's life`,
          type: 'text'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const data = await response.json();
      console.log('Document created:', data);
      await fetchDocuments();
      return data.document;
    } catch (err: any) {
      setError(err.message);
      console.error('Document creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.documents || []);
      console.log('Documents fetched:', data.documents);
    } catch (err: any) {
      console.error('Fetch documents error:', err);
    }
  };

  // Generate flashcards
  const generateFlashcards = async (documentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/flashcards/generate/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ numCards: 5 })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }

      const data = await response.json();
      console.log('Flashcards generated:', data);
      await fetchFlashcards();
    } catch (err: any) {
      setError(err.message);
      console.error('Generate flashcards error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch flashcards
  const fetchFlashcards = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/flashcards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch flashcards');

      const data = await response.json();
      setFlashcards(data.flashcards || []);
      console.log('Flashcards fetched:', data.flashcards);
    } catch (err: any) {
      console.error('Fetch flashcards error:', err);
    }
  };

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchDocuments();
      fetchFlashcards();
    }
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
        <div className="max-w-md mx-auto mt-20">
          <h1 className="text-2xl font-bold mb-8 text-center">Flashcards Auth Test</h1>
          
          <div className="glass rounded-xl p-6 space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 rounded-lg"
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 rounded-lg"
            />
            
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Login'}
              </button>
              
              <button
                onClick={handleRegister}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-50"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/test-flashcards')}
              className="p-2 hover:bg-white/5 rounded-lg"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Flashcards Auth Test</h1>
              <p className="text-gray-400 mt-1">Testing with real authentication</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              localStorage.removeItem('auth_token');
              setIsAuthenticated(false);
              setToken('');
            }}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Documents Section */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Documents</h2>
            <button
              onClick={createTestDocument}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg disabled:opacity-50"
            >
              Create Test Document
            </button>
          </div>
          
          {documents.length === 0 ? (
            <p className="text-gray-400">No documents yet. Create one to generate flashcards!</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 bg-white/5 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{doc.title}</h3>
                    <p className="text-sm text-gray-400">
                      {doc.content?.substring(0, 100)}...
                    </p>
                  </div>
                  <button
                    onClick={() => generateFlashcards(doc.id)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm disabled:opacity-50"
                  >
                    <SparklesIcon className="h-4 w-4 inline mr-1" />
                    Generate Cards
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flashcards Section */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Flashcards</h2>
          
          {flashcards.length === 0 ? (
            <p className="text-gray-400">No flashcards yet. Generate some from your documents!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {flashcards.map((card) => (
                <div key={card.id} className="p-4 bg-white/5 rounded-lg">
                  <div className="mb-2">
                    <span className="text-xs text-purple-400">Question:</span>
                    <p className="font-medium">{card.front}</p>
                  </div>
                  <div>
                    <span className="text-xs text-blue-400">Answer:</span>
                    <p className="text-sm text-gray-300">{card.back}</p>
                  </div>
                  {card.tags && (
                    <div className="mt-2 flex gap-1">
                      {card.tags.map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-purple-500/20 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}