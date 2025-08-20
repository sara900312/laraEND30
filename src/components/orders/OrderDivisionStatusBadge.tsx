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

interface OrderDivisionStatusBadgeProps {
  divisions: any[];
  compact?: boolean;
  className?: string;
}

export const OrderDivisionStatusBadge: React.FC<OrderDivisionStatusBadgeProps> = ({
  divisions,
  compact = false,
  className = ""
}) => {
  
  // حساب الحالة الإجمالية للتقسيمات
  const calculateOverallStatus = () => {
    if (!divisions || divisions.length === 0) {
      return { status: 'empty', label: 'لا توجد تقسيمات', color: 'bg-gray-100 text-gray-800', icon: Package };
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
      return { 
        status: 'delivered', 
        label: 'مُسل��ة', 
        color: 'bg-green-100 text-green-800', 
        icon: Truck 
      };
    }
    
    if (allReturned) {
      return { 
        status: 'returned', 
        label: 'مسترجعة', 
        color: 'bg-red-100 text-red-800', 
        icon: XCircle 
      };
    }
    
    // إذا كل المتاجر ردت بالموافقة = مكتملة
    if (allStoresResponded && !anyRejected) {
      return { 
        status: 'complete', 
        label: 'مكتملة', 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle 
      };
    }
    
    // إذا يوجد متاجر لم ترد بعد = غير مكتملة  
    if (anyPendingResponse) {
      return { 
        status: 'incomplete', 
        label: 'غير مكتملة', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Clock 
      };
    }
    
    // إذا يوجد رفض = مختلطة
    if (anyRejected) {
      return { 
        status: 'mixed', 
        label: 'مختلطة', 
        color: 'bg-orange-100 text-orange-800', 
        icon: AlertTriangle 
      };
    }

    return { 
      status: 'processing', 
      label: 'قيد المعالجة', 
      color: 'bg-blue-100 text-blue-800', 
      icon: Package 
    };
  };

  const statusInfo = calculateOverallStatus();
  const StatusIcon = statusInfo.icon;

  if (compact) {
    return (
      <Badge className={`${statusInfo.color} ${className}`}>
        <StatusIcon className="w-3 h-3 ml-1" />
        <ArabicText>{statusInfo.label}</ArabicText>
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={statusInfo.color}>
        <StatusIcon className="w-3 h-3 ml-1" />
        <ArabicText>{statusInfo.label}</ArabicText>
      </Badge>
      
      <span className="text-xs text-gray-500">
        ({divisions.length} متجر)
      </span>
      
      {/* عداد حالات سريع */}
      <div className="flex items-center gap-1 text-xs">
        {(() => {
          const accepted = divisions.filter(d => 
            d.store_response_status === 'available' || 
            d.store_response_status === 'accepted'
          ).length;
          
          const pending = divisions.filter(d => 
            !d.store_response_status || 
            d.store_response_status === 'pending' ||
            d.order_status === 'pending' ||
            d.order_status === 'assigned'
          ).length;
          
          const rejected = divisions.filter(d => 
            d.store_response_status === 'unavailable' || 
            d.store_response_status === 'rejected' ||
            d.order_status === 'rejected'
          ).length;

          return (
            <>
              {accepted > 0 && (
                <span className="text-green-600">✓{accepted}</span>
              )}
              {pending > 0 && (
                <span className="text-yellow-600">⏳{pending}</span>
              )}
              {rejected > 0 && (
                <span className="text-red-600">✗{rejected}</span>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default OrderDivisionStatusBadge;
