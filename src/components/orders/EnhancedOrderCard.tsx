import React, { useState, useEffect } from 'react';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArabicText } from '@/components/ui/arabic-text';
import { OrderItems } from './OrderItems';
import { SplitOrderButton } from './SplitOrderButton';
import { TransferOrderButton } from './TransferOrderButton';
import { CustomerRejectionButton } from './CustomerRejectionButton';
import { RejectOrderButton } from './RejectOrderButton';
import { OrderDivisionStatus } from './OrderDivisionStatus';
import { OrderDivisionStatusBadge } from './OrderDivisionStatusBadge';
import { OrderDivisionSummary } from './OrderDivisionSummary';
import { useOrderDivisions } from '@/hooks/useOrderDivisions';
import { formatPrice } from '@/utils/currency';
import { OrderService } from '@/services/orderService';
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
  DollarSign,
  Package
} from 'lucide-react';

interface EnhancedOrderCardProps {
  order: Order;
  onAssign?: (orderId: string, storeId: string) => Promise<void>;
  onEdit?: (order: Order) => void;
  onViewDetails?: (orderId: string) => void;
  onSplitComplete?: () => void;
  compact?: boolean;
  showAssignButton?: boolean;
}

export const EnhancedOrderCard: React.FC<EnhancedOrderCardProps> = ({
  order,
  onAssign,
  onEdit,
  onViewDetails,
  onSplitComplete,
  compact = false,
  showAssignButton = true
}) => {
  const { t } = useLanguage();
  const [isAssigning, setIsAssigning] = useState(false);

  // تحديد إذا كان هذا طلب مقسم (جزء من طلب أصلي)
  const isOriginalSplitOrder = order.order_details?.includes('تم تقسيمه من الطلب الأصلي');

  // جلب تقسيمات الطلب - نحاول جلب التقسيمات لأي طلب لنرى إذا كان له تقسيمات
  const { divisions, loading: divisionsLoading } = useOrderDivisions(
    order.order_code || order.id
  );

  // إضافة debugging للتحقق من البيانات
  useEffect(() => {
    if (!divisionsLoading && divisions.length > 0) {
      console.log(`📋 Order ${order.order_code || order.id.slice(0, 8)} has ${divisions.length} divisions:`, divisions);
    }
  }, [divisions, divisionsLoading, order.order_code, order.id]);

  const statusInfo = {
    label: ORDER_STATUS_LABELS[order.order_status] || order.order_status,
    color: ORDER_STATUS_COLORS[order.order_status] || 'bg-gray-100 text-gray-800'
  };

  // Safe date formatting without external locale
  const formatOrderDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'الآن';
      if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
      if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
      return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
    } catch (error) {
      console.error('Time ago formatting error:', error);
      return 'وقت غير محدد';
    }
  };

  // Process order to ensure proper currency conversion
  const processedOrder = OrderService.normalizeOrderAmounts(order);

  // Use IQD as primary currency
  const totalAmount = processedOrder.total_amount_iqd || order.total_amount || 0;
  const totalFormatted = formatPrice(totalAmount);

  // تحليل المنتجات لفهم كم متجر مختلف موجود
  const analyzeOrderStores = () => {
    // استخدام order_items أولاً إذا كانت متوفرة، ثم items كبديل
    const itemsToAnalyze = processedOrder.order_items && processedOrder.order_items.length > 0
      ? processedOrder.order_items
      : processedOrder.items || [];

    const storesMap = new Map();

    // إذا لم توجد منتجات في items أو order_items، استخدم main_store_name من الطلب مباشرة
    if (itemsToAnalyze.length === 0 && order.main_store_name) {
      storesMap.set(order.main_store_name, []);
    } else {
      itemsToAnalyze.forEach((item) => {
        // البحث عن اسم المتجر من عدة مصادر ��حتملة
        const storeName = item.main_store
          || item.main_store_name
          || order.main_store_name
          || 'متجر غير معروف';

        if (!storesMap.has(storeName)) {
          storesMap.set(storeName, []);
        }
        storesMap.get(storeName).push(item);
      });
    }

    const storesCount = storesMap.size;
    const stores = Array.from(storesMap.entries()).map(([storeName, items]) => ({
      storeName,
      itemsCount: items.length,
      items
    }));

    return {
      storesCount,
      stores,
      isSingleStore: storesCount === 1,
      mainStoreName: storesCount === 1 ? stores[0]?.storeName : null,
      hasItems: itemsToAnalyze.length > 0
    };
  };

  const storeAnalysis = analyzeOrderStores();

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

  const handleRejectOrder = () => {
    // إعادة تحميل الطلبات بعد الرفض
    if (onSplitComplete) {
      onSplitComplete();
    }
  };

  if (compact) {
    return (
      <Card className="w-full hover:shadow-md transition-shadow" data-order-id={order.id}>
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

          <div className="space-y-2 text-sm mb-3">
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
            {order.assigned_store_name && (
              <div className="flex items-center gap-2">
                <StoreIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-blue-600 font-medium">
                  {order.assigned_store_name}
                </span>
              </div>
            )}
            {/* إظهار حالة رفض الزبون بشكل منفصل */}
            {(order.order_status === 'customer_rejected' || order.store_response_status === 'customer_rejected') && (
              <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-600">
                  🚫 مرفوض من قبل الزبون
                </span>
              </div>
            )}
            {/* إظهار حالة المتجر فقط إذا لم يكن الطلب مرفوض من الزبون */}
            {order.assigned_store_name && order.store_response_status &&
             order.store_response_status !== 'customer_rejected' &&
             order.order_status !== 'customer_rejected' && (
              <div className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${
                  order.store_response_status === 'available' || order.store_response_status === 'accepted'
                    ? 'text-green-600'
                    : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`} />
                <span className={`text-xs font-medium ${
                  order.store_response_status === 'available' || order.store_response_status === 'accepted'
                    ? 'text-green-600'
                    : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`}>
                  {order.store_response_status === 'available' || order.store_response_status === 'accepted'
                    ? '✅ متوفر'
                    : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                    ? '❌ غير متوفر'
                    : '⏳ في انتظار رد المتجر'
                  }
                </span>
              </div>
            )}
          </div>

          {/* عرض أسماء المنتجات من order_items أولاً، ثم items كبديل */}
          {(() => {
            const itemsToShow = (processedOrder.order_items && processedOrder.order_items.length > 0)
              ? processedOrder.order_items
              : processedOrder.items;

            return itemsToShow && itemsToShow.length > 0 && (
              <OrderItems items={itemsToShow} compact={true} />
            );
          })()}

          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
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
                <ArabicText>تع��ين</ArabicText>
              </Button>
            )}

            {/* زر رفض الطلب للطلبات المعلقة أو زر رفض الزبون للحالات الأخرى */}
            {order.order_status === 'pending' ? (
              <RejectOrderButton
                orderId={order.id}
                orderStatus={order.order_status}
                onRejectComplete={handleRejectOrder}
                disabled={isAssigning}
                size="sm"
                variant="destructive"
              />
            ) : (
              <CustomerRejectionButton
                orderId={order.id}
                orderStatus={order.order_status}
                storeResponseStatus={order.store_response_status}
                adminMode={true}
                onRejectComplete={onSplitComplete}
                disabled={isAssigning}
                size="sm"
                variant="destructive"
              />
            )}

            {/* أزرار تقسيم/تحويل الطلب في النسخة المضغوطة */}
            {order.order_status === 'pending' && (
              <div className="w-full mt-2 flex gap-2">
                {storeAnalysis.storesCount > 1 ? (
                  <SplitOrderButton
                    orderId={order.id}
                    orderItems={(processedOrder.order_items && processedOrder.order_items.length > 0) ? processedOrder.order_items : (order.items || [])}
                    onSplitComplete={onSplitComplete}
                    disabled={isAssigning}
                  />
                ) : storeAnalysis.isSingleStore && storeAnalysis.mainStoreName && storeAnalysis.mainStoreName !== 'م����جر غير معروف' ? (
                  <TransferOrderButton
                    orderId={order.id}
                    orderItems={(processedOrder.order_items && processedOrder.order_items.length > 0) ? processedOrder.order_items : (order.items || [])}
                    storeName={storeAnalysis.mainStoreName}
                    onTransferComplete={onSplitComplete}
                    disabled={isAssigning}
                  />
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full hover:shadow-md transition-shadow" data-order-id={order.id}>
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
              <span>{formatTimeAgo(order.created_at)}</span>
              <span className="text-xs">
                ({formatOrderDate(order.created_at)})
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
              <div className="font-mono">
                <p style={{textIndent: '1em'}}>{order.customer_phone}</p>
              </div>
              <span className="text-sm text-muted-foreground">الهاتف: </span>
            </div>

            {order.customer_address && order.customer_address.trim() !== '' && order.customer_address !== "غير محدد" && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <span className="text-sm text-muted-foreground">ا��عنوان: </span>
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
                <div className="font-bold text-primary font-mono">
                  <div className="text-lg">{totalFormatted.iqd}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">تاريخ الطلب: </span>
                <span className="font-medium">
                  {formatOrderDate(order.created_at)}
                </span>
              </div>
            </div>

            {(order.assigned_store_name || order.main_store_name) && (
              <div className="flex items-center gap-2">
                <StoreIcon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground">
                    {getStoreTypeLabel(order)}
                  </span>
                  <ArabicText className="font-medium text-blue-600">
                    {getDisplayStoreName(order)}
                  </ArabicText>
                </div>
              </div>
            )}

            {/* إظهار حالة رفض الزبون بشكل منفصل ومميز */}
            {(order.order_status === 'customer_rejected' || order.store_response_status === 'customer_rejected') && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="text-sm text-muted-foreground">حالة الزبون: </span>
                  <span className="font-medium text-purple-600">
                    🚫 مرفوض من قبل الزبون
                  </span>
                </div>
              </div>
            )}

            {/* Store Response Status - فقط إذا لم يكن مرفوض من الزبون */}
            {order.assigned_store_name && order.store_response_status &&
             order.store_response_status !== 'customer_rejected' &&
             order.order_status !== 'customer_rejected' && (
              <div className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${
                  order.store_response_status === 'available' || order.store_response_status === 'accepted'
                    ? 'text-green-600'
                    : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`} />
                <div>
                  <span className="text-sm text-muted-foreground">حالة المتجر: </span>
                  <span className={`font-medium ${
                    order.store_response_status === 'available' || order.store_response_status === 'accepted'
                      ? 'text-green-600'
                      : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}>
                    {order.store_response_status === 'available' || order.store_response_status === 'accepted'
                      ? '✅ متوفر'
                      : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                      ? '❌ غير متوفر'
                      : '⏳ في انتظار رد المتجر'
                    }
                  </span>
                </div>
              </div>
            )}
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

        {/* Return Reason for Returned Orders */}
        {order.order_details && order.order_status === 'returned' && order.order_details.includes('Return reason:') && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <MessageSquare className="w-4 h-4 text-red-600 mt-1" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-red-600">🔄 سبب الإ��جاع:</span>
              <div className="mt-1">
                <ArabicText className="text-sm font-medium text-red-700">
                  {order.order_details.replace('Return reason: ', '')}
                </ArabicText>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        {(processedOrder.items && processedOrder.items.length > 0) || (processedOrder.order_items && processedOrder.order_items.length > 0) ? (
          <OrderItems
            items={processedOrder.order_items || processedOrder.items}
            showPriceInBothCurrencies={true}
          />
        ) : null}

        {/* Order Division Status - عرض حالة تقسيمات الطلب إذا كان له تقسيمات */}
        {!compact && !divisionsLoading && divisions.length > 0 && !isOriginalSplitOrder && (
          <div className="mt-4">
            <OrderDivisionSummary
              divisions={divisions}
              compact={false}
            />
          </div>
        )}

        {/* Division Status Badge in compact mode */}
        {compact && !divisionsLoading && divisions.length > 0 && !isOriginalSplitOrder && (
          <div className="mt-2">
            <OrderDivisionSummary
              divisions={divisions}
              compact={true}
            />
          </div>
        )}

        {/* عرض رسالة للطلبات المقسمة */}
        {isOriginalSplitOrder && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">
                <ArabicText>هذا الطلب جزء من تقسيم طلب أصلي</ArabicText>
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
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

          {/* زر رفض الطلب للطلبات المعلقة أو زر رفض الزبون للحالات الأخرى */}
          {order.order_status === 'pending' ? (
            <RejectOrderButton
              orderId={order.id}
              orderStatus={order.order_status}
              onRejectComplete={handleRejectOrder}
              disabled={isAssigning}
              size="sm"
              variant="destructive"
            />
          ) : (
            <CustomerRejectionButton
              orderId={order.id}
              orderStatus={order.order_status}
              storeResponseStatus={order.store_response_status}
              adminMode={true}
              onRejectComplete={onSplitComplete}
              disabled={isAssigning}
              size="sm"
              variant="destructive"
            />
          )}

          {/* أزرار تقسيم/تحويل الطلب */}
          {order.order_status === 'pending' && (
            <>
              {storeAnalysis.storesCount > 1 ? (
                <SplitOrderButton
                  orderId={order.id}
                  orderItems={(processedOrder.order_items && processedOrder.order_items.length > 0) ? processedOrder.order_items : (order.items || [])}
                  onSplitComplete={onSplitComplete}
                  disabled={isAssigning}
                />
              ) : storeAnalysis.isSingleStore && storeAnalysis.mainStoreName && storeAnalysis.mainStoreName !== 'متجر غير معروف' ? (
                <TransferOrderButton
                  orderId={order.id}
                  orderItems={(processedOrder.order_items && processedOrder.order_items.length > 0) ? processedOrder.order_items : (order.items || [])}
                  storeName={storeAnalysis.mainStoreName}
                  onTransferComplete={onSplitComplete}
                  disabled={isAssigning}
                />
              ) : null}
            </>
          )}

        </div>
      </CardContent>
    </Card>
  );
};
