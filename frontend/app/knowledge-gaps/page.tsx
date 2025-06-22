'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { KnowledgeGapAnalysis } from '@/components/knowledge-gap/KnowledgeGapAnalysis';
import { 
  ChevronLeftIcon,
  LightBulbIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function KnowledgeGapsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [learningPath, setLearningPath] = useState<any[]>([]);
  const [conceptMastery, setConceptMastery] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchDocuments();
  }, [user, router]);

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
    }
  };

  const runAnalysis = async () => {
    if (selectedDocuments.length === 0) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Run knowledge gap analysis
      const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/knowledge-gap/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentIds: selectedDocuments
        })
      });

      if (analysisResponse.ok) {
        const data = await analysisResponse.json();
        setAnalysisData(data);
        
        // Generate learning path based on gaps
        if (data.gaps && data.gaps.length > 0) {
          generateLearningPath(data.gaps);
        }
        
        // Update concept mastery
        if (data.concepts) {
          setConceptMastery(data.concepts);
        }
      }
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLearningPath = async (gaps: any[]) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/knowledge-gap/learning-path`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gaps })
      });

      if (response.ok) {
        const data = await response.json();
        setLearningPath(data.path || []);
      }
    } catch (error) {
      console.error('Error generating learning path:', error);
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <Logo size="sm" />
              <h1 className="text-xl font-semibold text-white">Knowledge Gap Analysis</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Introduction */}
          <div className="text-center py-8">
            <LightBulbIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">
              Discover Your Knowledge Gaps
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              AI-powered analysis identifies what you don't know yet and creates a personalized learning path
            </p>
          </div>

          {/* Document Selection */}
          {!analysisData && (
            <div className="glass-card">
              <h3 className="text-lg font-semibold text-white mb-4">
                Select Documents to Analyze
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedDocuments.includes(doc.id)
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      className="sr-only"
                    />
                    <h4 className="font-medium text-white mb-1">{doc.title}</h4>
                    <p className="text-sm text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </label>
                ))}
              </div>
              
              <button
                onClick={runAnalysis}
                disabled={selectedDocuments.length === 0 || isLoading}
                className="glass-button disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Run Analysis'
                )}
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {analysisData && (
            <>
              <KnowledgeGapAnalysis
                analysisData={analysisData}
                onReanalyze={() => {
                  setAnalysisData(null);
                  setSelectedDocuments([]);
                }}
              />

              {/* Learning Path */}
              {learningPath.length > 0 && (
                <div className="glass-card">
                  <div className="flex items-center gap-3 mb-6">
                    <AcademicCapIcon className="w-6 h-6 text-purple-400" />
                    <h3 className="text-xl font-semibold text-white">Recommended Learning Path</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {learningPath.map((step, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-purple-400 font-semibold">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">{step.topic}</h4>
                          <p className="text-sm text-gray-400 mb-2">{step.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {step.resources?.map((resource: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-300">
                                {resource}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concept Mastery Tracker */}
              {conceptMastery.length > 0 && (
                <div className="glass-card">
                  <div className="flex items-center gap-3 mb-6">
                    <ChartBarIcon className="w-6 h-6 text-blue-400" />
                    <h3 className="text-xl font-semibold text-white">Concept Mastery</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {conceptMastery.map((concept, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{concept.name}</span>
                          <span className="text-sm text-gray-400">{concept.mastery}%</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${concept.mastery}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}