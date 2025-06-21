// Authentication types for frontend
export interface User {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}