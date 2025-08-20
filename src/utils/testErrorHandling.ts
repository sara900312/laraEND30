/**
 * Test utility to verify error message extraction works correctly
 * This helps debug the "[object Object]" error issue
 */

import { getErrorMessage, handleSupabaseError } from './errorHandler';

export function testErrorHandling() {
  console.group('🧪 Testing Error Handling');

  // Test various error types
  const testCases = [
    {
      name: 'Standard Error',
      error: new Error('Test error message')
    },
    {
      name: 'String Error',
      error: 'Simple string error'
    },
    {
      name: 'Supabase Error Object',
      error: {
        message: 'Database connection failed',
        details: 'Connection timeout after 30 seconds',
        hint: 'Check your internet connection',
        code: 'CONNECTION_TIMEOUT'
      }
    },
    {
      name: 'Complex Supabase Error',
      error: {
        error: {
          message: 'Nested error message'
        },
        details: 'Complex error details',
        code: 'COMPLEX_ERROR'
      }
    },
    {
      name: 'Empty Object',
      error: {}
    },
    {
      name: 'Object without message',
      error: {
        code: 'NO_MESSAGE',
        details: 'Error without message field'
      }
    }
  ];

  testCases.forEach(testCase => {
    console.log(`\nTesting: ${testCase.name}`);
    const extractedMessage = getErrorMessage(testCase.error);
    console.log('Original:', testCase.error);
    console.log('Extracted:', extractedMessage);
    console.log('Is "[object Object]"?', extractedMessage === '[object Object]');
  });

  console.groupEnd();
}

export function testSupabaseErrorHandling() {
  console.group('🧪 Testing Supabase Error Handling');

  const mockSupabaseError = {
    message: 'INSERT INTO "notifications" failed',
    details: 'Foreign key constraint violation',
    hint: 'Check that recipient_id exists in the referenced table',
    code: 'FOREIGN_KEY_VIOLATION'
  };

  console.log('Testing handleSupabaseError with mock data...');
  const result = handleSupabaseError(mockSupabaseError, 'test operation', { testData: 'sample' });
  console.log('Result:', result);

  console.groupEnd();
}

// Auto-run tests in development
if (import.meta.env.DEV) {
  console.log('🔧 Error handling utilities loaded. Run testErrorHandling() or testSupabaseErrorHandling() to test.');
}
