'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  DocumentTextIcon,
  AcademicCapIcon,
  ClockIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  LightBulbIcon,
  BookOpenIcon,
  FireIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface Metric {
  id: string;
  name: string;
  category: 'learning' | 'productivity' | 'research' | 'engagement';
  value: number;
  previousValue?: number;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  unit?: string;
  icon?: string;
  color?: string;
}

interface MetricCardsProps {
  metrics: any;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const defaultMetrics: Metric[] = [
    {
      id: 'documents_added',
      name: 'Documents Added',
      category: 'productivity',
      value: metrics.documentsAdded || 0,
      previousValue: metrics.previousDocumentsAdded,
      trend: metrics.documentsAddedTrend || 'stable',
      changePercentage: metrics.documentsAddedChange || 0,
      icon: 'document',
      color: 'blue'
    },
    {
      id: 'study_time',
      name: 'Study Time',
      category: 'learning',
      value: metrics.studyTimeHours || 0,
      previousValue: metrics.previousStudyTimeHours,
      trend: metrics.studyTimeTrend || 'stable',
      changePercentage: metrics.studyTimeChange || 0,
      unit: 'hours',
      icon: 'clock',
      color: 'green'
    },
    {
      id: 'cards_reviewed',
      name: 'Cards Reviewed',
      category: 'learning',
      value: metrics.cardsReviewed || 0,
      previousValue: metrics.previousCardsReviewed,
      trend: metrics.cardsReviewedTrend || 'stable',
      changePercentage: metrics.cardsReviewedChange || 0,
      icon: 'academic',
      color: 'purple'
    },
    {
      id: 'knowledge_score',
      name: 'Knowledge Score',
      category: 'learning',
      value: metrics.knowledgeScore || 0,
      previousValue: metrics.previousKnowledgeScore,
      trend: metrics.knowledgeScoreTrend || 'stable',
      changePercentage: metrics.knowledgeScoreChange || 0,
      unit: '%',
      icon: 'lightbulb',
      color: 'yellow'
    },
    {
      id: 'study_streak',
      name: 'Study Streak',
      category: 'engagement',
      value: metrics.studyStreak || 0,
      previousValue: metrics.previousStudyStreak,
      trend: metrics.studyStreakTrend || 'stable',
      changePercentage: 0,
      unit: 'days',
      icon: 'fire',
      color: 'orange'
    },
    {
      id: 'connections_made',
      name: 'Connections Made',
      category: 'research',
      value: metrics.connectionsMade || 0,
      previousValue: metrics.previousConnectionsMade,
      trend: metrics.connectionsTrend || 'stable',
      changePercentage: metrics.connectionsChange || 0,
      icon: 'bolt',
      color: 'indigo'
    }
  ];

  const getIcon = (iconName?: string) => {
    const iconClass = "w-5 h-5";
    switch (iconName) {
      case 'document':
        return <DocumentTextIcon className={iconClass} />;
      case 'clock':
        return <ClockIcon className={iconClass} />;
      case 'academic':
        return <AcademicCapIcon className={iconClass} />;
      case 'lightbulb':
        return <LightBulbIcon className={iconClass} />;
      case 'fire':
        return <FireIcon className={iconClass} />;
      case 'bolt':
        return <BoltIcon className={iconClass} />;
      default:
        return <ChartBarIcon className={iconClass} />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <MinusIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600 bg-blue-100';
      case 'green':
        return 'text-green-600 bg-green-100';
      case 'purple':
        return 'text-purple-600 bg-purple-100';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-100';
      case 'orange':
        return 'text-orange-600 bg-orange-100';
      case 'indigo':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatValue = (value: number, unit?: string) => {
    if (unit === '%') {
      return `${value}%`;
    }
    if (unit === 'hours') {
      return `${value.toFixed(1)}h`;
    }
    if (unit === 'days') {
      return `${value} days`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {defaultMetrics.map((metric) => (
        <Card key={metric.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${getColorClasses(metric.color)}`}>
              {getIcon(metric.icon)}
            </div>
            {getTrendIcon(metric.trend)}
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-600">{metric.name}</p>
            <p className="text-2xl font-bold">
              {formatValue(metric.value, metric.unit)}
            </p>
            
            {metric.changePercentage !== 0 && (
              <div className="flex items-center text-xs">
                <span className={
                  metric.trend === 'up' ? 'text-green-600' : 
                  metric.trend === 'down' ? 'text-red-600' : 
                  'text-gray-500'
                }>
                  {metric.trend === 'up' ? '+' : ''}{metric.changePercentage}%
                </span>
                <span className="text-gray-400 ml-1">vs last period</span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}