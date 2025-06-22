'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RelationshipGraph } from './RelationshipGraph';
import { ThemeExtractor } from './ThemeExtractor';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  SparklesIcon,
  ArrowsRightLeftIcon,
  BeakerIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface CrossDocumentInsightsProps {
  documentIds?: string[];
  userId: string;
}

interface Pattern {
  id: string;
  type: string;
  frequency: number;
  documents: string[];
  description: string;
  confidence: number;
}

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  relevance: number;
  documentIds: string[];
  metadata?: any;
}

interface Contradiction {
  id: string;
  topic: string;
  documents: Array<{
    id: string;
    title: string;
    position: string;
  }>;
  severity: number;
}

export function CrossDocumentInsights({ documentIds, userId }: CrossDocumentInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('insights');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(documentIds || []);

  useEffect(() => {
    if (selectedDocuments.length > 0) {
      fetchAnalysis();
    }
  }, [selectedDocuments]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      // Fetch insights
      const insightsRes = await fetch('/api/cross-document/insights', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const insightsData = await insightsRes.json();
      setInsights(insightsData.insights || []);

      // Fetch patterns
      const patternsRes = await fetch('/api/cross-document/patterns', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const patternsData = await patternsRes.json();
      setPatterns(patternsData.patterns || []);

      // Fetch contradictions
      if (selectedDocuments.length > 1) {
        const contradictionsRes = await fetch('/api/cross-document/contradictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ document_ids: selectedDocuments })
        });
        const contradictionsData = await contradictionsRes.json();
        setContradictions(contradictionsData.contradictions || []);
      }

      // Fetch themes
      const themesRes = await fetch('/api/cross-document/themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ document_ids: selectedDocuments })
      });
      const themesData = await themesRes.json();
      setThemes(themesData.themes || []);

    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSynthesis = async () => {
    try {
      const res = await fetch('/api/cross-document/synthesis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          document_ids: selectedDocuments,
          output_format: 'markdown'
        })
      });
      const data = await res.json();
      // Handle synthesis report
      console.log('Synthesis:', data.synthesis);
    } catch (error) {
      console.error('Error generating synthesis:', error);
    }
  };

  const renderInsightIcon = (type: string) => {
    switch (type) {
      case 'theme':
        return <SparklesIcon className="w-5 h-5" />;
      case 'pattern':
        return <ChartBarIcon className="w-5 h-5" />;
      case 'relationship':
        return <ArrowsRightLeftIcon className="w-5 h-5" />;
      case 'discovery':
        return <LightBulbIcon className="w-5 h-5" />;
      default:
        return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cross-Document Insights</h2>
        <Button onClick={generateSynthesis} disabled={selectedDocuments.length === 0}>
          Generate Synthesis Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="contradictions">Contradictions</TabsTrigger>
          <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {insights.map((insight) => (
              <Card key={insight.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 text-blue-500">
                    {renderInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{insight.title}</h3>
                      <Badge variant="secondary">
                        {Math.round(insight.relevance * 100)}% relevant
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3">{insight.description}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Found in {insight.documentIds.length} documents
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-4">
            {patterns.map((pattern) => (
              <Card key={pattern.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge className="mb-2">{pattern.type}</Badge>
                    <h3 className="font-semibold text-lg">{pattern.description}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{pattern.frequency}</div>
                    <div className="text-sm text-gray-500">occurrences</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Confidence</span>
                    <span>{Math.round(pattern.confidence * 100)}%</span>
                  </div>
                  <Progress value={pattern.confidence * 100} className="h-2" />
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Found in {pattern.documents.length} documents
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="themes">
          <ThemeExtractor themes={themes} documentIds={selectedDocuments} />
        </TabsContent>

        <TabsContent value="contradictions" className="space-y-4">
          {contradictions.length === 0 ? (
            <Card className="p-8 text-center">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No contradictions found across documents</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contradictions.map((contradiction) => (
                <Card key={contradiction.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{contradiction.topic}</h3>
                      <div className="space-y-3">
                        {contradiction.documents.map((doc, idx) => (
                          <div key={doc.id} className="bg-gray-50 p-3 rounded">
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{doc.position}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <Badge variant={contradiction.severity > 0.7 ? 'destructive' : 'secondary'}>
                          {contradiction.severity > 0.7 ? 'High' : 'Medium'} severity
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="graph">
          <RelationshipGraph documentIds={selectedDocuments} userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}