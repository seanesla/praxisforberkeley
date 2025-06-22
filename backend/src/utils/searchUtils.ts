export interface SearchResult {
  id: string;
  type: string;
  title: string;
  content?: string;
  metadata?: {
    tags?: string[];
    created_at?: string;
    author?: string;
    [key: string]: any;
  };
}

export interface FacetCounts {
  types: Record<string, number>;
  tags: Record<string, number>;
  dates: Record<string, number>;
  authors?: Record<string, number>;
}

export async function generateFacetCounts(results: SearchResult[]): Promise<FacetCounts> {
  const facets: FacetCounts = {
    types: {},
    tags: {},
    dates: {},
    authors: {},
  };

  results.forEach(result => {
    // Count by type
    facets.types[result.type] = (facets.types[result.type] || 0) + 1;
    
    // Count by tags
    if (result.metadata?.tags && Array.isArray(result.metadata.tags)) {
      result.metadata.tags.forEach((tag: string) => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      });
    }
    
    // Count by date (monthly)
    if (result.metadata?.created_at) {
      try {
        const date = new Date(result.metadata.created_at);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          facets.dates[monthKey] = (facets.dates[monthKey] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid dates
      }
    }
    
    // Count by author
    if (result.metadata?.author && facets.authors) {
      facets.authors[result.metadata.author] = (facets.authors[result.metadata.author] || 0) + 1;
    }
  });

  // Sort facets by count (descending) and limit to top items
  const sortAndLimit = (obj: Record<string, number>, limit: number = 20) => {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  };

  return {
    types: sortAndLimit(facets.types, 10),
    tags: sortAndLimit(facets.tags, 30),
    dates: sortAndLimit(facets.dates, 12),
    authors: facets.authors ? sortAndLimit(facets.authors, 20) : undefined,
  };
}

export function parseSearchFilters(filters: any) {
  const parsed: any = {};
  
  if (filters?.dateRange) {
    if (filters.dateRange.start && filters.dateRange.end) {
      parsed.dateRange = {
        start: new Date(filters.dateRange.start),
        end: new Date(filters.dateRange.end),
      };
    }
  }
  
  if (filters?.documentTypes && Array.isArray(filters.documentTypes)) {
    parsed.documentTypes = filters.documentTypes.filter((type: any) => typeof type === 'string');
  }
  
  if (filters?.tags && Array.isArray(filters.tags)) {
    parsed.tags = filters.tags.filter((tag: any) => typeof tag === 'string');
  }
  
  if (filters?.authors && Array.isArray(filters.authors)) {
    parsed.authors = filters.authors.filter((author: any) => typeof author === 'string');
  }
  
  return parsed;
}