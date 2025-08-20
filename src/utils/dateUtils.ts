/**
 * دوال مساعدة لتنسيق التواريخ بشكل آمن
 */

export interface DateFormatOptions {
  locale?: string;
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  hour12?: boolean;
}

/**
 * تنسيق آمن للتواريخ مع معالجة الأخطاء
 */
export function safeFormatDate(
  dateValue: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  if (!dateValue) {
    return 'لا يوجد تاريخ';
  }

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // التحقق من صحة التاريخ
    if (isNaN(date.getTime())) {
      console.warn('تاريخ غير صالح:', dateValue);
      return typeof dateValue === 'string' ? dateValue : 'تاريخ غير صالح';
    }

    const defaultOptions: DateFormatOptions = {
      locale: 'ar-EG',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      ...options
    };

    return date.toLocaleDateString(defaultOptions.locale, defaultOptions);
  } catch (error) {
    console.error('خطأ في تنسيق التاريخ:', { dateValue, error });
    return typeof dateValue === 'string' ? dateValue : 'خطأ في تنسيق التاريخ';
  }
}

/**
 * تحويل آمن للتاريخ إلى ISO string
 */
export function safeToISOString(dateValue: string | Date | null | undefined): string | null {
  if (!dateValue) {
    return null;
  }

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    if (isNaN(date.getTime())) {
      console.warn('تاريخ غير صالح للتحويل لـ ISO:', dateValue);
      return null;
    }

    return date.toISOString();
  } catch (error) {
    console.error('خطأ في تحويل التاريخ لـ ISO:', { dateValue, error });
    return null;
  }
}

/**
 * تنسيق تاريخ للعرض في console.log بشكل آمن
 */
export function safeLogDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) {
    return 'null';
  }

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    if (isNaN(date.getTime())) {
      return `invalid_date: ${dateValue}`;
    }

    return date.toISOString();
  } catch (error) {
    return `error_formatting_date: ${dateValue}`;
  }
}

/**
 * تنسيق منذ كم من الوقت (مثل "منذ 5 دقائق")
 */
export function formatTimeAgo(dateValue: string | Date | null | undefined): string {
  if (!dateValue) {
    return 'لا يوجد وقت';
  }

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    if (isNaN(date.getTime())) {
      return 'تاريخ غير صالح';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'الآن';
    } else if (diffMinutes < 60) {
      return `منذ ${diffMinutes} دقيقة`;
    } else if (diffHours < 24) {
      return `منذ ${diffHours} ساعة`;
    } else if (diffDays < 7) {
      return `منذ ${diffDays} يوم`;
    } else {
      return safeFormatDate(date, {
        locale: 'ar-EG',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch (error) {
    console.error('خطأ في حساب الوقت المنقضي:', { dateValue, error });
    return 'خطأ في الحساب';
  }
}
