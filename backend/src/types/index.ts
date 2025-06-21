export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  provider: 'anthropic';
  encrypted_key: string;
  masked_key?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceReference[];
  perspective?: string;
  created_at: string;
}

export interface SourceReference {
  document_id: string;
  passage: string;
  page?: number;
  start_index?: number;
  end_index?: number;
  relevance_score?: number;
}

export interface MindMap {
  id: string;
  user_id: string;
  document_id?: string;
  title: string;
  data: MindMapNode;
  created_at: string;
  updated_at: string;
}

export interface MindMapNode {
  id: string;
  text: string;
  children?: MindMapNode[];
  x?: number;
  y?: number;
  metadata?: Record<string, any>;
}

export interface Flashcard {
  id: string;
  user_id: string;
  document_id?: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  review_count?: number;
  last_reviewed?: string;
  next_review?: string;
  ease_factor?: number;
  created_at: string;
  updated_at?: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  active_provider?: 'anthropic' | 'openai' | 'google';
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

// Request/Response types for better type safety
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    status?: number;
  };
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}