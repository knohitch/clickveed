// Fix Bug #10: Standardized error response utility
// Provides consistent error response format across all API endpoints

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: ErrorCode;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Creates a standard error response
 */
export function createErrorResponse(
  message: string,
  code: ErrorCode = ErrorCode.INTERNAL_ERROR,
  details?: any
): ErrorResponse {
  return {
    success: false,
    error: message,
    code,
    ...(details && { details }),
  };
}

/**
 * Creates a validation error response (400)
 */
export function createValidationError(
  message: string,
  details?: any
): ErrorResponse {
  return createErrorResponse(message, ErrorCode.VALIDATION_ERROR, details);
}

/**
 * Creates an unauthorized error response (401)
 */
export function createUnauthorizedError(
  message: string = 'Unauthorized'
): ErrorResponse {
  return createErrorResponse(message, ErrorCode.UNAUTHORIZED);
}

/**
 * Creates a forbidden error response (403)
 */
export function createForbiddenError(
  message: string = 'Forbidden'
): ErrorResponse {
  return createErrorResponse(message, ErrorCode.FORBIDDEN);
}

/**
 * Creates a not found error response (404)
 */
export function createNotFoundError(
  message: string = 'Resource not found'
): ErrorResponse {
  return createErrorResponse(message, ErrorCode.NOT_FOUND);
}

/**
 * Creates an internal server error response (500)
 */
export function createInternalError(
  message: string,
  details?: any
): ErrorResponse {
  return createErrorResponse(message, ErrorCode.INTERNAL_ERROR, details);
}

/**
 * Creates a success response
 */
export function createSuccessResponse<T = any>(
  data?: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    ...(data && { data }),
    ...(message && { message }),
  };
}
