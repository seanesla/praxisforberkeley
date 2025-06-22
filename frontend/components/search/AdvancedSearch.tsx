'use client';

import React, { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  CalendarDaysIcon,
  TagIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { SearchResults } from './SearchResults';
import { QueryExpansion } from './QueryExpansion';

interface AdvancedSearchProps {
  userId: string;
  onResultSelect?: (result: any) => void;
}

interface SearchFilters {
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  documentTypes?: string[];
  tags?: string[];
  authors?: string[];
  minRelevance?: number;
}

export function AdvancedSearch({ userId, onResultSelect }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [expandedQuery, setExpandedQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [facets, setFacets] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showQueryExpansion, setShowQueryExpansion] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/search/v2/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          query: expandedQuery || debouncedQuery,
          facets: {
            ...filters,
            expandQuery: !expandedQuery // Only auto-expand if not manually expanded
          }
        })
      });

      const data = await response.json();
      setSearchResults(data.results || []);
      setFacets(data.facets || {});
      
      if (data.expandedQuery && !expandedQuery) {
        setShowQueryExpansion(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, expandedQuery, filters]);

  React.useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const removeFilter = (filterType: string, value?: any) => {
    if (value !== undefined) {
      // Remove specific value from array filters
      setFilters(prev => ({
        ...prev,
        [filterType]: (prev[filterType] as any[])?.filter(v => v !== value)
      }));
    } else {
      // Remove entire filter
      const newFilters = { ...filters };
      delete newFilters[filterType as keyof SearchFilters];
      setFilters(newFilters);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange?.start || filters.dateRange?.end) count++;
    if (filters.documentTypes?.length) count += filters.documentTypes.length;
    if (filters.tags?.length) count += filters.tags.length;
    if (filters.authors?.length) count += filters.authors.length;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search across all your documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="w-4 h-4 mr-1" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
          </div>

          {/* Query Expansion Suggestions */}
          {showQueryExpansion && (
            <QueryExpansion
              originalQuery={query}
              onAccept={(expanded) => {
                setExpandedQuery(expanded);
                setShowQueryExpansion(false);
              }}
              onDismiss={() => setShowQueryExpansion(false)}
            />
          )}

          {/* Active Filters Display */}
          {getActiveFilterCount() > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.dateRange?.start && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CalendarDaysIcon className="w-3 h-3" />
                  From: {format(filters.dateRange.start, 'MMM d, yyyy')}
                  <XMarkIcon 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => handleFilterChange('dateRange', { ...filters.dateRange, start: undefined })}
                  />
                </Badge>
              )}
              {filters.documentTypes?.map(type => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  <DocumentTextIcon className="w-3 h-3" />
                  {type}
                  <XMarkIcon 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFilter('documentTypes', type)}
                  />
                </Badge>
              ))}
              {filters.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  <TagIcon className="w-3 h-3" />
                  {tag}
                  <XMarkIcon 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFilter('tags', tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Search Filters</h3>
            
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDaysIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.start ? format(filters.dateRange.start, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.start}
                      onSelect={(date) => handleFilterChange('dateRange', { ...filters.dateRange, start: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDaysIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.end ? format(filters.dateRange.end, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.end}
                      onSelect={(date) => handleFilterChange('dateRange', { ...filters.dateRange, end: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Document Types */}
            <div>
              <label className="text-sm font-medium mb-2 block">Document Types</label>
              <div className="space-y-2">
                {['PDF', 'Note', 'Article', 'Book', 'Paper'].map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.documentTypes?.includes(type) || false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleFilterChange('documentTypes', [...(filters.documentTypes || []), type]);
                        } else {
                          removeFilter('documentTypes', type);
                        }
                      }}
                    />
                    <span className="text-sm">{type}</span>
                    {facets.types?.[type] && (
                      <span className="text-xs text-gray-500">({facets.types[type]})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Tags (if available in facets) */}
            {Object.keys(facets.tags || {}).length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(facets.tags).slice(0, 10).map(([tag, count]) => (
                    <Badge
                      key={tag}
                      variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        if (filters.tags?.includes(tag)) {
                          removeFilter('tags', tag);
                        } else {
                          handleFilterChange('tags', [...(filters.tags || []), tag]);
                        }
                      }}
                    >
                      {tag} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Relevance Threshold */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Minimum Relevance: {filters.minRelevance || 0.5}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.minRelevance || 0.5}
                onChange={(e) => handleFilterChange('minRelevance', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Search Results */}
      <SearchResults
        results={searchResults}
        loading={loading}
        query={expandedQuery || query}
        onResultSelect={onResultSelect}
      />
    </div>
  );
}