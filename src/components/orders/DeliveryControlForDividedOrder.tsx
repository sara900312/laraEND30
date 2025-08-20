import React from 'react';
import { SelectItem } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { useDivisionCompletion, extractOriginalOrderId, isDividedOrder as checkIsDividedOrder } from '@/hooks/useDivisionCompletion';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeliveryControlForDividedOrderProps {
  orderDetails?: string;
  storeResponseStatus?: string;
  children: React.ReactNode; // الـ SelectItem العادي
}

export function DeliveryControlForDividedOrder({ 
  orderDetails, 
  storeResponseStatus,
  children 
}: DeliveryControlForDividedOrderProps) {
  const { t } = useLanguage();
  
  // التحقق من كون الطلب مقسماً
  const isDivided = checkIsDividedOrder(orderDetails);
  const originalOrderId = extractOriginalOrderId(orderDetails);
  
  // استخدام Hook لجلب حالة الاكتمال
  const { canDeliverOrder, loading, statusLabel } = useDivisionCompletion(
    originalOrderId || undefined, 
    isDivided
  );

  // إذا لم يكن الطلب مقسماً، أعرض التحكم العادي
  if (!isDivided) {
    return <>{children}</>;
  }

  // للطلبات المقسمة، أضف منطق إضافي
  const isAvailable = storeResponseStatus === 'available';
  const isDeliveryDisabled = !isAvailable || !canDeliverOrder;

  return (
    <>
      <SelectItem
        value="delivered"
        disabled={isDeliveryDisabled}
        className={isDeliveryDisabled ? 'opacity-50' : ''}
      >
        <div className="flex items-center gap-2">
          {t('delivered')}
          {isDivided && !canDeliverOrder && (
            <AlertCircle className="w-3 h-3 text-amber-600" />
          )}
        </div>
      </SelectItem>
      
      <SelectItem
        value="returned"
        disabled={isDeliveryDisabled}
        className={isDeliveryDisabled ? 'opacity-50' : ''}
      >
        <div className="flex items-center gap-2">
          {t('returned')}
          {isDivided && !canDeliverOrder && (
            <AlertCircle className="w-3 h-3 text-amber-600" />
          )}
        </div>
      </SelectItem>
    </>
  );
}

interface DeliveryStatusMessageProps {
  orderDetails?: string;
  storeResponseStatus?: string;
}

export function DeliveryStatusMessage({ orderDetails, storeResponseStatus }: DeliveryStatusMessageProps) {
  const isDivided = checkIsDividedOrder(orderDetails);
  const originalOrderId = extractOriginalOrderId(orderDetails);
  
  const { canDeliverOrder, loading, statusLabel } = useDivisionCompletion(
    originalOrderId || undefined, 
    isDivided
  );

  // إذا لم يكن الطلب مقسماً، أعرض الرسالة العادية
  if (!isDivided) {
    if (storeResponseStatus !== 'available') {
      return (
        <span className="text-xs text-amber-600">
          (أكد توفر المنتج أولاً)
        </span>
      );
    }
    return null;
  }

  // للطلبات المقسمة
  if (storeResponseStatus !== 'available') {
    return (
      <span className="text-xs text-amber-600">
        (أكد توفر المنتج أولاً)
      </span>
    );
  }

  if (!canDeliverOrder) {
    return (
      <span className="text-xs text-amber-600">
        (انتظر اكتمال الطلب المقسم: {statusLabel})
      </span>
    );
  }

  return (
    <span className="text-xs text-green-600">
      ✅ جاهز للتسليم
    </span>
  );
}
