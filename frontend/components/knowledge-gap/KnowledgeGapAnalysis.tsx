'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast';
import { makeInteractive } from '@/utils/accessibility';
import { 
  ExclamationTriangleIcon,
  LightBulbIcon,
  ArrowRightIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface KnowledgeGap {
  id: string;
  gap_type: 'prerequisite' | 'conceptual' | 'application' | 'retention';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  detected_from: any;
  detection_confidence: number;
  recommended_actions: any[];
  recommended_resources: string[];
  status: string;
  topic?: {
    topic_name: string;
    complexity_level: number;
  };
}

interface LearningPath {
  id: string;
  path_name: string;
  description: string;
  steps: any[];
  total_steps: number;
  completed_steps: number;
  estimated_duration: number;
  difficulty: string;
}

export function KnowledgeGapAnalysis() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);

  useEffect(() => {
    loadGaps();
  }, []);

  const loadGaps = async () => {
    try {
      const [gapsResponse, pathsResponse] = await Promise.all([
        fetch('/api/knowledge-gap/gaps', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }),
        fetch('/api/knowledge-gap/learning-paths?status=active', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
      ]);

      if (gapsResponse.ok) {
        const gapsData = await gapsResponse.json();
        setGaps(gapsData.gaps);
      }

      if (pathsResponse.ok) {
        const pathsData = await pathsResponse.json();
        setLearningPaths(pathsData.paths);
      }
    } catch (error) {
      console.error('Error loading knowledge gaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeKnowledge = async () => {
    setAnalyzing(true);

    try {
      const response = await fetch('/api/knowledge-gap/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to analyze knowledge');

      const data = await response.json();
      setGaps(data.gaps);
      toast.success(`Identified ${data.gaps.length} knowledge gaps`);
    } catch (error) {
      console.error('Error analyzing knowledge:', error);
      toast.error('Failed to analyze knowledge gaps');
    } finally {
      setAnalyzing(false);
    }
  };

  const createLearningPath = async (gap: KnowledgeGap) => {
    try {
      const response = await fetch(`/api/knowledge-gap/gaps/${gap.id}/create-path`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to create learning path');

      const data = await response.json();
      setLearningPaths([...learningPaths, data.path]);
      toast.success('Learning path created!');
    } catch (error) {
      console.error('Error creating learning path:', error);
      toast.error('Failed to create learning path');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prerequisite': return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'conceptual': return <LightBulbIcon className="w-5 h-5" />;
      case 'application': return <AcademicCapIcon className="w-5 h-5" />;
      case 'retention': return <ClockIcon className="w-5 h-5" />;
      default: return <ChartBarIcon className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Knowledge Gap Analysis</h2>
          <p className="text-gray-400">
            Identify and address gaps in your understanding
          </p>
        </div>
        <Button
          onClick={analyzeKnowledge}
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Analyze Knowledge
            </>
          )}
        </Button>
      </div>

      {/* Active Learning Paths */}
      {learningPaths.length > 0 && (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Active Learning Paths</h3>
          <div className="space-y-3">
            {learningPaths.map(path => (
              <div
                key={path.id}
                className="p-4 bg-gray-800/50 rounded-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-white">{path.path_name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{path.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {path.estimated_duration} min
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{path.completed_steps}/{path.total_steps} steps</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(path.completed_steps / path.total_steps) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Gaps */}
      {gaps.length === 0 ? (
        <div className="glass-card text-center py-12">
          <AcademicCapIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Knowledge Gaps Detected</h3>
          <p className="text-gray-400 mb-6">
            Run an analysis to identify areas for improvement
          </p>
          <Button onClick={analyzeKnowledge}>
            Start Analysis
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gaps.map(gap => (
            <div
              key={gap.id}
              {...makeInteractive(() => setSelectedGap(gap), {
                role: 'button',
                ariaLabel: `${gap.gap_type} gap: ${gap.concept || gap.description}, severity ${gap.severity}`,
                ariaPressed: selectedGap?.id === gap.id
              })}
              className={`glass-card border cursor-pointer transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                selectedGap?.id === gap.id ? 'ring-2 ring-purple-500' : ''
              } ${getSeverityColor(gap.severity)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  {getTypeIcon(gap.gap_type)}
                  <span className="ml-2 text-sm font-medium capitalize">
                    {gap.gap_type} Gap
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                  getSeverityColor(gap.severity)
                }`}>
                  {gap.severity}
                </span>
              </div>

              <p className="text-white mb-3">{gap.description}</p>

              {gap.topic && (
                <div className="flex items-center text-sm text-gray-400 mb-3">
                  <span>Topic: {gap.topic.topic_name}</span>
                  <span className="mx-2">•</span>
                  <span>Complexity: {gap.topic.complexity_level}/5</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  Confidence: {Math.round(gap.detection_confidence * 100)}%
                </span>
                {gap.recommended_actions.length > 0 && (
                  <span className="text-purple-400">
                    {gap.recommended_actions.length} actions
                  </span>
                )}
              </div>

              {gap.status === 'open' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    createLearningPath(gap);
                  }}
                >
                  Create Learning Path
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Gap Details */}
      {selectedGap && (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Recommended Actions</h3>
          <div className="space-y-3">
            {selectedGap.recommended_actions.map((action, index) => (
              <div key={index} className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-purple-400">{index + 1}</span>
                </div>
                <div className="ml-3">
                  <p className="text-white font-medium">{action.type}</p>
                  <p className="text-sm text-gray-400">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}