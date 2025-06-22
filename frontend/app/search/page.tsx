'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { QueryExpansion } from '@/components/search/QueryExpansion';
import { SearchResults } from '@/components/search/SearchResults';
import { 
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchStats, setSearchStats] = useState({
    totalResults: 0,
    searchTime: 0,
    relevanceScore: 0
  });
  
  const [filters, setFilters] = useState({
    documentType: 'all',
    dateRange: 'all',
    tags: [],
    minRelevance: 0.5
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSearch = async (query: string, expandedQuery?: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search-v2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: expandedQuery || query,
          filters,
          limit: 20
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setSearchStats({
          totalResults: data.totalResults || 0,
          searchTime: Date.now() - startTime,
          relevanceScore: data.averageRelevance || 0
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <Logo size="sm" />
              <h1 className="text-xl font-semibold text-white">Advanced Search</h1>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search Header */}
          <div className="text-center py-8">
            <MagnifyingGlassIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">
              Search Your Knowledge Base
            </h2>
            <p className="text-gray-400">
              Find exactly what you're looking for with AI-powered search
            </p>
          </div>

          {/* Search Interface */}
          <div className="space-y-4">
            <AdvancedSearch
              onSearch={handleSearch}
              onQueryChange={setSearchQuery}
              isLoading={isLoading}
            />
            
            {searchQuery && (
              <QueryExpansion
                query={searchQuery}
                onExpand={(expandedQuery) => handleSearch(searchQuery, expandedQuery)}
              />
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="glass-card space-y-4">
              <h3 className="text-lg font-semibold text-white">Search Filters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Document Type
                  </label>
                  <select
                    value={filters.documentType}
                    onChange={(e) => handleFilterChange({ ...filters, documentType: e.target.value })}
                    className="glass-input"
                  >
                    <option value="all">All Types</option>
                    <option value="pdf">PDF</option>
                    <option value="text">Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="note">Notes</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange({ ...filters, dateRange: e.target.value })}
                    className="glass-input"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Min Relevance Score
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.minRelevance}
                    onChange={(e) => handleFilterChange({ ...filters, minRelevance: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-400">{(filters.minRelevance * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Search Stats */}
          {searchResults.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-4">
                <span>{searchStats.totalResults} results</span>
                <span>•</span>
                <span>{searchStats.searchTime}ms</span>
                <span>•</span>
                <span>Avg relevance: {(searchStats.relevanceScore * 100).toFixed(0)}%</span>
              </div>
              
              <button className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                <ChartBarIcon className="w-4 h-4" />
                <span>View Analytics</span>
              </button>
            </div>
          )}

          {/* Results */}
          <SearchResults
            results={searchResults}
            isLoading={isLoading}
            query={searchQuery}
          />
        </div>
      </main>
    </div>
  );
}