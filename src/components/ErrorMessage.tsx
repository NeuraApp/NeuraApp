import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ErrorResponse } from '@/utils/error-handler';

interface ErrorMessageProps {
  error: ErrorResponse;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ error, onRetry, className = '' }: ErrorMessageProps) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{error.message}</h3>
          {error.details && (
            <p className="mt-1 text-sm text-red-600">{error.details}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}