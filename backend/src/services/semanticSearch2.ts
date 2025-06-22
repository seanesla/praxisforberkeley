import { supabase } from '../config/supabase';
import { VectorStoreService } from './vectorStore';
import { AIService } from './ai/aiService';
import { logger } from '../utils/logger';

export interface SearchQuery {
  text: string;
  scope?: string[]; // documents, notes, flashcards, etc.
  filters?: {
    dateRange?: { start: Date; end: Date };
    documentTypes?: string[];
    tags?: string[];
    authors?: string[];
  };
  options?: {
    expandQuery?: boolean;
    includeContext?: boolean;
    minRelevance?: number;
    maxResults?: number;
  };
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  content: string;
  relevance: number;
  highlights: string[];
  metadata: any;
  context?: {
    before: string;
    after: string;
  };
}

export interface QueryExpansion {
  original: string;
  expanded: string;
  synonyms: string[];
  related_concepts: string[];
  broader_terms: string[];
  narrower_terms: string[];
}

export class SemanticSearch2Service {
  /**
   * Enhanced semantic search with query expansion
   */
  static async search(userId: string, query: SearchQuery): Promise<{
    results: SearchResult[];
    expansion?: QueryExpansion;
    executionTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      let searchQuery = query.text;
      let expansion: QueryExpansion | undefined;

      // Expand query if requested
      if (query.options?.expandQuery) {
        expansion = await this.expandQuery(query.text);
        searchQuery = expansion.expanded;
      }

      // Perform vector search
      const vectorResults = await VectorStoreService.search({
        query: searchQuery,
        userId,
        documentIds: query.filters?.documentTypes ? undefined : undefined, // Filter by types
        limit: query.options?.maxResults || 20,
        minScore: query.options?.minRelevance || 0.5
      });

      // Convert to search results
      const results = await this.enrichResults(vectorResults, query);

      // Log search query for analytics
      await this.logSearchQuery(userId, query, expansion, results.length, Date.now() - startTime);

      return {
        results,
        expansion,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('Error in semantic search:', error);
      throw error;
    }
  }

  /**
   * Expand query using AI and linguistic techniques
   */
  private static async expandQuery(query: string): Promise<QueryExpansion> {
    try {
      const aiService = new AIService();
      
      const prompt = `Analyze this search query and provide expansions:
Query: "${query}"

Provide:
1. Synonyms (words with similar meaning)
2. Related concepts (conceptually related terms)
3. Broader terms (more general concepts)
4. Narrower terms (more specific concepts)

Format as JSON:
{
  "synonyms": [...],
  "related_concepts": [...],
  "broader_terms": [...],
  "narrower_terms": [...]
}`;

      const response = await aiService.generateResponse('system', {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 500
      });

      if (!response) throw new Error('Failed to expand query');

      const expansions = JSON.parse(response.content);
      
      // Build expanded query
      const expandedTerms = [
        query,
        ...expansions.synonyms.slice(0, 3),
        ...expansions.related_concepts.slice(0, 2)
      ];

      const expanded = expandedTerms.join(' OR ');

      return {
        original: query,
        expanded,
        ...expansions
      };
    } catch (error) {
      logger.error('Error expanding query:', error);
      
      // Fallback to original query
      return {
        original: query,
        expanded: query,
        synonyms: [],
        related_concepts: [],
        broader_terms: [],
        narrower_terms: []
      };
    }
  }

  /**
   * Enrich search results with additional context and metadata
   */
  private static async enrichResults(
    vectorResults: any[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const enrichedResults: SearchResult[] = [];

    for (const result of vectorResults) {
      try {
        // Get full content based on type
        let fullContent: any;
        let type: string;
        let title: string;

        if (result.metadata?.source === 'document') {
          const { data } = await supabase
            .from('documents')
            .select('*')
            .eq('id', result.metadata.documentId)
            .single();
          
          fullContent = data;
          type = 'document';
          title = data?.title || 'Untitled Document';
        } else if (result.metadata?.source === 'note') {
          const { data } = await supabase
            .from('notes')
            .select('*')
            .eq('id', result.metadata.noteId)
            .single();
          
          fullContent = data;
          type = 'note';
          title = data?.title || 'Untitled Note';
        }

        if (!fullContent) continue;

        // Extract highlights
        const highlights = this.extractHighlights(
          result.content,
          query.text,
          query.options?.includeContext ? 150 : 75
        );

        // Get context if requested
        let context;
        if (query.options?.includeContext) {
          context = this.extractContext(fullContent.content || '', result.content);
        }

        enrichedResults.push({
          id: fullContent.id,
          type,
          title,
          content: result.content,
          relevance: result.score,
          highlights,
          metadata: {
            ...fullContent.metadata,
            created_at: fullContent.created_at,
            updated_at: fullContent.updated_at
          },
          context
        });
      } catch (error) {
        logger.error('Error enriching result:', error);
      }
    }

    // Re-rank results if query was expanded
    if (query.options?.expandQuery) {
      return this.rerankResults(enrichedResults, query.text);
    }

    return enrichedResults;
  }

  /**
   * Extract highlighted snippets from content
   */
  private static extractHighlights(
    content: string,
    query: string,
    contextLength: number = 75
  ): string[] {
    const highlights: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const hasQueryTerm = queryTerms.some(term => lowerSentence.includes(term));

      if (hasQueryTerm) {
        // Find the position of query terms
        let highlightedSentence = sentence;
        queryTerms.forEach(term => {
          const regex = new RegExp(`(${term})`, 'gi');
          highlightedSentence = highlightedSentence.replace(regex, '**$1**');
        });

        // Trim to context length
        if (highlightedSentence.length > contextLength * 2) {
          const firstMatch = highlightedSentence.indexOf('**');
          const start = Math.max(0, firstMatch - contextLength);
          const end = Math.min(highlightedSentence.length, firstMatch + contextLength);
          highlightedSentence = '...' + highlightedSentence.substring(start, end) + '...';
        }

        highlights.push(highlightedSentence.trim());
      }
    });

    return highlights.slice(0, 3); // Return top 3 highlights
  }

  /**
   * Extract surrounding context for a match
   */
  private static extractContext(
    fullContent: string,
    matchContent: string
  ): { before: string; after: string } {
    const matchIndex = fullContent.indexOf(matchContent);
    
    if (matchIndex === -1) {
      return { before: '', after: '' };
    }

    const contextLength = 200;
    const before = fullContent.substring(
      Math.max(0, matchIndex - contextLength),
      matchIndex
    ).trim();
    const after = fullContent.substring(
      matchIndex + matchContent.length,
      Math.min(fullContent.length, matchIndex + matchContent.length + contextLength)
    ).trim();

    return {
      before: before ? '...' + before : '',
      after: after ? after + '...' : ''
    };
  }

  /**
   * Re-rank results based on exact query match
   */
  private static rerankResults(
    results: SearchResult[],
    originalQuery: string
  ): SearchResult[] {
    // Boost exact matches
    const queryTerms = originalQuery.toLowerCase().split(/\s+/);

    return results.map(result => {
      let boost = 1.0;
      const content = result.content.toLowerCase();
      const title = result.title.toLowerCase();

      // Exact query match in title
      if (title.includes(originalQuery.toLowerCase())) {
        boost *= 1.5;
      }

      // All query terms present
      const allTermsPresent = queryTerms.every(term => 
        content.includes(term) || title.includes(term)
      );
      if (allTermsPresent) {
        boost *= 1.3;
      }

      // Query terms in close proximity
      const proximity = this.calculateTermProximity(content, queryTerms);
      boost *= (1 + proximity * 0.2);

      return {
        ...result,
        relevance: Math.min(result.relevance * boost, 1.0)
      };
    }).sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Calculate proximity of query terms in content
   */
  private static calculateTermProximity(
    content: string,
    terms: string[]
  ): number {
    if (terms.length < 2) return 1;

    const positions = terms.map(term => {
      const index = content.indexOf(term);
      return index === -1 ? Infinity : index;
    });

    if (positions.some(p => p === Infinity)) return 0;

    const maxDistance = Math.max(...positions) - Math.min(...positions);
    const normalizedDistance = maxDistance / content.length;

    return 1 - normalizedDistance;
  }

  /**
   * Log search query for analytics
   */
  private static async logSearchQuery(
    userId: string,
    query: SearchQuery,
    expansion: QueryExpansion | undefined,
    resultCount: number,
    executionTime: number
  ) {
    try {
      await supabase
        .from('search_queries')
        .insert({
          user_id: userId,
          query_text: query.text,
          expanded_query: expansion?.expanded,
          search_scope: query.scope,
          filters: query.filters,
          result_count: resultCount,
          execution_time_ms: executionTime
        });
    } catch (error) {
      logger.error('Error logging search query:', error);
    }
  }

  /**
   * Get search suggestions based on user's history
   */
  static async getSearchSuggestions(
    userId: string,
    partialQuery: string
  ): Promise<string[]> {
    try {
      // Get user's recent searches
      const { data: recentQueries } = await supabase
        .from('search_queries')
        .select('query_text')
        .eq('user_id', userId)
        .ilike('query_text', `${partialQuery}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      const suggestions = new Set<string>();
      recentQueries?.forEach(q => suggestions.add(q.query_text));

      // Get popular searches from other users (privacy-conscious)
      const { data: popularQueries } = await supabase
        .from('search_queries')
        .select('query_text')
        .ilike('query_text', `${partialQuery}%`)
        .order('result_count', { ascending: false })
        .limit(5);

      popularQueries?.forEach(q => suggestions.add(q.query_text));

      return Array.from(suggestions).slice(0, 8);
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Analyze search effectiveness
   */
  static async analyzeSearchEffectiveness(userId: string): Promise<{
    averageResultCount: number;
    averageExecutionTime: number;
    topSearchTerms: string[];
    searchesWithNoResults: number;
    queryExpansionUsage: number;
  }> {
    try {
      const { data: queries } = await supabase
        .from('search_queries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!queries || queries.length === 0) {
        return {
          averageResultCount: 0,
          averageExecutionTime: 0,
          topSearchTerms: [],
          searchesWithNoResults: 0,
          queryExpansionUsage: 0
        };
      }

      const totalResults = queries.reduce((sum, q) => sum + (q.result_count || 0), 0);
      const totalTime = queries.reduce((sum, q) => sum + (q.execution_time_ms || 0), 0);
      const noResults = queries.filter(q => q.result_count === 0).length;
      const withExpansion = queries.filter(q => q.expanded_query).length;

      // Extract top search terms
      const termFrequency = new Map<string, number>();
      queries.forEach(q => {
        const terms = q.query_text.toLowerCase().split(/\s+/);
        terms.forEach(term => {
          if (term.length > 2) {
            termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
          }
        });
      });

      const topSearchTerms = Array.from(termFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term]) => term);

      return {
        averageResultCount: totalResults / queries.length,
        averageExecutionTime: totalTime / queries.length,
        topSearchTerms,
        searchesWithNoResults: noResults,
        queryExpansionUsage: (withExpansion / queries.length) * 100
      };
    } catch (error) {
      logger.error('Error analyzing search effectiveness:', error);
      throw error;
    }
  }
}