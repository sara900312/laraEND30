/**
 * دوال مساعدة لمعالجة الأخطاء بشكل متسق
 * Error handling utilities for consistent error management
 */

export interface ErrorContext {
  [key: string]: any;
}

export interface FormattedError {
  message: string;
  details: string;
  stack?: string;
  context?: ErrorContext;
}

/**
 * تنسيق الخطأ للحصول على رسالة واضحة
 * Format error to get clear message
 */
export function formatError(error: unknown): FormattedError {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.message,
      stack: error.stack,
    };
  }
  
  if (typeof error === 'string') {
    return {
      message: error,
      details: error,
    };
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    
    // للأخطاء من Supabase
    if (errorObj.message) {
      return {
        message: errorObj.message,
        details: errorObj.details || errorObj.hint || errorObj.message,
        context: {
          code: errorObj.code,
          details: errorObj.details,
          hint: errorObj.hint,
        },
      };
    }
    
    // للأخطاء من fetch API
    if (errorObj.status || errorObj.statusText) {
      return {
        message: errorObj.statusText || `HTTP Error ${errorObj.status}`,
        details: `خطأ HTTP: ${errorObj.status} - ${errorObj.statusText}`,
        context: {
          status: errorObj.status,
          statusText: errorObj.statusText,
        },
      };
    }
    
    // للكائنات الأخرى
    try {
      return {
        message: 'حدث خطأ غير متوقع',
        details: JSON.stringify(error, null, 2),
      };
    } catch {
      return {
        message: 'حدث خطأ غير متوقع',
        details: 'لا يمكن تحويل الخطأ إلى نص',
      };
    }
  }
  
  return {
    message: 'حدث خطأ غير محدد',
    details: 'نوع خطأ غير معروف',
  };
}

/**
 * طباعة الخطأ في وحدة التحكم بشكل منسق
 * Log error to console with proper formatting
 */
export function logError(
  operation: string, 
  error: unknown, 
  context?: ErrorContext
): FormattedError {
  const formattedError = formatError(error);
  
  const logData = {
    operation,
    errorType: error?.constructor?.name || typeof error,
    message: formattedError.message,
    details: formattedError.details,
    stack: formattedError.stack,
    context: {
      ...formattedError.context,
      ...context,
      timestamp: new Date().toISOString(),
    },
  };
  
  console.error(`❌ ${operation}:`, logData);
  
  return formattedError;
}

/**
 * معالج شامل للأخطاء مع Toast
 * Comprehensive error handler with Toast
 */
export function handleError(
  operation: string,
  error: unknown,
  showToast: (options: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  }) => void,
  context?: ErrorContext
): FormattedError {
  const formattedError = logError(operation, error, context);
  
  showToast({
    title: `خطأ في ${operation}`,
    description: formattedError.message,
    variant: 'destructive',
  });
  
  return formattedError;
}

/**
 * أنواع الأخطاء الشائعة
 * Common error types
 */
export const ErrorTypes = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTH: 'authentication',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  UNKNOWN: 'unknown',
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

/**
 * تحديد نوع الخطأ
 * Determine error type
 */
export function getErrorType(error: unknown): ErrorType {
  const formattedError = formatError(error);
  const message = formattedError.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorTypes.NETWORK;
  }
  
  if (message.includes('auth') || message.includes('unauthorized')) {
    return ErrorTypes.AUTH;
  }
  
  if (message.includes('permission') || message.includes('forbidden')) {
    return ErrorTypes.PERMISSION;
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return ErrorTypes.NOT_FOUND;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorTypes.VALIDATION;
  }
  
  if (message.includes('server') || message.includes('500')) {
    return ErrorTypes.SERVER;
  }
  
  return ErrorTypes.UNKNOWN;
}

/**
 * رسائل خطأ مخصصة حسب العملية
 * Custom error messages by operation
 */
export const ErrorMessages = {
  fetchOrders: 'تحميل الطلبات',
  updateOrder: 'تحديث الطلب',
  assignOrder: 'تعيين الطلب',
  deleteOrder: 'حذف الطلب',
  createStore: 'إنشاء المتجر',
  fetchStores: 'تحميل المتاجر',
  authentication: 'تسجيل الدخول',
  returnOrder: 'إرجاع الطلب',
} as const;

/**
 * مثال على الاستخدام
 * Usage example
 */
export const errorHandlingExample = {
  // استخدام بسيط
  simple: (error: unknown) => {
    const formatted = formatError(error);
    console.log('خطأ:', formatted.message);
  },
  
  // استخدام مع سياق
  withContext: (error: unknown, orderId: string) => {
    logError('تحديث الطلب', error, { orderId });
  },
  
  // استخدام مع Toast
  withToast: (error: unknown, toast: any) => {
    handleError('تحميل البيانات', error, toast);
  },
};
