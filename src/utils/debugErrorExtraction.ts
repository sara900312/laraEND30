/**
 * Debug utility to test error extraction directly in browser console
 * Add this to window for easy testing
 */

import { extractErrorMessage, extractSupabaseError, extractStoreError } from './errorMessageExtractor';

// Test the error extraction utility
export const debugErrorExtraction = () => {
  console.log('🔍 Testing error extraction utility...');
  
  // Test case 1: Simple string
  const stringError = "This is a string error";
  console.log('1. String error:', extractErrorMessage(stringError));
  
  // Test case 2: Error object
  const errorObj = new Error("This is an Error object");
  console.log('2. Error object:', extractErrorMessage(errorObj));
  
  // Test case 3: Supabase duplicate key error (common store creation error)
  const supabaseError = {
    message: "duplicate key value violates unique constraint \"stores_name_key\"",
    details: "Key (name)=(Test Store) already exists.",
    hint: null,
    code: "23505"
  };
  console.log('3. Supabase duplicate key:', extractStoreError(supabaseError));
  
  // Test case 4: Object without proper message properties
  const badObject = {
    someProperty: "value",
    nested: { data: "something" },
    number: 123
  };
  console.log('4. Bad object:', extractErrorMessage(badObject));
  
  // Test case 5: PostgreSQL permission error
  const permissionError = {
    message: "permission denied for table stores",
    code: "42501"
  };
  console.log('5. Permission error:', extractSupabaseError(permissionError));
  
  // Test case 6: Null/undefined
  console.log('6. Null:', extractErrorMessage(null));
  console.log('7. Undefined:', extractErrorMessage(undefined));
  
  // Test case 8: Empty object
  console.log('8. Empty object:', extractErrorMessage({}));
  
  console.log('✅ Error extraction tests completed');
};

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).debugErrorExtraction = debugErrorExtraction;
  console.log('💡 Run debugErrorExtraction() in console to test error handling');
}

export default debugErrorExtraction;
