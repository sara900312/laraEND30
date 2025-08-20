/**
 * Utility functions for error handling and logging
 */

// Debug mode flag - set to true to enable detailed error debugging
const DEBUG_ERRORS = true;

/**
 * Safely extracts error message from various error types
 * Prevents "[object Object]" display in console logs
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    // Handle specific Supabase error structure
    const supabaseError = error as any;

    // Primary message extraction
    if (supabaseError.message && typeof supabaseError.message === 'string') {
      return supabaseError.message;
    }

    // Handle nested error structures
    if (supabaseError.error?.message) {
      return supabaseError.error.message;
    }

    // Try to extract key information from the error object
    const errorParts = [];

    // Add the most important information first
    if (supabaseError.details && typeof supabaseError.details === 'string') {
      errorParts.push(supabaseError.details);
    }

    if (supabaseError.hint && typeof supabaseError.hint === 'string') {
      errorParts.push(`Hint: ${supabaseError.hint}`);
    }

    if (supabaseError.code && typeof supabaseError.code === 'string') {
      errorParts.push(`Code: ${supabaseError.code}`);
    }

    if (supabaseError.statusText && typeof supabaseError.statusText === 'string') {
      errorParts.push(`Status: ${supabaseError.statusText}`);
    }

    if (errorParts.length > 0) {
      return errorParts.join(' | ');
    }

    try {
      // Try to stringify the object, with fallback for circular references
      const stringified = JSON.stringify(error, null, 2);
      if (stringified !== '{}' && stringified !== '[object Object]') {
        return stringified;
      }
    } catch (e) {
      // If JSON.stringify fails (circular reference), try toString
      const toString = error.toString();
      if (toString === '[object Object]') {
        // Extract object keys and values manually
        try {
          const keys = Object.keys(error);
          if (keys.length > 0) {
            return keys.map(key => {
              const value = (error as any)[key];
              return `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`;
            }).join(', ');
          }
        } catch (keyError) {
          // Fall back to constructor name if available
          return error.constructor?.name || 'Unknown Error Object';
        }
      }
      return toString;
    }
  }

  return String(error);
}

/**
 * Safely extracts error stack trace
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Creates a safe error object for logging
 */
export function createErrorLog(error: unknown, context?: Record<string, any>) {
  return {
    error: getErrorMessage(error),
    stack: getErrorStack(error),
    timestamp: new Date().toISOString(),
    ...context
  };
}

/**
 * Safely logs error with consistent format
 */
export function logError(message: string, error: unknown, context?: Record<string, any>) {
  console.error(message, createErrorLog(error, context));
}

/**
 * Handles Supabase-specific errors with better context
 */
export function handleSupabaseError(error: any, operation: string, data?: any) {
  // Debug the error structure if debugging is enabled
  if (DEBUG_ERRORS) {
    debugError(error, `Supabase error in ${operation}`);
  }

  // Extract meaningful error information
  const errorMessage = getErrorMessage(error);
  const errorDetails = error?.details || 'No details available';
  const errorHint = error?.hint || 'No hint available';
  const errorCode = error?.code || 'No code available';

  const errorLog = {
    operation,
    error: errorMessage,
    details: errorDetails,
    hint: errorHint,
    code: errorCode,
    data: data || undefined
  };

  // Log the detailed error for debugging
  console.error(`❌ Supabase error in ${operation}:`, errorMessage);
  console.error('Error details:', errorLog);

  return errorLog;
}

/**
 * Debug function to analyze error object structure
 */
export function debugError(error: unknown, context: string = 'Error') {
  if (!DEBUG_ERRORS) return;

  console.group(`🔍 Debug ${context}`);

  try {
    console.log('Type:', typeof error);
    console.log('Constructor:', error?.constructor?.name);
    console.log('instanceof Error:', error instanceof Error);

    if (error && typeof error === 'object') {
      console.log('Keys:', Object.keys(error));
      console.log('Prototype:', Object.getPrototypeOf(error));

      // Try different ways to extract information
      const errorObj = error as any;
      console.log('Direct properties:');
      console.log('  message:', errorObj.message);
      console.log('  code:', errorObj.code);
      console.log('  details:', errorObj.details);
      console.log('  hint:', errorObj.hint);
      console.log('  statusText:', errorObj.statusText);
      console.log('  status:', errorObj.status);
    }

    console.log('String representation:', String(error));
    console.log('toString():', error?.toString?.());

    try {
      console.log('JSON.stringify:', JSON.stringify(error, null, 2));
    } catch (e) {
      console.log('JSON.stringify failed:', e.message);
    }

  } catch (debugError) {
    console.log('Debug error:', debugError);
  } finally {
    console.groupEnd();
  }
}
