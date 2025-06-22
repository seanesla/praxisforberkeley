'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricCards } from './MetricCards';
import { ChartWidgets } from './ChartWidgets';
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  CogIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

interface AnalyticsDashboardProps {
  userId: string;
}

interface Dashboard {
  id: string;
  name: string;
  layout: {
    type: 'grid' | 'flex' | 'masonry';
    columns: number;
    gap: number;
  };
  widgets: Widget[];
}

interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'progress' | 'list';
  dataSource: string;
  config: any;
  position: { x: number; y: number; w: number; h: number };
}

export function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('month');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [charts, setCharts] = useState<any>({});
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/v2/overview?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      
      setMetrics(data.metrics || {});
      setCharts(data.charts || {});
      setInsights(data.insights || []);
      
      // Load default dashboard if not already loaded
      if (!dashboard) {
        await loadDefaultDashboard();
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultDashboard = async () => {
    try {
      const response = await fetch('/api/analytics/v2/dashboards/default', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      setDashboard(data.dashboard);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Create default dashboard structure
      setDashboard({
        id: 'default',
        name: 'Overview Dashboard',
        layout: { type: 'grid', columns: 12, gap: 16 },
        widgets: [
          {
            id: 'metrics',
            type: 'metric',
            dataSource: 'overview_metrics',
            config: { title: 'Key Metrics' },
            position: { x: 0, y: 0, w: 12, h: 2 }
          },
          {
            id: 'activity_chart',
            type: 'chart',
            dataSource: 'activity_timeline',
            config: { 
              title: 'Activity Timeline',
              chartType: 'line',
              metrics: ['documents', 'notes', 'reviews']
            },
            position: { x: 0, y: 2, w: 8, h: 4 }
          },
          {
            id: 'insights_list',
            type: 'list',
            dataSource: 'ai_insights',
            config: { title: 'AI Insights' },
            position: { x: 8, y: 2, w: 4, h: 4 }
          },
          {
            id: 'study_heatmap',
            type: 'heatmap',
            dataSource: 'study_activity',
            config: { title: 'Study Activity' },
            position: { x: 0, y: 6, w: 6, h: 3 }
          },
          {
            id: 'knowledge_progress',
            type: 'progress',
            dataSource: 'knowledge_mastery',
            config: { title: 'Knowledge Progress' },
            position: { x: 6, y: 6, w: 6, h: 3 }
          }
        ]
      });
    }
  };

  const exportData = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const response = await fetch(`/api/analytics/v2/export?format=${format}&timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const addWidget = () => {
    // In a real implementation, this would open a widget selector
    console.log('Add widget');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your learning progress and productivity</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={toggleEditMode}>
            <Squares2X2Icon className="w-4 h-4 mr-2" />
            {editMode ? 'Done Editing' : 'Customize'}
          </Button>
          
          <Button variant="outline" onClick={() => exportData('csv')}>
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <MetricCards metrics={metrics} />

      {/* Dashboard Grid */}
      {dashboard && (
        <div className={`grid grid-cols-${dashboard.layout.columns} gap-${dashboard.layout.gap / 4}`}>
          {dashboard.widgets.map((widget) => (
            <div
              key={widget.id}
              className={`col-span-${widget.position.w} row-span-${widget.position.h}`}
              style={{
                gridColumn: `span ${widget.position.w}`,
                gridRow: `span ${widget.position.h}`
              }}
            >
              {widget.type === 'chart' && (
                <ChartWidgets
                  type={widget.config.chartType}
                  data={charts[widget.dataSource]}
                  config={widget.config}
                />
              )}
              
              {widget.type === 'list' && widget.dataSource === 'ai_insights' && (
                <Card className="p-6 h-full">
                  <h3 className="font-semibold mb-4">{widget.config.title}</h3>
                  <div className="space-y-3 overflow-y-auto max-h-64">
                    {insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <ChartBarIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-600">{insight}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              
              {widget.type === 'heatmap' && (
                <Card className="p-6 h-full">
                  <h3 className="font-semibold mb-4">{widget.config.title}</h3>
                  <div className="bg-gray-100 rounded h-48 flex items-center justify-center">
                    <CalendarDaysIcon className="w-8 h-8 text-gray-400" />
                  </div>
                </Card>
              )}
              
              {widget.type === 'progress' && (
                <Card className="p-6 h-full">
                  <h3 className="font-semibold mb-4">{widget.config.title}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Concept Mastery</span>
                        <span>73%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '73%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Knowledge Gaps Closed</span>
                        <span>45%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ))}
          
          {editMode && (
            <div className="col-span-4 row-span-2 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <Button variant="ghost" onClick={addWidget}>
                <PlusIcon className="w-6 h-6 mr-2" />
                Add Widget
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start">
            <CogIcon className="w-4 h-4 mr-2" />
            Configure Alerts
          </Button>
          <Button variant="outline" className="justify-start">
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Create Custom Report
          </Button>
          <Button variant="outline" className="justify-start">
            <CalendarDaysIcon className="w-4 h-4 mr-2" />
            Schedule Analytics Email
          </Button>
        </div>
      </Card>
    </div>
  );
}