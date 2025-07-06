import { logError } from './logger';

export interface ErrorResponse {
  code: string;
  message: string;
  details?: string;
}

export class AppError extends Error {
  code: string;
  details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export async function handleError(error: unknown, context: string): Promise<ErrorResponse> {
  let errorResponse: ErrorResponse;

  if (error instanceof AppError) {
    errorResponse = {
      code: error.code,
      message: error.message,
      details: error.details
    };
  } else if (error instanceof Error) {
    errorResponse = {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Ocorreu um erro inesperado',
      details: error.stack
    };
  } else {
    errorResponse = {
      code: 'UNKNOWN_ERROR',
      message: 'Ocorreu um erro inesperado',
      details: String(error)
    };
  }

  // Log error for debugging
  await logError(errorResponse.code, new Error(errorResponse.message));

  return errorResponse;
}