'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  FireIcon,
  TrophyIcon,
  ClockIcon,
  ChartBarIcon,
  StarIcon,
  BoltIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { format, differenceInDays } from 'date-fns';

interface ProgressTrackerProps {
  learningPath: {
    id: string;
    targetCompletion: Date;
    totalSteps: number;
    completedSteps: number;
    estimatedHours: number;
  };
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  icon: React.ReactNode;
  achieved: boolean;
}

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
}

export function ProgressTracker({ learningPath }: ProgressTrackerProps) {
  const daysRemaining = differenceInDays(new Date(learningPath.targetCompletion), new Date());
  const progressPercentage = (learningPath.completedSteps / learningPath.totalSteps) * 100;
  const estimatedDaysToComplete = Math.ceil(
    (learningPath.totalSteps - learningPath.completedSteps) * 
    (daysRemaining / learningPath.completedSteps || 1)
  );

  const milestones: Milestone[] = [
    {
      id: '1',
      name: 'Getting Started',
      description: 'Complete your first 3 steps',
      progress: Math.min(learningPath.completedSteps, 3),
      target: 3,
      unit: 'steps',
      icon: <StarIcon className="w-5 h-5" />,
      achieved: learningPath.completedSteps >= 3
    },
    {
      id: '2',
      name: 'Halfway There',
      description: 'Complete 50% of the path',
      progress: progressPercentage,
      target: 50,
      unit: '%',
      icon: <BoltIcon className="w-5 h-5" />,
      achieved: progressPercentage >= 50
    },
    {
      id: '3',
      name: 'Almost Done',
      description: 'Complete 80% of the path',
      progress: progressPercentage,
      target: 80,
      unit: '%',
      icon: <FireIcon className="w-5 h-5" />,
      achieved: progressPercentage >= 80
    },
    {
      id: '4',
      name: 'Path Master',
      description: 'Complete the entire path',
      progress: progressPercentage,
      target: 100,
      unit: '%',
      icon: <TrophyIcon className="w-5 h-5" />,
      achieved: progressPercentage >= 100
    }
  ];

  const stats: Stat[] = [
    {
      label: 'Current Streak',
      value: '7 days',
      change: '+2 from last week',
      icon: <FireIcon className="w-4 h-4" />
    },
    {
      label: 'Time Invested',
      value: `${Math.round(learningPath.completedSteps * 0.75)}h`,
      icon: <ClockIcon className="w-4 h-4" />
    },
    {
      label: 'Avg. Progress/Day',
      value: '2.3 steps',
      icon: <ChartBarIcon className="w-4 h-4" />
    },
    {
      label: 'Est. Completion',
      value: estimatedDaysToComplete > 0 ? `${estimatedDaysToComplete} days` : 'Soon!',
      icon: <CalendarDaysIcon className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{stat.label}</span>
              <div className="text-gray-400">{stat.icon}</div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            {stat.change && (
              <p className="text-xs text-green-600 mt-1">{stat.change}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Milestones */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Milestones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.map((milestone) => (
            <div 
              key={milestone.id}
              className={`p-4 rounded-lg border ${
                milestone.achieved 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    milestone.achieved 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {milestone.icon}
                  </div>
                  <div>
                    <h4 className="font-medium">{milestone.name}</h4>
                    <p className="text-sm text-gray-600">{milestone.description}</p>
                  </div>
                </div>
                {milestone.achieved && (
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span>
                    {Math.round(milestone.progress)}{milestone.unit} / {milestone.target}{milestone.unit}
                  </span>
                </div>
                <Progress 
                  value={(milestone.progress / milestone.target) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Velocity Chart */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Learning Velocity</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => {
              const height = Math.random() * 100; // In real app, use actual data
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              
              return (
                <div key={i} className="text-center">
                  <div className="bg-gray-100 rounded relative h-24 flex items-end">
                    <div 
                      className="bg-blue-500 rounded w-full transition-all"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(date, 'EEE')}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Weekly Average: 2.3 steps/day</span>
            <span className="text-green-600">↑ 15% from last week</span>
          </div>
        </div>
      </Card>

      {/* Motivational Message */}
      {daysRemaining > 0 && progressPercentage < 100 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <CalendarDaysIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              You have <strong>{daysRemaining} days</strong> to reach your target. 
              {daysRemaining > estimatedDaysToComplete 
                ? " You're on track to finish early!" 
                : " Keep up the pace to meet your goal!"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

// Add missing import
import { CheckCircleIcon } from '@heroicons/react/24/solid';