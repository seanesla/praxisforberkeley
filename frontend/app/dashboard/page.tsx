'use client';

import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="sm" />
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {user?.email}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card">
          <h1 className="text-2xl font-light mb-4">Welcome to Praxis</h1>
          <p className="text-gray-400">
            Your dashboard is being prepared. More features coming soon!
          </p>
        </div>
      </main>
    </div>
  );
}