import { User, ApiResponse, ApiError } from '@/types/auth';

// Use HTTPS in production, HTTP only for localhost development
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:5001' 
    : 'https://localhost:5001');

class ApiClient {
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private activeRequests: Map<string, AbortController> = new Map();

  constructor() {
    // Initialize token from storage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.refreshTokenValue = localStorage.getItem('refresh_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
        // Also set as a cookie for middleware
        const isProduction = window.location.protocol === 'https:';
        const sameSite = isProduction ? 'Strict' : 'Lax';
        const secure = isProduction ? '; Secure' : '';
        document.cookie = `token=${token}; path=/; max-age=${60 * 60}; SameSite=${sameSite}${secure}`;
      } else {
        localStorage.removeItem('auth_token');
        // Clear the cookie
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshTokenValue = refreshToken;
    if (typeof window !== 'undefined') {
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      } else {
        localStorage.removeItem('refresh_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenValue;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { requestId?: string } = {}
  ): Promise<ApiResponse<T>> {
    // Create unique request ID
    const requestId = options.requestId || `${endpoint}-${Date.now()}`;
    
    // Cancel any existing request with same ID
    this.cancelRequest(requestId);
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);
    
    try {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };

      // Only set Content-Type for JSON requests, not FormData
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        signal: abortController.signal,
      });

      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Handle 401 Unauthorized - session expired
        if (response.status === 401 && !endpoint.includes('/auth/')) {
          this.clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        
        return {
          error: {
            message: data?.error?.message || data?.message || 'An error occurred',
            code: data?.error?.code,
            status: response.status,
          },
        };
      }

      return { data };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          error: {
            message: 'Request was cancelled',
            status: 0,
          },
        };
      }
      
      return {
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          status: 0,
        },
      };
    } finally {
      this.activeRequests.delete(requestId);
    }
  }
  
  cancelRequest(requestId: string) {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
    }
  }
  
  cancelAllRequests() {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }

  private clearAuth() {
    this.setToken(null);
    this.setRefreshToken(null);
  }

  // Auth endpoints
  async register(email: string, password: string, name?: string) {
    return this.request<{ 
      user: User; 
      session?: { 
        access_token: string; 
        refresh_token?: string; 
        expires_at: number; 
      } 
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    const response = await this.request<{ 
      user: User; 
      session: { 
        access_token: string; 
        refresh_token?: string; 
        expires_at: number; 
      } 
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.session?.access_token) {
      this.setToken(response.data.session.access_token);
      if (response.data.session.refresh_token) {
        this.setRefreshToken(response.data.session.refresh_token);
      }
    }

    return response;
  }

  async logout() {
    const response = await this.request('/api/auth/logout', {
      method: 'POST',
    });
    this.clearAuth();
    return response;
  }

  async getCurrentUser() {
    return this.request<{ user: User }>('/api/auth/me');
  }

  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return {
        error: {
          message: 'No refresh token available',
          status: 401,
        },
      };
    }

    const response = await this.request<{ 
      session: { 
        access_token: string; 
        refresh_token?: string; 
        expires_at: number; 
      } 
    }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.data?.session?.access_token) {
      this.setToken(response.data.session.access_token);
      if (response.data.session.refresh_token) {
        this.setRefreshToken(response.data.session.refresh_token);
      }
    }

    return response;
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        current_password: currentPassword, 
        new_password: newPassword 
      }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; message: string }>('/health');
  }

  // HTTP method shortcuts
  async get<T = any>(endpoint: string, options?: RequestInit & { requestId?: string }) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestInit & { requestId?: string }) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestInit & { requestId?: string }) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string, options?: RequestInit & { requestId?: string }) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();