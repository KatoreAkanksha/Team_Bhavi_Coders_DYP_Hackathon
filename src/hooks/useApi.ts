import { useState, useCallback } from 'react';
import { apiClient, ApiResponse, ApiRequestOptions } from '@/config/api';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    async (
      endpoint: string,
      options: ApiRequestOptions = {},
      { onSuccess, onError }: UseApiOptions<T> = {}
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.request<T>(endpoint, options);
        setData(response.data);
        onSuccess?.(response.data);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    data,
    error,
    loading,
    request,
  };
}
