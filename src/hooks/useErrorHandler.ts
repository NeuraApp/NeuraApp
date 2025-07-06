import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import { handleError, ErrorResponse } from '@/utils/error-handler';

export function useErrorHandler() {
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { error: showToast } = useToast();

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context: string,
    options: {
      showToast?: boolean;
      customErrorMessage?: string;
    } = {}
  ): Promise<T | null> => {
    const { showToast: shouldShowToast = true, customErrorMessage } = options;
    
    try {
      setLoading(true);
      setError(null);
      return await asyncFn();
    } catch (err) {
      const errorResponse = await handleError(err, context);
      setError(errorResponse);
      
      if (shouldShowToast) {
        showToast(customErrorMessage || errorResponse.message);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  return {
    error,
    loading,
    handleAsyncError,
    clearError: () => setError(null)
  };
}