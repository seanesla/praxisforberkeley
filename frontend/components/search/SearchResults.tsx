'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DocumentTextIcon, 
  ClockIcon,
  TagIcon,
  StarIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'note' | 'flashcard' | 'mindmap';
  content: string;
  excerpt?: string;
  relevance: number;
  metadata: {
    created_at: string;
    updated_at?: string;
    tags?: string[];
    author?: string;
    source?: string;
    page_count?: number;
  };
  highlights?: Array<{
    field: string;
    snippet: string;
  }>;
}

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onResultSelect?: (result: SearchResult) => void;
}

export function SearchResults({ results, loading, query, onResultSelect }: SearchResultsProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <DocumentTextIcon className="w-5 h-5" />;
      case 'note':
        return <DocumentTextIcon className="w-5 h-5" />;
      case 'flashcard':
        return <StarIcon className="w-5 h-5" />;
      case 'mindmap':
        return <ChevronRightIcon className="w-5 h-5" />;
      default:
        return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'blue';
      case 'note': return 'green';
      case 'flashcard': return 'purple';
      case 'mindmap': return 'orange';
      default: return 'gray';
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200 px-0.5">{part}</mark> : 
        part
    );
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-500">Searching...</p>
        </div>
      </Card>
    );
  }

  if (results.length === 0 && query) {
    return (
      <Card className="p-8 text-center">
        <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500 mb-2">No results found for "{query}"</p>
        <p className="text-sm text-gray-400">Try adjusting your search terms or filters</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {query && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Found {results.length} results for "{query}"
          </p>
          <Button variant="ghost" size="sm">
            Save Search
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {results.map((result) => (
          <Card 
            key={result.id} 
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onResultSelect?.(result)}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`text-${getTypeColor(result.type)}-500 flex-shrink-0 mt-1`}>
                    {getTypeIcon(result.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {highlightText(result.title, query)}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{format(new Date(result.metadata.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {result.metadata.author && (
                        <span>by {result.metadata.author}</span>
                      )}
                      {result.metadata.page_count && (
                        <span>{result.metadata.page_count} pages</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {Math.round(result.relevance * 100)}% match
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content Excerpt */}
              {result.excerpt && (
                <p className="text-gray-600 line-clamp-2">
                  {highlightText(result.excerpt, query)}
                </p>
              )}

              {/* Highlights */}
              {result.highlights && result.highlights.length > 0 && (
                <div className="space-y-2 pl-8">
                  {result.highlights.slice(0, 2).map((highlight, idx) => (
                    <div key={idx} className="text-sm border-l-2 border-gray-200 pl-3">
                      <p className="text-gray-500 text-xs mb-1">{highlight.field}</p>
                      <p className="text-gray-700">
                        ...{highlightText(highlight.snippet, query)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {result.metadata.tags && result.metadata.tags.length > 0 && (
                <div className="flex items-center space-x-2 pl-8">
                  <TagIcon className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {result.metadata.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {results.length >= 20 && (
        <div className="text-center">
          <Button variant="outline">
            Load More Results
          </Button>
        </div>
      )}
    </div>
  );
}