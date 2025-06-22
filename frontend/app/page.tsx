'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen auth-gradient flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse mx-1"></div>
          <div
            className="w-3 h-3 bg-purple-400 rounded-full animate-pulse mx-1"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="w-3 h-3 bg-purple-400 rounded-full animate-pulse mx-1"
            style={{ animationDelay: '0.4s' }}
          ></div>
        </div>
        <div className="text-lg text-gray-300">Loading...</div>
      </div>
    </div>
  );
}