import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Store, 
  Calendar,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  MessageSquare,
  Package,
  History
} from 'lucide-react';
import {
  getLatestStoreResponseForAdmin,
  getOrderStoreHistoryForAdmin,
  StoreOrderResponse
} from '@/services/storeResponseService';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/utils/currency';
import { safeFormatDate } from '@/utils/dateUtils';
import { OrderItems } from '@/components/orders/OrderItems';
import { ArabicText } from '@/components/ui/arabic-text';

interface Order {
  id: string;
  order_code?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_notes?: string;
  total_amount?: number;
  subtotal?: number;
  assigned_store_id?: string;
  store_response_status?: string;
  store_response_at?: string;
  rejection_reason?: string;
  order_items?: any[];
  stores?: { name: string };
}

interface StoreInventoryStatusProps {
  order: Order;
  onRefresh?: () => void;
}

export function StoreInventoryStatus({ order, onRefresh }: StoreInventoryStatusProps) {
  const { t } = useLanguage();
  const [storeResponse, setStoreResponse] = useState<StoreOrderResponse | null>(null);
  const [storeName, setStoreName] = useState<string>(order.stores?.name || 'غير محدد');
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);

  // إظها�� تفاصي�� العميل تلقائياً عندما يكون الطلب متوفراً
  useEffect(() => {
    if (order.store_response_status === 'available') {
      setShowCustomerDetails(true);
    }
  }, [order.store_response_status]);

  useEffect(() => {
    console.log('🔄 StoreInventoryStatus useEffect triggered:', {
      orderId: order.id,
      assigned_store_id: order.assigned_store_id,
      store_response_status: order.store_response_status
    });

    if (order.assigned_store_id) {
      fetchStoreResponse();
      fetchTransferHistory();
      fetchStoreName();
    } else {
      setIsLoading(false);
    }
  }, [order.id, order.assigned_store_id, order.store_response_status]);

  const fetchStoreResponse = async () => {
    if (!order.assigned_store_id) return;

    try {
      console.log('🔍 Fetching store response for order:', order.id, 'store:', order.assigned_store_id);

      const result = await getLatestStoreResponseForAdmin(order.id, order.assigned_store_id);

      if (result.error) {
        console.error('❌ خطأ في جلب استجابة المتجر:', result.error);

        // Fallback: جلب البيانات مباشرة من قاعدة البيانات
        console.log('🔄 Trying direct database fetch...');
        const { data: orderData, error: dbError } = await supabase
          .from('orders')
          .select('store_response_status, store_response_at, rejection_reason')
          .eq('id', order.id)
          .single();

        if (!dbError && orderData) {
          console.log('✅ Direct DB fetch successful:', orderData);
          // إنشاء response object من البيانات المجلبة
          setStoreResponse({
            id: order.id,
            order_id: order.id,
            store_id: order.assigned_store_id,
            response_type: orderData.store_response_status as any,
            responded_at: orderData.store_response_at,
            rejection_reason: orderData.rejection_reason,
            created_at: orderData.store_response_at
          });
        }
        return;
      }

      console.log('✅ Store response fetched successfully:', result.response);
      setStoreResponse(result.response);
      setStoreName(result.storeName || order.stores?.name || 'غير محدد');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('❌ خطأ في جلب استجابة المتجر:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransferHistory = async () => {
    try {
      const history = await getOrderStoreHistoryForAdmin(order.id);
      setTransferHistory(history);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('❌ خطأ في جلب تاريخ تحويل الطلب:', errorMessage);
    }
  };

  const fetchStoreName = async () => {
    if (!order.assigned_store_id) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('name')
        .eq('id', order.assigned_store_id)
        .single();

      if (error) {
        console.error('❌ خطأ في جلب اسم المتجر:', error.message);
        return;
      }

      if (data?.name) {
        setStoreName(data.name);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('❌ خطأ في جلب اسم المتجر:', errorMessage);
    }
  };

  const getStatusInfo = () => {
    if (!order.assigned_store_id) {
      return {
        status: 'unassigned',
        label: 'غير معين',
        message: 'لم يتم تعيين ال��تجر بعد',
        color: 'bg-gray-100 text-gray-800',
        icon: Store,
        variant: 'secondary' as const
      };
    }

    // أولاً تحقق من store_response_status في البيانات المحدثة
    if (order.store_response_status === 'available' || order.store_response_status === 'accepted') {
      console.log('✅ Order status detected as available:', {
        store_response_status: order.store_response_status,
        storeName: storeName || order.stores?.name || 'غير محدد'
      });

      return {
        status: 'available',
        label: t('available'),
        message: `المتجر ${storeName || order.stores?.name || 'غير محدد'} أكد توفر جميع المنتجات`,
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        variant: 'default' as const
      };
    }

    if (order.store_response_status === 'unavailable' || order.store_response_status === 'rejected') {
      return {
        status: 'unavailable',
        label: `${t('unavailable')} – تم إلغاء تعيين المتجر`,
        message: `المتجر ${storeName || order.stores?.name || 'غير محدد'} غير قادر على توفير المنتجات. يرجى تعيين متجر آخر.`,
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
        variant: 'destructive' as const
      };
    }

    // ثم تحقق من storeResponse من API
    if (storeResponse) {
      console.log('🔍 Checking storeResponse object:', {
        response_type: storeResponse.response_type,
        responded_at: storeResponse.responded_at
      });

      if (storeResponse.response_type === 'available' || storeResponse.response_type === 'accepted') {
        console.log('✅ StoreResponse detected as available:', storeResponse.response_type);

        return {
          status: 'available',
          label: t('available'),
          message: `المتجر ${storeName} أكد توفر جميع المنتجات`,
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          variant: 'default' as const
        };
      }

      if (storeResponse.response_type === 'unavailable' || storeResponse.response_type === 'rejected') {
        console.log('❌ StoreResponse detected as unavailable:', storeResponse.response_type);

        return {
          status: 'unavailable',
          label: `${t('unavailable')} – تم إلغاء تعيين المتجر`,
          message: `المتجر ${storeName} غير قادر على توفير المنتجات. يرجى تعيين متجر آخر.`,
          color: 'bg-red-100 text-red-800',
          icon: XCircle,
          variant: 'destructive' as const
        };
      }
    }

    // إذا ��م يكن هناك رد بعد
    return {
      status: 'pending',
      label: 'بانتظار رد المتجر',
      message: `ينتظر النظام رد المتجر ${storeName || order.stores?.name || 'غير محدد'} على توفر المنتجات`,
      color: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      variant: 'secondary' as const
    };
  };

  const statusInfo = getStatusInfo();

  // Debug logging
  console.log('🔍 StoreInventoryStatus debug info:', {
    orderId: order.id,
    assigned_store_id: order.assigned_store_id,
    store_response_status: order.store_response_status,
    storeResponse: storeResponse?.response_type,
    statusInfo: statusInfo.status,
    storeName: storeName || order.stores?.name,
    isLoading,
    showCustomerDetails
  });

  if (!order.assigned_store_id) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="w-5 h-5" />
            حالة المخزون لدى المتجر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Store className="w-6 h-6 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700">لم يتم تعيين المتجر بعد</p>
              <p className="text-sm text-gray-500">يرجى تعيين متجر للطلب أولاً</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="w-5 h-5" />
            حالة المخزون لدى المتجر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg animate-pulse">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Store className="w-5 h-5" />
            رد المتجر على توفر الطلب
          </div>
          <Badge variant={statusInfo.variant} className={statusInfo.color}>
            {statusInfo.label}
          </Badge>
        </CardTitle>

        {/* Debug Information (for troubleshooting) */}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          statusInfo.status === 'available' ? 'bg-green-50 border border-green-200' :
          statusInfo.status === 'unavailable' ? 'bg-red-50 border border-red-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <statusInfo.icon className={`w-6 h-6 mt-1 ${
            statusInfo.status === 'available' ? 'text-green-600' :
            statusInfo.status === 'unavailable' ? 'text-red-600' :
            'text-yellow-600'
          }`} />
          <div className="flex-1">
            <p className={`font-medium ${
              statusInfo.status === 'available' ? 'text-green-800' :
              statusInfo.status === 'unavailable' ? 'text-red-800' :
              'text-yellow-800'
            }`}>
              {statusInfo.message}
            </p>
            
            {/* Response Time */}
            {storeResponse && storeResponse.responded_at && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  رد المتجر في: {safeFormatDate(storeResponse.responded_at)}
                </span>
              </div>
            )}

            {/* Store Name */}
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <Store className="w-4 h-4" />
              <span>المتجر ��لمعين: <strong>{storeName}</strong></span>
            </div>
          </div>
        </div>

        {/* Customer Details Section (only show when available) */}
        {statusInfo.status === 'available' && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex items-center justify-center bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
              <h4 className="font-bold text-green-800 flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5" />
                الطلب متوفر - تفاصيل العميل والمنتجات
              </h4>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">


              {/* Customer Notes */}
              {order.customer_notes && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 mt-1" />
                    <div>
                      <span className="font-semibold text-blue-800">ملاحظات العميل:</span>
                      <p className="text-blue-900 mt-1">
                        <ArabicText>{order.customer_notes}</ArabicText>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    تفاصيل المنتجات المطلوبة
                  </h5>
                  <div className="bg-white border border-green-300 rounded-lg p-3">
                    <OrderItems items={order.order_items} compact={false} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rejection Reason (only show when unavailable) */}
        {statusInfo.status === 'unavailable' && order.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-1" />
              <div>
                <span className="font-semibold text-red-800">سبب الرفض:</span>
                <p className="text-red-900 mt-1">{order.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transfer History */}
        {transferHistory.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <h5 className="font-medium text-gray-700 flex items-center gap-2">
              <History className="w-4 h-4" />
              تاريخ تحويل الطلب
            </h5>
            <div className="space-y-2">
              {transferHistory.map((transfer, index) => (
                <div key={transfer.id} className="text-sm bg-gray-50 p-3 rounded border">
                  <p>
                    تم التحويل من <strong>{transfer.from_store?.name || 'غير محدد'}</strong> إلى{' '}
                    <strong>{transfer.to_store?.name || 'غير محدد'}</strong>
                  </p>
                  {transfer.transfer_reason && (
                    <p className="text-gray-600">السبب: {transfer.transfer_reason}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {safeFormatDate(transfer.transferred_at, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Suggestion */}
        {statusInfo.status === 'unavailable' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-1" />
              <div>
                <p className="font-semibold text-orange-800">اقتراح:</p>
                <p className="text-orange-900 text-sm mt-1">
                  يمكنك الآن إعادة تعيين هذا الطلب لمتجر آخر من خلال قسم "تعيين المتجر" أعلاه.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Refresh Buttons */}
        <div className="mt-4 flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🔄 Manual refresh triggered for order:', order.id);
              fetchStoreResponse();
              fetchTransferHistory();
              if (onRefresh) onRefresh();
            }}
            className="text-xs"
            disabled={isLoading}
          >
            🔄 تحديث حالة المخزون
          </Button>

        </div>
      </CardContent>
    </Card>
  );
}
