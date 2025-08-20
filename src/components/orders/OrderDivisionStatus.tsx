import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArabicText } from '@/components/ui/arabic-text';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Package,
  Truck,
  RotateCcw,
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

interface OrderDivisionStatusProps {
  divisions: OrderDivision[];
  originalOrderId?: string;
  className?: string;
}

export const OrderDivisionStatus: React.FC<OrderDivisionStatusProps> = ({
  divisions,
  originalOrderId,
  className = ""
}) => {
  
  // حساب الحالة الإجمالية للطلب المقسم
  const calculateOverallStatus = () => {
    if (!divisions || divisions.length === 0) {
      return { status: 'empty', label: 'لا توجد تقسيمات', color: 'gray' };
    }

    // جميع التقسيمات مُسلمة
    const allDelivered = divisions.every(div => div.order_status === 'delivered');

    // جميع التقسيمات مسترجعة
    const allReturned = divisions.every(div => div.order_status === 'returned');

    // جميع التقسيمات أكملت ردودها (متوفر أو مقبول)
    const allStoresResponded = divisions.every(div =>
      div.store_response_status === 'available' ||
      div.store_response_status === 'accepted'
    );

    // يوجد متاجر لم ترد بعد أو في انتظار
    const anyPendingResponse = divisions.some(div =>
      !div.store_response_status ||
      div.store_response_status === 'pending' ||
      div.order_status === 'pending' ||
      div.order_status === 'assigned'
    );

    // يوجد متاجر رفضت الطلب
    const anyRejected = divisions.some(div =>
      div.store_response_status === 'unavailable' ||
      div.store_response_status === 'rejected' ||
      div.order_status === 'rejected'
    );

    // الأولوية للحالات النهائية
    if (allDelivered) {
      return { status: 'delivered', label: 'مُسلمة', color: 'green' };
    }

    if (allReturned) {
      return { status: 'returned', label: 'مسترجعة', color: 'red' };
    }

    // إذا كل المتاجر ردت بالموافقة = مكتملة
    if (allStoresResponded && !anyRejected) {
      return { status: 'complete', label: 'مكتملة', color: 'green' };
    }

    // إذا يوجد متاجر لم ترد بعد = غير مكتملة
    if (anyPendingResponse) {
      return { status: 'incomplete', label: 'غير مكتملة', color: 'yellow' };
    }

    // إذا يوجد رفض = مختلطة
    if (anyRejected) {
      return { status: 'mixed', label: 'مختلطة', color: 'orange' };
    }

    return { status: 'processing', label: 'قيد المعالجة', color: 'blue' };
  };

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
        description: 'تم التسليم بنجاح'
      };
    }

    if (order_status === 'returned') {
      return {
        status: 'returned',
        label: 'مسترجع',
        color: 'bg-red-100 text-red-800',
        icon: RotateCcw,
        description: 'تم استرجاع الطلب'
      };
    }

    // حالات الرفض
    if (store_response_status === 'unavailable' || store_response_status === 'rejected' || order_status === 'rejected') {
      return {
        status: 'rejected',
        label: 'مرفوض',
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
        description: division.rejection_reason || 'رفض المتجر الطلب'
      };
    }

    // حالات القبول والموافقة
    if (store_response_status === 'available' || store_response_status === 'accepted') {
      return {
        status: 'accepted',
        label: 'متوفر',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        description: 'المتجر وافق على الطلب'
      };
    }

    // حالات المعالجة (معين ولكن لم يرد المتجر بعد)
    if (order_status === 'assigned') {
      return {
        status: 'assigned',
        label: 'معين',
        color: 'bg-blue-100 text-blue-800',
        icon: Package,
        description: 'تم تعيين الطلب للمتجر - في انتظار الرد'
      };
    }

    if (order_status === 'preparing' || order_status === 'ready') {
      return {
        status: 'processing',
        label: 'قيد التحضير',
        color: 'bg-orange-100 text-orange-800',
        icon: Package,
        description: 'المتجر يحضر الطلب'
      };
    }

    // الحالة الافتراضية - معلق
    return {
      status: 'pending',
      label: 'في الانتظار',
      color: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      description: 'في انتظار تعيين المتجر'
    };
  };

  const overallStatus = calculateOverallStatus();

  const getOverallStatusIcon = () => {
    switch (overallStatus.status) {
      case 'delivered': return Truck;
      case 'returned': return RotateCcw;
      case 'complete': return CheckCircle;
      case 'incomplete': return AlertTriangle;
      default: return Clock;
    }
  };

  const OverallIcon = getOverallStatusIcon();

  if (!divisions || divisions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <ArabicText>لا توجد تقسيمات للطلب</ArabicText>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <ArabicText>حالة تقسيمات الطلب</ArabicText>
            {originalOrderId && (
              <span className="text-sm text-gray-500">
                ({divisions.length} تقسيم)
              </span>
            )}
          </div>
          <Badge 
            className={`
              ${overallStatus.color === 'green' ? 'bg-green-100 text-green-800' : ''}
              ${overallStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${overallStatus.color === 'red' ? 'bg-red-100 text-red-800' : ''}
              ${overallStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
              ${overallStatus.color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
            `}
          >
            <OverallIcon className="w-4 h-4 ml-1" />
            <ArabicText>{overallStatus.label}</ArabicText>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
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
                <ArabicText>{statusInfo.description}</ArabicText>
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
        
        {/* ملخص سريع */}
        <div className="border-t pt-3 mt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {divisions.filter(d => {
                  const info = getDivisionStatusInfo(d);
                  return info.status === 'accepted' || info.status === 'delivered';
                }).length}
              </div>
              <div className="text-gray-600">
                <ArabicText>مقبول/مسلم</ArabicText>
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {divisions.filter(d => {
                  const info = getDivisionStatusInfo(d);
                  return info.status === 'pending' || info.status === 'processing';
                }).length}
              </div>
              <div className="text-gray-600">
                <ArabicText>في الانتظار</ArabicText>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderDivisionStatus;
