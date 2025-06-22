'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SparklesIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface QueryExpansionProps {
  originalQuery: string;
  onAccept: (expandedQuery: string) => void;
  onDismiss: () => void;
}

interface Suggestion {
  type: 'synonym' | 'related' | 'spelling' | 'concept';
  text: string;
  confidence: number;
}

export function QueryExpansion({ originalQuery, onAccept, onDismiss }: QueryExpansionProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, [originalQuery]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search/v2/suggestions?q=${encodeURIComponent(originalQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await res.json();
      
      // Process suggestions into structured format
      const processed: Suggestion[] = data.suggestions?.map((s: any) => ({
        type: s.type || 'related',
        text: s.text || s,
        confidence: s.confidence || 0.8
      })) || [];
      
      setSuggestions(processed);
      
      // Auto-select high confidence suggestions
      const autoSelect = processed
        .filter(s => s.confidence > 0.85)
        .map(s => s.text);
      setSelectedSuggestions(new Set(autoSelect));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSuggestion = (text: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(text)) {
      newSelected.delete(text);
    } else {
      newSelected.add(text);
    }
    setSelectedSuggestions(newSelected);
  };

  const buildExpandedQuery = () => {
    const selected = Array.from(selectedSuggestions);
    if (selected.length === 0) return originalQuery;
    
    // Build expanded query with OR operators
    const expansions = selected.map(s => `"${s}"`).join(' OR ');
    return `(${originalQuery} OR ${expansions})`;
  };

  const handleAccept = () => {
    const expandedQuery = buildExpandedQuery();
    onAccept(expandedQuery);
  };

  if (loading) {
    return (
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-blue-500 animate-pulse" />
          <span className="text-sm text-blue-700">Finding related terms...</span>
        </div>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'synonym': return 'blue';
      case 'related': return 'green';
      case 'spelling': return 'amber';
      case 'concept': return 'purple';
      default: return 'gray';
    }
  };

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-blue-900">
              Enhance your search with related terms
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-blue-700 hover:text-blue-900"
          >
            <XMarkIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <Badge
              key={idx}
              variant={selectedSuggestions.has(suggestion.text) ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                selectedSuggestions.has(suggestion.text) 
                  ? 'bg-blue-600 text-white' 
                  : `text-${getSuggestionColor(suggestion.type)}-700 border-${getSuggestionColor(suggestion.type)}-300`
              }`}
              onClick={() => toggleSuggestion(suggestion.text)}
            >
              <span className="flex items-center space-x-1">
                {selectedSuggestions.has(suggestion.text) && (
                  <CheckIcon className="w-3 h-3" />
                )}
                <span>{suggestion.text}</span>
                <span className="text-xs opacity-70">
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              </span>
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-blue-700">
            {selectedSuggestions.size} terms selected
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-blue-700"
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={selectedSuggestions.size === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Search with expansions
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}