import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { VectorStoreService } from './vectorStore';
import * as crypto from 'crypto';

export interface DocumentDNA {
  id?: string;
  documentId: string;
  fingerprint: DNAFingerprint;
  metadata: DNAMetadata;
  createdAt?: Date;
}

export interface DNAFingerprint {
  structural: number[];      // Document structure pattern
  semantic: number[];        // Semantic embedding summary
  stylistic: number[];       // Writing style metrics
  topical: number[];         // Topic distribution
  complexity: number[];      // Complexity metrics
}

export interface DNAMetadata {
  documentTitle: string;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  vocabularyRichness: number;
  readabilityScore: number;
  dominantTopics: string[];
  uniqueTerms: string[];
}

export interface DNASimilarity {
  documentId1: string;
  documentId2: string;
  overallSimilarity: number;
  structuralSimilarity: number;
  semanticSimilarity: number;
  stylisticSimilarity: number;
  topicalSimilarity: number;
  complexitySimilarity: number;
}

// DNA cache for performance
interface DNACacheEntry {
  dna: DocumentDNA;
  createdAt: Date;
}

const dnaCache = new Map<string, DNACacheEntry>();
const CACHE_TTL = 3600000; // 1 hour

export class DocumentDNAService {
  constructor() {
    // No longer need ChromaService instance
  }

  /**
   * Generate semantic embedding using the VectorStore embedding function
   */
  private async generateSemanticEmbedding(text: string, userId?: string): Promise<number[]> {
    try {
      // Use VectorStore's embedding function for consistency
      const embeddingFunc = await VectorStoreService.getEmbeddingFunction(userId || 'system');
      const embeddings = await embeddingFunc.generate([text.substring(0, 8000)]); // Limit text length
      
      return embeddings[0];
    } catch (error) {
      logger.error('Error generating semantic embedding', error);
      
      // Fallback to simple hash-based embedding
      return this.generateFallbackEmbedding(text);
    }
  }
  
  /**
   * Fallback embedding generation when API fails
   */
  private generateFallbackEmbedding(text: string): number[] {
    const embedding = new Array(384).fill(0);
    const tokens = text.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let hash = 0;
      
      for (let j = 0; j < token.length; j++) {
        hash = ((hash << 5) - hash) + token.charCodeAt(j);
        hash = hash & hash;
      }
      
      const index = Math.abs(hash) % 384;
      embedding[index] += 1.0 / Math.sqrt(tokens.length);
      
      if (index > 0) embedding[index - 1] += 0.5 / Math.sqrt(tokens.length);
      if (index < 383) embedding[index + 1] += 0.5 / Math.sqrt(tokens.length);
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  // Generate DNA fingerprint for a document
  async generateDNA(documentId: string, content: string, title: string, userId?: string): Promise<DocumentDNA> {
    try {
      logger.info('Generating DNA fingerprint', { documentId, titleLength: title.length });
      
      // Check cache first
      const cached = this.getFromCache(documentId);
      if (cached) {
        logger.debug('Using cached DNA', { documentId });
        return cached;
      }

      // Extract various features in parallel for performance
      const [structural, stylistic, complexity, topical, semantic] = await Promise.all([
        Promise.resolve(this.extractStructuralFeatures(content)),
        Promise.resolve(this.extractStylisticFeatures(content)),
        Promise.resolve(this.extractComplexityFeatures(content)),
        this.extractTopicalFeatures(content),
        this.extractSemanticFeatures(content, userId)
      ]);

      // Extract metadata
      const metadata = this.extractMetadata(content, title);

      const dna: DocumentDNA = {
        documentId,
        fingerprint: {
          structural,
          semantic,
          stylistic,
          topical,
          complexity
        },
        metadata
      };

      // Store in database
      await this.storeDNA(dna);
      
      // Cache the result
      this.saveToCache(documentId, dna);

      return dna;
    } catch (error) {
      logger.error('Error generating document DNA', { error, documentId });
      throw error;
    }
  }

  // Extract structural features (document layout pattern)
  private extractStructuralFeatures(content: string): number[] {
    const features: number[] = [];
    
    // Split into sections
    const lines = content.split('\n');
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    // Features based on structure
    features.push(lines.length); // Total lines
    features.push(paragraphs.length); // Total paragraphs
    
    // Heading patterns (assuming markdown)
    const h1Count = (content.match(/^# /gm) || []).length;
    const h2Count = (content.match(/^## /gm) || []).length;
    const h3Count = (content.match(/^### /gm) || []).length;
    features.push(h1Count, h2Count, h3Count);
    
    // List patterns
    const bulletLists = (content.match(/^[*-] /gm) || []).length;
    const numberedLists = (content.match(/^\d+\. /gm) || []).length;
    features.push(bulletLists, numberedLists);
    
    // Code blocks
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    features.push(codeBlocks);
    
    // Normalize to 0-255 range for visualization
    return this.normalizeFeatures(features, 255);
  }

  // Extract stylistic features (writing style)
  private extractStylisticFeatures(content: string): number[] {
    const features: number[] = [];
    
    // Clean content
    const sentences = this.extractSentences(content);
    const words: string[] = content.toLowerCase().match(/\b\w+\b/g) || [];
    
    // Sentence length variation
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length || 0;
    const sentenceLengthStd = this.standardDeviation(sentenceLengths);
    
    features.push(avgSentenceLength);
    features.push(sentenceLengthStd);
    
    // Word length distribution
    const wordLengths = words.map(w => w.length);
    const avgWordLength = wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length || 0;
    features.push(avgWordLength);
    
    // Punctuation usage
    const exclamations = (content.match(/!/g) || []).length;
    const questions = (content.match(/\?/g) || []).length;
    const commas = (content.match(/,/g) || []).length;
    features.push(exclamations, questions, commas / sentences.length);
    
    // Vocabulary richness (unique words / total words)
    const uniqueWords = new Set(words);
    const vocabularyRichness = uniqueWords.size / words.length;
    features.push(vocabularyRichness * 100);
    
    return this.normalizeFeatures(features, 255);
  }

  // Extract complexity features
  private extractComplexityFeatures(content: string): number[] {
    const features: number[] = [];
    
    const sentences = this.extractSentences(content);
    const words: string[] = content.toLowerCase().match(/\b\w+\b/g) || [];
    
    // Flesch Reading Ease Score components
    const totalSyllables = words.reduce((sum: number, word: string) => sum + this.countSyllables(word), 0);
    const avgSyllablesPerWord = words.length > 0 ? totalSyllables / words.length : 0;
    const avgWordsPerSentence = words.length / sentences.length || 0;
    
    // Flesch Reading Ease (inverted for complexity)
    const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    const complexityScore = Math.max(0, Math.min(100, 100 - fleschScore));
    features.push(complexityScore);
    
    // Complex word ratio (words with 3+ syllables)
    const complexWords = words.filter(w => this.countSyllables(w) >= 3).length;
    features.push((complexWords / words.length) * 100);
    
    // Average paragraph length
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const avgParagraphLength = words.length / paragraphs.length || 0;
    features.push(avgParagraphLength / 10); // Scale down
    
    // Depth of nesting (for technical documents)
    const maxIndentLevel = this.calculateMaxIndentLevel(content);
    features.push(maxIndentLevel * 20);
    
    return this.normalizeFeatures(features, 255);
  }

  // Extract topical features using keyword extraction
  private async extractTopicalFeatures(content: string): Promise<number[]> {
    const features: number[] = [];
    
    // Extract keywords and their frequencies
    const keywords = this.extractKeywords(content);
    
    // Create topic vector based on predefined categories
    const topicCategories = [
      { name: 'technical', keywords: ['code', 'function', 'algorithm', 'data', 'system', 'api', 'software'] },
      { name: 'scientific', keywords: ['research', 'study', 'analysis', 'hypothesis', 'experiment', 'results'] },
      { name: 'business', keywords: ['market', 'strategy', 'revenue', 'customer', 'growth', 'profit'] },
      { name: 'educational', keywords: ['learn', 'understand', 'explain', 'teach', 'student', 'course'] },
      { name: 'narrative', keywords: ['story', 'character', 'plot', 'chapter', 'said', 'told'] }
    ];
    
    for (const category of topicCategories) {
      const score = category.keywords.reduce((sum, keyword) => {
        return sum + (keywords[keyword] || 0);
      }, 0);
      features.push(score);
    }
    
    // Add dominant term frequencies
    const topTerms = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [_, freq] of topTerms) {
      features.push(freq);
    }
    
    // Pad if necessary
    while (features.length < 15) {
      features.push(0);
    }
    
    return this.normalizeFeatures(features.slice(0, 15), 255);
  }

  // Extract semantic features using embeddings
  private async extractSemanticFeatures(content: string, userId?: string): Promise<number[]> {
    try {
      // Use the enhanced embedding approach
      const embedding = await this.generateSemanticEmbedding(content.substring(0, 8000), userId);
      
      // Reduce dimensionality for visualization (take first 50 dimensions)
      const reducedEmbedding = embedding.slice(0, 50);
      
      // Normalize to 0-255 range
      return this.normalizeFeatures(reducedEmbedding, 255);
    } catch (error) {
      logger.error('Error extracting semantic features', error);
      // Return default features on error
      return new Array(50).fill(128);
    }
  }

  // Extract metadata
  private extractMetadata(content: string, title: string): DNAMetadata {
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const sentences = this.extractSentences(content);
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    // Calculate vocabulary richness
    const uniqueWords = new Set(words);
    const vocabularyRichness = uniqueWords.size / words.length;
    
    // Calculate readability
    const avgSentenceLength = words.length / sentences.length || 0;
    const totalSyllables = words.reduce((sum: number, word: string) => sum + this.countSyllables(word), 0);
    const avgSyllablesPerWord = words.length > 0 ? totalSyllables / words.length : 0;
    const fleschScore = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
    
    // Extract keywords for dominant topics
    const keywords = this.extractKeywords(content);
    const dominantTopics = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term);
    
    // Find unique terms (appear only in this document)
    const uniqueTerms = Array.from(uniqueWords)
      .filter(word => word.length > 5)
      .slice(0, 10);
    
    return {
      documentTitle: title,
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgSentenceLength: Math.round(avgSentenceLength),
      vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
      readabilityScore: Math.max(0, Math.min(100, fleschScore)),
      dominantTopics,
      uniqueTerms
    };
  }

  // Store DNA in database
  private async storeDNA(dna: DocumentDNA): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_dna')
        .upsert({
          document_id: dna.documentId,
          fingerprint: dna.fingerprint,
          metadata: dna.metadata,
          similarity_vector: this.createSimilarityVector(dna.fingerprint),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'document_id'
        });

      if (error) throw error;
      logger.info('DNA fingerprint stored successfully', { documentId: dna.documentId });
    } catch (error) {
      logger.error('Error storing DNA fingerprint', { error, documentId: dna.documentId });
      throw error;
    }
  }

  // Get DNA for a document
  async getDNA(documentId: string): Promise<DocumentDNA | null> {
    try {
      const { data, error } = await supabase
        .from('document_dna')
        .select('*')
        .eq('document_id', documentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        id: data.id,
        documentId: data.document_id,
        fingerprint: data.fingerprint,
        metadata: data.metadata,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      logger.error('Error retrieving DNA fingerprint', { error, documentId });
      throw error;
    }
  }

  // Compare two DNAs
  async compareDNA(documentId1: string, documentId2: string): Promise<DNASimilarity> {
    try {
      const [dna1, dna2] = await Promise.all([
        this.getDNA(documentId1),
        this.getDNA(documentId2)
      ]);

      if (!dna1 || !dna2) {
        throw new Error('DNA not found for one or both documents');
      }

      const structuralSim = this.cosineSimilarity(
        dna1.fingerprint.structural,
        dna2.fingerprint.structural
      );
      const semanticSim = this.cosineSimilarity(
        dna1.fingerprint.semantic,
        dna2.fingerprint.semantic
      );
      const stylisticSim = this.cosineSimilarity(
        dna1.fingerprint.stylistic,
        dna2.fingerprint.stylistic
      );
      const topicalSim = this.cosineSimilarity(
        dna1.fingerprint.topical,
        dna2.fingerprint.topical
      );
      const complexitySim = this.cosineSimilarity(
        dna1.fingerprint.complexity,
        dna2.fingerprint.complexity
      );

      const overallSimilarity = (
        structuralSim * 0.15 +
        semanticSim * 0.35 +
        stylisticSim * 0.15 +
        topicalSim * 0.25 +
        complexitySim * 0.1
      );

      return {
        documentId1,
        documentId2,
        overallSimilarity,
        structuralSimilarity: structuralSim,
        semanticSimilarity: semanticSim,
        stylisticSimilarity: stylisticSim,
        topicalSimilarity: topicalSim,
        complexitySimilarity: complexitySim
      };
    } catch (error) {
      logger.error('Error comparing DNA fingerprints', { error, documentId1, documentId2 });
      throw error;
    }
  }

  // Find similar documents
  async findSimilarDocuments(documentId: string, threshold: number = 0.7, limit: number = 10): Promise<{
    documentId: string;
    similarity: number;
    title: string;
  }[]> {
    try {
      const dna = await this.getDNA(documentId);
      if (!dna) throw new Error('DNA not found for document');

      // Get all DNAs
      const { data: allDnas, error } = await supabase
        .from('document_dna')
        .select('document_id, fingerprint, metadata')
        .neq('document_id', documentId);

      if (error) throw error;

      // Calculate similarities
      const similarities = await Promise.all(
        (allDnas || []).map(async (otherDna) => {
          const similarity = await this.compareDNA(documentId, otherDna.document_id);
          return {
            documentId: otherDna.document_id,
            similarity: similarity.overallSimilarity,
            title: otherDna.metadata.documentTitle
          };
        })
      );

      // Filter and sort
      return similarities
        .filter(s => s.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error finding similar documents', { error, documentId });
      throw error;
    }
  }

  // Helper functions
  private extractSentences(content: string): string[] {
    // Simple sentence extraction (can be improved with NLP library)
    return content
      .replace(/\n/g, ' ')
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 0);
  }

  private countSyllables(word: string): number {
    // Simple syllable counting algorithm
    word = word.toLowerCase();
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = 'aeiou'.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent e
    if (word.endsWith('e')) {
      count--;
    }
    
    // Ensure at least 1 syllable
    return Math.max(1, count);
  }

  private extractKeywords(content: string): Record<string, number> {
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'was', 'are', 'were']);
    
    const frequencies: Record<string, number> = {};
    
    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        frequencies[word] = (frequencies[word] || 0) + 1;
      }
    }
    
    return frequencies;
  }

  private calculateMaxIndentLevel(content: string): number {
    const lines = content.split('\n');
    let maxIndent = 0;
    
    for (const line of lines) {
      const indent = line.match(/^(\s*)/)?.[0].length || 0;
      maxIndent = Math.max(maxIndent, Math.floor(indent / 2));
    }
    
    return maxIndent;
  }

  private standardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  private normalizeFeatures(features: number[], maxValue: number = 255): number[] {
    const max = Math.max(...features) || 1;
    return features.map(f => Math.round((f / max) * maxValue));
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)) || 0;
  }

  private createSimilarityVector(fingerprint: DNAFingerprint): number[] {
    // Concatenate all feature vectors for similarity search
    return [
      ...fingerprint.structural,
      ...fingerprint.semantic,
      ...fingerprint.stylistic,
      ...fingerprint.topical,
      ...fingerprint.complexity
    ];
  }
  
  // Cache management methods
  private getFromCache(documentId: string): DocumentDNA | null {
    const entry = dnaCache.get(documentId);
    if (!entry) return null;
    
    const age = Date.now() - entry.createdAt.getTime();
    if (age > CACHE_TTL) {
      dnaCache.delete(documentId);
      return null;
    }
    
    return entry.dna;
  }
  
  private saveToCache(documentId: string, dna: DocumentDNA): void {
    dnaCache.set(documentId, {
      dna,
      createdAt: new Date()
    });
    
    // Clean old entries if cache is too large
    if (dnaCache.size > 100) {
      const oldestKey = Array.from(dnaCache.entries())
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())[0][0];
      dnaCache.delete(oldestKey);
    }
  }
  
  // Batch operations for performance
  async generateBatchDNA(
    documents: Array<{ id: string; content: string; title: string }>,
    userId?: string
  ): Promise<Map<string, DocumentDNA>> {
    logger.info('Generating DNA for batch of documents', { count: documents.length });
    
    const results = new Map<string, DocumentDNA>();
    
    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(doc => this.generateDNA(doc.id, doc.content, doc.title, userId))
      );
      
      batchResults.forEach((dna, index) => {
        results.set(batch[index].id, dna);
      });
    }
    
    return results;
  }
  
  // Enhanced similarity comparison with multiple documents
  async compareMultipleDNA(
    baseDocumentId: string,
    compareDocumentIds: string[]
  ): Promise<DNASimilarity[]> {
    logger.info('Comparing DNA across multiple documents', { 
      baseDocumentId, 
      compareCount: compareDocumentIds.length 
    });
    
    const comparisons = await Promise.all(
      compareDocumentIds.map(docId => this.compareDNA(baseDocumentId, docId))
    );
    
    // Sort by overall similarity
    return comparisons.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
  }
  
  // Cluster documents by DNA similarity
  async clusterDocumentsByDNA(
    documentIds: string[],
    threshold: number = 0.7
  ): Promise<string[][]> {
    logger.info('Clustering documents by DNA similarity', { 
      documentCount: documentIds.length,
      threshold 
    });
    
    const clusters: string[][] = [];
    const assigned = new Set<string>();
    
    for (const docId of documentIds) {
      if (assigned.has(docId)) continue;
      
      const cluster = [docId];
      assigned.add(docId);
      
      // Find similar documents
      for (const otherId of documentIds) {
        if (otherId === docId || assigned.has(otherId)) continue;
        
        const similarity = await this.compareDNA(docId, otherId);
        if (similarity.overallSimilarity >= threshold) {
          cluster.push(otherId);
          assigned.add(otherId);
        }
      }
      
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }
}

export const documentDNAService = new DocumentDNAService();