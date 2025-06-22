import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { SpacedRepetitionService } from './spacedRepetition';
import { ExerciseEngineService } from './exerciseEngine';
import { KnowledgeGapService } from './knowledgeGap';
import { CitationNetworkService } from './citationNetwork';
import { DocumentWorkspaceService } from './documentWorkspace';
import { WorkflowAutomationService } from './workflowAutomation';

export interface AnalyticsMetric {
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

export interface AnalyticsDashboard {
  id: string;
  userId: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  refreshInterval?: number; // in seconds
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'masonry';
  columns: number;
  gap: number;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'progress' | 'list' | 'custom';
  dataSource: string;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
  refreshInterval?: number;
}

export interface WidgetConfig {
  title: string;
  subtitle?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter';
  metrics?: string[];
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';
  filters?: Record<string, any>;
  styling?: Record<string, any>;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: string;
  category: string;
  properties?: Record<string, any>;
  timestamp: Date;
}

export class Analytics2Service {
  /**
   * Get comprehensive analytics overview
   */
  static async getAnalyticsOverview(userId: string, timeRange: string = 'month'): Promise<{
    metrics: AnalyticsMetric[];
    charts: Record<string, any>;
    insights: string[];
  }> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(timeRange);

      // Fetch all metrics in parallel
      const [
        learningMetrics,
        productivityMetrics,
        researchMetrics,
        engagementMetrics
      ] = await Promise.all([
        this.getLearningMetrics(userId, startDate, endDate),
        this.getProductivityMetrics(userId, startDate, endDate),
        this.getResearchMetrics(userId, startDate, endDate),
        this.getEngagementMetrics(userId, startDate, endDate)
      ]);

      const allMetrics = [
        ...learningMetrics,
        ...productivityMetrics,
        ...researchMetrics,
        ...engagementMetrics
      ];

      // Generate charts
      const charts = await this.generateOverviewCharts(userId, startDate, endDate);

      // Generate AI insights
      const insights = await this.generateInsights(allMetrics, charts);

      return {
        metrics: allMetrics,
        charts,
        insights
      };
    } catch (error) {
      logger.error('Error getting analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get learning metrics
   */
  private static async getLearningMetrics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];

    // Study streak
    const studyStats = await SpacedRepetitionService.getStudyStats(userId);
    metrics.push({
      id: 'study_streak',
      name: 'Study Streak',
      category: 'learning',
      value: studyStats.currentStreak,
      previousValue: studyStats.longestStreak,
      trend: studyStats.currentStreak > 0 ? 'up' : 'down',
      changePercentage: 0,
      unit: 'days',
      icon: '🔥',
      color: '#FF6B6B'
    });

    // Cards reviewed
    const { data: reviews } = await supabase
      .from('study_reviews')
      .select('*')
      .eq('user_id', userId)
      .gte('reviewed_at', startDate.toISOString())
      .lte('reviewed_at', endDate.toISOString());

    const currentReviews = reviews?.length || 0;
    const previousReviews = await this.getPreviousPeriodCount(
      'study_reviews',
      userId,
      startDate,
      endDate
    );

    metrics.push({
      id: 'cards_reviewed',
      name: 'Cards Reviewed',
      category: 'learning',
      value: currentReviews,
      previousValue: previousReviews,
      trend: currentReviews > previousReviews ? 'up' : currentReviews < previousReviews ? 'down' : 'stable',
      changePercentage: this.calculatePercentageChange(currentReviews, previousReviews),
      icon: '📚',
      color: '#4ECDC4'
    });

    // Exercise accuracy
    const { data: sessions } = await supabase
      .from('exercise_sessions')
      .select('percentage')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('percentage', 'is', null);

    const avgAccuracy = sessions?.length > 0
      ? sessions.reduce((sum, s) => sum + s.percentage, 0) / sessions.length
      : 0;

    metrics.push({
      id: 'exercise_accuracy',
      name: 'Exercise Accuracy',
      category: 'learning',
      value: Math.round(avgAccuracy),
      trend: avgAccuracy > 80 ? 'up' : avgAccuracy > 60 ? 'stable' : 'down',
      changePercentage: 0,
      unit: '%',
      icon: '🎯',
      color: '#95E1D3'
    });

    // Knowledge gaps resolved
    const gaps = await KnowledgeGapService.detectGaps(userId);
    const resolvedGaps = gaps.filter(g => g.severity < 0.3).length;
    const totalGaps = gaps.length;

    metrics.push({
      id: 'gaps_resolved',
      name: 'Knowledge Gaps Resolved',
      category: 'learning',
      value: resolvedGaps,
      previousValue: totalGaps,
      trend: resolvedGaps > totalGaps * 0.5 ? 'up' : 'down',
      changePercentage: totalGaps > 0 ? (resolvedGaps / totalGaps) * 100 : 0,
      unit: 'gaps',
      icon: '🧩',
      color: '#F38181'
    });

    return metrics;
  }

  /**
   * Get productivity metrics
   */
  private static async getProductivityMetrics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];

    // Documents created
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const docCount = documents?.length || 0;
    const prevDocCount = await this.getPreviousPeriodCount('documents', userId, startDate, endDate);

    metrics.push({
      id: 'documents_created',
      name: 'Documents Created',
      category: 'productivity',
      value: docCount,
      previousValue: prevDocCount,
      trend: docCount > prevDocCount ? 'up' : docCount < prevDocCount ? 'down' : 'stable',
      changePercentage: this.calculatePercentageChange(docCount, prevDocCount),
      icon: '📄',
      color: '#6C5CE7'
    });

    // Notes taken
    const { data: notes } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const noteCount = notes?.length || 0;

    metrics.push({
      id: 'notes_taken',
      name: 'Notes Taken',
      category: 'productivity',
      value: noteCount,
      trend: noteCount > 10 ? 'up' : 'stable',
      changePercentage: 0,
      icon: '📝',
      color: '#A8E6CF'
    });

    // Workflows executed
    const workflowAnalytics = await WorkflowAutomationService.getWorkflowAnalytics(userId);

    metrics.push({
      id: 'workflows_executed',
      name: 'Workflows Executed',
      category: 'productivity',
      value: workflowAnalytics.totalExecutions,
      trend: workflowAnalytics.successRate > 80 ? 'up' : 'down',
      changePercentage: workflowAnalytics.successRate,
      unit: 'runs',
      icon: '⚡',
      color: '#FFD93D'
    });

    // Time saved (estimate based on automation)
    const timeSaved = Math.round(workflowAnalytics.totalExecutions * 5); // 5 min per workflow

    metrics.push({
      id: 'time_saved',
      name: 'Time Saved',
      category: 'productivity',
      value: timeSaved,
      trend: 'up',
      changePercentage: 0,
      unit: 'minutes',
      icon: '⏱️',
      color: '#6BCF7F'
    });

    return metrics;
  }

  /**
   * Get research metrics
   */
  private static async getResearchMetrics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];

    // Citation network size
    const network = await CitationNetworkService.getNetworkForUser(userId);
    const networkSize = network.nodes.length;

    metrics.push({
      id: 'citation_network',
      name: 'Citation Network Size',
      category: 'research',
      value: networkSize,
      trend: networkSize > 10 ? 'up' : 'stable',
      changePercentage: 0,
      icon: '🔗',
      color: '#FF7979'
    });

    // Cross-document insights
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', userId)
      .limit(20);

    const documentIds = documents?.map(d => d.id) || [];
    const insights = await CrossDocumentInsightsService.analyzeDocumentCollection(
      userId,
      documentIds
    );

    metrics.push({
      id: 'document_relationships',
      name: 'Document Relationships',
      category: 'research',
      value: insights.relationships.length,
      trend: insights.relationships.length > 0 ? 'up' : 'stable',
      changePercentage: 0,
      icon: '🔍',
      color: '#74B9FF'
    });

    // Active workspaces
    const workspaces = await DocumentWorkspaceService.getUserWorkspaces(userId);
    const activeWorkspaces = workspaces.filter(w => {
      const lastUpdate = new Date(w.updatedAt);
      return lastUpdate >= startDate && lastUpdate <= endDate;
    }).length;

    metrics.push({
      id: 'active_workspaces',
      name: 'Active Workspaces',
      category: 'research',
      value: activeWorkspaces,
      trend: activeWorkspaces > 0 ? 'up' : 'down',
      changePercentage: 0,
      icon: '🏢',
      color: '#DFE6E9'
    });

    // Research velocity (docs per week)
    const daysInPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const docsPerWeek = (documentIds.length / daysInPeriod) * 7;

    metrics.push({
      id: 'research_velocity',
      name: 'Research Velocity',
      category: 'research',
      value: Math.round(docsPerWeek * 10) / 10,
      trend: docsPerWeek > 3 ? 'up' : 'stable',
      changePercentage: 0,
      unit: 'docs/week',
      icon: '📈',
      color: '#FDCB6E'
    });

    return metrics;
  }

  /**
   * Get engagement metrics
   */
  private static async getEngagementMetrics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];

    // Daily active use
    const { data: events } = await supabase
      .from('analytics_events')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const uniqueDays = new Set(
      events?.map(e => new Date(e.created_at).toDateString()) || []
    ).size;

    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const activePercentage = (uniqueDays / totalDays) * 100;

    metrics.push({
      id: 'daily_active',
      name: 'Daily Active Use',
      category: 'engagement',
      value: Math.round(activePercentage),
      trend: activePercentage > 70 ? 'up' : activePercentage > 40 ? 'stable' : 'down',
      changePercentage: 0,
      unit: '%',
      icon: '📅',
      color: '#00B894'
    });

    // Feature adoption
    const featuresUsed = await this.getFeatureAdoption(userId, startDate, endDate);
    const totalFeatures = 11; // Total features from README
    const adoptionRate = (featuresUsed / totalFeatures) * 100;

    metrics.push({
      id: 'feature_adoption',
      name: 'Feature Adoption',
      category: 'engagement',
      value: Math.round(adoptionRate),
      trend: adoptionRate > 60 ? 'up' : 'stable',
      changePercentage: 0,
      unit: '%',
      icon: '🚀',
      color: '#E17055'
    });

    // Session duration
    const avgSessionDuration = await this.getAverageSessionDuration(userId, startDate, endDate);

    metrics.push({
      id: 'session_duration',
      name: 'Avg Session Duration',
      category: 'engagement',
      value: Math.round(avgSessionDuration),
      trend: avgSessionDuration > 15 ? 'up' : 'stable',
      changePercentage: 0,
      unit: 'minutes',
      icon: '⏰',
      color: '#FDCB6E'
    });

    // Collaboration score
    const { data: sharedWorkspaces } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);

    const collabScore = Math.min(100, (sharedWorkspaces?.length || 0) * 20);

    metrics.push({
      id: 'collaboration',
      name: 'Collaboration Score',
      category: 'engagement',
      value: collabScore,
      trend: collabScore > 40 ? 'up' : 'stable',
      changePercentage: 0,
      unit: 'points',
      icon: '👥',
      color: '#00CEC9'
    });

    return metrics;
  }

  /**
   * Generate charts for overview
   */
  private static async generateOverviewCharts(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, any>> {
    const charts: Record<string, any> = {};

    // Learning progress chart
    charts.learningProgress = await this.getLearningProgressChart(userId, startDate, endDate);

    // Activity heatmap
    charts.activityHeatmap = await this.getActivityHeatmap(userId, startDate, endDate);

    // Feature usage pie chart
    charts.featureUsage = await this.getFeatureUsageChart(userId, startDate, endDate);

    // Productivity timeline
    charts.productivityTimeline = await this.getProductivityTimeline(userId, startDate, endDate);

    return charts;
  }

  /**
   * Get learning progress chart data
   */
  private static async getLearningProgressChart(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const data: TimeSeriesData[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const { data: reviews } = await supabase
        .from('study_reviews')
        .select('quality')
        .eq('user_id', userId)
        .gte('reviewed_at', date.toISOString())
        .lt('reviewed_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString());

      const avgQuality = reviews?.length > 0
        ? reviews.reduce((sum, r) => sum + r.quality, 0) / reviews.length
        : 0;

      data.push({
        timestamp: date,
        value: avgQuality,
        label: date.toLocaleDateString()
      });
    }

    return {
      type: 'line',
      data,
      config: {
        xAxis: 'Date',
        yAxis: 'Learning Quality',
        color: '#4ECDC4'
      }
    };
  }

  /**
   * Get activity heatmap data
   */
  private static async getActivityHeatmap(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const { data: events } = await supabase
      .from('analytics_events')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const heatmapData: Record<string, number> = {};

    events?.forEach(event => {
      const date = new Date(event.created_at).toDateString();
      heatmapData[date] = (heatmapData[date] || 0) + 1;
    });

    return {
      type: 'heatmap',
      data: heatmapData,
      config: {
        color: 'green',
        title: 'Daily Activity'
      }
    };
  }

  /**
   * Get feature usage chart
   */
  private static async getFeatureUsageChart(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const features = [
      { name: 'Spaced Repetition', table: 'study_reviews' },
      { name: 'Exercises', table: 'exercise_sessions' },
      { name: 'Documents', table: 'documents' },
      { name: 'Notes', table: 'notes' },
      { name: 'Workspaces', table: 'workspace_members' }
    ];

    const usageData = [];

    for (const feature of features) {
      const { count } = await supabase
        .from(feature.table)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      usageData.push({
        name: feature.name,
        value: count || 0
      });
    }

    return {
      type: 'pie',
      data: usageData,
      config: {
        title: 'Feature Usage Distribution'
      }
    };
  }

  /**
   * Get productivity timeline
   */
  private static async getProductivityTimeline(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const timeline = [];
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i += 7) { // Weekly aggregation
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + i);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [docs, notes, exercises] = await Promise.all([
        supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString()),
        supabase
          .from('notes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString()),
        supabase
          .from('exercise_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString())
      ]);

      timeline.push({
        week: `Week ${Math.floor(i / 7) + 1}`,
        documents: docs.count || 0,
        notes: notes.count || 0,
        exercises: exercises.count || 0
      });
    }

    return {
      type: 'bar',
      data: timeline,
      config: {
        stacked: true,
        title: 'Weekly Productivity'
      }
    };
  }

  /**
   * Create custom dashboard
   */
  static async createDashboard(
    userId: string,
    name: string,
    description: string,
    widgets: DashboardWidget[]
  ): Promise<AnalyticsDashboard> {
    try {
      const layout: DashboardLayout = {
        type: 'grid',
        columns: 12,
        gap: 16
      };

      const { data: dashboard, error } = await supabase
        .from('analytics_dashboards')
        .insert({
          user_id: userId,
          name,
          description,
          layout,
          widgets,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: dashboard.id,
        userId: dashboard.user_id,
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        widgets: dashboard.widgets,
        refreshInterval: dashboard.refresh_interval,
        isDefault: dashboard.is_default,
        createdAt: new Date(dashboard.created_at),
        updatedAt: new Date(dashboard.updated_at)
      };
    } catch (error) {
      logger.error('Error creating dashboard:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data
   */
  static async getDashboardData(
    dashboardId: string,
    userId: string
  ): Promise<{ dashboard: AnalyticsDashboard; data: Record<string, any> }> {
    try {
      const { data: dashboard, error } = await supabase
        .from('analytics_dashboards')
        .select('*')
        .eq('id', dashboardId)
        .eq('user_id', userId)
        .single();

      if (error || !dashboard) {
        throw new Error('Dashboard not found');
      }

      const widgetData: Record<string, any> = {};

      // Fetch data for each widget
      for (const widget of dashboard.widgets) {
        widgetData[widget.id] = await this.getWidgetData(
          widget,
          userId,
          widget.config.timeRange || 'month'
        );
      }

      return {
        dashboard: {
          id: dashboard.id,
          userId: dashboard.user_id,
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          widgets: dashboard.widgets,
          refreshInterval: dashboard.refresh_interval,
          isDefault: dashboard.is_default,
          createdAt: new Date(dashboard.created_at),
          updatedAt: new Date(dashboard.updated_at)
        },
        data: widgetData
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get widget data
   */
  private static async getWidgetData(
    widget: DashboardWidget,
    userId: string,
    timeRange: string
  ): Promise<any> {
    const endDate = new Date();
    const startDate = this.getStartDate(timeRange);

    switch (widget.dataSource) {
      case 'study_progress':
        return SpacedRepetitionService.getPerformanceTrends(userId, 30);
      
      case 'exercise_performance':
        return this.getExercisePerformanceData(userId, startDate, endDate);
      
      case 'knowledge_gaps':
        return KnowledgeGapService.detectGaps(userId);
      
      case 'document_activity':
        return this.getDocumentActivityData(userId, startDate, endDate);
      
      case 'workspace_collaboration':
        return this.getWorkspaceCollaborationData(userId);
      
      case 'workflow_executions':
        return WorkflowAutomationService.getExecutionHistory(userId);
      
      case 'citation_network':
        return CitationNetworkService.getNetworkForUser(userId);
      
      default:
        return null;
    }
  }

  /**
   * Track analytics event
   */
  static async trackEvent(
    userId: string,
    eventType: string,
    category: string,
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('analytics_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          category,
          properties,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error tracking event:', error);
    }
  }

  /**
   * Get custom metric
   */
  static async getCustomMetric(
    userId: string,
    metricDefinition: {
      name: string;
      query: string;
      aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min';
      groupBy?: string;
    }
  ): Promise<any> {
    try {
      // This is a simplified version - in production, you'd have a safe query builder
      const { data, error } = await supabase.rpc('calculate_custom_metric', {
        user_id: userId,
        metric_query: metricDefinition.query,
        aggregation: metricDefinition.aggregation,
        group_by: metricDefinition.groupBy
      });

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error calculating custom metric:', error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(
    userId: string,
    format: 'csv' | 'json' | 'excel',
    dataTypes: string[]
  ): Promise<{ url: string; expiresAt: Date }> {
    try {
      const data: Record<string, any> = {};

      // Collect requested data
      for (const dataType of dataTypes) {
        switch (dataType) {
          case 'overview':
            data.overview = await this.getAnalyticsOverview(userId);
            break;
          case 'study_history':
            data.studyHistory = await SpacedRepetitionService.getStudyStats(userId);
            break;
          case 'exercise_results':
            data.exerciseResults = await this.getExerciseResults(userId);
            break;
          case 'documents':
            data.documents = await this.getDocumentAnalytics(userId);
            break;
          default:
            break;
        }
      }

      // Convert to requested format
      let exportData: Buffer;
      let contentType: string;
      let extension: string;

      switch (format) {
        case 'csv':
          exportData = Buffer.from(this.convertToCSV(data));
          contentType = 'text/csv';
          extension = 'csv';
          break;
        case 'json':
          exportData = Buffer.from(JSON.stringify(data, null, 2));
          contentType = 'application/json';
          extension = 'json';
          break;
        case 'excel':
          // In production, use a library like exceljs
          exportData = Buffer.from(JSON.stringify(data, null, 2));
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;
        default:
          throw new Error('Invalid format');
      }

      // Upload to storage
      const fileName = `analytics_export_${userId}_${Date.now()}.${extension}`;
      const { data: upload, error } = await supabase.storage
        .from('exports')
        .upload(fileName, exportData, { contentType });

      if (error) throw error;

      const { data: url } = supabase.storage
        .from('exports')
        .getPublicUrl(fileName);

      return {
        url: url.publicUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      logger.error('Error exporting analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private static getStartDate(timeRange: string): Date {
    const now = new Date();
    const start = new Date(now);

    switch (timeRange) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020); // App inception
        break;
    }

    return start;
  }

  private static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private static async getPreviousPeriodCount(
    table: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodLength);
    const prevEnd = new Date(startDate);

    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', prevStart.toISOString())
      .lt('created_at', prevEnd.toISOString());

    return count || 0;
  }

  private static async getFeatureAdoption(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const features = [
      'study_reviews',
      'exercise_sessions',
      'documents',
      'notes',
      'flashcard_sets',
      'workspace_members',
      'user_workflows',
      'generated_reports'
    ];

    let usedFeatures = 0;

    for (const feature of features) {
      const { count } = await supabase
        .from(feature)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .limit(1);

      if (count && count > 0) usedFeatures++;
    }

    return usedFeatures;
  }

  private static async getAverageSessionDuration(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const { data: events } = await supabase
      .from('analytics_events')
      .select('created_at, event_type')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');

    if (!events || events.length < 2) return 0;

    const sessions = [];
    let sessionStart = null;

    for (const event of events) {
      if (event.event_type === 'session_start') {
        sessionStart = new Date(event.created_at);
      } else if (event.event_type === 'session_end' && sessionStart) {
        const duration = (new Date(event.created_at).getTime() - sessionStart.getTime()) / 60000;
        sessions.push(duration);
        sessionStart = null;
      }
    }

    return sessions.length > 0
      ? sessions.reduce((a, b) => a + b, 0) / sessions.length
      : 15; // Default 15 minutes
  }

  private static async generateInsights(
    metrics: AnalyticsMetric[],
    charts: Record<string, any>
  ): Promise<string[]> {
    const insights: string[] = [];

    // Learning insights
    const studyStreak = metrics.find(m => m.id === 'study_streak');
    if (studyStreak && studyStreak.value > 7) {
      insights.push(`Great job! You're on a ${studyStreak.value}-day study streak 🔥`);
    }

    const accuracy = metrics.find(m => m.id === 'exercise_accuracy');
    if (accuracy && accuracy.value < 60) {
      insights.push('Consider reviewing difficult topics - your exercise accuracy could improve');
    }

    // Productivity insights
    const docsCreated = metrics.find(m => m.id === 'documents_created');
    if (docsCreated && docsCreated.trend === 'up') {
      insights.push(`Document creation up ${docsCreated.changePercentage}% - keep up the momentum!`);
    }

    // Research insights
    const networkSize = metrics.find(m => m.id === 'citation_network');
    if (networkSize && networkSize.value > 20) {
      insights.push('Your citation network is growing! Consider exploring cross-document insights');
    }

    // Engagement insights
    const featureAdoption = metrics.find(m => m.id === 'feature_adoption');
    if (featureAdoption && featureAdoption.value < 50) {
      insights.push('Try exploring more features to get the most out of the platform');
    }

    return insights;
  }

  private static async getExercisePerformanceData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const { data: sessions } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');

    return {
      sessions: sessions || [],
      averageScore: sessions?.reduce((sum, s) => sum + (s.percentage || 0), 0) / (sessions?.length || 1),
      totalTime: sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0
    };
  }

  private static async getDocumentActivityData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const [documents, notes] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ]);

    return {
      documents: documents.data || [],
      notes: notes.data || [],
      totalContent: (documents.data?.length || 0) + (notes.data?.length || 0)
    };
  }

  private static async getWorkspaceCollaborationData(userId: string): Promise<any> {
    const workspaces = await DocumentWorkspaceService.getUserWorkspaces(userId);
    
    const collaborationData = await Promise.all(
      workspaces.map(async (workspace) => {
        const { data: members } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', workspace.id);

        return {
          workspace: workspace.name,
          memberCount: members?.length || 0,
          lastActive: workspace.updatedAt
        };
      })
    );

    return collaborationData;
  }

  private static async getExerciseResults(userId: string): Promise<any> {
    const { data: sessions } = await supabase
      .from('exercise_sessions')
      .select('*, exercise_responses(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    return sessions || [];
  }

  private static async getDocumentAnalytics(userId: string): Promise<any> {
    const { data: documents } = await supabase
      .from('documents')
      .select('*, document_dna(*)')
      .eq('user_id', userId);

    return documents || [];
  }

  private static convertToCSV(data: Record<string, any>): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const lines: string[] = [];
    
    for (const [section, sectionData] of Object.entries(data)) {
      lines.push(`\n${section.toUpperCase()}`);
      
      if (Array.isArray(sectionData)) {
        if (sectionData.length > 0) {
          const headers = Object.keys(sectionData[0]);
          lines.push(headers.join(','));
          
          for (const row of sectionData) {
            lines.push(headers.map(h => String(row[h] || '')).join(','));
          }
        }
      } else if (typeof sectionData === 'object') {
        for (const [key, value] of Object.entries(sectionData)) {
          lines.push(`${key},${value}`);
        }
      }
    }

    return lines.join('\n');
  }
}