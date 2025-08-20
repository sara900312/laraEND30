import { useState, useEffect } from 'react';
import { calculateDivisionCompletionStatus, DivisionCompletionStatus } from '@/services/divisionCompletionService';
import { logError, getErrorMessage } from '@/utils/errorLogger';

/**
 * Hook للتحقق من حالة اكتمال الطلبات المقسمة
 * @param originalOrderId معرف الطلب الأصلي
 * @param enabled تفعيل/تعطيل التحقق
 * @returns حالة الاكتمال والدوال المساعدة
 */
export function useDivisionCompletion(originalOrderId?: string, enabled: boolean = true) {
  const [completionStatus, setCompletionStatus] = useState<DivisionCompletionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // جلب حالة الاكتمال
  const fetchCompletionStatus = async () => {
    if (!originalOrderId || !enabled) {
      setCompletionStatus(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const status = await calculateDivisionCompletionStatus(originalOrderId);
      setCompletionStatus(status);
      
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'خطأ في جلب حالة الاكتمال');
      setError(errorMessage);
      console.error('❌ حساب حالة الاكتمال:', {
        message: err instanceof Error ? err.message : String(err),
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        originalOrderId: originalOrderId,
        enabled: enabled
      });
    } finally {
      setLoading(false);
    }
  };

  // تحديث تلقائي عند تغيير originalOrderId أو enabled
  useEffect(() => {
    fetchCompletionStatus();
  }, [originalOrderId, enabled]);

  // تحديث دوري (كل 30 ثانية)
  useEffect(() => {
    if (!enabled || !originalOrderId) return;

    const interval = setInterval(() => {
      fetchCompletionStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [originalOrderId, enabled]);

  // دوال مساعدة
  const isCompleted = completionStatus?.isComplete ?? false;
  const canDeliverOrder = completionStatus?.status === 'completed';
  const completionPercentage = completionStatus?.completionPercentage ?? 0;
  const statusLabel = completionStatus?.statusLabel ?? 'غير محدد';

  return {
    completionStatus,
    loading,
    error,
    isCompleted,
    canDeliverOrder,
    completionPercentage,
    statusLabel,
    refreshStatus: fetchCompletionStatus
  };
}

/**
 * دالة مساعدة للتحقق من كون الطلب مقسماً
 * @param orderDetails تفاصيل الطلب
 * @returns معرف الطلب الأصلي أو null
 */
export function extractOriginalOrderId(orderDetails?: string): string | null {
  if (!orderDetails) return null;
  
  const match = orderDetails.match(/تم تقسيمه من الطلب الأصلي (\S+)/);
  return match ? match[1] : null;
}

/**
 * دالة مساعدة للتحقق من كون الطلب مقسماً
 * @param orderDetails تفاصيل الطلب
 * @returns true إذا كان الطلب مقسماً
 */
export function isDividedOrder(orderDetails?: string): boolean {
  return !!orderDetails?.includes('تم تقسيمه من الطلب الأصلي');
}
