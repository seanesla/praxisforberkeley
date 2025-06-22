'use client';

import { useEffect, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export interface WithAuthProps {
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Higher-order component for protecting routes with authentication
 * Usage: export default withAuth(YourComponent);
 */
export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: WithAuthProps = {}
) {
  const { redirectTo = '/login', fallback = null } = options;

  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    useEffect(() => {
      if (!token) {
        toast.error('Please login to access this page');
        router.push(redirectTo);
      }
    }, [token, router]);

    // Show fallback while checking auth
    if (!token) {
      return <>{fallback || <AuthLoadingFallback />}</>;
    }

    return <Component {...props} />;
  };
}

/**
 * Hook for checking authentication status
 */
export function useAuth() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const isAuthenticated = !!token;

  return {
    isAuthenticated,
    token,
    user,
    logout,
  };
}

/**
 * Component for checking auth status without HOC
 */
export function RequireAuth({ 
  children, 
  redirectTo = '/login',
  fallback = null 
}: { 
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, router, redirectTo]);

  if (!isAuthenticated) {
    return <>{fallback || <AuthLoadingFallback />}</>;
  }

  return <>{children}</>;
}

/**
 * Default loading component while checking auth
 */
function AuthLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
    </div>
  );
}