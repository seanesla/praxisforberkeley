'use client';

import { useState } from 'react';

export default function TestAPIPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (result: string) => {
    setResults(prev => [...prev, result]);
    console.log(result);
  };

  const testAPI = async () => {
    setLoading(true);
    setResults([]);
    
    // Test health endpoint
    addResult('Testing health endpoint...');
    try {
      const healthRes = await fetch('http://localhost:5001/health');
      const healthData = await healthRes.json();
      addResult(`✅ Health: ${JSON.stringify(healthData)}`);
    } catch (error) {
      addResult(`❌ Health error: ${error}`);
    }

    // Test flashcards endpoint
    addResult('\nTesting flashcards endpoint...');
    try {
      const flashRes = await fetch('http://localhost:5001/api/flashcards', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      addResult(`Flashcards status: ${flashRes.status}`);
      const flashData = await flashRes.json();
      addResult(`Flashcards response: ${JSON.stringify(flashData)}`);
    } catch (error) {
      addResult(`❌ Flashcards error: ${error}`);
    }

    // Test creating a document
    addResult('\nCreating test document...');
    try {
      const docRes = await fetch('http://localhost:5001/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          title: 'Test Document',
          content: 'This is a test document for flashcards.',
          file_type: 'text/plain'
        })
      });
      addResult(`Document status: ${docRes.status}`);
      const docData = await docRes.json();
      addResult(`Document response: ${JSON.stringify(docData)}`);
      
      if (docRes.ok && docData.document) {
        // Try generating flashcards
        addResult('\nGenerating flashcards...');
        const genRes = await fetch(`http://localhost:5001/api/flashcards/generate/${docData.document.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify({
            numCards: 3
          })
        });
        addResult(`Generate status: ${genRes.status}`);
        const genData = await genRes.json();
        addResult(`Generate response: ${JSON.stringify(genData)}`);
      }
    } catch (error) {
      addResult(`❌ Document error: ${error}`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 rounded-lg mb-6"
      >
        {loading ? 'Testing...' : 'Test API Endpoints'}
      </button>

      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Results:</h2>
        <pre className="text-sm whitespace-pre-wrap">
          {results.length === 0 ? 'Click the button to test API endpoints' : results.join('\n')}
        </pre>
      </div>
    </div>
  );
}