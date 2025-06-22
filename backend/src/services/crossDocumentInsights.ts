import { supabase } from '../config/supabase';
import { VectorStoreService } from './vectorStore';
import { AIService } from './ai/aiService';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';
import {
  DocumentRelationship,
  CrossDocumentInsight,
  ConceptNetwork,
  ConceptNode,
  ConceptEdge,
  InsightType,
  RelationshipType
} from '../types/ai-features';

interface InsightCacheEntry {
  insights: CrossDocumentInsight[];
  relationships: DocumentRelationship[];
  conceptNetwork: ConceptNetwork;
  documentIds: string[];
  createdAt: Date;
}

// Cache for expensive insight operations
const insightCache = new Map<string, InsightCacheEntry>();
const CACHE_TTL = 3600000; // 1 hour

export class CrossDocumentInsightsService {
  static async analyzeDocumentCollection(
    userId: string,
    documentIds?: string[]
  ): Promise<{
    relationships: DocumentRelationship[];
    insights: CrossDocumentInsight[];
    conceptNetwork: ConceptNetwork;
  }> {
    logger.info('Analyzing document collection', { userId, documentCount: documentIds?.length });
    
    // Fetch documents
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId);
    
    if (documentIds && documentIds.length > 0) {
      query = query.in('id', documentIds);
    }
    
    const { data: documents, error } = await query;
    
    if (error || !documents || documents.length < 2) {
      logger.warn('Insufficient documents for cross-document analysis', { documentCount: documents?.length || 0 });
      return {
        relationships: [],
        insights: [],
        conceptNetwork: { nodes: [], edges: [] }
      };
    }
    
    // Detect relationships
    const relationships = await this.detectRelationships(documents, userId);
    
    // Generate insights
    const insights = await this.generateInsights(documents, relationships, userId);
    
    // Build concept network
    const conceptNetwork = await this.buildConceptNetwork(documents, relationships);
    
    // Save relationships to database
    for (const rel of relationships) {
      await this.saveRelationship(rel);
    }
    
    return {
      relationships,
      insights,
      conceptNetwork
    };
  }

  private static async detectRelationships(
    documents: any[],
    userId: string
  ): Promise<DocumentRelationship[]> {
    logger.debug('Detecting relationships between documents', { documentCount: documents.length });
    
    const relationships: DocumentRelationship[] = [];
    
    // Compare each pair of documents
    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const doc1 = documents[i];
        const doc2 = documents[j];
        
        // Check similarity using vector embeddings
        const similarity = await this.calculateSimilarity(doc1.id, doc2.id, userId);
        
        if (similarity > 0.7) {
          relationships.push({
            sourceDocId: doc1.id,
            targetDocId: doc2.id,
            relationshipType: 'similar_to',
            strength: similarity,
            evidence: [`High semantic similarity: ${(similarity * 100).toFixed(1)}%`],
            autoDetected: true
          });
        }
        
        // Check for citations/references
        const citations = this.detectCitations(doc1.content, doc2.title);
        if (citations.length > 0) {
          relationships.push({
            sourceDocId: doc1.id,
            targetDocId: doc2.id,
            relationshipType: 'references',
            strength: Math.min(citations.length * 0.2, 1),
            evidence: citations,
            autoDetected: true
          });
        }
        
        // Check for contradictions using AI
        const contradictions = await this.detectContradictions(
          doc1.content,
          doc2.content,
          userId
        );
        if (contradictions.length > 0) {
          relationships.push({
            sourceDocId: doc1.id,
            targetDocId: doc2.id,
            relationshipType: 'contradicts',
            strength: 0.8,
            evidence: contradictions,
            autoDetected: true
          });
        }
        
        // Check if one extends the other
        const extension = await this.detectExtension(
          doc1,
          doc2,
          userId
        );
        if (extension.isExtension) {
          relationships.push({
            sourceDocId: extension.extender,
            targetDocId: extension.extended,
            relationshipType: 'extends',
            strength: extension.strength,
            evidence: extension.evidence,
            autoDetected: true
          });
        }
      }
    }
    
    return relationships;
  }

  private static async calculateSimilarity(
    docId1: string,
    docId2: string,
    userId: string
  ): Promise<number> {
    try {
      // Get document embeddings from vector store
      const [embeddings1, embeddings2] = await Promise.all([
        this.getDocumentEmbedding(userId, docId1),
        this.getDocumentEmbedding(userId, docId2)
      ]);
      
      if (!embeddings1 || !embeddings2) {
        // Fallback to text-based similarity
        return await this.calculateTextBasedSimilarity(userId, docId1, docId2);
      }
      
      // Calculate cosine similarity between embeddings
      const similarity = this.cosineSimilarity(embeddings1, embeddings2);
      
      logger.debug('Calculated embedding similarity', { docId1, docId2, similarity });
      return similarity;
    } catch (error) {
      logger.error('Error calculating document similarity', { error, docId1, docId2 });
      return 0;
    }
  }
  
  private static async getDocumentEmbedding(
    userId: string,
    documentId: string
  ): Promise<number[] | null> {
    try {
      // Get the first chunk's embedding as document representation
      const searchResults = await VectorStoreService.searchDocuments(
        userId,
        '',
        [documentId],
        1
      );
      
      if (searchResults.length === 0) {
        return null;
      }
      
      // Generate embedding for the chunk
      const embeddingFunc = await VectorStoreService.getEmbeddingFunction(userId);
      const embeddings = await embeddingFunc.generate([searchResults[0].text]);
      
      return embeddings[0];
    } catch (error) {
      logger.error('Error getting document embedding', { error, documentId });
      return null;
    }
  }
  
  private static async calculateTextBasedSimilarity(
    userId: string,
    docId1: string,
    docId2: string
  ): Promise<number> {
    const searchResults1 = await VectorStoreService.searchDocuments(userId, 'summary', [docId1], 1);
    const searchResults2 = await VectorStoreService.searchDocuments(userId, 'summary', [docId2], 1);
    
    if (searchResults1.length === 0 || searchResults2.length === 0) {
      return 0;
    }
    
    // Use TF-IDF for better text similarity
    return this.calculateTFIDFSimilarity(searchResults1[0].text, searchResults2[0].text);
  }
  
  private static calculateTFIDFSimilarity(text1: string, text2: string): number {
    // Simple TF-IDF implementation
    const doc1Terms = this.getTermFrequencies(text1);
    const doc2Terms = this.getTermFrequencies(text2);
    
    // Calculate IDF weights
    const allTerms = new Set([...Object.keys(doc1Terms), ...Object.keys(doc2Terms)]);
    const idfWeights = new Map<string, number>();
    
    allTerms.forEach(term => {
      let docCount = 0;
      if (doc1Terms[term]) docCount++;
      if (doc2Terms[term]) docCount++;
      idfWeights.set(term, Math.log(2 / docCount));
    });
    
    // Calculate TF-IDF vectors
    const vector1: number[] = [];
    const vector2: number[] = [];
    
    allTerms.forEach(term => {
      const idf = idfWeights.get(term) || 0;
      vector1.push((doc1Terms[term] || 0) * idf);
      vector2.push((doc2Terms[term] || 0) * idf);
    });
    
    return this.cosineSimilarity(vector1, vector2);
  }
  
  private static getTermFrequencies(text: string): Record<string, number> {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const frequencies: Record<string, number> = {};
    const totalWords = words.length;
    
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'about', 'as', 'is', 'was', 'are', 'were',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would'
    ]);
    
    words.forEach(word => {
      if (word.length > 2 && !stopWords.has(word)) {
        frequencies[word] = (frequencies[word] || 0) + 1;
      }
    });
    
    // Normalize by total words (TF)
    Object.keys(frequencies).forEach(term => {
      frequencies[term] = frequencies[term] / totalWords;
    });
    
    return frequencies;
  }
  
  private static cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  private static detectCitations(content: string, targetTitle: string): string[] {
    const citations: string[] = [];
    const titleWords = targetTitle.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Check for direct title mentions
    if (contentLower.includes(targetTitle.toLowerCase())) {
      citations.push(`Direct reference to "${targetTitle}"`);
    }
    
    // Check for quoted references
    const quotePattern = new RegExp(`["']([^"']*${titleWords[0]}[^"']*)["']`, 'gi');
    const quoteMatches = content.match(quotePattern);
    if (quoteMatches) {
      citations.push(`Quoted reference found: ${quoteMatches[0]}`);
    }
    
    // Check for partial title matches with context
    const significantWords = titleWords.filter(w => w.length > 4);
    if (significantWords.length > 0) {
      const matchCount = significantWords.filter(w => contentLower.includes(w)).length;
      if (matchCount >= significantWords.length * 0.7) {
        // Find the context
        const firstWord = significantWords[0];
        const index = contentLower.indexOf(firstWord);
        if (index !== -1) {
          const context = content.substring(Math.max(0, index - 50), Math.min(content.length, index + 50));
          citations.push(`Likely reference: "...${context.trim()}..."`);
        }
      }
    }
    
    // Check for author name patterns (assuming title might contain author)
    const authorPattern = /\b(?:by|from|according to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    const authorMatches = content.match(authorPattern);
    if (authorMatches) {
      authorMatches.forEach(match => {
        if (titleWords.some(word => match.toLowerCase().includes(word))) {
          citations.push(`Author reference: ${match}`);
        }
      });
    }
    
    return citations;
  }

  private static async detectContradictions(
    content1: string,
    content2: string,
    userId: string
  ): Promise<string[]> {
    // First, extract key claims from each document
    const claims1 = await this.extractKeyClaims(content1);
    const claims2 = await this.extractKeyClaims(content2);
    
    const prompt = `Compare these sets of claims and identify contradictions:
    
    Document 1 claims:
    ${claims1.map((c, i) => `${i + 1}. ${c}`).join('\n')}
    
    Document 2 claims:
    ${claims2.map((c, i) => `${i + 1}. ${c}`).join('\n')}
    
    Additional context from Document 1:
    ${content1.substring(0, 800)}
    
    Additional context from Document 2:
    ${content2.substring(0, 800)}
    
    Identify specific contradictions. For each contradiction:
    1. Quote the conflicting claims
    2. Explain why they contradict
    3. Rate the severity (minor/moderate/major)
    
    Format as JSON array: [{ claim1: "", claim2: "", explanation: "", severity: "" }]
    If no contradictions exist, return empty array.`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at logical analysis and identifying contradictions. Be precise and only identify genuine contradictions, not just differences in emphasis or detail.'
          },
          { role: 'user', content: prompt }
        ]
      });
      
      const contradictions = JSON.parse(response.content);
      
      // Format the output
      return contradictions.map((c: any) => 
        `${c.severity.toUpperCase()}: "${c.claim1}" contradicts "${c.claim2}" - ${c.explanation}`
      );
    } catch (error) {
      logger.error('Error detecting contradictions', error);
      return [];
    }
  }
  
  private static async extractKeyClaims(content: string): Promise<string[]> {
    // Extract sentences that appear to be claims or assertions
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const claims: string[] = [];
    
    const claimPatterns = [
      /\b(?:is|are|was|were|will be|has been|have been)\b/i,
      /\b(?:shows?|demonstrates?|proves?|indicates?|suggests?)\b/i,
      /\b(?:must|should|cannot|will not|always|never)\b/i,
      /\b(?:research|study|data|evidence|analysis)\s+(?:shows?|indicates?|suggests?)\b/i
    ];
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 200) {
        if (claimPatterns.some(pattern => pattern.test(trimmed))) {
          claims.push(trimmed);
        }
      }
    });
    
    // Return top 10 most claim-like sentences
    return claims.slice(0, 10);
  }

  private static async detectExtension(
    doc1: any,
    doc2: any,
    userId: string
  ): Promise<{
    isExtension: boolean;
    extender: string;
    extended: string;
    strength: number;
    evidence: string[];
  }> {
    // Check if one document extends another based on creation date and content
    const isDoc1Newer = new Date(doc1.created_at) > new Date(doc2.created_at);
    const newerDoc = isDoc1Newer ? doc1 : doc2;
    const olderDoc = isDoc1Newer ? doc2 : doc1;
    
    // Multiple checks for extension relationship
    const evidence: string[] = [];
    let extensionScore = 0;
    
    // 1. Check for explicit references
    const references = this.detectCitations(newerDoc.content, olderDoc.title);
    if (references.length > 0) {
      extensionScore += 0.3;
      evidence.push(...references);
    }
    
    // 2. Check for content overlap and expansion
    const overlapAnalysis = await this.analyzeContentOverlap(olderDoc.content, newerDoc.content);
    if (overlapAnalysis.overlapRatio > 0.3 && overlapAnalysis.expansionRatio > 1.5) {
      extensionScore += 0.2;
      evidence.push(`Expands on ${Math.round(overlapAnalysis.overlapRatio * 100)}% of original content`);
    }
    
    // 3. Check for similar structure
    const structuralSimilarity = this.compareDocumentStructure(olderDoc.content, newerDoc.content);
    if (structuralSimilarity > 0.6) {
      extensionScore += 0.1;
      evidence.push(`Similar document structure (${Math.round(structuralSimilarity * 100)}% match)`);
    }
    
    // 4. Use AI for semantic analysis if score is promising
    if (extensionScore > 0.2) {
      const prompt = `Analyze if the newer document extends/builds upon the older one:
      
      Older document: ${olderDoc.title}
      Key points: ${this.extractKeyPoints(olderDoc.content).join('; ')}
      
      Newer document: ${newerDoc.title}  
      Key points: ${this.extractKeyPoints(newerDoc.content).join('; ')}
      
      Consider:
      1. Does the newer document reference or acknowledge the older one?
      2. Does it expand on the same topics with more detail?
      3. Does it advance the ideas presented in the older document?
      4. Does it contradict or replace the older document?
      
      Respond with: { "extends": true/false, "confidence": 0-1, "evidence": ["reason1", "reason2"], "relationship": "extends|updates|replaces|independent" }`;
      
      try {
        const response = await AIService.generateResponse(userId, {
          messages: [
            { role: 'system', content: 'You are an expert at analyzing how academic and technical documents relate to each other over time.' },
            { role: 'user', content: prompt }
          ]
        });
        
        const analysis = JSON.parse(response.content);
        
        if (analysis.extends && analysis.confidence > 0.6) {
          extensionScore += analysis.confidence * 0.4;
          evidence.push(...analysis.evidence);
          
          return {
            isExtension: true,
            extender: newerDoc.id,
            extended: olderDoc.id,
            strength: Math.min(extensionScore, 1),
            evidence
          };
        }
      } catch (error) {
        logger.error('Error in AI extension analysis', error);
      }
    }
    
    return {
      isExtension: false,
      extender: '',
      extended: '',
      strength: 0,
      evidence: []
    };
  }
  
  private static async analyzeContentOverlap(
    content1: string,
    content2: string
  ): Promise<{ overlapRatio: number; expansionRatio: number }> {
    const concepts1 = await this.extractDocumentConcepts(content1);
    const concepts2 = await this.extractDocumentConcepts(content2);
    
    const set1 = new Set(concepts1);
    const set2 = new Set(concepts2);
    
    const overlap = Array.from(set1).filter(c => set2.has(c)).length;
    const overlapRatio = overlap / set1.size;
    const expansionRatio = set2.size / set1.size;
    
    return { overlapRatio, expansionRatio };
  }
  
  private static compareDocumentStructure(content1: string, content2: string): number {
    // Extract structural elements
    const struct1 = this.extractStructure(content1);
    const struct2 = this.extractStructure(content2);
    
    // Compare structures
    let similarity = 0;
    const totalElements = Math.max(struct1.headings + struct2.headings, 1);
    
    similarity += Math.min(struct1.headings, struct2.headings) / totalElements * 0.3;
    similarity += Math.min(struct1.paragraphs, struct2.paragraphs) / Math.max(struct1.paragraphs, struct2.paragraphs) * 0.3;
    similarity += Math.min(struct1.lists, struct2.lists) / Math.max(struct1.lists + struct2.lists, 1) * 0.2;
    similarity += Math.min(struct1.codeBlocks, struct2.codeBlocks) / Math.max(struct1.codeBlocks + struct2.codeBlocks, 1) * 0.2;
    
    return similarity;
  }
  
  private static extractStructure(content: string): {
    headings: number;
    paragraphs: number;
    lists: number;
    codeBlocks: number;
  } {
    return {
      headings: (content.match(/^#+\s/gm) || []).length,
      paragraphs: content.split(/\n\n+/).filter(p => p.trim().length > 50).length,
      lists: (content.match(/^[*\-+]\s/gm) || []).length + (content.match(/^\d+\.\s/gm) || []).length,
      codeBlocks: (content.match(/```/g) || []).length / 2
    };
  }
  
  private static extractKeyPoints(content: string): string[] {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const keyPoints: string[] = [];
    
    // Look for sentences with key indicators
    const importanceIndicators = /\b(?:important|key|crucial|essential|main|primary|significant|critical)\b/i;
    const conclusionIndicators = /\b(?:therefore|thus|hence|consequently|in conclusion|to summarize)\b/i;
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 150) {
        if (importanceIndicators.test(trimmed) || conclusionIndicators.test(trimmed)) {
          keyPoints.push(trimmed);
        }
      }
    });
    
    // Also get first and last meaningful sentences
    const meaningfulSentences = sentences.filter(s => s.trim().length > 30);
    if (meaningfulSentences.length > 0) {
      keyPoints.unshift(meaningfulSentences[0].trim());
      if (meaningfulSentences.length > 1) {
        keyPoints.push(meaningfulSentences[meaningfulSentences.length - 1].trim());
      }
    }
    
    return [...new Set(keyPoints)].slice(0, 5);
  }

  private static async generateInsights(
    documents: any[],
    relationships: DocumentRelationship[],
    userId: string
  ): Promise<CrossDocumentInsight[]> {
    logger.info('Generating cross-document insights', { documentCount: documents.length, relationshipCount: relationships.length });
    
    const insights: CrossDocumentInsight[] = [];
    
    // Find common themes
    const themes = await this.identifyCommonThemes(documents, userId);
    insights.push(...themes);
    
    // Identify progression of ideas
    const progression = await this.identifyProgression(documents, relationships);
    insights.push(...progression);
    
    // Find synthesis opportunities
    const synthesis = await this.identifySynthesisOpportunities(
      documents,
      relationships,
      userId
    );
    insights.push(...synthesis);
    
    // Identify gaps in coverage
    const gaps = await this.identifyGaps(documents, userId);
    insights.push(...gaps);
    
    return insights;
  }

  private static async identifyCommonThemes(
    documents: any[],
    userId: string
  ): Promise<CrossDocumentInsight[]> {
    // First extract key concepts from each document
    const documentConcepts = await Promise.all(
      documents.map(async doc => ({
        docId: doc.id,
        title: doc.title,
        concepts: await this.extractDocumentConcepts(doc.content)
      }))
    );
    
    // Find common concepts across documents
    const conceptFrequency = new Map<string, Set<string>>();
    documentConcepts.forEach(({ docId, concepts }) => {
      concepts.forEach(concept => {
        if (!conceptFrequency.has(concept)) {
          conceptFrequency.set(concept, new Set());
        }
        conceptFrequency.get(concept)!.add(docId);
      });
    });
    
    // Filter concepts that appear in multiple documents
    const commonConcepts = Array.from(conceptFrequency.entries())
      .filter(([_, docIds]) => docIds.size > 1)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10);
    
    // Use AI to analyze themes around common concepts
    const prompt = `Analyze these common concepts found across multiple documents and identify overarching themes:
    
    Common concepts:
    ${commonConcepts.map(([concept, docIds]) => 
      `- "${concept}" appears in ${docIds.size} documents`
    ).join('\n')}
    
    Document summaries:
    ${documents.map(d => `${d.title}: ${d.content.substring(0, 300)}...`).join('\n\n')}
    
    Identify 3-5 major themes. For each theme provide:
    1. Theme name
    2. Description of how it manifests across documents
    3. Prominence score (0-1)
    4. Specific examples from the documents
    
    Return as JSON array with: { theme, description, prominence, examples }`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { role: 'system', content: 'You are an expert at thematic analysis across multiple texts.' },
          { role: 'user', content: prompt }
        ]
      });
      
      const themes = JSON.parse(response.content);
      
      return themes.map((theme: any) => ({
        type: 'theme' as InsightType,
        title: `Common Theme: ${theme.theme}`,
        description: theme.description,
        involvedDocuments: documents.map(d => d.id),
        confidence: theme.prominence,
        insights: theme.examples
      }));
    } catch (error) {
      logger.error('Error identifying common themes', error);
      return [];
    }
  }

  private static async identifyProgression(
    documents: any[],
    relationships: DocumentRelationship[]
  ): Promise<CrossDocumentInsight[]> {
    // Sort documents by creation date
    const sortedDocs = [...documents].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const insights: CrossDocumentInsight[] = [];
    
    // Look for extension relationships
    const extensions = relationships.filter(r => r.relationshipType === 'extends');
    
    if (extensions.length > 0) {
      // Build progression chains
      const chains = this.buildProgressionChains(extensions, sortedDocs);
      
      chains.forEach(chain => {
        insights.push({
          type: 'progression',
          title: `Idea Development: ${chain.title}`,
          description: `This series of documents shows the evolution of an idea over time`,
          involvedDocuments: chain.documents,
          confidence: 0.8,
          insights: chain.insights
        });
      });
    }
    
    return insights;
  }

  private static buildProgressionChains(
    extensions: DocumentRelationship[],
    documents: any[]
  ): Array<{
    title: string;
    documents: string[];
    insights: string[];
  }> {
    const chains: any[] = [];
    const visited = new Set<string>();
    
    // Build chains from extension relationships
    extensions.forEach(ext => {
      if (!visited.has(ext.sourceDocId)) {
        const chain = [ext.targetDocId, ext.sourceDocId];
        visited.add(ext.sourceDocId);
        visited.add(ext.targetDocId);
        
        // Follow the chain
        let current = ext.sourceDocId;
        let found = true;
        while (found) {
          found = false;
          const next = extensions.find(e => e.targetDocId === current && !visited.has(e.sourceDocId));
          if (next) {
            chain.push(next.sourceDocId);
            visited.add(next.sourceDocId);
            current = next.sourceDocId;
            found = true;
          }
        }
        
        // Get document titles
        const chainDocs = chain.map(id => documents.find(d => d.id === id));
        const title = chainDocs[0]?.title || 'Unknown Topic';
        
        chains.push({
          title,
          documents: chain,
          insights: [
            `Started with: ${chainDocs[0]?.title}`,
            `Evolved to: ${chainDocs[chainDocs.length - 1]?.title}`,
            `${chain.length} documents in progression`
          ]
        });
      }
    });
    
    return chains;
  }

  private static async identifySynthesisOpportunities(
    documents: any[],
    relationships: DocumentRelationship[],
    userId: string
  ): Promise<CrossDocumentInsight[]> {
    const insights: CrossDocumentInsight[] = [];
    
    // Group documents by similarity clusters
    const clusters = this.clusterDocumentsByRelationships(documents, relationships);
    
    // Analyze each cluster for synthesis opportunities
    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      
      const clusterDocs = cluster.map(id => documents.find(d => d.id === id)).filter(Boolean);
      
      // Extract key concepts from each document
      const docConcepts = await Promise.all(
        clusterDocs.map(async doc => ({
          id: doc.id,
          title: doc.title,
          concepts: await this.extractDocumentConcepts(doc.content),
          keyPoints: this.extractKeyPoints(doc.content)
        }))
      );
      
      // Find complementary aspects
      const complementaryAspects = this.findComplementaryAspects(docConcepts);
      
      if (complementaryAspects.length > 0) {
        const synthesisPrompt = `Analyze these ${clusterDocs.length} related documents for synthesis opportunities:
        
        ${docConcepts.map(d => `${d.title}:
        - Key concepts: ${d.concepts.slice(0, 5).join(', ')}
        - Main points: ${d.keyPoints.slice(0, 2).join('; ')}`).join('\n\n')}
        
        Complementary aspects found:
        ${complementaryAspects.join('\n')}
        
        Suggest how these documents could be synthesized to create new insights. Consider:
        1. How different perspectives could be combined
        2. Gaps that could be filled by combining information
        3. New frameworks that could emerge from synthesis
        4. Practical applications of combined knowledge
        
        Format: { "syntheses": [{ "title": "", "description": "", "value": "", "approach": "" }] }`;
        
        try {
          const response = await AIService.generateResponse(userId, {
            messages: [
              { 
                role: 'system', 
                content: 'You are an expert at knowledge synthesis and identifying how different sources can be combined to create new insights.'
              },
              { role: 'user', content: synthesisPrompt }
            ]
          });
          
          const syntheses = JSON.parse(response.content).syntheses;
          
          insights.push({
            type: 'synthesis' as InsightType,
            title: `Synthesis Opportunity: ${clusterDocs.map(d => d.title).join(' + ')}`,
            description: `${clusterDocs.length} related documents can be synthesized for deeper insights`,
            involvedDocuments: cluster,
            confidence: 0.8,
            insights: syntheses.map((s: any) => 
              `${s.title}: ${s.description} (Value: ${s.value})`
            ),
            visualData: {
              complementaryAspects,
              syntheses
            }
          });
        } catch (error) {
          logger.error('Error generating synthesis insights', error);
        }
      }
    }
    
    return insights;
  }
  
  private static clusterDocumentsByRelationships(
    documents: any[],
    relationships: DocumentRelationship[]
  ): string[][] {
    const adjacencyMap = new Map<string, Set<string>>();
    
    // Build adjacency map from relationships
    relationships.forEach(rel => {
      if (rel.strength > 0.5) {
        if (!adjacencyMap.has(rel.sourceDocId)) {
          adjacencyMap.set(rel.sourceDocId, new Set());
        }
        if (!adjacencyMap.has(rel.targetDocId)) {
          adjacencyMap.set(rel.targetDocId, new Set());
        }
        adjacencyMap.get(rel.sourceDocId)!.add(rel.targetDocId);
        adjacencyMap.get(rel.targetDocId)!.add(rel.sourceDocId);
      }
    });
    
    // Find connected components (clusters)
    const visited = new Set<string>();
    const clusters: string[][] = [];
    
    const dfs = (docId: string, cluster: string[]) => {
      if (visited.has(docId)) return;
      visited.add(docId);
      cluster.push(docId);
      
      const neighbors = adjacencyMap.get(docId) || new Set();
      neighbors.forEach(neighbor => dfs(neighbor, cluster));
    };
    
    documents.forEach(doc => {
      if (!visited.has(doc.id)) {
        const cluster: string[] = [];
        dfs(doc.id, cluster);
        if (cluster.length > 1) {
          clusters.push(cluster);
        }
      }
    });
    
    return clusters;
  }
  
  private static findComplementaryAspects(docConcepts: any[]): string[] {
    const aspects: string[] = [];
    
    // Find unique concepts in each document
    const allConcepts = new Set<string>();
    const docConceptSets = docConcepts.map(d => {
      const conceptSet = new Set(d.concepts);
      d.concepts.forEach(c => allConcepts.add(c));
      return conceptSet;
    });
    
    // Find concepts that appear in some but not all documents
    allConcepts.forEach(concept => {
      const appearanceCount = docConceptSets.filter(set => set.has(concept)).length;
      if (appearanceCount > 0 && appearanceCount < docConcepts.length) {
        const haveDocs = docConcepts.filter(d => d.concepts.includes(concept)).map(d => d.title);
        const missingDocs = docConcepts.filter(d => !d.concepts.includes(concept)).map(d => d.title);
        aspects.push(
          `"${concept}" is covered by ${haveDocs.join(', ')} but not by ${missingDocs.join(', ')}`
        );
      }
    });
    
    return aspects.slice(0, 5);
  }

  private static async identifyGaps(
    documents: any[],
    userId: string
  ): Promise<CrossDocumentInsight[]> {
    // Identify what's missing from the document collection
    const allContent = documents.map(d => `${d.title}: ${d.content.substring(0, 300)}`).join('\n\n');
    
    const prompt = `Analyze this document collection and identify important gaps or missing topics that would complete the knowledge base.
    
    Documents:
    ${allContent}
    
    Identify 3-5 gaps with explanations.`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { role: 'system', content: 'You are an expert at curriculum analysis and identifying knowledge gaps.' },
          { role: 'user', content: prompt }
        ]
      });
      
      const gaps = response.content.split('\n').filter(line => line.trim().length > 0);
      
      return [{
        type: 'gap',
        title: 'Knowledge Gaps in Document Collection',
        description: 'Important topics missing from your current documents',
        involvedDocuments: documents.map(d => d.id),
        confidence: 0.7,
        insights: gaps
      }];
    } catch (error) {
      logger.error('Error identifying knowledge gaps', error);
      return [];
    }
  }

  private static async buildConceptNetwork(
    documents: any[],
    relationships: DocumentRelationship[]
  ): Promise<ConceptNetwork> {
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // Add document nodes
    documents.forEach(doc => {
      nodes.push({
        id: doc.id,
        label: doc.title,
        type: 'document',
        size: doc.content.length / 1000, // Size based on content length
        metadata: {
          created_at: doc.created_at,
          wordCount: doc.content.split(/\s+/).length
        }
      });
    });
    
    // Add relationship edges
    relationships.forEach(rel => {
      edges.push({
        source: rel.sourceDocId,
        target: rel.targetDocId,
        type: rel.relationshipType,
        weight: rel.strength
      });
    });
    
    // Extract and add concept nodes
    const concepts = await this.extractConcepts(documents);
    concepts.forEach(concept => {
      nodes.push({
        id: `concept_${concept.name}`,
        label: concept.name,
        type: 'concept',
        size: concept.frequency,
        metadata: concept.metadata
      });
      
      // Link concepts to documents
      concept.documents.forEach(docId => {
        edges.push({
          source: docId,
          target: `concept_${concept.name}`,
          type: 'contains',
          weight: 0.5
        });
      });
    });
    
    return { nodes, edges };
  }

  private static async extractConcepts(documents: any[]): Promise<Array<{
    name: string;
    frequency: number;
    documents: string[];
    metadata: any;
  }>> {
    const conceptMap = new Map<string, Set<string>>();
    
    // Extract concepts from each document
    await Promise.all(documents.map(async doc => {
      const concepts = await this.extractDocumentConcepts(doc.content);
      concepts.forEach(concept => {
        if (!conceptMap.has(concept)) {
          conceptMap.set(concept, new Set());
        }
        conceptMap.get(concept)!.add(doc.id);
      });
    }));
    
    // Calculate concept importance
    return Array.from(conceptMap.entries())
      .filter(([_, docs]) => docs.size > 1)
      .map(([concept, docs]) => ({
        name: concept,
        frequency: docs.size,
        documents: Array.from(docs),
        metadata: {
          avgPosition: 0, // Could calculate average position in documents
          isAcronym: /^[A-Z]{2,}$/.test(concept),
          wordCount: concept.split(/\s+/).length
        }
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 30);
  }
  
  private static async extractDocumentConcepts(content: string): Promise<string[]> {
    const concepts = new Set<string>();
    
    // Extract named entities and technical terms
    const patterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, // Multi-word proper nouns
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\w+(?:ization|isation|ology|ometry|graphy)\b/gi, // Technical suffixes
      /\b(?:algorithm|framework|methodology|approach|technique|system)\s+\w+/gi // Technical phrases
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        if (match.length > 3 && match.length < 50) {
          concepts.add(match.toLowerCase().trim());
        }
      });
    });
    
    // Extract key phrases using simple heuristics
    const sentences = content.split(/[.!?]+/);
    sentences.forEach(sentence => {
      // Look for definitions
      const defPattern = /(?:is|are|means|refers to|defined as)\s+([^,.]+)/i;
      const defMatch = sentence.match(defPattern);
      if (defMatch && defMatch[1].length < 50) {
        concepts.add(defMatch[1].toLowerCase().trim());
      }
    });
    
    return Array.from(concepts);
  }

  private static async saveRelationship(relationship: DocumentRelationship): Promise<void> {
    const { error } = await supabase
      .from('document_relationships')
      .upsert({
        source_doc_id: relationship.sourceDocId,
        target_doc_id: relationship.targetDocId,
        relationship_type: relationship.relationshipType,
        strength: relationship.strength,
        metadata: {
          evidence: relationship.evidence,
          auto_detected: relationship.autoDetected
        }
      }, {
        onConflict: 'source_doc_id,target_doc_id,relationship_type'
      });
    
    if (error) {
      logger.error('Error saving document relationship', { error, relationship });
    }
  }

  static async getDocumentNetwork(userId: string): Promise<ConceptNetwork> {
    // Fetch all relationships for user's documents
    const { data: relationships } = await supabase
      .from('document_relationships')
      .select(`
        *,
        source:documents!source_doc_id(id, title),
        target:documents!target_doc_id(id, title)
      `)
      .eq('source.user_id', userId);
    
    if (!relationships) {
      return { nodes: [], edges: [] };
    }
    
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeSet = new Set<string>();
    
    relationships.forEach(rel => {
      // Add nodes
      if (!nodeSet.has(rel.source.id)) {
        nodes.push({
          id: rel.source.id,
          label: rel.source.title,
          type: 'document',
          size: 10,
          metadata: {}
        });
        nodeSet.add(rel.source.id);
      }
      
      if (!nodeSet.has(rel.target.id)) {
        nodes.push({
          id: rel.target.id,
          label: rel.target.title,
          type: 'document',
          size: 10,
          metadata: {}
        });
        nodeSet.add(rel.target.id);
      }
      
      // Add edge
      edges.push({
        source: rel.source_doc_id,
        target: rel.target_doc_id,
        type: rel.relationship_type,
        weight: rel.strength
      });
    });
    
    return { nodes, edges };
  }
  
  // Cache management methods
  private static getCacheKey(userId: string, documentIds?: string[]): string {
    const docIdStr = documentIds ? documentIds.sort().join(',') : 'all';
    return crypto.createHash('sha256').update(`${userId}:${docIdStr}`).digest('hex');
  }
  
  private static getFromCache(key: string): any | null {
    const entry = insightCache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.createdAt.getTime();
    if (age > CACHE_TTL) {
      insightCache.delete(key);
      return null;
    }
    
    return {
      relationships: entry.relationships,
      insights: entry.insights,
      conceptNetwork: entry.conceptNetwork
    };
  }
  
  private static saveToCache(
    key: string,
    data: any,
    documentIds: string[]
  ): void {
    insightCache.set(key, {
      ...data,
      documentIds,
      createdAt: new Date()
    });
    
    // Clean old entries
    if (insightCache.size > 100) {
      const oldestKey = Array.from(insightCache.entries())
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())[0][0];
      insightCache.delete(oldestKey);
    }
  }
  
  static async invalidateCache(userId: string, documentIds?: string[]): Promise<void> {
    const key = this.getCacheKey(userId, documentIds);
    insightCache.delete(key);
    logger.debug('Invalidated insight cache', { userId, documentIds });
  }
}