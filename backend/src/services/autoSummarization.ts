import { AIService } from './ai/aiService';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export type SummaryLevel = 'one_sentence' | 'one_paragraph' | 'one_page' | 'key_points' | 'outline';

interface SummaryResult {
  level: SummaryLevel;
  content: string;
  metadata: {
    wordCount: number;
    readingTime: number; // in seconds
    keyTopics: string[];
  };
}

export class AutoSummarizationService {
  private static readonly SUMMARY_PROMPTS: Record<SummaryLevel, string> = {
    one_sentence: `Summarize the following document in exactly one clear, comprehensive sentence that captures the main idea:`,
    
    one_paragraph: `Summarize the following document in one paragraph (3-5 sentences) that covers the main points, key arguments, and conclusions:`,
    
    one_page: `Provide a one-page summary (approximately 300-500 words) of the following document. Include:
    1. Main thesis or purpose
    2. Key arguments or findings
    3. Supporting evidence
    4. Conclusions or implications
    5. Any important caveats or limitations`,
    
    key_points: `Extract the key points from the following document as a bulleted list. Include:
    - Main ideas (3-5 points)
    - Supporting arguments (2-3 per main idea)
    - Important facts or statistics
    - Conclusions or takeaways
    Format as a hierarchical bullet list.`,
    
    outline: `Create a detailed outline of the following document with:
    I. Main sections
       A. Subsections
          1. Key points
          2. Supporting details
    Include all major topics and their relationships.`
  };

  static async generateAllSummaries(
    documentId: string,
    documentContent: string,
    userId: string
  ): Promise<SummaryResult[]> {
    logger.info('Generating all summary levels for document', { documentId });
    
    const summaries: SummaryResult[] = [];
    const levels: SummaryLevel[] = ['one_sentence', 'one_paragraph', 'one_page', 'key_points', 'outline'];
    
    // Check cache first for each level
    const cachedSummaries = await this.getCachedSummaries(documentId);
    const levelsToGenerate = levels.filter(level => 
      !cachedSummaries.find(s => s.level === level)
    );
    
    // Add cached summaries to results
    summaries.push(...cachedSummaries);
    
    if (levelsToGenerate.length > 0) {
      logger.info(`Generating ${levelsToGenerate.length} missing summary levels`, { levelsToGenerate });
      
      // Generate missing summaries in parallel
      const summaryPromises = levelsToGenerate.map(level => 
        this.generateSummary(documentContent, level, userId)
      );
      
      const results = await Promise.all(summaryPromises);
      
      // Save to database
      for (const summary of results) {
        await this.saveSummary(documentId, summary);
        summaries.push(summary);
      }
    }
    
    // Sort by level order
    return summaries.sort((a, b) => 
      levels.indexOf(a.level) - levels.indexOf(b.level)
    );
  }

  static async generateSummary(
    content: string,
    level: SummaryLevel,
    userId: string,
    documentId?: string
  ): Promise<SummaryResult> {
    logger.debug('Generating summary level', { level, documentId });
    
    // Check cache if documentId provided
    if (documentId) {
      const cached = await this.getSummary(documentId, level);
      if (cached) {
        logger.debug('Using cached summary', { documentId, level });
        return cached;
      }
    }
    
    const prompt = this.SUMMARY_PROMPTS[level];
    const fullPrompt = `${prompt}\n\nDocument:\n${content}`;
    
    try {
      // Get the summary from AI
      const response = await AIService.generateResponse(userId, {
        messages: [
          { role: 'system', content: 'You are an expert at creating clear, accurate summaries. Follow the instructions precisely.' },
          { role: 'user', content: fullPrompt }
        ]
      });
      
      const summaryContent = response.content;
      
      // Extract key topics using a simple approach
      const keyTopics = this.extractKeyTopics(content);
      
      // Calculate metadata
      const wordCount = summaryContent.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200 * 60); // 200 words per minute
      
      return {
        level,
        content: summaryContent,
        metadata: {
          wordCount,
          readingTime,
          keyTopics
        }
      };
    } catch (error) {
      logger.error('Error generating summary', error);
      throw error;
    }
  }

  static async getSummary(
    documentId: string,
    level: SummaryLevel
  ): Promise<SummaryResult | null> {
    logger.debug('Fetching summary', { documentId, level });
    
    const { data, error } = await supabase
      .from('document_summaries')
      .select('*')
      .eq('document_id', documentId)
      .eq('summary_level', level)
      .single();
    
    if (error || !data) {
      logger.debug('Summary not found', error);
      return null;
    }
    
    return {
      level: data.summary_level as SummaryLevel,
      content: data.content,
      metadata: data.metadata
    };
  }

  static async generateProgressiveSummary(
    documentId: string,
    targetLevel: SummaryLevel,
    userId: string
  ): Promise<SummaryResult[]> {
    logger.info('Generating progressive summary', { documentId, targetLevel });
    
    // Generate summaries progressively from shortest to target level
    const levels: SummaryLevel[] = ['one_sentence', 'one_paragraph', 'one_page', 'key_points', 'outline'];
    const targetIndex = levels.indexOf(targetLevel);
    const levelsToGenerate = levels.slice(0, targetIndex + 1);
    
    // Check what summaries already exist
    const existingSummaries = await this.getCachedSummaries(documentId);
    const summaries: SummaryResult[] = [];
    
    // Fetch document content once
    const { data: doc } = await supabase
      .from('documents')
      .select('content')
      .eq('id', documentId)
      .single();
    
    if (!doc) throw new Error('Document not found');
    
    // Generate missing summaries in order (progressive)
    for (const level of levelsToGenerate) {
      const existing = existingSummaries.find(s => s.level === level);
      if (existing) {
        summaries.push(existing);
      } else {
        // Use previous summary as context for better progressive summarization
        const previousSummary = summaries.length > 0 
          ? summaries[summaries.length - 1].content 
          : null;
        
        const summary = await this.generateProgressiveLevelSummary(
          doc.content,
          level,
          userId,
          previousSummary
        );
        
        await this.saveSummary(documentId, summary);
        summaries.push(summary);
      }
    }
    
    return summaries;
  }

  static async generateComparativeSummary(
    documentIds: string[],
    userId: string
  ): Promise<string> {
    logger.info('Generating comparative summary for documents', { documentIds });
    
    // Fetch all documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, content')
      .in('id', documentIds);
    
    if (!documents || documents.length === 0) {
      throw new Error('Documents not found');
    }
    
    // Create a prompt for comparative analysis
    const docSummaries = documents.map(doc => 
      `Document: ${doc.title}\nContent: ${doc.content.substring(0, 1000)}...`
    ).join('\n\n---\n\n');
    
    const prompt = `Compare and contrast the following documents. Identify:
    1. Common themes and ideas
    2. Key differences in perspective or approach
    3. Complementary information
    4. Contradictions or conflicts
    5. Overall synthesis
    
    ${docSummaries}`;
    
    const response = await AIService.generateResponse(userId, {
      messages: [
        { role: 'system', content: 'You are an expert at comparative analysis and synthesis.' },
        { role: 'user', content: prompt }
      ]
    });
    
    return response.content;
  }

  private static async saveSummary(
    documentId: string,
    summary: SummaryResult
  ): Promise<void> {
    const { error } = await supabase
      .from('document_summaries')
      .upsert({
        document_id: documentId,
        summary_level: summary.level,
        content: summary.content,
        metadata: summary.metadata,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'document_id,summary_level'
      });
    
    if (error) {
      logger.error('Error saving summary', error);
      throw error;
    }
  }

  private static extractKeyTopics(content: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'about', 'as', 'is', 'was', 'are', 'were',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which'
    ]);
    
    const wordFreq: Map<string, number> = new Map();
    
    words.forEach(word => {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordFreq.set(cleaned, (wordFreq.get(cleaned) || 0) + 1);
      }
    });
    
    // Get top 10 topics
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Get all cached summaries for a document
   */
  private static async getCachedSummaries(
    documentId: string
  ): Promise<SummaryResult[]> {
    logger.debug('Fetching all cached summaries', { documentId });
    
    const { data, error } = await supabase
      .from('document_summaries')
      .select('*')
      .eq('document_id', documentId);
    
    if (error || !data) {
      logger.debug('No cached summaries found', error);
      return [];
    }
    
    return data.map(row => ({
      level: row.summary_level as SummaryLevel,
      content: row.content,
      metadata: row.metadata
    }));
  }

  /**
   * Invalidate cached summaries when document is updated
   */
  static async invalidateSummaries(documentId: string): Promise<void> {
    logger.info('Invalidating cached summaries', { documentId });
    
    const { error } = await supabase
      .from('document_summaries')
      .delete()
      .eq('document_id', documentId);
    
    if (error) {
      logger.error('Error invalidating summaries', error);
      throw error;
    }
  }

  /**
   * Get summary statistics for a user
   */
  static async getSummaryStats(userId: string): Promise<{
    totalSummaries: number;
    summariesByLevel: Record<SummaryLevel, number>;
    avgReadingTime: number;
    totalDocuments: number;
  }> {
    logger.debug('Getting summary statistics', { userId });
    
    // Get all summaries for user's documents
    const { data: summaries } = await supabase
      .from('document_summaries')
      .select('*, documents!inner(user_id)')
      .eq('documents.user_id', userId);
    
    if (!summaries || summaries.length === 0) {
      return {
        totalSummaries: 0,
        summariesByLevel: {
          one_sentence: 0,
          one_paragraph: 0,
          one_page: 0,
          key_points: 0,
          outline: 0
        },
        avgReadingTime: 0,
        totalDocuments: 0
      };
    }
    
    const summariesByLevel = summaries.reduce((acc, s) => {
      acc[s.summary_level as SummaryLevel] = (acc[s.summary_level as SummaryLevel] || 0) + 1;
      return acc;
    }, {} as Record<SummaryLevel, number>);
    
    const totalReadingTime = summaries.reduce((sum, s) => 
      sum + (s.metadata?.readingTime || 0), 0
    );
    
    const uniqueDocuments = new Set(summaries.map(s => s.document_id)).size;
    
    return {
      totalSummaries: summaries.length,
      summariesByLevel,
      avgReadingTime: Math.round(totalReadingTime / summaries.length),
      totalDocuments: uniqueDocuments
    };
  }

  static async generateAdaptiveSummary(
    documentId: string,
    userPreferences: {
      readingLevel: 'beginner' | 'intermediate' | 'advanced';
      timeAvailable: number; // in minutes
      focusAreas?: string[];
    },
    userId: string
  ): Promise<SummaryResult> {
    logger.info('Generating adaptive summary', { userPreferences });
    
    // Determine appropriate level based on time
    let level: SummaryLevel;
    if (userPreferences.timeAvailable < 1) {
      level = 'one_sentence';
    } else if (userPreferences.timeAvailable < 3) {
      level = 'one_paragraph';
    } else if (userPreferences.timeAvailable < 10) {
      level = 'key_points';
    } else {
      level = 'one_page';
    }
    
    // Fetch document
    const { data: doc } = await supabase
      .from('documents')
      .select('content')
      .eq('id', documentId)
      .single();
    
    if (!doc) throw new Error('Document not found');
    
    // Create adaptive prompt
    const readingLevelPrompts = {
      beginner: 'Use simple language and explain technical terms.',
      intermediate: 'Use clear language with some technical terms where appropriate.',
      advanced: 'Use precise technical language and assume domain knowledge.'
    };
    
    let prompt = `${this.SUMMARY_PROMPTS[level]}\n\n`;
    prompt += `Reading level: ${readingLevelPrompts[userPreferences.readingLevel]}\n`;
    
    if (userPreferences.focusAreas && userPreferences.focusAreas.length > 0) {
      prompt += `Focus especially on: ${userPreferences.focusAreas.join(', ')}\n`;
    }
    
    prompt += `\nDocument:\n${doc.content}`;
    
    const response = await AIService.generateResponse(userId, {
      messages: [
        { role: 'system', content: 'You are an expert at creating adaptive summaries for different audiences.' },
        { role: 'user', content: prompt }
      ]
    });
    
    const summaryContent = response.content;
    const wordCount = summaryContent.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200 * 60);
    
    return {
      level,
      content: summaryContent,
      metadata: {
        wordCount,
        readingTime,
        keyTopics: this.extractKeyTopics(doc.content)
      }
    };
  }

  /**
   * Generate a summary using previous level as context
   */
  private static async generateProgressiveLevelSummary(
    content: string,
    level: SummaryLevel,
    userId: string,
    previousSummary: string | null
  ): Promise<SummaryResult> {
    logger.debug('Generating progressive level summary', { level, hasPrevious: !!previousSummary });
    
    let prompt = this.SUMMARY_PROMPTS[level];
    
    // Add context from previous summary if available
    if (previousSummary) {
      prompt = `Based on this shorter summary:\n${previousSummary}\n\n${prompt}`;
    }
    
    const fullPrompt = `${prompt}\n\nDocument:\n${content}`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating clear, accurate summaries. Build upon previous summaries to create progressively more detailed versions.'
          },
          { role: 'user', content: fullPrompt }
        ]
      });
      
      const summaryContent = response.content;
      const keyTopics = this.extractKeyTopics(content);
      const wordCount = summaryContent.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200 * 60);
      
      return {
        level,
        content: summaryContent,
        metadata: {
          wordCount,
          readingTime,
          keyTopics
        }
      };
    } catch (error) {
      logger.error('Error generating progressive summary', error);
      throw error;
    }
  }

  /**
   * Batch generate summaries for multiple documents
   */
  static async batchGenerateSummaries(
    documentIds: string[],
    levels: SummaryLevel[],
    userId: string
  ): Promise<Map<string, SummaryResult[]>> {
    logger.info('Batch generating summaries', { documentCount: documentIds.length, levels });
    
    const results = new Map<string, SummaryResult[]>();
    
    // Process in batches of 5 to avoid overwhelming the AI service
    const batchSize = 5;
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (docId) => {
        // Fetch document
        const { data: doc } = await supabase
          .from('documents')
          .select('content')
          .eq('id', docId)
          .single();
        
        if (!doc) {
          logger.warn('Document not found for batch summary', { docId });
          return { docId, summaries: [] };
        }
        
        // Check cache first
        const cached = await this.getCachedSummaries(docId);
        const cachedLevels = cached.map(s => s.level);
        const missingLevels = levels.filter(l => !cachedLevels.includes(l));
        
        // Generate missing summaries
        const newSummaries: SummaryResult[] = [];
        for (const level of missingLevels) {
          const summary = await this.generateSummary(doc.content, level, userId, docId);
          await this.saveSummary(docId, summary);
          newSummaries.push(summary);
        }
        
        return { 
          docId, 
          summaries: [...cached, ...newSummaries].sort((a, b) => 
            levels.indexOf(a.level) - levels.indexOf(b.level)
          )
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ docId, summaries }) => {
        results.set(docId, summaries);
      });
    }
    
    return results;
  }
}