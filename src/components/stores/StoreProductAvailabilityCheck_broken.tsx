import { useState, useEffect } from 'react';
import { Check, X, Package, AlertTriangle, Clock, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/currency';
import { OrderItems } from '@/components/orders/OrderItems';
import { useToast } from '@/hooks/use-toast';
import { ArabicText } from '@/components/ui/arabic-text';
import { safeFormatDate } from '@/utils/dateUtils';
import { updateOrderStoreResponse } from '@/services/orderStatusService';
import { RejectionReasonDialog } from './RejectionReasonDialog';

interface Order {
  id: string;
  order_code?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_notes?: string;
  total_amount?: number;
  subtotal?: number;
  delivery_cost?: number;
  created_at: string;
  order_status?: string;
  store_response_status?: string;
  order_items?: any[];
}

interface StoreProductAvailabilityCheckProps {
  order: Order;
  storeId: string;
  onAvailableResponse?: (orderId: string) => void;
  onUnavailableResponse?: (orderId: string) => void;
  onDeliveryConfirm?: (orderId: string) => void;
  onOrderUpdated?: () => void;
}

export function StoreProductAvailabilityCheck({
  order,
  storeId,
  onAvailableResponse,
  onUnavailableResponse,
  onDeliveryConfirm,
  onOrderUpdated
}: StoreProductAvailabilityCheckProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const { toast } = useToast();

  // استخراج اسم المنتج
  const getProductName = () => {
    if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
      const validItems = order.order_items.filter(item =>
        item && (item.product_name || item.name) &&
        (item.product_name?.trim() !== '' || item.name?.trim() !== '') &&
        (item.product_name !== 'منتج غير محدد' && item.name !== 'منتج غير محدد')
      );

      if (validItems.length > 0) {
        return validItems.map(item => item.product_name || item.name).join(', ');
      }
    }

    const orderRef = order.order_code || order.id.slice(0, 8);
    return `منتج طلب ${orderRef}`;
  };

  const productName = getProductName();

  // معالج تأكيد توفر المنتج
  const handleAvailableClick = async () => {
    setIsProcessing(true);
    try {
      console.log('🟢 تأكيد توفر المنتج:', { orderId: order.id, storeId });

      const result = await updateOrderStoreResponse({
        orderId: order.id,
        storeId,
        status: 'accepted'
      });

      if (result.success) {
        toast({
          title: "تم تأكيد التوفر ✅",
          description: "تم تأكيد توفر المنتج بنجاح. تفاصيل الطلب متاحة الآن.",
        });

        if (onAvailableResponse) {
          onAvailableResponse(order.id);
        }

        if (onOrderUpdated) {
          onOrderUpdated();
        }
      } else {
        throw new Error(result.error || 'فشل في تأكيد التوفر');
      }
    } catch (error) {
      console.error('❌ تأكيد توفر المنتج:', error);
      toast({
        title: "خطأ في التأكيد",
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // معالج عدم توفر المنتج
  const handleUnavailableClick = () => {
    setShowRejectionDialog(true);
  };

  // معالج تأكيد الرفض
  const handleRejectionConfirm = async (rejectionReason: string) => {
    setIsProcessing(true);
    try {
      console.log('🔴 رفض الطلب:', { orderId: order.id, storeId, rejectionReason });

      const result = await updateOrderStoreResponse({
        orderId: order.id,
        storeId,
        status: 'rejected',
        rejectionReason
      });

      if (result.success) {
        toast({
          title: "تم رفض الطلب ❌",
          description: "تم رفض الطلب وحفظ السبب. سيتم إرجاعه للطلبات المعلقة لإعادة التوزيع.",
          variant: "destructive"
        });

        setShowRejectionDialog(false);

        if (onUnavailableResponse) {
          onUnavailableResponse(order.id);
        }

        if (onOrderUpdated) {
          onOrderUpdated();
        }
      } else {
        throw new Error(result.error || 'فشل في رفض الطلب');
      }
    } catch (error) {
      console.error('❌ رفض الطلب:', error);
      toast({
        title: "خطأ في الرفض",
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectionCancel = () => {
    setShowRejectionDialog(false);
  };

  const handleDeliveryClick = () => {
    if (onDeliveryConfirm) {
      onDeliveryConfirm(order.id);
    }
  };

  console.log('🔍 StoreProductAvailabilityCheck - Order status:', {
    orderId: order.id,
    order_status: order.order_status,
    store_response_status: order.store_response_status
  });

  // **الحالة 1: إذا تم رفض الطلب - لا يعرض شيء (سيختفي من قائمة المتجر)**
  if (order.store_response_status === 'unavailable') {
    console.log('❌ الطلب مرفوض - إخفاء من قائمة المتجر');
    return null;
  }

  // **الحالة 2: إذا تم قبول الطلب - عرض تفاصيل المنتج مع إمكا��ية التسليم**
  if (order.store_response_status === 'available') {
    console.log('✅ الطلب متوفر - عرض تفاصيل المنتج');
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-green-800">
                    {productName} - متوفر
                  </h3>
                  <p className="text-sm text-green-600">تفاصيل المنتج</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✅ متوفر
              </Badge>
            </div>

            {/* Product Details */}
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                تفاصيل المنتج
              </h4>
              
              {(() => {
                if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
                  const enhancedItems = order.order_items.map((item, index) => ({
                    ...item,
                    product_name: item.product_name || item.name || `منتج ${index + 1}`,
                    price: item.price || order.total_amount || 0,
                    quantity: item.quantity || 1,
                    id: item.id || `item-${index}`
                  }));

                  return <OrderItems items={enhancedItems} compact={false} />;
                }

                const orderRef = order.order_code || order.id.slice(0, 8);
                const defaultItem = {
                  id: `default-${order.id}`,
                  product_name: productName,
                  quantity: 1,
                  price: order.total_amount || order.subtotal || 0,
                  discounted_price: order.total_amount || order.subtotal || 0
                };

                return <OrderItems items={[defaultItem]} compact={false} />;
              })()}

              {/* Total Amount */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-700">💰 المبلغ الإجمالي:</span>
                  <span className="text-green-800 font-bold text-lg">
                    {order.subtotal ? formatCurrency(order.subtotal) :
                     order.total_amount ? formatCurrency(order.total_amount) : "غير محدد"}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Details Button */}
            <div className="flex justify-center">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-bold"
                onClick={handleDeliveryClick}
              >
                🚚 عرض بيانات العميل للتسليم
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // **الحالة 3: العرض الأولي - نافذة الاختيار (متوفر/غير متوفر)**
  console.log('🟡 عرض نافذة الاختيار الأولي');
  return (
    <>
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Product name only */}
            <div className="text-center">
              <h3 className="font-bold text-xl text-orange-800 mb-2">
                {productName}
              </h3>
              <p className="text-sm text-orange-600">
                طلب #{order.order_code || order.id.slice(0, 8)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                المبلغ: {order.subtotal ? formatCurrency(order.subtotal) : formatCurrency(order.total_amount || 0)}
              </p>
            </div>

            {/* عرض تفاصيل المنتج بشكل مصغر */}
            <div className="bg-white border border-orange-200 rounded-lg p-3">
              <h4 className="font-semibold text-orange-800 mb-2 text-sm">تفاصيل المنتج:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div><span className="font-medium">الاسم:</span> <span className="text-blue-800 font-semibold">{productName}</span></div>
                <div><span className="font-medium">الكمية:</span> {order.order_items?.[0]?.quantity || 1}</div>
                <div><span className="font-medium">السعر:</span> {order.subtotal ? formatCurrency(order.subtotal) : formatCurrency(order.total_amount || 0)}</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleAvailableClick}
                disabled={isProcessing}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    جاري...
                  </div>
                ) : (
                  '✔️ متوفر'
                )}
              </Button>

              <Button
                onClick={handleUnavailableClick}
                disabled={isProcessing}
                size="lg"
                variant="destructive"
                className="px-6 py-2"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    جاري...
                  </div>
                ) : (
                  '❌ غير متوفر'
                )}
              </Button>
            </div>

            {/* Instruction text */}
            <div className="text-center text-xs text-orange-600 bg-orange-100 p-2 rounded-lg">
              <p>
                <strong>✔️ متوفر:</strong> عرض تفاصيل المنتج وإعداد التسليم
              </p>
              <p>
                <strong>❌ غير متوفر:</strong> إدخال سبب عدم التوفر وإرجاع للمدير
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Rejection Reason Dialog */}
      <RejectionReasonDialog
        isOpen={showRejectionDialog}
        onClose={handleRejectionCancel}
        onConfirm={handleRejectionConfirm}
        orderCode={order.order_code || order.id.slice(0, 8)}
        productName={productName}
        isProcessing={isProcessing}
      />
    </>
  );
}
