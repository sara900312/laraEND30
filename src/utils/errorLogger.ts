/**
 * Utility functions for better error logging and display
 */

/**
 * تحسين عرض الأخطاء في console.error
 * @param context وصف السياق (مثل: "خطأ في جلب البيانات")
 * @param error الخطأ
 * @param additionalData بيانات إضافية
 */
export function logError(context: string, error: any, additionalData?: Record<string, any>) {
  const errorDetails = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...additionalData,
    timestamp: new Date().toISOString()
  };

  console.error(`❌ ${context}:`, errorDetails);
  
  return errorDetails;
}

/**
 * تحويل الخطأ إلى رسالة سهلة القراءة للمستخدم
 * @param error الخطأ
 * @param defaultMessage رسالة افتراضية
 * @returns رسالة خطأ واضحة
 */
export function getErrorMessage(error: any, defaultMessage: string = 'حدث خطأ غير متوقع'): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return defaultMessage;
}

/**
 * تحقق من نوع خطأ Supabase المحدد
 * @param error الخطأ
 * @param code كود الخطأ المطلوب التحقق منه
 * @returns true إذا كان نفس نوع الخطأ
 */
export function isSupabaseError(error: any, code: string): boolean {
  return error?.code === code;
}

/**
 * تحقق من كون الخطأ "لم يتم العثور على البيانات"
 * @param error الخطأ
 * @returns true إذا كان خطأ عدم وجود بيانات
 */
export function isNotFoundError(error: any): boolean {
  return isSupabaseError(error, 'PGRST116') || error?.status === 404;
}

/**
 * تحقق من كون الخطأ خطأ شبكة
 * @param error الخطأ
 * @returns true إذا كان خطأ شبكة
 */
export function isNetworkError(error: any): boolean {
  return error?.name === 'NetworkError' || 
         error?.message?.includes('fetch') ||
         error?.code === 'ECONNREFUSED' ||
         error?.status === 0;
}

/**
 * معالجة شاملة للأخطاء مع logging محسن
 * @param context وصف السياق
 * @param error الخطأ
 * @param additionalData بيانات إضافية
 * @returns تفاصيل الخطأ المعالج
 */
export function handleError(context: string, error: any, additionalData?: Record<string, any>) {
  const errorDetails = logError(context, error, additionalData);
  
  return {
    message: getErrorMessage(error, 'حدث خطأ غير متوقع'),
    isNotFound: isNotFoundError(error),
    isNetwork: isNetworkError(error),
    code: error?.code,
    details: errorDetails
  };
}
