// Authentication specific types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

// Request/Response types for auth endpoints
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
  session: Session;
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    status?: number;
    details?: any;
  };
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  session: Session;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}