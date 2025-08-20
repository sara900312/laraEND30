import React from 'react';
import { CheckCircle, Clock, XCircle, Store } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Order {
  id: string;
  assigned_store_id?: string;
  assigned_store_name?: string;
  store_response_status?: string;
  store_response_at?: string;
  rejection_reason?: string;
  order_status?: string;
}

interface StoreInventoryStatusDisplayProps {
  order: Order;
  showTitle?: boolean;
  compact?: boolean;
}

export function StoreInventoryStatusDisplay({
  order,
  showTitle = true,
  compact = false
}: StoreInventoryStatusDisplayProps) {
  const { t } = useLanguage();

  // إذا كان الطلب مرفوض من الزبون، لا نعرض معلومات المتجر
  if (order.order_status === 'customer_rejected' || order.store_response_status === 'customer_rejected') {
    return null;
  }

  // إذا لم يكن هناك متجر معين، لا نعرض شيء
  if (!order.assigned_store_id) {
    return null;
  }

  // إذا لم يرد الم��جر بعد، نعرض حالة الانتظار
  if (!order.store_response_status) {
    return (
      <div className={`flex items-start gap-2 p-3 rounded-lg border ${compact ? 'bg-blue-50 border-blue-200' : 'bg-blue-50'}`}>
        <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">حالة فحص المخزون:</span>
            <span className="font-bold text-blue-600">🔍 لم يتم الفحص بعد</span>
          </div>
          <div className="text-sm text-blue-600 mt-1">
            المتجر لم يقم بفحص توفر هذا المنتج في مخزونه بعد
          </div>
          <div className="text-xs text-gray-500 mt-2">
            💡 ا��متجر سيرى هذا الطلب في لوحة تحكمه ويحدد إذا كان المنتج متوفر أم لا
          </div>
        </div>
      </div>
    );
  }

  // تحديد حالة الرد
  const isAvailable = order.store_response_status === 'available' || order.store_response_status === 'accepted';
  const isUnavailable = order.store_response_status === 'unavailable' || order.store_response_status === 'rejected';

  // ألوان وأيقونات مختلفة حسب الحالة
  const statusConfig = isAvailable 
    ? {
        icon: CheckCircle,
        iconColor: 'text-green-600',
        textColor: 'text-green-600',
        bgColor: compact ? 'bg-green-50 border-green-200' : 'bg-green-50',
        label: `✅ ${t('available')} في المخزون`,
        description: 'المتجر أكد توفر هذا المنتج في مخزونه'
      }
    : {
        icon: XCircle,
        iconColor: 'text-red-600',
        textColor: 'text-red-600',
        bgColor: compact ? 'bg-red-50 border-red-200' : 'bg-red-50',
        label: `❌ ${t('unavailable')} في المخزون`,
        description: 'المتجر أكد عدم توفر هذا المنتج في مخزونه'
      };

  const IconComponent = statusConfig.icon;

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${statusConfig.bgColor}`}>
      <IconComponent className={`w-5 h-5 ${statusConfig.iconColor} mt-0.5`} />
      <div className="flex-1">
        {showTitle && (
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-800">فحص المخزون من المتجر</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <span className="font-medium">حالة التوفر:</span>
          <span className={`font-bold ${statusConfig.textColor}`}>
            {statusConfig.label}
          </span>
        </div>

        
        {order.store_response_at && (
          <div className="text-sm text-gray-600 mt-1">
            تم الرد في: {new Date(order.store_response_at).toLocaleString('ar-IQ', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
        
        {isUnavailable && order.rejection_reason && (
          <div className={`text-sm ${statusConfig.textColor} mt-2 p-2 rounded ${isUnavailable ? 'bg-red-100' : ''}`}>
            <span className="font-medium">سبب عدم التوفر:</span>
            <div className="mt-1">{order.rejection_reason}</div>
          </div>
        )}

        {!compact && (
          <div className="text-xs text-gray-500 mt-2">
            {statusConfig.description}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreInventoryStatusDisplay;
