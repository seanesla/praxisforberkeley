import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Exponential backoff retry delay
const getRetryDelay = (attempt: number): number => {
  return Math.min(1000 * Math.pow(2, attempt), 10000);
};

// Type for API responses
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Enhanced API client with retry logic and better error handling
class ApiClient {
  private instance: AxiosInstance;
  private maxRetries = 3;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and retry logic
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: number };

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          toast.error('Session expired. Please login again.');
          return Promise.reject(error);
        }

        // Retry logic for network errors and 5xx errors
        if (
          originalRequest &&
          !originalRequest._retry &&
          (error.code === 'ECONNABORTED' || 
           error.code === 'ETIMEDOUT' ||
           !error.response || 
           error.response.status >= 500)
        ) {
          originalRequest._retry = (originalRequest._retry || 0) + 1;

          if (originalRequest._retry <= this.maxRetries) {
            const delay = getRetryDelay(originalRequest._retry);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.instance(originalRequest);
          }
        }

        // Generic error handling
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.message || 
                           error.message || 
                           'An unexpected error occurred';

        // Don't show toast for cancelled requests
        if (error.code !== 'ECONNABORTED') {
          toast.error(errorMessage);
        }

        return Promise.reject(error);
      }
    );
  }

  // GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  // POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  // PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  // PATCH request
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  // DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  // File upload with progress
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.instance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }

  // Batch requests
  async batch<T = any>(requests: Promise<any>[]): Promise<T[]> {
    return Promise.all(requests);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export commonly used API endpoints
export const API_ENDPOINTS = {
  // Auth
  login: '/auth/login',
  register: '/auth/register',
  logout: '/auth/logout',
  profile: '/auth/profile',

  // Documents
  documents: '/documents',
  upload: '/documents/upload',
  
  // Flashcards
  flashcards: '/flashcards',
  flashcardSets: '/flashcards/sets',
  
  // Notes
  notes: '/notes',
  
  // Mindmaps
  mindmaps: '/mindmaps',
  
  // New features
  spacedRepetition: '/spaced-repetition',
  exercises: '/exercises',
  knowledgeGaps: '/knowledge-gaps',
  citations: '/citations',
  search: '/search',
  workspace: '/workspace',
  reports: '/reports',
  workflows: '/workflows',
  analytics: '/analytics',
  
  // AI
  ai: '/ai',
  podcast: '/podcast',
  socratic: '/socratic',
} as const;