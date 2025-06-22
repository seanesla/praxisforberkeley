'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  DocumentTextIcon,
  ChartBarIcon,
  SparklesIcon,
  BookOpenIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface DNAFingerprint {
  structural: number[];
  semantic: number[];
  stylistic: number[];
  topical: number[];
  complexity: number[];
}

interface DNAMetadata {
  documentTitle: string;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  vocabularyRichness: number;
  readabilityScore: number;
  dominantTopics: string[];
  uniqueTerms: string[];
}

interface DocumentDNA {
  id: string;
  documentId: string;
  fingerprint: DNAFingerprint;
  metadata: DNAMetadata;
}

export function DocumentDNAVisualization({ documentId }: { documentId: string }) {
  const [dna, setDNA] = useState<DocumentDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [similarDocuments, setSimilarDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadDocumentDNA();
  }, [documentId]);

  const loadDocumentDNA = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/dna`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        // Generate DNA if not exists
        await generateDNA();
      } else {
        const data = await response.json();
        setDNA(data.dna);
      }
    } catch (error) {
      console.error('Error loading document DNA:', error);
      toast.error('Failed to load document DNA');
    } finally {
      setLoading(false);
    }
  };

  const generateDNA = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/generate-dna`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to generate DNA');

      const data = await response.json();
      setDNA(data.dna);
      toast.success('Document DNA generated successfully');
    } catch (error) {
      console.error('Error generating DNA:', error);
      toast.error('Failed to generate document DNA');
    }
  };

  const findSimilarDocuments = async () => {
    setComparing(true);

    try {
      const response = await fetch(`/api/citation-network/similar/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to find similar documents');

      const data = await response.json();
      setSimilarDocuments(data.similarDocuments);
      toast.success(`Found ${data.similarDocuments.length} similar documents`);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      toast.error('Failed to find similar documents');
    } finally {
      setComparing(false);
    }
  };

  const renderFingerprint = (fingerprint: DNAFingerprint) => {
    const categories = [
      { name: 'Structure', data: fingerprint.structural, color: '#8B5CF6' },
      { name: 'Semantic', data: fingerprint.semantic, color: '#EC4899' },
      { name: 'Style', data: fingerprint.stylistic, color: '#10B981' },
      { name: 'Topics', data: fingerprint.topical, color: '#F59E0B' },
      { name: 'Complexity', data: fingerprint.complexity, color: '#3B82F6' }
    ];

    return (
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.name}>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{category.name}</span>
              <span className="text-gray-500">
                {Math.round(category.data.reduce((a, b) => a + b, 0) / category.data.length * 100)}%
              </span>
            </div>
            <div className="flex h-8 gap-0.5">
              {category.data.map((value, index) => (
                <div
                  key={index}
                  className="flex-1 rounded"
                  style={{
                    backgroundColor: category.color,
                    opacity: 0.2 + value * 0.8,
                    height: `${value * 100}%`,
                    alignSelf: 'flex-end'
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!dna) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No DNA data available for this document.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metadata Overview */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <DocumentTextIcon className="w-5 h-5 mr-2" />
          Document Overview
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-sm mb-1">
              <BookOpenIcon className="w-4 h-4 mr-1" />
              Words
            </div>
            <p className="text-xl font-semibold text-white">
              {dna.metadata.wordCount.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-sm mb-1">
              <ChartBarIcon className="w-4 h-4 mr-1" />
              Readability
            </div>
            <p className="text-xl font-semibold text-white">
              {Math.round(dna.metadata.readabilityScore)}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-sm mb-1">
              <SparklesIcon className="w-4 h-4 mr-1" />
              Vocabulary
            </div>
            <p className="text-xl font-semibold text-white">
              {Math.round(dna.metadata.vocabularyRichness * 100)}%
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-sm mb-1">
              <ClockIcon className="w-4 h-4 mr-1" />
              Avg Sentence
            </div>
            <p className="text-xl font-semibold text-white">
              {Math.round(dna.metadata.avgSentenceLength)} words
            </p>
          </div>
        </div>
      </div>

      {/* DNA Fingerprint */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">DNA Fingerprint</h3>
        {renderFingerprint(dna.fingerprint)}
      </div>

      {/* Topics and Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Dominant Topics</h3>
          <div className="flex flex-wrap gap-2">
            {dna.metadata.dominantTopics.map((topic, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Unique Terms</h3>
          <div className="flex flex-wrap gap-2">
            {dna.metadata.uniqueTerms.slice(0, 10).map((term, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Similar Documents */}
      <div className="glass-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Similar Documents</h3>
          <button
            onClick={findSimilarDocuments}
            disabled={comparing}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            {comparing ? 'Comparing...' : 'Find Similar'}
          </button>
        </div>

        {similarDocuments.length > 0 ? (
          <div className="space-y-3">
            {similarDocuments.map((doc) => (
              <div
                key={doc.document.id}
                className="p-3 bg-gray-800/50 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="text-white font-medium">{doc.document.title}</p>
                  <p className="text-sm text-gray-400">
                    Similarity: {Math.round(doc.similarity * 100)}%
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {doc.shared_citations} shared citations
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            Click "Find Similar" to discover related documents
          </p>
        )}
      </div>
    </div>
  );
}