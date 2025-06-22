import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { AIService } from './ai/aiService';
import { SpacedRepetitionService } from './spacedRepetition';
import { ExerciseEngineService } from './exerciseEngine';
import { KnowledgeGapService } from './knowledgeGap';
import { CitationNetworkService } from './citationNetwork';
import { CrossDocumentInsightsService } from './crossDocumentInsights';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'learning' | 'research' | 'analytics' | 'custom';
  sections: ReportSection[];
  dataRequirements: string[];
  outputFormat: 'pdf' | 'html' | 'markdown' | 'docx';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'chart' | 'table' | 'metric' | 'ai_analysis';
  dataSource: string;
  configuration: any;
  order: number;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  userId: string;
  title: string;
  content: any;
  format: string;
  metadata: {
    generatedAt: Date;
    dataRange?: { start: Date; end: Date };
    documentIds?: string[];
    parameters?: any;
  };
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: Date;
}

export interface ReportSchedule {
  id: string;
  userId: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  nextRunAt: Date;
  lastRunAt?: Date;
  isActive: boolean;
  parameters?: any;
  recipients?: string[];
}

export class ReportGeneratorService {
  /**
   * Generate a report from template
   */
  static async generateReport(
    userId: string,
    templateId: string,
    parameters?: any
  ): Promise<GeneratedReport> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .eq('active', true)
        .single();

      if (templateError || !template) {
        throw new Error('Template not found');
      }

      // Create report record
      const { data: report, error: reportError } = await supabase
        .from('generated_reports')
        .insert({
          template_id: templateId,
          user_id: userId,
          title: `${template.name} - ${new Date().toLocaleDateString()}`,
          format: template.output_format,
          status: 'generating',
          metadata: {
            generatedAt: new Date(),
            parameters
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Generate report content asynchronously
      this.generateReportContent(report.id, template, userId, parameters);

      return {
        id: report.id,
        templateId: report.template_id,
        userId: report.user_id,
        title: report.title,
        content: null,
        format: report.format,
        metadata: report.metadata,
        status: report.status,
        createdAt: new Date(report.created_at)
      };
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Generate report content
   */
  private static async generateReportContent(
    reportId: string,
    template: any,
    userId: string,
    parameters: any
  ): Promise<void> {
    try {
      const sections = [];

      for (const section of template.sections) {
        const sectionContent = await this.generateSection(
          section,
          userId,
          parameters
        );
        sections.push({
          ...section,
          content: sectionContent
        });
      }

      const content = {
        title: template.name,
        generatedAt: new Date(),
        sections
      };

      // Update report with content
      await supabase
        .from('generated_reports')
        .update({
          content,
          status: 'completed'
        })
        .eq('id', reportId);

      logger.info('Report generated successfully', { reportId });
    } catch (error) {
      logger.error('Error generating report content:', error);
      
      await supabase
        .from('generated_reports')
        .update({
          status: 'failed',
          content: { error: error.message }
        })
        .eq('id', reportId);
    }
  }

  /**
   * Generate a report section
   */
  private static async generateSection(
    section: ReportSection,
    userId: string,
    parameters: any
  ): Promise<any> {
    switch (section.type) {
      case 'text':
        return this.generateTextSection(section, userId, parameters);
      case 'chart':
        return this.generateChartSection(section, userId, parameters);
      case 'table':
        return this.generateTableSection(section, userId, parameters);
      case 'metric':
        return this.generateMetricSection(section, userId, parameters);
      case 'ai_analysis':
        return this.generateAIAnalysisSection(section, userId, parameters);
      default:
        return { error: 'Unknown section type' };
    }
  }

  /**
   * Generate text section
   */
  private static async generateTextSection(
    section: ReportSection,
    userId: string,
    parameters: any
  ): Promise<any> {
    const data = await this.fetchSectionData(section.dataSource, userId, parameters);
    
    return {
      type: 'text',
      content: section.configuration.template
        ? this.processTemplate(section.configuration.template, data)
        : data.text || 'No content available'
    };
  }

  /**
   * Generate chart section
   */
  private static async generateChartSection(
    section: ReportSection,
    userId: string,
    parameters: any
  ): Promise<any> {
    const data = await this.fetchSectionData(section.dataSource, userId, parameters);
    
    return {
      type: 'chart',
      chartType: section.configuration.chartType || 'line',
      data: this.processChartData(data, section.configuration),
      options: section.configuration.options || {}
    };
  }

  /**
   * Generate table section
   */
  private static async generateTableSection(
    section: ReportSection,
    userId: string,
    parameters: any
  ): Promise<any> {
    const data = await this.fetchSectionData(section.dataSource, userId, parameters);
    
    return {
      type: 'table',
      headers: section.configuration.headers || Object.keys(data[0] || {}),
      rows: this.processTableData(data, section.configuration)
    };
  }

  /**
   * Generate metric section
   */
  private static async generateMetricSection(
    section: ReportSection,
    userId: string,
    parameters: any
  ): Promise<any> {
    const data = await this.fetchSectionData(section.dataSource, userId, parameters);
    
    return {
      type: 'metric',
      value: this.calculateMetric(data, section.configuration),
      label: section.configuration.label,
      format: section.configuration.format,
      trend: await this.calculateTrend(section.dataSource, userId, parameters)
    };
  }

  /**
   * Generate AI analysis section
   */
  private static async generateAIAnalysisSection(
    section: ReportSection,
    userId: string,
    parameters: any
  ): Promise<any> {
    const data = await this.fetchSectionData(section.dataSource, userId, parameters);
    const aiService = new AIService();

    const prompt = section.configuration.prompt || 
      `Analyze the following data and provide insights:\n${JSON.stringify(data, null, 2)}`;

    const response = await aiService.generateResponse('system', {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 1000
    });

    return {
      type: 'ai_analysis',
      content: response?.content || 'Unable to generate analysis',
      data: data
    };
  }

  /**
   * Fetch data for a section
   */
  private static async fetchSectionData(
    dataSource: string,
    userId: string,
    parameters: any
  ): Promise<any> {
    switch (dataSource) {
      case 'study_stats':
        return SpacedRepetitionService.getStudyStats(userId);
      
      case 'exercise_analytics':
        const { data } = await supabase
          .from('exercise_sessions')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', parameters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
        return data || [];
      
      case 'knowledge_gaps':
        const gaps = await KnowledgeGapService.detectGaps(userId);
        return gaps;
      
      case 'citation_network':
        const network = await CitationNetworkService.getNetworkForUser(userId);
        return network;
      
      case 'document_insights':
        const insights = await CrossDocumentInsightsService.analyzeDocumentCollection(
          userId,
          parameters?.documentIds
        );
        return insights;
      
      case 'learning_progress':
        return this.getLearningProgress(userId, parameters);
      
      case 'research_summary':
        return this.getResearchSummary(userId, parameters);
      
      default:
        return {};
    }
  }

  /**
   * Get learning progress data
   */
  private static async getLearningProgress(userId: string, parameters: any): Promise<any> {
    const [studyStats, exerciseStats, gaps] = await Promise.all([
      SpacedRepetitionService.getStudyStats(userId),
      this.getExerciseStats(userId, parameters),
      KnowledgeGapService.detectGaps(userId)
    ]);

    return {
      studyStats,
      exerciseStats,
      knowledgeGaps: gaps,
      overallProgress: this.calculateOverallProgress(studyStats, exerciseStats, gaps)
    };
  }

  /**
   * Get research summary data
   */
  private static async getResearchSummary(userId: string, parameters: any): Promise<any> {
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', parameters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', parameters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return {
      documentCount: documents?.length || 0,
      noteCount: notes?.length || 0,
      recentDocuments: documents?.slice(0, 5) || [],
      recentNotes: notes?.slice(0, 5) || [],
      topTags: await this.getTopTags(userId),
      researchThemes: await this.extractResearchThemes(documents || [], notes || [])
    };
  }

  /**
   * Get exercise statistics
   */
  private static async getExerciseStats(userId: string, parameters: any): Promise<any> {
    const { data: sessions } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', parameters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter(s => s.completed_at).length || 0;
    const totalTime = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
    const avgAccuracy = sessions?.reduce((sum, s) => sum + (s.percentage || 0), 0) / totalSessions || 0;

    return {
      totalSessions,
      completedSessions,
      totalTime,
      avgAccuracy,
      sessionsByType: this.groupSessionsByType(sessions || [])
    };
  }

  /**
   * Create report from user activity
   */
  static async createActivityReport(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<GeneratedReport> {
    try {
      // Get comprehensive user activity
      const [
        studyActivity,
        exerciseActivity,
        documentActivity,
        noteActivity
      ] = await Promise.all([
        this.getStudyActivity(userId, dateRange),
        this.getExerciseActivity(userId, dateRange),
        this.getDocumentActivity(userId, dateRange),
        this.getNoteActivity(userId, dateRange)
      ]);

      const aiService = new AIService();
      const analysisPrompt = `Generate a comprehensive activity report based on the following data:

Study Activity:
${JSON.stringify(studyActivity, null, 2)}

Exercise Activity:
${JSON.stringify(exerciseActivity, null, 2)}

Document Activity:
${JSON.stringify(documentActivity, null, 2)}

Note Activity:
${JSON.stringify(noteActivity, null, 2)}

Provide:
1. Executive summary
2. Key achievements
3. Areas of improvement
4. Recommendations

Format as structured JSON.`;

      const response = await aiService.generateResponse('system', {
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.7,
        maxTokens: 1500
      });

      const analysis = response ? JSON.parse(response.content) : {};

      // Create report
      const { data: report, error } = await supabase
        .from('generated_reports')
        .insert({
          template_id: 'activity-report',
          user_id: userId,
          title: `Activity Report: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
          content: {
            summary: analysis.summary,
            achievements: analysis.achievements,
            improvements: analysis.improvements,
            recommendations: analysis.recommendations,
            rawData: {
              studyActivity,
              exerciseActivity,
              documentActivity,
              noteActivity
            }
          },
          format: 'html',
          status: 'completed',
          metadata: {
            generatedAt: new Date(),
            dataRange: dateRange
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: report.id,
        templateId: report.template_id,
        userId: report.user_id,
        title: report.title,
        content: report.content,
        format: report.format,
        metadata: report.metadata,
        status: report.status,
        createdAt: new Date(report.created_at)
      };
    } catch (error) {
      logger.error('Error creating activity report:', error);
      throw error;
    }
  }

  /**
   * Schedule recurring report
   */
  static async scheduleReport(
    userId: string,
    templateId: string,
    frequency: ReportSchedule['frequency'],
    parameters?: any,
    recipients?: string[]
  ): Promise<ReportSchedule> {
    try {
      const nextRunAt = this.calculateNextRunDate(frequency);

      const { data: schedule, error } = await supabase
        .from('report_schedules')
        .insert({
          user_id: userId,
          template_id: templateId,
          frequency,
          next_run_at: nextRunAt.toISOString(),
          is_active: true,
          parameters,
          recipients,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: schedule.id,
        userId: schedule.user_id,
        templateId: schedule.template_id,
        frequency: schedule.frequency,
        nextRunAt: new Date(schedule.next_run_at),
        lastRunAt: schedule.last_run_at ? new Date(schedule.last_run_at) : undefined,
        isActive: schedule.is_active,
        parameters: schedule.parameters,
        recipients: schedule.recipients
      };
    } catch (error) {
      logger.error('Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * Export report in specified format
   */
  static async exportReport(
    reportId: string,
    format: 'pdf' | 'html' | 'markdown' | 'docx'
  ): Promise<{ url: string; expiresAt: Date }> {
    try {
      const { data: report, error } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error || !report) {
        throw new Error('Report not found');
      }

      // Convert content to requested format
      const convertedContent = await this.convertReportFormat(
        report.content,
        report.format,
        format
      );

      // Generate temporary download URL
      const fileName = `report_${reportId}_${Date.now()}.${format}`;
      const { data: upload, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, convertedContent, {
          contentType: this.getContentType(format)
        });

      if (uploadError) throw uploadError;

      const { data: url } = supabase.storage
        .from('reports')
        .getPublicUrl(fileName);

      return {
        url: url.publicUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      logger.error('Error exporting report:', error);
      throw error;
    }
  }

  // Helper methods
  private static processTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private static processChartData(data: any[], config: any): any {
    return {
      labels: data.map(d => d[config.labelField] || ''),
      datasets: config.valueFields.map((field: any) => ({
        label: field.label,
        data: data.map(d => d[field.name] || 0),
        ...field.style
      }))
    };
  }

  private static processTableData(data: any[], config: any): any[] {
    return data.map(row => {
      const processedRow: any = {};
      config.columns.forEach((col: any) => {
        processedRow[col.key] = col.formatter
          ? this.formatValue(row[col.field], col.formatter)
          : row[col.field];
      });
      return processedRow;
    });
  }

  private static calculateMetric(data: any, config: any): number {
    switch (config.calculation) {
      case 'sum':
        return data.reduce((sum: number, item: any) => sum + (item[config.field] || 0), 0);
      case 'average':
        return data.reduce((sum: number, item: any) => sum + (item[config.field] || 0), 0) / data.length;
      case 'count':
        return data.length;
      case 'percentage':
        const matching = data.filter((item: any) => item[config.field] === config.matchValue).length;
        return (matching / data.length) * 100;
      default:
        return 0;
    }
  }

  private static async calculateTrend(
    dataSource: string,
    userId: string,
    parameters: any
  ): Promise<{ direction: 'up' | 'down' | 'stable'; percentage: number }> {
    // Compare current period with previous period
    const currentData = await this.fetchSectionData(dataSource, userId, parameters);
    const previousData = await this.fetchSectionData(dataSource, userId, {
      ...parameters,
      startDate: new Date(new Date(parameters.startDate).getTime() - 30 * 24 * 60 * 60 * 1000)
    });

    const currentValue = Array.isArray(currentData) ? currentData.length : currentData.value || 0;
    const previousValue = Array.isArray(previousData) ? previousData.length : previousData.value || 0;

    const change = ((currentValue - previousValue) / previousValue) * 100;

    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      percentage: Math.abs(change)
    };
  }

  private static calculateNextRunDate(frequency: ReportSchedule['frequency']): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case 'quarterly':
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter;
      default:
        return now;
    }
  }

  private static formatValue(value: any, formatter: string): string {
    switch (formatter) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        return `${Math.floor(value / 60)}m ${value % 60}s`;
      default:
        return String(value);
    }
  }

  private static getContentType(format: string): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'html':
        return 'text/html';
      case 'markdown':
        return 'text/markdown';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'text/plain';
    }
  }

  private static async convertReportFormat(
    content: any,
    fromFormat: string,
    toFormat: string
  ): Promise<Buffer> {
    // This is a simplified version - in production, you'd use proper conversion libraries
    let convertedContent = '';

    if (toFormat === 'html') {
      convertedContent = this.generateHTMLReport(content);
    } else if (toFormat === 'markdown') {
      convertedContent = this.generateMarkdownReport(content);
    } else {
      // For PDF and DOCX, you'd use libraries like puppeteer or docx
      convertedContent = JSON.stringify(content, null, 2);
    }

    return Buffer.from(convertedContent);
  }

  private static generateHTMLReport(content: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${content.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .section { margin: 20px 0; }
    .metric { font-size: 24px; font-weight: bold; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${content.title}</h1>
  <p>Generated: ${new Date(content.generatedAt).toLocaleString()}</p>
  ${content.sections.map((section: any) => this.renderHTMLSection(section)).join('')}
</body>
</html>`;
  }

  private static renderHTMLSection(section: any): string {
    switch (section.content.type) {
      case 'text':
        return `<div class="section"><h2>${section.title}</h2><p>${section.content.content}</p></div>`;
      case 'metric':
        return `<div class="section"><h2>${section.title}</h2><div class="metric">${section.content.value} ${section.content.label}</div></div>`;
      case 'table':
        return `<div class="section"><h2>${section.title}</h2>${this.renderHTMLTable(section.content)}</div>`;
      default:
        return `<div class="section"><h2>${section.title}</h2><pre>${JSON.stringify(section.content, null, 2)}</pre></div>`;
    }
  }

  private static renderHTMLTable(content: any): string {
    return `<table>
      <thead><tr>${content.headers.map((h: string) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${content.rows.map((row: any) => 
        `<tr>${content.headers.map((h: string) => `<td>${row[h] || ''}</td>`).join('')}</tr>`
      ).join('')}</tbody>
    </table>`;
  }

  private static generateMarkdownReport(content: any): string {
    return `# ${content.title}

Generated: ${new Date(content.generatedAt).toLocaleString()}

${content.sections.map((section: any) => this.renderMarkdownSection(section)).join('\n\n')}`;
  }

  private static renderMarkdownSection(section: any): string {
    switch (section.content.type) {
      case 'text':
        return `## ${section.title}\n\n${section.content.content}`;
      case 'metric':
        return `## ${section.title}\n\n**${section.content.value}** ${section.content.label}`;
      case 'table':
        return `## ${section.title}\n\n${this.renderMarkdownTable(section.content)}`;
      default:
        return `## ${section.title}\n\n\`\`\`json\n${JSON.stringify(section.content, null, 2)}\n\`\`\``;
    }
  }

  private static renderMarkdownTable(content: any): string {
    const headers = content.headers.join(' | ');
    const separator = content.headers.map(() => '---').join(' | ');
    const rows = content.rows.map((row: any) => 
      content.headers.map((h: string) => row[h] || '').join(' | ')
    ).join('\n');
    
    return `${headers}\n${separator}\n${rows}`;
  }

  // Activity data fetching methods
  private static async getStudyActivity(userId: string, dateRange: { start: Date; end: Date }) {
    const { data } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
    
    return data || [];
  }

  private static async getExerciseActivity(userId: string, dateRange: { start: Date; end: Date }) {
    const { data } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
    
    return data || [];
  }

  private static async getDocumentActivity(userId: string, dateRange: { start: Date; end: Date }) {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
    
    return data || [];
  }

  private static async getNoteActivity(userId: string, dateRange: { start: Date; end: Date }) {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
    
    return data || [];
  }

  private static calculateOverallProgress(studyStats: any, exerciseStats: any, gaps: any[]): number {
    const studyProgress = studyStats.cardsReviewed > 0 ? Math.min(studyStats.cardsReviewed / 100, 1) : 0;
    const exerciseProgress = exerciseStats.avgAccuracy / 100;
    const gapProgress = gaps.length > 0 ? (gaps.filter(g => g.severity < 0.5).length / gaps.length) : 1;
    
    return ((studyProgress + exerciseProgress + gapProgress) / 3) * 100;
  }

  private static async getTopTags(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('documents')
      .select('tags')
      .eq('user_id', userId);
    
    const tagCounts: Record<string, number> = {};
    data?.forEach(doc => {
      doc.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  private static async extractResearchThemes(documents: any[], notes: any[]): Promise<string[]> {
    const aiService = new AIService();
    const content = [
      ...documents.map(d => d.title + ' ' + (d.content?.substring(0, 200) || '')),
      ...notes.map(n => n.title + ' ' + (n.content?.substring(0, 200) || ''))
    ].join('\n');

    const response = await aiService.generateResponse('system', {
      messages: [{
        role: 'user',
        content: `Extract 5 main research themes from this content:\n${content}\n\nReturn as JSON array of theme names.`
      }],
      temperature: 0.7,
      maxTokens: 200
    });

    try {
      return response ? JSON.parse(response.content) : [];
    } catch {
      return [];
    }
  }

  private static groupSessionsByType(sessions: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    sessions.forEach(session => {
      const type = session.session_type || 'practice';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }
}