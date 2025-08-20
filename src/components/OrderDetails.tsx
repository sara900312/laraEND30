import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnhancedEdgeFunctions } from '@/hooks/useEnhancedEdgeFunctions';
import { formatCurrency, calculateFinalPrice } from '@/utils/currency';
import { getProductNameWithPriority } from '@/utils/productNameFixer';
import { StoreInventoryStatusDisplay } from '@/components/admin/StoreInventoryStatusDisplay';
import { supabase } from '@/integrations/supabase/client';
import {
  User, Phone, MapPin, FileText, Store, Package,
  Calendar, DollarSign, RefreshCw, CheckCircle, Clock
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStoreTypeLabel, getDisplayStoreName } from '@/utils/storeDisplayUtils';

interface OrderDetailsProps {
  orderId: string;
  stores?: Array<{ id: string; name: string }>;
  onOrderUpdated?: () => void;
  storeId?: string; // إضافة storeId كـ prop اختياري
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ orderId, stores = [], onOrderUpdated, storeId }) => {
  const { t } = useLanguage();
  const [orderData, setOrderData] = useState<any>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const {
    getOrderDetails,
    assignOrder,
    isGettingOrder: loading,
    isAssigningOrder: isAssigning
  } = useEnhancedEdgeFunctions();

  const loadOrderData = async () => {
    if (!orderId) {
      console.warn("⚠�� loadOrderData called without orderId");
      return;
    }

    try {
      console.log("🔵 loadOrderData: Starting to load order data for:", orderId, "with storeId:", storeId || 'undefined (admin mode)');

      // Use enhanced Edge Functions service
      const data = await getOrderDetails(orderId, storeId);
      console.log("✅ getOrderDetails successful:", data);

      if (data) {
        setOrderData(data);
        console.log("📋 Order data loaded and set:", data);
      } else {
        console.warn("⚠️ No data received from order loading");
      }
    } catch (err) {
      console.error('❌ Failed to fetch order details:', err);
      // Don't show toast here as useEdgeFunctions already handles it
    }
  };

  useEffect(() => {
    if (orderId) {
      console.log("🔄 OrderDetails: Loading data for orderId:", orderId, "with storeId:", storeId || 'undefined (admin mode)');
      loadOrderData();
    }
  }, [orderId, storeId]); // Run when orderId or storeId changes

  // إضافة subscription للتحديثات التلقائية
  useEffect(() => {
    if (!orderId) return;

    const subscription = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('🔄 OrderDetails: Real-time update received:', payload);
          // إعادة تحميل البيانات عند التح��يث
          loadOrderData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId]);

  const handleAssignOrder = async () => {
    if (!selectedStoreId || !orderId) return;

    const success = await assignOrder(orderId, selectedStoreId);
    if (success) {
      // إعادة تحميل بيانات الطلب لتحديث الوا��هة
      await loadOrderData();
      setSelectedStoreId('');
      onOrderUpdated?.();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: t('pending'), variant: 'secondary' as const, icon: Clock },
      assigned: { label: t('assigned'), variant: 'default' as const, icon: Package },
      delivered: { label: t('delivered'), variant: 'default' as const, icon: CheckCircle },
      completed: { label: t('delivered'), variant: 'default' as const, icon: CheckCircle },
      returned: { label: t('returned'), variant: 'destructive' as const, icon: RefreshCw },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || 
           { label: status, variant: 'secondary' as const, icon: Package };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>جارٍ تحميل تفاصيل الطلب...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orderData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            لم يتم العثور على بيانات الطلب
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle both new and old response structures
  const order = orderData.order || orderData;
  const orderItems = orderData.order_items || order.items || [];
  const assignedStore = orderData.assigned_store;

  // Calculate total from product items only (excluding delivery completely)
  const getProductsTotal = () => {
    if (!orderItems || orderItems.length === 0) return 0;

    return orderItems.reduce((total, item) => {
      const originalPrice = item.product?.price || item.price || 0;
      const discountedPrice = item.product?.discounted_price || item.discounted_price || 0;

      // تحويل السعر المخ��ض إلى مبلغ الخصم
      const discountAmount = discountedPrice > 0 && discountedPrice < originalPrice
        ? originalPrice - discountedPrice
        : 0;

      const priceInfo = calculateFinalPrice(originalPrice, discountAmount);
      const quantity = item.quantity || 1;
      return total + (priceInfo.finalPrice * quantity);
    }, 0);
  };

  // Calculate total savings across all items
  const getTotalSavings = () => {
    if (!orderItems || orderItems.length === 0) return 0;

    return orderItems.reduce((totalSavings, item) => {
      const originalPrice = item.product?.price || item.price || 0;
      const discountedPrice = item.product?.discounted_price || item.discounted_price || 0;

      // تحويل السعر المخفض إلى مبلغ الخصم
      const discountAmount = discountedPrice > 0 && discountedPrice < originalPrice
        ? originalPrice - discountedPrice
        : 0;

      const priceInfo = calculateFinalPrice(originalPrice, discountAmount);

      if (priceInfo.hasDiscount) {
        const quantity = item.quantity || 1;
        return totalSavings + (priceInfo.savings * quantity);
      }

      return totalSavings;
    }, 0);
  };

  const statusInfo = getStatusBadge(order.order_status || order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* رأس الطلب */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              الطلب
            </CardTitle>
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {/* تفاصيل الطلب */}
            <div className="space-y-4 flex flex-col mx-auto">
              <h3 className="font-semibold text-lg border-b pb-2 mx-auto">تفاصيل الطلب</h3>

              <div className="space-y-3 flex flex-col mt-4 mx-auto">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{t('order.date.label')}</span>
                  <span>
                    {new Date(order.created_at).toLocaleString('ar-IQ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-medium">إجم��لي المبلغ (بدون التوصيل):</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(getProductsTotal())}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{getStoreTypeLabel(order)}</span>
                  <span className="text-blue-600 font-medium">
                    {getDisplayStoreName(order)}
                  </span>
                </div>

                {/* إظهار حالة رفض الزبون بشكل منفصل ومميز */}
                {(order.order_status === 'customer_rejected' || order.store_response_status === 'customer_rejected') && (
                  <div className="flex items-start gap-2 p-4 rounded-lg border-2 border-purple-300 bg-purple-50 mt-3 mx-auto">
                    <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-purple-800">حالة الزبون:</span>
                        <span className="font-bold text-purple-600">
                          🚫 مرفوض من قبل الزبون
                        </span>
                      </div>
                      {order.store_response_at && (
                        <div className="text-sm text-purple-600 mt-1">
                          تم الرفض في: {new Date(order.store_response_at).toLocaleString('ar-IQ', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* حالة توفر المنتج في المخزون - فقط إذا لم يكن مرفوض من الزبون */}
                {order.store_response_status &&
                 order.store_response_status !== 'customer_rejected' &&
                 order.order_status !== 'customer_rejected' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border bg-gray-50 mt-3 mx-auto">
                    {order.store_response_status === 'available' || order.store_response_status === 'accepted' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <Clock className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">حالة المتجر:</span>
                        <span className={`font-bold ${
                          order.store_response_status === 'available' || order.store_response_status === 'accepted'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {order.store_response_status === 'available' || order.store_response_status === 'accepted'
                            ? '✅ متوفر'
                            : '❌ غير متوفر'
                          }
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
                      {order.store_response_status === 'unavailable' && order.rejection_reason && (
                        <div className="text-sm text-red-600 mt-1">
                          سبب عدم التوفر: {order.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* حالة المخزون من ا��متجر - فقط للمدير */}
      {!storeId &&
       order.order_status !== 'customer_rejected' &&
       order.store_response_status !== 'customer_rejected' &&
       <StoreInventoryStatusDisplay order={order} />}

      {/* المنتجات */}
      {orderItems && orderItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              المنتجات ({orderItems.length} منتج)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderItems.map((item: any, index: number) => (
                <div key={item.id || index} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-blue-800 mb-2">
                        {getProductNameWithPriority(item)}
                      </h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{t('quantity.label')}</span>
                          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0 rounded text-xs border dark:border-blue-700 w-6 h-5 flex items-center justify-center font-medium">
                            {item.quantity || 1}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-purple-600" />
                          <span className="font-semibold text-gray-700">المتجر:</span>
                          <span className="text-purple-600 font-medium">
                            {item.product?.main_store_name ||
                             item.main_store_name ||
                             item.main_store ||
                             order.main_store_name ||
                             'المتجر'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {(() => {
                        // الحصول ��لى الأسعار الفعلية من بيانات المنتج واستخدام calculateFinalPrice للحسابات الدقيقة
                        const originalPrice = item.product?.price || item.price || 0;
                        const discountedPrice = item.product?.discounted_price || item.discounted_price || 0;

                        // تحويل السعر المخف�� إلى مبلغ الخصم
                        const discountAmount = discountedPrice > 0 && discountedPrice < originalPrice
                          ? originalPrice - discountedPrice
                          : 0;

                        const priceInfo = calculateFinalPrice(originalPrice, discountAmount);

                        return (
                          <div className="space-y-2">
                            {/* السعر النهائي */}
                            <div className={`inline-block rounded-lg px-3 py-2 ${
                              priceInfo.hasDiscount
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-green-50 border border-green-200'
                            }`}>
                              <div className={`text-xl font-bold ${
                                priceInfo.hasDiscount ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {formatCurrency(priceInfo.finalPrice)}
                              </div>
                            </div>

                            {/* السعر الأ��لي مشطو�� إذا كان هناك خصم */}
                            {priceInfo.hasDiscount && (
                              <div className="text-gray-500 line-through text-sm">
                                {formatCurrency(originalPrice)}
                              </div>
                            )}

                            {/* مقدار التوفير */}
                            {priceInfo.hasDiscount && priceInfo.savings > 0 && (
                              <div className="inline-block bg-green-50 border border-green-200 rounded px-2 py-1">
                                <span className="text-xs font-medium text-green-700">
                                  وفرت: {formatCurrency(priceInfo.savings)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {item.quantity > 1 && (
                        <div className="text-xs text-gray-600 mt-2 bg-gray-50 px-2 py-1 rounded">
                          <span className="font-medium">المجموع: </span>
                          {formatCurrency((() => {
                            const originalPrice = item.product?.price || item.price || 0;
                            const discountedPrice = item.product?.discounted_price || item.discounted_price || 0;

                            // ت��ويل ال��عر المخفض إلى مبلغ الخصم
                            const discountAmount = discountedPrice > 0 && discountedPrice < originalPrice
                              ? originalPrice - discountedPrice
                              : 0;

                            const priceInfo = calculateFinalPrice(originalPrice, discountAmount);
                            return priceInfo.finalPrice * (item.quantity || 1);
                          })())}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* إجمالي ال��عر */}
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-lg text-green-800">{t('order.total.without.delivery')}:</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-700">
                      {formatCurrency(getProductsTotal())}
                    </div>
                  </div>
                </div>

                {/* إجمالي التو��ير */}
                {getTotalSavings() > 0 && (
                  <div className="flex justify-between items-center bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <span className="font-semibold text-orange-800">إجمالي ما وفرته في هذا الطلب:</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-orange-700 bg-white px-3 py-1 rounded-lg border border-orange-300">
                        {formatCurrency(getTotalSavings())}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {false && (
        <Card>
          <CardHeader>
            <CardTitle>تعيي�� الطلب للمتجر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  اختر المتجر
                </label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المتجر..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAssignOrder}
                disabled={!selectedStoreId || isAssigning}
                className="min-w-[120px]"
              >
                {isAssigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    جاري التعيين...
                  </>
                ) : (
                  'تعيين الطلب'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderDetails;
