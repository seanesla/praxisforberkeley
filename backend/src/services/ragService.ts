import { VectorStoreService } from './vectorStore';
import { ChatMessage } from './ai/aiService';
import logger from '../utils/logger';
import { 
  RAGContext, 
  SourceReference, 
  RelevantChunk,
  RAGSearchOptions,
  SearchMetadata 
} from '../types/ai-features';
import { supabase } from '../config/supabase';
import * as crypto from 'crypto';

export class RAGService {
  /**
   * Extract source references from document context
   */
  static extractSourceReferences(documentContext: string): SourceReference[] {
    const references: SourceReference[] = [];
    
    // Parse the document context which contains numbered excerpts
    const excerptRegex = /\[Excerpt (\d+)\]\n([^[]+?)(?=\n\n---|\n\n\[|$)/gs;
    let match;
    let index = 0;
    
    while ((match = excerptRegex.exec(documentContext)) !== null) {
      const excerpt = match[2].trim();
      if (excerpt) {
        references.push({
          document_id: 'current', // Will be replaced by actual document ID
          passage: excerpt.substring(0, 200) + (excerpt.length > 200 ? '...' : ''),
          relevance: 1 - (index * 0.1), // Decrease relevance by position
          startPosition: 0,
          endPosition: excerpt.length,
          metadata: {
            title: 'Document',
            chunkIndex: index,
            totalChunks: 0 // Will be updated if needed
          }
        });
        index++;
      }
    }
    
    return references;
  }
  static async enhanceMessagesWithContext(
    userId: string,
    messages: ChatMessage[],
    documentId?: string,
    options: RAGSearchOptions = {}
  ): Promise<{ messages: ChatMessage[], context: RAGContext }> {
    const startTime = Date.now();
    logger.info('Enhancing messages with RAG context', { userId, documentId });
    
    // Get the last user message
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();
    
    if (!lastUserMessage) {
      logger.debug('No user message found for context enhancement');
      return { messages, context: { relevantChunks: [] } };
    }
    
    try {
      // Check cache first
      const cachedContext = await this.getCachedContext(userId, lastUserMessage.content);
      if (cachedContext) {
        logger.info('Using cached RAG context');
        return this.buildEnhancedResponse(messages, cachedContext, lastUserMessage);
      }
      
      // Set default options
      const searchOptions: RAGSearchOptions = {
        nResults: 15,
        documentIds: documentId ? [documentId] : undefined,
        includeMetadata: true,
        rerank: true,
        minRelevance: 0.3,
        ...options
      };
      
      // Search for relevant document chunks using enhanced search
      const searchResults = await VectorStoreService.searchDocumentsEnhanced(
        userId,
        lastUserMessage.content,
        searchOptions
      );
      
      logger.info(`Found ${searchResults.length} relevant chunks after filtering`);
      
      if (searchResults.length === 0) {
        return { messages, context: { relevantChunks: [] } };
      }
      
      // Build context from search results
      const relevantChunks: RelevantChunk[] = searchResults.map((result) => ({
        id: result.id,
        text: result.text,
        metadata: result.metadata || {},
        relevance: result.relevance || 0,
        distance: result.distance
      }));
      
      // Calculate search metadata
      const searchMetadata: SearchMetadata = {
        query: lastUserMessage.content,
        searchTime: Date.now() - startTime,
        totalResults: relevantChunks.length,
        reranked: searchOptions.rerank || false,
        filters: searchOptions.documentIds ? { documentIds: searchOptions.documentIds } : undefined
      };
      
      const context: RAGContext = {
        relevantChunks,
        documentId,
        totalChunks: relevantChunks.length,
        searchMetadata
      };
      
      // Cache the context
      await this.cacheContext(userId, lastUserMessage.content, context);
      
      return this.buildEnhancedResponse(messages, context, lastUserMessage);
    } catch (error) {
      logger.error('Error enhancing messages with context', error);
      return { messages, context: { relevantChunks: [] } };
    }
  }
  
  private static buildEnhancedResponse(
    messages: ChatMessage[],
    context: RAGContext,
    lastUserMessage: ChatMessage
  ): { messages: ChatMessage[], context: RAGContext } {
    // Create enhanced system message with context
    const contextMessage: ChatMessage = {
      role: 'system',
      content: this.buildEnhancedContextPrompt(context, lastUserMessage.content)
    };
    
    // Insert context message before the last user message
    const enhancedMessages = [...messages];
    const lastUserIndex = enhancedMessages
      .map((m, i) => m.role === 'user' ? i : -1)
      .filter(i => i !== -1)
      .pop() || 0;
    
    enhancedMessages.splice(lastUserIndex, 0, contextMessage);
    
    logger.debug('Messages enhanced with RAG context');
    
    return {
      messages: enhancedMessages,
      context
    };
  }
  
  private static buildEnhancedContextPrompt(
    context: RAGContext,
    query: string
  ): string {
    const intro = context.documentId
      ? 'Here are the most relevant sections from the document being discussed:'
      : 'Here are the most relevant sections from the user\'s documents:';
    
    // Group chunks by document for better organization
    const chunksByDocument = new Map<string, RelevantChunk[]>();
    context.relevantChunks.forEach(chunk => {
      const docId = chunk.metadata.documentId || 'unknown';
      if (!chunksByDocument.has(docId)) {
        chunksByDocument.set(docId, []);
      }
      chunksByDocument.get(docId)!.push(chunk);
    });
    
    // Build context sections with relevance scores
    const contextSections = Array.from(chunksByDocument.entries())
      .map(([docId, chunks]) => {
        const docTitle = chunks[0].metadata.documentTitle || docId;
        const sections = chunks
          .sort((a, b) => b.relevance - a.relevance)
          .map((chunk, index) => {
            const relevanceIndicator = this.getRelevanceIndicator(chunk.relevance);
            return `
[${relevanceIndicator}] Section ${index + 1} (Relevance: ${(chunk.relevance * 100).toFixed(1)}%)
${chunk.text}
`;
          })
          .join('\n');
        
        return `
=== Document: ${docTitle} ===
${sections}`;
      })
      .join('\n\n');
    
    const searchInfo = context.searchMetadata 
      ? `\nSearch completed in ${context.searchMetadata.searchTime}ms with ${context.searchMetadata.reranked ? 'reranking' : 'standard ranking'}.`
      : '';
    
    return `${intro}${searchInfo}

Query: "${query}"

${contextSections}

Instructions for using this context:
1. Prioritize information from HIGH relevance sections
2. Always cite the document and section number when referencing information
3. If multiple sections contain conflicting information, mention this to the user
4. If the context doesn't fully answer the question, acknowledge what's missing
5. Use exact quotes when precision is important`;
  }
  
  private static getRelevanceIndicator(relevance: number): string {
    if (relevance >= 0.8) return 'HIGH';
    if (relevance >= 0.6) return 'MEDIUM';
    return 'LOW';
  }
  
  static formatSourceReferences(context: RAGContext): SourceReference[] {
    return context.relevantChunks.map((chunk) => ({
      document_id: chunk.metadata.documentId,
      passage: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''),
      relevance: chunk.relevance,
      startPosition: chunk.metadata.startPosition || 0,
      endPosition: chunk.metadata.endPosition || chunk.text.length,
      metadata: {
        title: chunk.metadata.documentTitle || chunk.metadata.title || 'Unknown',
        chunkIndex: chunk.metadata.chunkIndex || 0,
        totalChunks: chunk.metadata.totalChunks || 1
      }
    }));
  }
  
  /**
   * Cache RAG context for performance
   */
  private static async cacheContext(
    userId: string,
    query: string,
    context: RAGContext
  ): Promise<void> {
    try {
      const queryHash = crypto.createHash('sha256').update(query).digest('hex');
      
      await supabase
        .from('rag_context_cache')
        .upsert({
          user_id: userId,
          query_hash: queryHash,
          query_text: query,
          relevant_chunks: context.relevantChunks,
          document_ids: context.relevantChunks.map(c => c.metadata.documentId).filter(Boolean),
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }, {
          onConflict: 'user_id,query_hash'
        });
        
      logger.debug('Cached RAG context', { queryHash });
    } catch (error) {
      logger.error('Failed to cache RAG context', error);
      // Don't throw - caching is optional
    }
  }
  
  /**
   * Retrieve cached RAG context
   */
  private static async getCachedContext(
    userId: string,
    query: string
  ): Promise<RAGContext | null> {
    try {
      const queryHash = crypto.createHash('sha256').update(query).digest('hex');
      
      const { data, error } = await supabase
        .from('rag_context_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) {
        return null;
      }
      
      logger.debug('Found cached RAG context', { queryHash });
      
      return {
        relevantChunks: data.relevant_chunks as RelevantChunk[],
        documentId: data.document_ids?.[0],
        totalChunks: data.relevant_chunks.length,
        searchMetadata: {
          query: data.query_text,
          searchTime: 0, // Cached result
          totalResults: data.relevant_chunks.length,
          reranked: true,
          filters: data.document_ids?.length > 0 ? { documentIds: data.document_ids } : undefined
        }
      };
    } catch (error) {
      logger.error('Failed to get cached context', error);
      return null;
    }
  }
  
  /**
   * Clean expired cache entries
   */
  static async cleanExpiredCache(): Promise<void> {
    try {
      const { error } = await supabase
        .from('rag_context_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (!error) {
        logger.info('Cleaned expired RAG cache entries');
      }
    } catch (error) {
      logger.error('Failed to clean expired cache', error);
    }
  }

  /**
   * Query RAG system with documents
   */
  async query(query: string, options: any = {}): Promise<any> {
    try {
      const { userId, documentIds, includeMetadata } = options;
      
      // Search for relevant content
      const searchResults = await VectorStoreService.searchDocumentsEnhanced(
        userId,
        query,
        {
          nResults: 10,
          documentIds,
          includeMetadata,
          rerank: true,
          minRelevance: 0.3
        }
      );

      // Format results
      const results = searchResults.map(result => ({
        content: result.text,
        metadata: result.metadata,
        relevance: result.relevance || 0,
        documentId: result.metadata?.documentId
      }));

      return {
        query,
        results,
        totalResults: results.length
      };
    } catch (error) {
      logger.error('Error in RAG query:', error);
      throw error;
    }
  }

  /**
   * Get context suggestions for smart notes
   */
  async getContextSuggestions(query: string, options: any = {}): Promise<any[]> {
    try {
      const { userId, documentIds, limit = 5, minScore = 0.7 } = options;
      
      // Search for relevant content
      const searchResults = await VectorStoreService.searchDocumentsEnhanced(
        userId,
        query,
        {
          nResults: limit,
          documentIds,
          includeMetadata: true,
          rerank: true,
          minRelevance: minScore
        }
      );

      // Format as suggestions
      return searchResults.map(result => ({
        content: result.text,
        metadata: {
          ...result.metadata,
          source: result.metadata?.title || 'Unknown Source'
        },
        score: result.relevance || 0
      }));
    } catch (error) {
      logger.error('Error getting context suggestions:', error);
      return [];
    }
  }
}