import { ChromaDBConfig } from '../config/chromadb';
import { Collection } from 'chromadb';
import { supabase } from '../config/supabase';
import { AIService } from './ai/aiService';
import logger from '../utils/logger';
import { 
  DocumentChunk, 
  ChunkWithPosition, 
  VectorSearchResult,
  ChunkMetadata,
  RAGSearchOptions 
} from '../types/ai-features';
import * as crypto from 'crypto';

export class VectorStoreService {
  private static collections: Map<string, Collection> = new Map();
  
  /**
   * Generate a simple hash-based embedding for text
   * This is a deterministic approach that doesn't require external APIs
   */
  private static async generateSemanticEmbedding(text: string): Promise<number[]> {
    // Create a 384-dimensional embedding (similar to sentence-transformers models)
    const embedding = new Array(384).fill(0);
    
    // Convert text to lowercase and split into tokens
    const tokens = text.toLowerCase().split(/\s+/);
    
    // Simple hash-based approach for deterministic embeddings
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let hash = 0;
      
      // Generate hash for each token
      for (let j = 0; j < token.length; j++) {
        hash = ((hash << 5) - hash) + token.charCodeAt(j);
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Distribute hash across embedding dimensions
      const index = Math.abs(hash) % 384;
      embedding[index] += 1.0 / Math.sqrt(tokens.length);
      
      // Add some neighboring dimensions for smoothness
      if (index > 0) embedding[index - 1] += 0.5 / Math.sqrt(tokens.length);
      if (index < 383) embedding[index + 1] += 0.5 / Math.sqrt(tokens.length);
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }
  
  static async getEmbeddingFunction(userId: string) {
    logger.debug('Getting embedding function for user');
    
    // Return a custom embedding function using Claude for semantic understanding
    return {
      generate: async (texts: string[]) => {
        logger.debug(`Generating embeddings for ${texts.length} texts`);
        try {
          const embeddings: number[][] = [];
          
          for (const text of texts) {
            // Use Claude to generate semantic features as a simple embedding
            const embedding = await this.generateSemanticEmbedding(text);
            embeddings.push(embedding);
          }
          
          return embeddings;
        } catch (error) {
          logger.error('Embedding generation error', error);
          throw error;
        }
      }
    };
  }
  
  static async getUserCollection(userId: string): Promise<Collection | null> {
    const collectionName = `user_${userId}`;
    
    // Check if we already have this collection cached
    if (this.collections.has(collectionName)) {
      return this.collections.get(collectionName)!;
    }
    
    try {
      // Get embedding function for this user
      const embeddingFunction = await this.getEmbeddingFunction(userId);
      if (!embeddingFunction) {
        logger.error('Cannot create collection without embedding function');
        return null;
      }
      
      // Create or get the collection
      const collection = await ChromaDBConfig.createCollection(
        collectionName,
        embeddingFunction
      );
      
      // Cache it
      this.collections.set(collectionName, collection);
      
      return collection;
    } catch (error) {
      logger.error('Error getting user collection', error);
      return null;
    }
  }
  
  static chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    logger.debug(`Chunking text of length ${text.length}`);
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
      
      // Prevent infinite loop on very small texts
      if (start >= text.length - overlap) break;
    }
    
    logger.debug(`Created ${chunks.length} chunks`);
    return chunks;
  }
  
  static chunkTextWithPositions(text: string, chunkSize: number = 1500, overlap: number = 200): ChunkWithPosition[] {
    logger.debug(`Creating semantic chunks from text of length ${text.length}`);
    
    const chunks: ChunkWithPosition[] = [];
    
    // Enhanced semantic chunking with multiple strategies
    if (text.length < chunkSize) {
      // Small documents don't need chunking
      chunks.push({
        text: text.trim(),
        startPosition: 0,
        endPosition: text.length
      });
      return chunks;
    }
    
    // Try multiple splitting strategies in order of preference
    const splitters = [
      { pattern: /\n#{1,3}\s+[^\n]+\n/g, name: 'headers' },     // Markdown headers
      { pattern: /\n\n+/g, name: 'paragraphs' },               // Double newlines
      { pattern: /\.\s+(?=[A-Z])/g, name: 'sentences' },       // Sentence boundaries
      { pattern: /[.!?]\s+/g, name: 'punctuation' }            // Any punctuation
    ];
    
    let bestChunks: ChunkWithPosition[] = [];
    let bestScore = Infinity;
    
    for (const splitter of splitters) {
      const testChunks = this.chunkWithSplitter(text, splitter.pattern, chunkSize, overlap);
      const score = this.evaluateChunkQuality(testChunks, chunkSize);
      
      if (score < bestScore) {
        bestScore = score;
        bestChunks = testChunks;
        logger.debug(`Best chunking strategy: ${splitter.name} with score ${score}`);
      }
    }
    
    // Use the best chunking strategy found
    chunks.push(...bestChunks);
    
    // Fallback to simple chunking if no good semantic boundaries found
    if (chunks.length === 0) {
      logger.debug('Falling back to simple chunking');
      let start = 0;
      
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        
        // Try to find a good breaking point
        let breakPoint = end;
        if (end < text.length) {
          // Look for a space, newline, or punctuation to break at
          for (let i = end; i > start + chunkSize * 0.8; i--) {
            if (/\s|[.!?,;:]/.test(text[i])) {
              breakPoint = i + 1;
              break;
            }
          }
        }
        
        chunks.push({
          text: text.slice(start, breakPoint).trim(),
          startPosition: start,
          endPosition: breakPoint
        });
        
        start = breakPoint - overlap;
        if (start >= text.length - overlap) break;
      }
    }
    
    logger.debug(`Created ${chunks.length} semantic chunks`);
    return chunks;
  }
  
  private static chunkWithSplitter(
    text: string, 
    splitter: RegExp, 
    chunkSize: number, 
    overlap: number
  ): ChunkWithPosition[] {
    const chunks: ChunkWithPosition[] = [];
    const splits = text.split(splitter);
    
    let currentChunk = '';
    let currentStartPos = 0;
    let currentPos = 0;
    
    for (const split of splits) {
      if (!split.trim()) continue;
      
      const splitLength = split.length;
      
      if (currentChunk.length + splitLength > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          startPosition: currentStartPos,
          endPosition: currentPos
        });
        
        // Start new chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - overlap);
        const overlapText = currentChunk.substring(overlapStart);
        currentChunk = overlapText + ' ' + split;
        currentStartPos = currentPos - overlapText.length;
      } else {
        if (currentChunk) currentChunk += ' ';
        currentChunk += split;
      }
      
      currentPos += splitLength + 1; // +1 for separator
    }
    
    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        startPosition: currentStartPos,
        endPosition: Math.min(currentPos, text.length)
      });
    }
    
    return chunks;
  }
  
  private static evaluateChunkQuality(chunks: ChunkWithPosition[], targetSize: number): number {
    if (chunks.length === 0) return Infinity;
    
    let score = 0;
    
    // Penalize chunks that are too small or too large
    for (const chunk of chunks) {
      const size = chunk.text.length;
      const deviation = Math.abs(size - targetSize) / targetSize;
      score += deviation;
      
      // Extra penalty for very small chunks
      if (size < targetSize * 0.3) score += 1;
      
      // Extra penalty for very large chunks
      if (size > targetSize * 1.5) score += 0.5;
    }
    
    // Normalize by number of chunks
    return score / chunks.length;
  }
  
  static async addDocument(
    userId: string,
    documentId: string,
    content: string,
    metadata: any = {}
  ): Promise<boolean> {
    logger.info(`Adding document ${documentId} to vector store`);
    
    try {
      const collection = await this.getUserCollection(userId);
      if (!collection) {
        logger.error('No collection available for document storage');
        return false;
      }
      
      // Chunk the document with position tracking
      const chunksWithPositions = this.chunkTextWithPositions(content);
      
      // Get document title from metadata or database
      let documentTitle = metadata.title;
      if (!documentTitle) {
        const { data: doc } = await supabase
          .from('documents')
          .select('title')
          .eq('id', documentId)
          .single();
        documentTitle = doc?.title || 'Untitled';
      }
      
      // Prepare data for ChromaDB with enhanced metadata
      const ids: string[] = [];
      const documents: string[] = [];
      const metadatas: ChunkMetadata[] = [];
      
      chunksWithPositions.forEach((chunk, index) => {
        const chunkId = `${documentId}_chunk_${index}`;
        const chunkHash = crypto.createHash('md5').update(chunk.text).digest('hex');
        
        // Calculate chunk statistics
        const wordCount = chunk.text.split(/\s+/).length;
        const sentenceCount = chunk.text.split(/[.!?]+/).filter(s => s.trim()).length;
        const avgWordLength = chunk.text.replace(/\s+/g, '').length / wordCount;
        
        // Extract potential keywords (simple approach)
        const keywords = this.extractKeywords(chunk.text, 5);
        
        ids.push(chunkId);
        documents.push(chunk.text);
        
        const chunkMetadata: ChunkMetadata = {
          documentId,
          documentTitle,
          userId,
          chunkIndex: index,
          totalChunks: chunksWithPositions.length,
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
          chunkHash,
          wordCount,
          sentenceCount,
          avgWordLength,
          keywords,
          createdAt: new Date().toISOString(),
          ...metadata
        };
        
        metadatas.push(chunkMetadata);
      });
      
      // Add to ChromaDB
      logger.debug(`Adding ${chunksWithPositions.length} chunks to collection`);
      await collection.add({
        ids,
        documents,
        metadatas
      });
      
      logger.info(`Document ${documentId} added successfully`);
      return true;
    } catch (error) {
      logger.error('Error adding document', error);
      return false;
    }
  }
  
  static async searchDocuments(
    userId: string,
    query: string,
    documentIds?: string[],
    nResults: number = 5
  ): Promise<any[]> {
    logger.info(`Searching for: "${query}"`);
    
    try {
      const collection = await this.getUserCollection(userId);
      if (!collection) {
        logger.error('No collection available for search');
        return [];
      }
      
      // Build where clause for filtering
      const whereClause: any = {};
      if (documentIds && documentIds.length > 0) {
        whereClause.documentId = { $in: documentIds };
      }
      
      // Perform search
      const results = await collection.query({
        queryTexts: [query],
        nResults,
        where: whereClause
      });
      
      logger.debug(`Found ${results.ids[0].length} results`);
      
      // Format results
      const formattedResults: VectorSearchResult[] = [];
      for (let i = 0; i < results.ids[0].length; i++) {
        formattedResults.push({
          id: results.ids[0][i],
          text: results.documents[0][i] || '',
          metadata: results.metadatas[0][i],
          distance: results.distances?.[0][i] || 0
        });
      }
      
      return formattedResults;
    } catch (error) {
      logger.error('Search error', error);
      return [];
    }
  }
  
  static async deleteDocument(userId: string, documentId: string): Promise<boolean> {
    logger.info(`Deleting document ${documentId} from vector store`);
    
    try {
      const collection = await this.getUserCollection(userId);
      if (!collection) {
        logger.error('No collection available for deletion');
        return false;
      }
      
      // Delete all chunks for this document
      await collection.delete({
        where: { documentId }
      });
      
      logger.info(`Document ${documentId} deleted successfully`);
      return true;
    } catch (error) {
      logger.error('Error deleting document', error);
      return false;
    }
  }
  
  static async updateDocument(
    userId: string,
    documentId: string,
    content: string,
    metadata: any = {}
  ): Promise<boolean> {
    logger.info(`Updating document ${documentId}`);
    
    // Delete existing chunks
    await this.deleteDocument(userId, documentId);
    
    // Add new chunks
    return await this.addDocument(userId, documentId, content, metadata);
  }
  
  /**
   * Extract keywords from text using a simple TF-IDF-like approach
   */
  private static extractKeywords(text: string, count: number = 5): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'about', 'as', 'is', 'was', 'are', 'were',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
      'when', 'where', 'why', 'how', 'all', 'each', 'every', 'some', 'any'
    ]);
    
    // Tokenize and clean
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Count word frequencies
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Sort by frequency and return top N
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([word]) => word);
  }
  
  /**
   * Enhanced search with reranking and filtering options
   */
  static async searchDocumentsEnhanced(
    userId: string,
    query: string,
    options: RAGSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const {
      nResults = 10,
      documentIds,
      includeMetadata = true,
      rerank = false,
      minRelevance = 0
    } = options;
    
    logger.info(`Enhanced search for: "${query}"`, { options });
    
    try {
      const collection = await this.getUserCollection(userId);
      if (!collection) {
        logger.error('No collection available for search');
        return [];
      }
      
      // Build where clause for filtering
      const whereClause: any = {};
      if (documentIds && documentIds.length > 0) {
        whereClause.documentId = { $in: documentIds };
      }
      
      // Perform initial search with more results for reranking
      const searchResults = rerank ? nResults * 2 : nResults;
      const results = await collection.query({
        queryTexts: [query],
        nResults: searchResults,
        where: whereClause
      });
      
      logger.debug(`Initial search found ${results.ids[0].length} results`);
      
      // Format results
      let formattedResults: VectorSearchResult[] = [];
      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances?.[0][i] || 0;
        const relevance = 1 - (distance / 2); // Convert distance to relevance score
        
        if (relevance >= minRelevance) {
          formattedResults.push({
            id: results.ids[0][i],
            text: results.documents[0][i] || '',
            metadata: includeMetadata ? results.metadatas[0][i] : undefined,
            distance,
            relevance
          });
        }
      }
      
      // Rerank if requested
      if (rerank && formattedResults.length > 0) {
        formattedResults = await this.rerankResults(query, formattedResults, userId);
        formattedResults = formattedResults.slice(0, nResults);
      }
      
      logger.info(`Returning ${formattedResults.length} results after filtering and reranking`);
      return formattedResults;
    } catch (error) {
      logger.error('Enhanced search error', error);
      return [];
    }
  }
  
  /**
   * Rerank search results using semantic similarity
   */
  private static async rerankResults(
    query: string,
    results: VectorSearchResult[],
    userId: string
  ): Promise<VectorSearchResult[]> {
    logger.debug('Reranking search results');
    
    try {
      // Use AI to score relevance
      const prompt = `Given the search query: "${query}"
      
Rate the relevance of each text excerpt on a scale of 0-1, where 1 is highly relevant and 0 is not relevant.
Return only a JSON array of numbers in the same order as the excerpts.

Excerpts:
${results.map((r, i) => `${i + 1}. ${r.text.substring(0, 200)}...`).join('\n\n')}`;

      const response = await AIService.generateResponse(userId, {
        messages: [
          { role: 'system', content: 'You are a relevance scoring system. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ]
      });
      
      // Parse relevance scores
      const scores = response ? JSON.parse(response.content) as number[] : [];
      
      // Update relevance scores and sort
      results.forEach((result, index) => {
        if (scores[index] !== undefined) {
          result.relevance = scores[index];
        }
      });
      
      return results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    } catch (error) {
      logger.error('Error reranking results', error);
      // Return original order if reranking fails
      return results;
    }
  }
}
