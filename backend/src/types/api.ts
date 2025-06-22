// Common types
export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface TimeRangeQuery {
  start_date?: string;
  end_date?: string;
}

export interface ApiError {
  error: string;
  details?: any;
  code?: string;
}

export interface ApiSuccess<T = any> {
  data?: T;
  message?: string;
  metadata?: Record<string, any>;
}

// Document DNA types
export interface DocumentFingerprint {
  id: string;
  document_id: string;
  fingerprint: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DocumentComparison {
  document_id_1: string;
  document_id_2: string;
  similarity_score: number;
  common_themes: string[];
  differences: string[];
}

export interface SimilarDocument {
  document_id: string;
  title: string;
  similarity_score: number;
  shared_concepts: string[];
}

// Cross-document types
export interface CrossDocumentAnalysis {
  document_ids: string[];
  themes: Theme[];
  patterns: Pattern[];
  insights: Insight[];
  metadata: Record<string, any>;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  document_count: number;
  relevance_score: number;
}

export interface Pattern {
  type: string;
  description: string;
  frequency: number;
  documents: string[];
}

export interface Insight {
  type: string;
  title: string;
  description: string;
  supporting_documents: string[];
  confidence: number;
}

// Workspace types
export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCollaborator {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  permission: 'view' | 'edit' | 'admin';
  added_at: string;
}

// Spaced repetition types
export interface StudyCard {
  id: string;
  flashcard_id: string;
  user_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: string;
  last_reviewed?: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  set_id?: string;
  started_at: string;
  completed_at?: string;
  cards_studied: number;
  correct_answers: number;
  avg_response_time: number;
}

export interface StudyStats {
  totalCards: number;
  cardsStudied: number;
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
  averageAccuracy: number;
}

// Exercise types
export interface Exercise {
  id: string;
  set_id?: string;
  type: string;
  question: string;
  options?: string[];
  correct_answer: any;
  explanation?: string;
  difficulty: number;
  metadata: Record<string, any>;
}

export interface ExerciseAttempt {
  exercise_id: string;
  user_answer: any;
  is_correct: boolean;
  response_time: number;
  feedback?: string;
  points_earned?: number;
}

export interface ExerciseSet {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  document_id?: string;
  exercise_count: number;
  created_at: string;
}

// Knowledge gap types
export interface KnowledgeGap {
  id: string;
  concept: string;
  severity: number;
  type: string;
  detected_from: string[];
  recommendations: string[];
}

export interface ConceptMastery {
  concept: string;
  mastery_level: number;
  last_updated: string;
  sources: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  steps: LearningStep[];
  estimated_time: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface LearningStep {
  order: number;
  type: string;
  title: string;
  resource_id?: string;
  estimated_time: number;
  completed: boolean;
}

// Citation network types
export interface CitationNode {
  id: string;
  label: string;
  type: string;
  citationCount: number;
  centralityScore: number;
  metadata: Record<string, any>;
}

export interface CitationEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
  metadata: Record<string, any>;
}

export interface CitationNetwork {
  nodes: CitationNode[];
  edges: CitationEdge[];
  metrics: NetworkMetrics;
}

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  density: number;
  clusters: number;
}

// Search types
export interface SearchQuery {
  text: string;
  scope: ('documents' | 'notes' | 'flashcards')[];
  filters?: SearchFilters;
  options?: SearchOptions;
}

export interface SearchFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  documentTypes?: string[];
  tags?: string[];
  authors?: string[];
}

export interface SearchOptions {
  expandQuery: boolean;
  includeContext: boolean;
  minRelevance: number;
  maxResults: number;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  content: string;
  relevance_score: number;
  highlights: string[];
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets?: Record<string, Record<string, number>>;
  query_expansion?: string[];
  search_time_ms: number;
}

// Report types
export interface ReportConfig {
  title: string;
  description?: string;
  template_id?: string;
  format: 'pdf' | 'html' | 'markdown' | 'docx';
  sections?: string[];
  options?: Record<string, any>;
}

export interface GeneratedReport {
  id: string;
  user_id: string;
  title: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  format: string;
  file_url?: string;
  generation_time_ms?: number;
  error_message?: string;
  created_at: string;
}

// Workflow types
export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  trigger_type: 'manual' | 'schedule' | 'event';
  trigger_config?: Record<string, any>;
  flow_data: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error?: string;
  started_at: string;
  completed_at?: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  status: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  started_at: string;
  completed_at?: string;
}

// Analytics types
export interface AnalyticsEvent {
  event_type: string;
  event_category: string;
  event_label?: string;
  event_value?: number;
  metadata?: Record<string, any>;
}

export interface UserAnalytics {
  totalSessions: number;
  totalTimeSpent: number;
  documentsCreated: number;
  documentsViewed: number;
  notesCreated: number;
  flashcardsStudied: number;
  exercisesCompleted: number;
  studyStreakDays: number;
  knowledgeGrowthScore: number;
  workflowsExecuted: number;
  reportsGenerated: number;
  lastActiveAt: string;
}

export interface AnalyticsReport {
  period: string;
  metrics: UserAnalytics;
  trends: {
    metric: string;
    change: number;
    direction: 'up' | 'down' | 'stable';
  }[];
  insights: string[];
}