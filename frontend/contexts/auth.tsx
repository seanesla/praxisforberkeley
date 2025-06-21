'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { User, Session } from '@/types/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if session is expired
  const isSessionExpired = useCallback((session: Session | null): boolean => {
    if (!session) return true;
    return Date.now() >= session.expires_at;
  }, []);

  // Refresh session if needed
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.refreshToken();
      
      if (response.data?.session) {
        const newSession: Session = {
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token || '',
          expires_at: response.data.session.expires_at,
          user: user!,
        };
        setSession(newSession);
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }, [user]);

  // Check authentication on mount
  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
        setError('Authentication check timed out');
      }
    }, 10000);

    const checkAuth = async () => {
      try {
        const token = apiClient.getToken();
        
        if (!token) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        const response = await apiClient.getCurrentUser();
        
        if (mounted) {
          if (response.data?.user) {
            setUser(response.data.user);
            // Reconstruct session from stored token
            setSession({
              access_token: token,
              refresh_token: apiClient.getRefreshToken() || '',
              expires_at: Date.now() + 3600000, // 1 hour
              user: response.data.user,
            });
          } else {
            // Invalid token, clear auth
            apiClient.setToken(null);
            apiClient.setRefreshToken(null);
          }
          setLoading(false);
        }
      } catch {
        if (mounted) {
          apiClient.setToken(null);
          apiClient.setRefreshToken(null);
          setLoading(false);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    checkAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Check session expiry periodically
  useEffect(() => {
    if (!session || !user) return;

    const checkExpiry = () => {
      if (isSessionExpired(session)) {
        // Try to refresh the session
        refreshSession().then((success) => {
          if (!success) {
            // Session refresh failed, logout
            setUser(null);
            setSession(null);
            setError('Your session has expired. Please login again.');
            router.push('/login');
          }
        });
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiry, 60000);
    
    // Also check immediately
    checkExpiry();

    return () => clearInterval(interval);
  }, [session, user, isSessionExpired, refreshSession, router]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiClient.login(email, password);
      
      if (response.error) {
        setError(response.error.message);
        return false;
      }

      if (response.data) {
        setUser(response.data.user);
        setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token || '',
          expires_at: response.data.session.expires_at,
          user: response.data.user,
        });
        return true;
      }

      setError('Login failed. Please try again.');
      return false;
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiClient.register(email, password, name);
      
      if (response.error) {
        setError(response.error.message);
        return false;
      }

      if (response.data) {
        // If session is returned, log the user in automatically
        if (response.data.session) {
          setUser(response.data.user);
          setSession({
            access_token: response.data.session.access_token,
            refresh_token: response.data.session.refresh_token || '',
            expires_at: response.data.session.expires_at,
            user: response.data.user,
          });
        }
        return true;
      }

      setError('Registration failed. Please try again.');
      return false;
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Even if logout fails on server, clear local state
    } finally {
      setUser(null);
      setSession(null);
      setError(null);
      router.push('/login');
    }
  }, [router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}