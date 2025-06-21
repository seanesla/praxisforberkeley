'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useRouter } from 'next/navigation';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already authenticated and not loading, redirect to dashboard
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mx-1"></div>
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mx-1"
              style={{ animationDelay: '0.2s' }}
            ></div>
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mx-1"
              style={{ animationDelay: '0.4s' }}
            ></div>
          </div>
          <div className="text-lg text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-700 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-40 w-80 h-80 bg-pink-700 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-80 h-80 bg-blue-700 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex min-h-screen">
        {/* Left side - Auth form */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
          <div className="w-full max-w-md mx-auto">
            {children}
          </div>
        </div>
        
        {/* Right side - Feature showcase (desktop only) */}
        <div className="hidden lg:flex lg:flex-1 bg-gray-800/50 backdrop-blur-sm">
          <div className="flex-1 flex flex-col justify-center px-16">
            <div className="max-w-lg">
              <h2 className="text-4xl font-bold text-white mb-6">
                Your Ideas, Realized.
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Experience the power of AI-driven knowledge management with Praxis. 
                Transform your documents into actionable insights.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Instant Context</h3>
                    <p className="text-sm text-gray-400">Get relevant suggestions as you write</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">AI-Powered Insights</h3>
                    <p className="text-sm text-gray-400">Claude 4 Sonnet built-in, no API key needed</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Unified Workspace</h3>
                    <p className="text-sm text-gray-400">Everything you need in one place</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}