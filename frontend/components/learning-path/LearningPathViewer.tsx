'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProgressTracker } from './ProgressTracker';
import { 
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  PlayIcon,
  LockClosedIcon,
  ChartBarIcon,
  BeakerIcon,
  BookOpenIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';

interface LearningPathViewerProps {
  learningPathId?: string;
  userId: string;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  targetCompletion: Date;
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  estimatedHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: LearningStep[];
  prerequisites: string[];
  outcomes: string[];
}

interface LearningStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'concept' | 'exercise' | 'project' | 'assessment';
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  estimatedTime: number;
  resources: Resource[];
  activities: Activity[];
  completionCriteria: string[];
  progress: number;
}

interface Resource {
  id: string;
  type: 'document' | 'video' | 'article' | 'external';
  title: string;
  url?: string;
  documentId?: string;
}

interface Activity {
  id: string;
  type: 'flashcards' | 'exercises' | 'quiz' | 'project';
  title: string;
  completed: boolean;
}

export function LearningPathViewer({ learningPathId, userId }: LearningPathViewerProps) {
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    if (learningPathId) {
      fetchLearningPath();
    } else {
      generateRecommendedPath();
    }
  }, [learningPathId]);

  const fetchLearningPath = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge-gap/learning-paths/${learningPathId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      setLearningPath(data.learningPath);
    } catch (error) {
      console.error('Error fetching learning path:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendedPath = async () => {
    setLoading(true);
    try {
      // Get detected gaps
      const gapsResponse = await fetch('/api/knowledge-gap/detect', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const gapsData = await gapsResponse.json();
      
      if (gapsData.gaps && gapsData.gaps.length > 0) {
        // Generate learning path from gaps
        const pathResponse = await fetch('/api/knowledge-gap/learning-path', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            gap_ids: gapsData.gaps.slice(0, 5).map((g: any) => g.id),
            preferences: { pace: 'moderate', style: 'mixed' }
          })
        });
        const pathData = await pathResponse.json();
        setLearningPath(pathData.learningPath);
      }
    } catch (error) {
      console.error('Error generating learning path:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStep = async (stepId: string) => {
    // Update step status to in_progress
    console.log('Starting step:', stepId);
    setExpandedStep(stepId);
  };

  const completeActivity = async (stepId: string, activityId: string) => {
    // Mark activity as completed
    console.log('Completing activity:', activityId);
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'concept':
        return <BookOpenIcon className="w-5 h-5" />;
      case 'exercise':
        return <PuzzlePieceIcon className="w-5 h-5" />;
      case 'project':
        return <BeakerIcon className="w-5 h-5" />;
      case 'assessment':
        return <ChartBarIcon className="w-5 h-5" />;
      default:
        return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      case 'available':
        return 'text-gray-600 bg-gray-50';
      case 'locked':
        return 'text-gray-400 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!learningPath) {
    return (
      <Card className="p-8 text-center">
        <AcademicCapIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500 mb-4">No learning path available</p>
        <Button onClick={generateRecommendedPath}>
          Generate Recommended Path
        </Button>
      </Card>
    );
  }

  const progress = (learningPath.completedSteps / learningPath.totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{learningPath.name}</h2>
              <p className="text-gray-600">{learningPath.description}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {learningPath.difficulty}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              <span>{learningPath.estimatedHours} hours total</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-4 h-4 text-gray-400" />
              <span>{learningPath.completedSteps} of {learningPath.totalSteps} completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <AcademicCapIcon className="w-4 h-4 text-gray-400" />
              <span>Step {learningPath.currentStep} of {learningPath.totalSteps}</span>
            </div>
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-4 h-4 text-gray-400" />
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>

          <Progress value={progress} className="h-3" />
        </div>
      </Card>

      {/* Progress Tracker */}
      <ProgressTracker learningPath={learningPath} />

      {/* Learning Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Learning Steps</h3>
        
        {learningPath.steps.map((step, index) => (
          <Card 
            key={step.id} 
            className={`p-6 transition-all ${
              step.status === 'locked' ? 'opacity-60' : 'hover:shadow-md'
            }`}
          >
            <div className="space-y-4">
              {/* Step Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${getStatusColor(step.status)}`}>
                    {step.status === 'completed' ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : step.status === 'locked' ? (
                      <LockClosedIcon className="w-5 h-5" />
                    ) : (
                      getStepIcon(step.type)
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm text-gray-500">Step {step.order}</span>
                      <Badge variant="outline" className="text-xs">
                        {step.type}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-lg">{step.title}</h4>
                    <p className="text-gray-600 mt-1">{step.description}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-500">{step.estimatedTime} min</p>
                  {step.status === 'available' && (
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => startStep(step.id)}
                    >
                      <PlayIcon className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}
                  {step.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="mt-2"
                      onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    >
                      {expandedStep === step.id ? 'Hide' : 'Continue'}
                    </Button>
                  )}
                  {step.status === 'completed' && (
                    <Badge variant="default" className="mt-2">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress for in-progress steps */}
              {step.status === 'in_progress' && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span>{step.progress}%</span>
                  </div>
                  <Progress value={step.progress} className="h-2" />
                </div>
              )}

              {/* Expanded Content */}
              {expandedStep === step.id && (
                <div className="border-t pt-4 space-y-4">
                  {/* Completion Criteria */}
                  <div>
                    <h5 className="font-medium mb-2">Completion Criteria</h5>
                    <ul className="space-y-1">
                      {step.completionCriteria.map((criteria, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-sm">
                          <CheckCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-600">{criteria}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Resources */}
                  {step.resources.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Resources</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {step.resources.map((resource) => (
                          <Button
                            key={resource.id}
                            variant="outline"
                            size="sm"
                            className="justify-start"
                          >
                            <DocumentTextIcon className="w-4 h-4 mr-2" />
                            {resource.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  {step.activities.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Activities</h5>
                      <div className="space-y-2">
                        {step.activities.map((activity) => (
                          <div 
                            key={activity.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded"
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={activity.completed}
                                onCheckedChange={() => completeActivity(step.id, activity.id)}
                              />
                              <span className={activity.completed ? 'line-through text-gray-500' : ''}>
                                {activity.title}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {activity.type}
                              </Badge>
                            </div>
                            <Button size="sm" variant="ghost">
                              Start
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Outcomes */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Learning Outcomes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {learningPath.outcomes.map((outcome, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{outcome}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}