/**
 * Utility to extract meaningful error messages from various error types
 * Fixes the "[object Object]" error display issue
 */

export const extractErrorMessage = (error: unknown, fallbackMessage: string = 'حدث خطأ غير متوقع'): string => {
  // Handle null/undefined
  if (!error) {
    return fallbackMessage;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error || fallbackMessage;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  // Handle Supabase-style error objects
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    
    // Check for common error properties in order of preference
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    
    if (errorObj.details && typeof errorObj.details === 'string') {
      return errorObj.details;
    }
    
    if (errorObj.hint && typeof errorObj.hint === 'string') {
      return errorObj.hint;
    }
    
    if (errorObj.error && typeof errorObj.error === 'string') {
      return errorObj.error;
    }
    
    if (errorObj.description && typeof errorObj.description === 'string') {
      return errorObj.description;
    }
    
    // For Supabase PostgreSQL errors
    if (errorObj.code && errorObj.message) {
      return `[${errorObj.code}] ${errorObj.message}`;
    }
    
    // Try to stringify if it's a simple object
    try {
      const stringified = JSON.stringify(error);
      if (stringified !== '{}' && stringified !== '[object Object]') {
        return stringified;
      }
    } catch {
      // Ignore JSON.stringify errors
    }
  }

  return fallbackMessage;
};

/**
 * Specific error message extractor for Supabase operations
 */
export const extractSupabaseError = (error: unknown, operation: string = 'العملية'): string => {
  const baseMessage = extractErrorMessage(error);
  
  // Handle common Supabase error codes with Arabic translations
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    
    switch (errorObj.code) {
      case '23505':
        return 'هذا العنصر موجود مسبقاً';
      case '23503':
        return 'لا يمكن حذف هذا العنصر لأنه مرتبط بعناصر أخرى';
      case '42P01':
        return 'الجدول المطلوب غير موجود في قاعدة البيانات';
      case '42501':
        return 'ليس لديك صلاحية لتنفيذ هذه العملية';
      case '08003':
        return 'انقطع الاتصال مع قاعدة البيانات';
      default:
        if (baseMessage.includes('duplicate key value violates unique constraint')) {
          return 'هذا العنصر موجود مسبقاً';
        }
        if (baseMessage.includes('violates foreign key constraint')) {
          return 'لا يمكن حذف هذا العنصر لأنه مرتبط بعناصر أخرى';
        }
        if (baseMessage.includes('permission denied')) {
          return 'ليس لديك صلاحية لتنفيذ هذه العملية';
        }
        break;
    }
  }
  
  return baseMessage;
};

/**
 * Extract error message specifically for store operations
 */
export const extractStoreError = (error: unknown): string => {
  const message = extractSupabaseError(error, 'عملية المتجر');
  
  // Handle store-specific errors
  if (message.includes('stores_name_key')) {
    return 'اسم المتجر موجود مسبقاً، يرجى اختيار اسم آخر';
  }
  
  if (message.includes('stores_password_check')) {
    return 'كلمة المرور يجب أن تكون أطول من 3 أحرف';
  }
  
  if (message.includes('name')) {
    return 'يرجى إدخال اسم صحيح للمتجر';
  }
  
  if (message.includes('password')) {
    return 'يرجى إدخال كلمة مرور صحيحة';
  }
  
  return message;
};

export default extractErrorMessage;
