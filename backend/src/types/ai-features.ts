// TypeScript types for Advanced AI Features

// ==================== Summary Types ====================
export type SummaryLevel = 'one_sentence' | 'one_paragraph' | 'one_page' | 'key_points' | 'outline';

export interface SummaryResult {
  level: SummaryLevel;
  content: string;
  metadata: SummaryMetadata;
}

export interface SummaryMetadata {
  wordCount: number;
  readingTime: number; // in seconds
  keyTopics: string[];
}

export interface DocumentSummary {
  id: string;
  document_id: string;
  summary_level: SummaryLevel;
  content: string;
  metadata: SummaryMetadata;
  created_at: string;
  updated_at: string;
}

export interface AdaptiveSummaryPreferences {
  readingLevel: 'beginner' | 'intermediate' | 'advanced';
  timeAvailable: number; // in minutes
  focusAreas?: string[];
}

// ==================== Document Relationships Types ====================
export type RelationshipType = 
  | 'references' 
  | 'contradicts' 
  | 'extends' 
  | 'summarizes' 
  | 'prerequisite' 
  | 'similar_to' 
  | 'part_of';

export interface DocumentRelationship {
  id?: string;
  sourceDocId: string;
  targetDocId: string;
  relationshipType: RelationshipType;
  strength: number; // 0-1
  evidence: string[];
  autoDetected: boolean;
  created_at?: string;
  updated_at?: string;
}

// ==================== Document DNA Types ====================
export interface DocumentDNA {
  id?: string;
  documentId: string;
  fingerprint: DNAFingerprint;
  metadata: DNAMetadata;
  createdAt?: Date;
  updatedAt?: Date;
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

// ==================== Cross-Document Insights Types ====================
export type InsightType = 'theme' | 'contradiction' | 'progression' | 'synthesis' | 'gap';

export interface CrossDocumentInsight {
  id?: string;
  type: InsightType;
  title: string;
  description: string;
  involvedDocuments: string[];
  confidence: number; // 0-1
  insights: string[];
  visualData?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ConceptNetwork {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

export interface ConceptNode {
  id: string;
  label: string;
  type: 'document' | 'concept' | 'theme';
  size: number;
  metadata: Record<string, any>;
}

export interface ConceptEdge {
  id?: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  metadata?: Record<string, any>;
}

export interface DocumentCollectionAnalysis {
  relationships: DocumentRelationship[];
  insights: CrossDocumentInsight[];
  conceptNetwork: ConceptNetwork;
}

// ==================== RAG Types ====================
export interface RAGContext {
  relevantChunks: RelevantChunk[];
  documentId?: string;
  totalChunks?: number;
  searchMetadata?: SearchMetadata;
}

export interface RelevantChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  relevance: number;
  distance?: number;
}

export interface ChunkMetadata {
  documentId: string;
  documentTitle?: string;
  userId: string;
  pageNumber?: number;
  chunkIndex: number;
  totalChunks: number;
  startPosition: number;
  endPosition: number;
  [key: string]: any;
}

export interface SourceReference {
  document_id: string;
  passage: string;
  relevance: number;
  startPosition: number;
  endPosition: number;
  metadata: {
    title: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface SearchMetadata {
  query: string;
  searchTime: number; // milliseconds
  totalResults: number;
  reranked: boolean;
  filters?: Record<string, any>;
}

export interface RAGSearchOptions {
  nResults?: number;
  documentIds?: string[];
  includeMetadata?: boolean;
  rerank?: boolean;
  minRelevance?: number;
}

export interface RAGCacheEntry {
  id: string;
  user_id: string;
  query_hash: string;
  query_text: string;
  relevant_chunks: RelevantChunk[];
  document_ids: string[];
  created_at: string;
  expires_at: string;
}

// ==================== Mind Map Types ====================
export interface MindMap {
  id: string;
  user_id: string;
  document_id?: string;
  title: string;
  data: MindMapData;
  created_at: string;
  updated_at: string;
}

export interface MindMapData {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
  layout?: MindMapLayout;
  theme?: MindMapTheme;
}

export interface MindMapNode {
  id: string;
  text: string;
  type: 'root' | 'main' | 'sub' | 'detail';
  position?: { x: number; y: number };
  color?: string;
  icon?: string;
  expanded?: boolean;
  metadata?: Record<string, any>;
}

export interface MindMapConnection {
  source: string;
  target: string;
  type?: 'hierarchy' | 'association' | 'reference';
  label?: string;
  style?: ConnectionStyle;
}

export interface ConnectionStyle {
  color?: string;
  width?: number;
  dashArray?: string;
  curved?: boolean;
}

export interface MindMapLayout {
  type: 'radial' | 'tree' | 'organic' | 'force';
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  spacing?: { x: number; y: number };
}

export interface MindMapTheme {
  name: string;
  colors: string[];
  fontFamily?: string;
  fontSize?: number;
}

// ==================== Flashcard Types ====================
export interface Flashcard {
  id: string;
  user_id: string;
  document_id?: string;
  question: string;
  answer: string;
  type?: 'basic' | 'cloze' | 'image' | 'multi';
  metadata?: FlashcardMetadata;
  created_at: string;
  updated_at?: string;
}

export interface FlashcardMetadata {
  difficulty?: number; // 0-1
  tags?: string[];
  source?: string;
  imageUrl?: string;
  choices?: string[]; // for multi type
  correctChoices?: number[]; // indices of correct choices
}

export interface StudySession {
  id: string;
  user_id: string;
  flashcard_ids: string[];
  started_at: string;
  completed_at?: string;
  performance: SessionPerformance;
}

export interface SessionPerformance {
  totalCards: number;
  correctAnswers: number;
  averageTime: number; // seconds per card
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface StudyProgress {
  flashcard_id: string;
  user_id: string;
  repetitions: number;
  ease_factor: number;
  interval: number; // days
  next_review: string;
  last_review: string;
  performance_history: ReviewPerformance[];
}

export interface ReviewPerformance {
  date: string;
  quality: number; // 0-5 (SM-2 algorithm)
  time_spent: number; // seconds
}

// ==================== Vector Store Types ====================
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export interface ChunkWithPosition {
  text: string;
  startPosition: number;
  endPosition: number;
}

export interface VectorSearchResult {
  id: string;
  text: string;
  metadata: any;
  distance?: number;
  relevance?: number;
}

// ==================== Error Types ====================
export enum AIFeatureErrorCode {
  SUMMARY_GENERATION_FAILED = 'SUMMARY_GENERATION_FAILED',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  VECTOR_STORE_ERROR = 'VECTOR_STORE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CACHE_ERROR = 'CACHE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

export interface AIFeatureError {
  code: AIFeatureErrorCode;
  message: string;
  details?: any;
  timestamp: string;
}

// ==================== Request/Response Types ====================
export interface GenerateSummaryRequest {
  documentId: string;
  levels?: SummaryLevel[];
  preferences?: AdaptiveSummaryPreferences;
}

export interface GenerateSummaryResponse {
  summaries: SummaryResult[];
  documentId: string;
  generatedAt: string;
}

export interface AnalyzeDocumentsRequest {
  documentIds: string[];
  analysisTypes?: ('relationships' | 'insights' | 'network')[];
  options?: {
    minConfidence?: number;
    maxResults?: number;
  };
}

export interface AnalyzeDocumentsResponse {
  analysis: DocumentCollectionAnalysis;
  documentCount: number;
  processingTime: number;
}

export interface GenerateMindMapRequest {
  documentId?: string;
  content?: string;
  template?: string;
  autoLayout?: boolean;
}

export interface GenerateMindMapResponse {
  mindMap: MindMapData;
  suggestions?: string[];
}

export interface CreateFlashcardsRequest {
  documentId?: string;
  content?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'basic' | 'cloze' | 'multi';
}

export interface CreateFlashcardsResponse {
  flashcards: Flashcard[];
  qualityScore: number;
}

// ==================== Configuration Types ====================
export interface AIFeatureConfig {
  rag: {
    chunkSize: number;
    chunkOverlap: number;
    maxResults: number;
    enableReranking: boolean;
    cacheExpiry: number; // seconds
  };
  summary: {
    enableCaching: boolean;
    maxConcurrent: number;
    defaultLevels: SummaryLevel[];
  };
  insights: {
    minConfidence: number;
    maxDocuments: number;
    enableAutoDetection: boolean;
  };
  vectorStore: {
    collectionPrefix: string;
    embeddingDimensions: number;
    similarityThreshold: number;
  };
}