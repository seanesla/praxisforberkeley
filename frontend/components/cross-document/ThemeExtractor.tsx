'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TagIcon, DocumentTextIcon, TrendingUpIcon } from '@heroicons/react/24/outline';

interface Theme {
  id: string;
  name: string;
  description: string;
  prominence: number;
  documentCount: number;
  keywords: string[];
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  evolution?: Array<{
    date: string;
    frequency: number;
  }>;
}

interface ThemeExtractorProps {
  themes: Theme[];
  documentIds: string[];
}

export function ThemeExtractor({ themes, documentIds }: ThemeExtractorProps) {
  const getSentimentColor = (sentiment?: Theme['sentiment']) => {
    if (!sentiment) return 'gray';
    const { positive, negative } = sentiment;
    if (positive > 0.6) return 'green';
    if (negative > 0.6) return 'red';
    return 'yellow';
  };

  const renderSentimentBar = (sentiment?: Theme['sentiment']) => {
    if (!sentiment) return null;
    
    return (
      <div className="flex items-center space-x-1 text-xs">
        <div className="flex h-2 flex-1 overflow-hidden rounded">
          <div 
            className="bg-green-500" 
            style={{ width: `${sentiment.positive * 100}%` }}
          />
          <div 
            className="bg-gray-300" 
            style={{ width: `${sentiment.neutral * 100}%` }}
          />
          <div 
            className="bg-red-500" 
            style={{ width: `${sentiment.negative * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const renderEvolutionSparkline = (evolution?: Theme['evolution']) => {
    if (!evolution || evolution.length === 0) return null;

    const maxFreq = Math.max(...evolution.map(e => e.frequency));
    const minFreq = Math.min(...evolution.map(e => e.frequency));
    const range = maxFreq - minFreq || 1;

    return (
      <div className="h-8 flex items-end space-x-1">
        {evolution.slice(-10).map((point, idx) => (
          <div
            key={idx}
            className="flex-1 bg-blue-500 rounded-t"
            style={{
              height: `${((point.frequency - minFreq) / range) * 100}%`,
              minHeight: '2px'
            }}
            title={`${point.date}: ${point.frequency}`}
          />
        ))}
      </div>
    );
  };

  if (themes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <TagIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">No themes extracted yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Select documents to extract common themes
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => (
          <Card key={theme.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{theme.name}</h3>
                  <Badge variant="secondary">
                    {Math.round(theme.prominence * 100)}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{theme.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    Found in {theme.documentCount} of {documentIds.length} documents
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Prominence</span>
                    <span>{Math.round(theme.prominence * 100)}%</span>
                  </div>
                  <Progress value={theme.prominence * 100} className="h-2" />
                </div>

                {theme.sentiment && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Sentiment</p>
                    {renderSentimentBar(theme.sentiment)}
                  </div>
                )}

                {theme.evolution && (
                  <div>
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                      <TrendingUpIcon className="w-4 h-4" />
                      <span>Trend</span>
                    </div>
                    {renderEvolutionSparkline(theme.evolution)}
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {theme.keywords.slice(0, 5).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {theme.keywords.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{theme.keywords.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-gray-50">
        <h4 className="font-semibold mb-3">Theme Analysis Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Themes</p>
            <p className="text-2xl font-bold">{themes.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Average Prominence</p>
            <p className="text-2xl font-bold">
              {Math.round(
                (themes.reduce((sum, t) => sum + t.prominence, 0) / themes.length) * 100
              )}%
            </p>
          </div>
          <div>
            <p className="text-gray-600">Document Coverage</p>
            <p className="text-2xl font-bold">
              {Math.round(
                (themes.filter(t => t.documentCount > 1).length / themes.length) * 100
              )}%
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}