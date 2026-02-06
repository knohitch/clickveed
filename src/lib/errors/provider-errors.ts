/**
 * @fileOverview Standardized provider error codes and error factory
 * 
 * UI-Safe Error Pattern:
 * - code: Machine-readable error code (enum-style)
 * - message: Human-readable message
 * - provider: Optional provider name for context
 * - Original error preserved for debugging
 */

import { z } from 'zod';

// Error code enum - extend as needed
export const ProviderErrorCode = {
  // OAuth-related errors
  PROVIDER_OAUTH_REQUIRED: 'PROVIDER_OAUTH_REQUIRED',
  PROVIDER_OAUTH_SETUP_INCOMPLETE: 'PROVIDER_OAUTH_SETUP_INCOMPLETE',
  
  // Provider state errors
  PROVIDER_NOT_ENABLED: 'PROVIDER_NOT_ENABLED',
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  PROVIDER_PLACEHOLDER: 'PROVIDER_PLACEHOLDER',
  
  // Configuration errors
  PROVIDER_KEY_MISSING: 'PROVIDER_KEY_MISSING',
  PROVIDER_KEY_INVALID: 'PROVIDER_KEY_INVALID',
  
  // Runtime errors
  PROVIDER_RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ProviderErrorCodeType = typeof ProviderErrorCode[keyof typeof ProviderErrorCode];

// Schema for structured errors
export const ProviderErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  provider: z.string().optional(),
  originalError: z.any().optional(),
});

export type ProviderErrorData = z.infer<typeof ProviderErrorSchema>;

/**
 * ProviderError class - extends Error with structured data
 * Maintains backward compatibility (instanceof Error works)
 */
export class ProviderError extends Error {
  code: ProviderErrorCodeType;
  provider?: string;
  originalError?: Error;

  constructor(
    code: ProviderErrorCodeType,
    message: string,
    options?: {
      provider?: string;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.provider = options?.provider;
    this.originalError = options?.originalError;

    // Maintain stack trace (V8 environments)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }

  /**
   * Convert to structured data for UI consumption
   */
  toJSON(): ProviderErrorData {
    return {
      code: this.code,
      message: this.message,
      provider: this.provider,
      originalError: this.originalError?.message,
    };
  }

  /**
   * Check if error is a specific type
   */
  static isProviderError(error: unknown): error is ProviderError {
    return (
      error instanceof ProviderError ||
      (error instanceof Error &&
        'code' in error &&
        typeof (error as any).code === 'string')
    );
  }
}

// Error factory functions for common cases
export function oauthRequired(
  provider: string,
  setupInstructions: string
): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_OAUTH_REQUIRED,
    `[${provider}] OAuth authentication is required. ${setupInstructions}`,
    { provider }
  );
}

export function providerPlaceholder(provider: string): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_PLACEHOLDER,
    `[${provider}] This provider is a placeholder implementation and not yet functional.`,
    { provider }
  );
}

export function providerDisabled(
  provider: string,
  reason: string = 'Provider has been disabled.'
): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_DISABLED,
    `[${provider}] ${reason}`,
    { provider }
  );
}

export function providerNotEnabled(
  provider: string
): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_NOT_ENABLED,
    `[${provider}] Provider is not enabled in configuration.`,
    { provider }
  );
}

export function providerRateLimited(
  provider: string,
  retryAfter?: number
): ProviderError {
  const message = retryAfter
    ? `[${provider}] Rate limited. Retry after ${retryAfter} seconds.`
    : `[${provider}] Rate limited. Please try again later.`;
  
  return new ProviderError(
    ProviderErrorCode.PROVIDER_RATE_LIMITED,
    message,
    { provider }
  );
}

export function providerTimeout(
  provider: string,
  timeoutMs: number
): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_TIMEOUT,
    `[${provider}] Request timed out after ${timeoutMs / 1000} seconds.`,
    { provider }
  );
}

export function providerUnavailable(
  provider: string,
  reason?: string
): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_UNAVAILABLE,
    `[${provider}] Provider is temporarily unavailable. ${reason || ''}`,
    { provider }
  );
}

export function providerError(
  provider: string,
  error: Error
): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_ERROR,
    `[${provider}] Provider error: ${error.message}`,
    { provider, originalError: error }
  );
}

export function providerKeyMissing(provider: string): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_KEY_MISSING,
    `[${provider}] API key is not configured.`,
    { provider }
  );
}

export function providerKeyInvalid(provider: string): ProviderError {
  return new ProviderError(
    ProviderErrorCode.PROVIDER_KEY_INVALID,
    `[${provider}] API key is invalid or expired.`,
    { provider }
  );
}
