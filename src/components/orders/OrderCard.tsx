import React, { useState } from 'react';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArabicText } from '@/components/ui/arabic-text';
import { OrderItems } from './OrderItems';
import { formatDistanceToNow, format } from 'date-fns';
import ar from 'date-fns/locale/ar-SA';
import { formatPrice } from '@/utils/currency';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStoreTypeLabel, getDisplayStoreName } from '@/utils/storeDisplayUtils';
import {
  Clock,
  User,
  Phone,
  MessageSquare,
  Store as StoreIcon,
  Edit,
  CheckCircle,
  MapPin,
  Calendar,
  DollarSign
} from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onAssign?: (orderId: string, storeId: string) => Promise<void>;
  onEdit?: (order: Order) => void;
  onViewDetails?: (orderId: string) => void;
  compact?: boolean;
  showAssignButton?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  onAssign, 
  onEdit,
  onViewDetails,
  compact = false,
  showAssignButton = true
}) => {
  const { t } = useLanguage();
  const [isAssigning, setIsAssigning] = useState(false);

  const statusInfo = {
    label: ORDER_STATUS_LABELS[order.order_status] || order.order_status,
    color: ORDER_STATUS_COLORS[order.order_status] || 'bg-gray-100 text-gray-800'
  };

  const orderDate = new Date(order.created_at);
  const totalFormatted = formatPrice(order.total_amount || 0, true);

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(order.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(order);
    }
  };

  if (compact) {
    return (
      <Card className="w-full hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg">
                <ArabicText>
                  طلب #{order.order_code || order.id.slice(0, 8)}
                </ArabicText>
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <ArabicText className="font-medium">{order.customer_name}</ArabicText>
              </div>
            </div>
            <Badge className={statusInfo.color}>
              <ArabicText>{statusInfo.label}</ArabicText>
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono">{order.customer_phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-primary font-bold">
                {totalFormatted.iqd}
              </span>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <OrderItems items={order.items} compact={true} />
          )}

          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleViewDetails}
              className="flex-1"
            >
              <ArabicText>{t('details')}</ArabicText>
            </Button>
            
            {order.order_status === 'pending' && showAssignButton && (
              <Button 
                size="sm"
                onClick={handleEdit}
                className="flex-1"
                disabled={isAssigning}
              >
                <CheckCircle className="w-4 h-4 ml-2" />
                <ArabicText>تعيين</ArabicText>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArabicText>
                طلب #{order.order_code || order.id.slice(0, 8)}
              </ArabicText>
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {formatDistanceToNow(orderDate, { 
                  addSuffix: true, 
                  locale: ar 
                })}
              </span>
              <span className="text-xs">
                ({format(orderDate, 'PPp', { locale: ar })})
              </span>
            </div>
          </div>
          <Badge className={statusInfo.color}>
            <ArabicText>{statusInfo.label}</ArabicText>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">{t('customer.label')} </span>
                <ArabicText className="font-medium">{order.customer_name}</ArabicText>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">الهاتف: </span>
                <span className="font-mono">{order.customer_phone}</span>
              </div>
            </div>

            {order.customer_address && order.customer_address.trim() !== '' && order.customer_address !== "غير محدد" && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <span className="text-sm text-muted-foreground">العنوان: </span>
                  <ArabicText className="font-medium">{order.customer_address}</ArabicText>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">المبلغ الإجمالي: </span>
                <span className="font-bold text-primary font-mono">
                  {totalFormatted.primary}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">تاريخ الطلب: </span>
                <span className="font-medium">
                  {format(orderDate, 'PPp', { locale: ar })}
                </span>
              </div>
            </div>

            {(() => {
              const displayName = getDisplayStoreName(order);
              const typeLabel = getStoreTypeLabel(order);

              if (displayName && displayName !== 'متجر غير محدد') {
                return (
                  <div className="flex items-center gap-2">
                    <StoreIcon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {typeLabel}
                      </span>
                      <ArabicText className="font-medium text-blue-600">
                        {displayName}
                      </ArabicText>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Customer Notes */}
        {order.customer_notes && (
          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <span className="text-sm font-medium text-muted-foreground">ملاحظات العميل:</span>
              <div className="mt-1">
                <ArabicText className="text-sm">{order.customer_notes}</ArabicText>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        {(order.items && order.items.length > 0) || (order.order_items && order.order_items.length > 0) ? (
          <OrderItems 
            items={order.order_items || order.items} 
            showPriceInBothCurrencies={true}
          />
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <ArabicText>لا توجد تفاصيل منتجات متاحة</ArabicText>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewDetails}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            <ArabicText>التفاصيل</ArabicText>
          </Button>
          
          {onEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <ArabicText>تعديل</ArabicText>
            </Button>
          )}
          
          {order.order_status === 'pending' && showAssignButton && (
            <Button 
              size="sm"
              onClick={handleEdit}
              className="flex items-center gap-2"
              disabled={isAssigning}
            >
              <CheckCircle className="w-4 h-4" />
              <ArabicText>
                {isAssigning ? 'جاري التعيين...' : 'تعيين للمتجر'}
              </ArabicText>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
