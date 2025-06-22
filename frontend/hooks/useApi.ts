import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/utils/api-client';
import { AxiosError } from 'axios';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialData?: T;
  enabled?: boolean;
}

interface UseApiReturn<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Generic hook for API calls with loading, error, and data states
 */
export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const { onSuccess, onError, initialData, enabled = true } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]) => {
      if (!enabled) return;

      try {
        setLoading(true);
        setError(null);
        const result = await apiFunction(...args);
        
        if (isMountedRef.current) {
          setData(result);
          onSuccess?.(result);
        }
        
        return result;
      } catch (err) {
        const error = err as Error;
        if (isMountedRef.current) {
          setError(error);
          onError?.(error);
        }
        throw error;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [apiFunction, enabled, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  return { data, error, loading, execute, reset };
}

/**
 * Hook for fetching data on mount
 */
export function useFetch<T = any>(
  url: string,
  options: UseApiOptions<T> & { dependencies?: any[] } = {}
) {
  const { dependencies = [], ...apiOptions } = options;
  const { data, error, loading, execute, reset } = useApi(
    () => apiClient.get<T>(url),
    apiOptions
  );

  useEffect(() => {
    execute();
  }, dependencies);

  return { data, error, loading, refetch: execute, reset };
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 */
export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseApiOptions<TData> = {}
) {
  const { data, error, loading, execute, reset } = useApi(mutationFn, options);

  const mutate = useCallback(
    async (variables: TVariables) => {
      return execute(variables);
    },
    [execute]
  );

  return {
    data,
    error,
    loading,
    mutate,
    reset,
    isLoading: loading,
    isError: !!error,
    isSuccess: !!data && !error,
  };
}

/**
 * Hook for paginated data fetching
 */
export function usePaginatedApi<T = any>(
  baseUrl: string,
  pageSize: number = 20
) {
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const { loading, error, execute } = useApi(
    async (pageNum: number) => {
      const response = await apiClient.get<{
        items: T[];
        total: number;
        hasMore: boolean;
      }>(`${baseUrl}?limit=${pageSize}&offset=${pageNum * pageSize}`);
      
      return response;
    }
  );

  const loadPage = useCallback(
    async (pageNum: number) => {
      const result = await execute(pageNum);
      if (result) {
        if (pageNum === 0) {
          setItems(result.items);
        } else {
          setItems(prev => [...prev, ...result.items]);
        }
        setTotalCount(result.total);
        setHasMore(result.hasMore);
        setPage(pageNum);
      }
    },
    [execute]
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadPage(page + 1);
    }
  }, [loading, hasMore, page, loadPage]);

  const refresh = useCallback(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    loadPage(0);
  }, [loadPage]);

  useEffect(() => {
    loadPage(0);
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    page,
  };
}

/**
 * Hook for debounced API calls (useful for search)
 */
export function useDebouncedApi<T = any>(
  apiFunction: (query: string) => Promise<T>,
  delay: number = 300
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, delay]);

  const { data, error, loading } = useFetch(
    debouncedQuery,
    {
      enabled: !!debouncedQuery,
      dependencies: [debouncedQuery],
    }
  );

  return {
    query,
    setQuery,
    data,
    error,
    loading,
    debouncedQuery,
  };
}