import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArabicText } from '@/components/ui/arabic-text';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Package,
  Truck,
  XCircle
} from 'lucide-react';

interface OrderDivision {
  id: string;
  store_name: string;
  assigned_store_id?: string;
  store_response_status?: 'available' | 'unavailable' | 'accepted' | 'rejected' | 'pending';
  order_status: 'pending' | 'assigned' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'returned' | 'customer_rejected' | 'rejected';
  store_response_at?: string;
  rejection_reason?: string;
  items_count: number;
  total_amount: number;
}

interface OrderDivisionSummaryProps {
  divisions: OrderDivision[];
  compact?: boolean;
  className?: string;
}

export const OrderDivisionSummary: React.FC<OrderDivisionSummaryProps> = ({
  divisions,
  compact = false,
  className = ""
}) => {
  
  // الحصول على معلومات حالة التقسيم الفردي
  const getDivisionStatusInfo = (division: OrderDivision) => {
    const { store_response_status, order_status } = division;

    // الحالات حسب الأولوية - أولاً الحالات النهائية
    if (order_status === 'delivered') {
      return {
        status: 'delivered',
        label: 'مُسلم',
        color: 'bg-green-100 text-green-800',
        icon: Truck,
        shortDescription: 'مُسلم'
      };
    }

    if (order_status === 'returned') {
      return {
        status: 'returned',
        label: 'مسترجع',
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
        shortDescription: 'مسترجع'
      };
    }

    // حالات الرفض
    if (store_response_status === 'unavailable' || store_response_status === 'rejected' || order_status === 'rejected') {
      return {
        status: 'rejected',
        label: 'مرفوض',
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
        shortDescription: 'مرفوض'
      };
    }

    // حالات القبول والموافقة
    if (store_response_status === 'available' || store_response_status === 'accepted') {
      return {
        status: 'accepted',
        label: 'متوفر',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        shortDescription: 'متوفر'
      };
    }

    // حالات المعالجة (معين ولكن لم يرد المتجر بعد)
    if (order_status === 'assigned') {
      return {
        status: 'assigned',
        label: 'معين',
        color: 'bg-blue-100 text-blue-800',
        icon: Package,
        shortDescription: 'معين'
      };
    }

    if (order_status === 'preparing' || order_status === 'ready') {
      return {
        status: 'processing',
        label: 'قيد التحضير',
        color: 'bg-orange-100 text-orange-800',
        icon: Package,
        shortDescription: 'قيد التحضير'
      };
    }

    // الحالة الافتراضية - معلق
    return {
      status: 'pending',
      label: 'في الانتظار',
      color: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      shortDescription: 'في الانتظار'
    };
  };

  if (!divisions || divisions.length === 0) {
    return null;
  }

  if (compact) {
    // عرض مختصر للتقسيمات
    const statusCounts = divisions.reduce((acc, division) => {
      const statusInfo = getDivisionStatusInfo(division);
      acc[statusInfo.status] = (acc[statusInfo.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Package className="w-4 h-4" />
          <span>{divisions.length} متجر:</span>
        </div>
        <div className="flex items-center gap-1">
          {Object.entries(statusCounts).map(([status, count]) => {
            const statusColors = {
              delivered: 'bg-green-100 text-green-700',
              accepted: 'bg-green-100 text-green-700',
              assigned: 'bg-blue-100 text-blue-700',
              processing: 'bg-orange-100 text-orange-700',
              rejected: 'bg-red-100 text-red-700',
              returned: 'bg-red-100 text-red-700',
              pending: 'bg-yellow-100 text-yellow-700'
            };
            
            const statusLabels = {
              delivered: 'مُسلم',
              accepted: 'متوفر',
              assigned: 'معين',
              processing: 'قيد التحضير',
              rejected: 'مرفوض',
              returned: 'مسترجع',
              pending: 'معلق'
            };
            
            return (
              <Badge key={status} className={`text-xs ${statusColors[status as keyof typeof statusColors]}`}>
                {count} {statusLabels[status as keyof typeof statusLabels]}
              </Badge>
            );
          })}
        </div>
      </div>
    );
  }

  // عرض تفصيلي للتقسيمات
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-blue-600 flex items-center gap-2 mb-3">
        <Package className="w-4 h-4" />
        <ArabicText>حالة تقسيمات هذا الطلب ({divisions.length} متجر)</ArabicText>
      </div>
      
      {divisions.map((division, index) => {
        const statusInfo = getDivisionStatusInfo(division);
        const StatusIcon = statusInfo.icon;
        
        return (
          <div 
            key={division.id} 
            className="border rounded-lg p-3 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  <ArabicText>{division.store_name}</ArabicText>
                </span>
                <span className="text-sm text-gray-500">
                  ({division.items_count} منتج)
                </span>
              </div>
              
              <Badge className={statusInfo.color}>
                <StatusIcon className="w-3 h-3 ml-1" />
                <ArabicText>{statusInfo.label}</ArabicText>
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                <ArabicText>
                  {statusInfo.shortDescription === 'معين' ? 'تم تعيين الطلب للمتجر - في انتظار الرد' :
                   statusInfo.shortDescription === 'متوفر' ? 'المتجر وافق على الطلب' :
                   statusInfo.shortDescription === 'مرفوض' ? division.rejection_reason || 'رفض المتجر الطلب' :
                   statusInfo.shortDescription === 'مُسلم' ? 'تم التسليم بنجاح' :
                   statusInfo.shortDescription === 'مسترجع' ? 'تم استرجاع الطلب' :
                   statusInfo.shortDescription === 'قيد التحضير' ? 'المتجر يحضر الطلب' :
                   'في انتظار تعيين المتجر'}
                </ArabicText>
              </span>
              <span className="font-medium text-gray-900">
                {division.total_amount.toLocaleString()} د.ع
              </span>
            </div>
            
            {division.store_response_at && (
              <div className="text-xs text-gray-500 mt-1">
                آخر تحديث: {new Date(division.store_response_at).toLocaleDateString('ar-SA')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderDivisionSummary;
