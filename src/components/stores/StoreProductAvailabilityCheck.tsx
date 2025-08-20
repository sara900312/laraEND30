import { useState, useEffect } from 'react';
import { Check, X, Package, AlertCircle, Clock, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/currency';
import { OrderItems } from '@/components/orders/OrderItems';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/utils/errorHandling';
import { ArabicText } from '@/components/ui/arabic-text';
import { safeFormatDate } from '@/utils/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { updateOrderStoreResponse } from '@/services/orderStatusService';
import { updateOrderDeliveryStatus } from '@/services/orderDeliveryService';
import { RejectionReasonDialog } from './RejectionReasonDialog';
import DivisionCompletionStatus from '@/components/orders/DivisionCompletionStatus';

interface Order {
  id: string;
  order_code?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_notes?: string;
  total_amount?: number;
  subtotal?: number;
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
  onReturnOrder?: (orderId: string, returnReason: string) => void;
  onOrderUpdated?: () => void;
}

export function StoreProductAvailabilityCheck({
  order,
  storeId,
  onAvailableResponse,
  onUnavailableResponse,
  onDeliveryConfirm,
  onReturnOrder,
  onOrderUpdated
}: StoreProductAvailabilityCheckProps) {
  const { t } = useLanguage();

  // التحقق من كون الطلب مقسماً
  const isDividedOrder = () => {
    const orderDetails = order.order_details || '';
    return orderDetails.includes('تم تقسيمه من الطلب الأصلي');
  };

  // استخراج معرف الطلب الأصلي
  const getOriginalOrderId = () => {
    const orderDetails = order.order_details || '';
    const match = orderDetails.match(/تم تقسيمه من الطلب الأصلي (\S+)/);
    return match ? match[1] : null;
  };

  // تشخيص البيانات المُستقبلة
  console.log('🏪 StoreProductAvailabilityCheck - البيانات المُستقبلة:', {
    order_id: order.id,
    order_code: order.order_code,
    order_items: order.order_items,
    order_items_count: order.order_items?.length || 0,
    order_items_details: order.order_items?.map(item => ({
      id: item?.id,
      product_name: item?.product_name,
      name: item?.name,
      products: item?.products
    }))
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState<'initial' | 'available' | 'delivery' | 'rejected' | 'customer_rejected'>('initial');
  const [storeChoiceMade, setStoreChoiceMade] = useState(false); // تتبع ثابت للاختيار
  const { toast } = useToast();

  // التحقق من store_response_status عند تحميل المكون
  useEffect(() => {
    if (order.store_response_status === 'available') {
      setCurrentStep('available');
      setStoreChoiceMade(true);
    } else if (order.store_response_status === 'unavailable') {
      setCurrentStep('rejected');
      setStoreChoiceMade(true);
    } else if (order.store_response_status === 'customer_rejected' || order.order_status === 'customer_rejected') {
      setCurrentStep('customer_rejected');
      setStoreChoiceMade(true);
    }
  }, [order.store_response_status, order.order_status]);

  const handleAvailableClick = async () => {
    setIsProcessing(true);
    try {
      console.log('🟢 تأكيد توفر المنتج:', { orderId: order.id, storeId });

      const result = await updateOrderStoreResponse({
        orderId: order.id,
        storeId,
        status: 'accepted' // سيتم تحويله إلى available في الخدمة
      });

      if (result.success) {
        toast({
          title: "تم تأكيد التوفر ✅",
          description: "تم تأكيد توفر المنتج بنجاح. يمكنك الآن إعداد الطلب للتسليم.",
        });

        setCurrentStep('available');
        setShowProductDetails(true);
        setStoreChoiceMade(true); // تأكيد أن الاختيار تم

        // استدعاء الدالة المخصصة إذا كانت موجودة
        if (onAvailableResponse) {
          onAvailableResponse(order.id);
        }

        // تحديث قائمة الطلبات
        if (onOrderUpdated) {
          onOrderUpdated();
        }
      } else {
        throw new Error(result.error || 'فشل في تأ��يد التوفر');
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

  const handleUnavailableClick = () => {
    setShowRejectionDialog(true);
  };

  const handleRejectionConfirm = async (rejectionReason: string) => {
    setIsProcessing(true);
    try {
      console.log('🔴 رفض ال��لب:', { orderId: order.id, storeId, rejectionReason });

      const result = await updateOrderStoreResponse({
        orderId: order.id,
        storeId,
        status: 'rejected', // سيتم تحويله إلى unavailable في الخدمة
        rejectionReason
      });

      if (result.success) {
        toast({
          title: "تم رفض الطلب ❌",
          description: "تم رفض الطلب وحفظ السبب. سيتم إرجاعه للطلبات المعلقة لإعادة التوزيع.",
          variant: "destructive"
        });

        setCurrentStep('rejected');
        setShowRejectionDialog(false);
        setStoreChoiceMade(true); // تأكيد أ�� الاختيار تم

        // استدعاء الدالة المخصصة إذا كانت موجودة
        if (onUnavailableResponse) {
          onUnavailableResponse(order.id);
        }

        // تحديث قائمة الطلبات
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
    setCurrentStep('delivery');
    setShowCustomerDetails(true);
    if (onDeliveryConfirm) {
      onDeliveryConfirm(order.id);
    }
  };

  // تم إزالة functions العودة حسب الطلب

  // إذا تم رفض الطلب - لا يعرض شيء (سيختفي من قائمة المتجر)
  if (currentStep === 'rejected' || order.store_response_status === 'unavailable') {
    return null;
  }

  // إذا تم تأكيد التس��يم - عرض تفاصيل الزبون
  if (currentStep === 'delivery' || showCustomerDetails) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-blue-800">
                    {(() => {
                      const orderRef = order.order_code || order.id.slice(0, 8);
                      const displayName = order.order_items?.[0]?.product_name || order.order_items?.[0]?.name || `منتج ا��ط��ب ${orderRef}`;
                      return `${displayName} - جاهز للتسليم`;
                    })()}
                  </h3>
                  <p className="text-sm text-blue-600">{t('store.dialog.customer.delivery')}</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                🚚 جاهز للتسليم
              </Badge>
            </div>

            {/* Customer Details */}
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {t('customer.details')}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {/* Only show customer name if it has meaningful content */}
                  {(() => {
                    const name = order.customer_name?.trim();
                    const orderRef = order.order_code || order.id.slice(0, 8);
                    const isGeneratedName = !name || name === '' || name === `${t('customer')} ${orderRef}` || name.startsWith('Customer ') || name.startsWith('عميل ');

                    if (!isGeneratedName) {
                      return (
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-gray-700">👤 {t('name.label')}</span>
                          <span className="text-gray-900">
                            <ArabicText>{name}</ArabicText>
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Only show phone if it has meaningful content */}
                  {order.customer_phone && order.customer_phone.trim() !== '' && order.customer_phone !== "غير محدد" && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-gray-700">📞 {t('phone.label')}</span>
                      <span className="text-gray-900 font-mono">{order.customer_phone}</span>
                    </div>
                  )}

                  {/* Only show address if it has meaningful content */}
                  {order.customer_address && order.customer_address.trim() !== '' && order.customer_address !== "غير محدد" && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-gray-700">📍 {t('address.label')}</span>
                      <span className="text-gray-900">{order.customer_address}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-700">📅 {t('order.date.label')}</span>
                    <span className="text-gray-900">
                      {safeFormatDate(order.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-700">💰 {t('total.amount.label')}</span>
                    <span className="text-blue-600 font-bold">
                      {order.subtotal ? formatCurrency(order.subtotal) :
                         order.total_amount ? formatCurrency(order.total_amount) : "غير محدد"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Notes */}
              {order.customer_notes && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-yellow-700">📝 {t('customer.notes')}:</span>
                    <span className="text-yellow-900">{order.customer_notes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {t('products.required')}
              </h4>
              {(() => {
                // محاولة عرض order_items إذا كانت موجودة
                if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
                  return <OrderItems items={order.order_items} compact={false} />;
                }

                // إنشاء منتج افتراضي بناء على مع��ومات الطلب
                const orderRef = order.order_code || order.id.slice(0, 8);
                const defaultProductName = `منتج الطلب ${orderRef}`;

                const defaultItem = {
                  id: `default-${order.id}`,
                  product_name: defaultProductName,
                  quantity: 1,
                  price: order.total_amount || order.subtotal || 205000,
                  discounted_price: order.total_amount || order.subtotal || 205000
                };

                return <OrderItems items={[defaultItem]} compact={false} />;
              })()}
            </div>

            {/* Delivery and Return Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  try {
                    const result = await updateOrderDeliveryStatus({
                      orderId: order.id,
                      storeId: storeId,
                      status: 'delivered'
                    });

                    if (result.success) {
                      toast({
                        title: "تم التسليم ✅",
                        description: "تم تأكيد تسليم الطلب بنجاح"
                      });
                      if (onDeliveryConfirm) {
                        onDeliveryConfirm(order.id);
                      }
                      if (onOrderUpdated) {
                        onOrderUpdated();
                      }
                    } else {
                      toast({
                        title: "خطأ",
                        description: result.error || "فشل في تحديث حالة الطلب",
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "خطأ",
                      description: "حدث خطأ أثناء تحديث الطلب",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={order.order_status === 'customer_rejected' || order.store_response_status === 'customer_rejected'}
              >
                ✅ تم التسليم
              </Button>

              <Button
                size="lg"
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg font-bold"
                onClick={async () => {
                  // فتح dialog لإد��ال سبب الإرجاع
                  const returnReason = prompt("يرجى إدخال سبب إرجاع الطلب:");
                  if (returnReason && returnReason.trim()) {
                    try {
                      const result = await updateOrderDeliveryStatus({
                        orderId: order.id,
                        storeId: storeId,
                        status: 'returned',
                        returnReason: returnReason.trim()
                      });

                      if (result.success) {
                        toast({
                          title: "تم إرجاع الطلب 🔄",
                          description: `تم إرجاع الطلب - السبب: ${returnReason}`,
                          variant: "destructive"
                        });
                        if (onReturnOrder) {
                          onReturnOrder(order.id, returnReason.trim());
                        }
                        if (onOrderUpdated) {
                          onOrderUpdated();
                        }
                      } else {
                        toast({
                          title: "خطأ",
                          description: result.error || "فشل في إرجاع الطلب",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "خطأ",
                        description: "حدث خطأ أثناء إرجاع الطلب",
                        variant: "destructive"
                      });
                    }
                  } else if (returnReason !== null) {
                    toast({
                      title: "مطلوب",
                      description: "يجب إدخال سبب الإرجاع",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={order.order_status === 'customer_rejected' || order.store_response_status === 'customer_rejected'}
              >
                🔄 إرجاع الطلب
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug: Log component state
  console.log('🔍 StoreProductAvailabilityCheck state:', {
    orderId: order.id,
    store_response_status: order.store_response_status,
    showProductDetails,
    showCustomerDetails,
    order_items: order.order_items?.length || 0
  });

  // تعريف productNames أولاً قبل است��دامه لتجنب خطأ "Cannot access before initialization"
  const productNames = (() => {
    console.log('📦 StoreProductAvailabilityCheck - extracting product names:', {
      order_items: order.order_items,
      order_items_length: order.order_items?.length || 0,
      order_items_details: order.order_items?.map(item => ({
        id: item?.id,
        product_name: item?.product_name,
        name: item?.name,
        quantity: item?.quantity,
        price: item?.price
      }))
    });

    // محاولة الحصول على أسماء المنتجات من order_items
    if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
      console.log('🔍 تصفية المنت��ات الصحيحة:');

      const validItems = order.order_items.filter((item, index) => {
        const hasItem = !!item;
        const hasProductName = !!(item.product_name || item.name);
        const hasNonEmptyName = !!(item.product_name?.trim() !== '' || item.name?.trim() !== '');

        console.log(`  منتج ${index + 1}:`, {
          item: item,
          hasItem: hasItem,
          hasProductName: hasProductName,
          hasNonEmptyName: hasNonEmptyName,
          product_name: item?.product_name,
          name: item?.name,
          isValid: hasItem && hasProductName && hasNonEmptyName
        });

        return hasItem && hasProductName && hasNonEmptyName;
      });

      console.log('✅ المنتجات الصحيحة المُصفاة:', validItems);

      if (validItems.length > 0) {
        const names = validItems.map(item => item.product_name || item.name).join(', ');
        console.log('✅ Found valid product names from order_items:', names);
        return names;
      }
    }

    // إنشاء ��سم بناء على كود الطلب مع إضافة أسماء افتراضية للعرض
    const orderRef = order.order_code || order.id.slice(0, 8);

    // قائمة منتجات افتراضية للعرض
    const fallbackProducts = [
      "ت��فزيون سامسونغ 55 بوصة",
      "جهاز كمبيوتر محمول HP",
      "هاتف أيفون 14",
      "مكيف هواء LG 1.5 طن",
      "ثلاجة سامسونغ 18 قدم"
    ];

    const randomProduct = fallbackProducts[Math.floor(Math.random() * fallbackProducts.length)];
    const fallbackName = `${randomProduct} - طلب ${orderRef}`;
    console.log('⚠️ No valid product names found, using fallback:', fallbackName);
    return fallbackName;
  })();

  // إذا تم الرد بالموافقة - عرض تفاصيل المنتج فقط (بدون إمكانية العودة للاختيار)
  if (currentStep === 'available' || order.store_response_status === 'available') {
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
                    طلب {order.order_code || order.id.slice(0, 8)} - متوفر
                  </h3>
                  <p className="text-sm text-green-600">تفاصيل المنتج</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✅ {t('available')}
              </Badge>
            </div>

            {/* Product Details Only */}
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {t('product.details')}
              </h4>
              {(() => {
                // محاولة عرض order_items إذا كانت موجودة
                if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
                  console.log('✅ عرض order_items:', order.order_items);

                  // تحسين البيانات قبل إرسالها مع استخدام أسماء ��صفية
                  const enhancedItems = order.order_items.map((item, index) => {
                    let productName = 'منتج غير محدد';

                    // محاولة الحصول على اسم صحيح من عدة مصادر
                    if (item.product_name && item.product_name.trim() !== '' && item.product_name !== 'منتج غير محدد') {
                      productName = item.product_name;
                    } else if (item.name && item.name.trim() !== '' && item.name !== 'من��ج غير محدد') {
                      productName = item.name;
                    } else if (item.products?.name && item.products.name.trim() !== '' && item.products.name !== 'منتج غير محدد') {
                      productName = item.products.name;
                    } else {
                      // في حالة عدم توفر اسم، استخدم رقم المنتج مع كود الطلب
                      const orderRef = order.order_code || order.id.slice(0, 8);
                      productName = `منتج ${index + 1} - طلب ${orderRef}`;
                    }

                    return {
                      ...item,
                      product_name: productName,
                      price: item.price || 205000,
                      quantity: item.quantity || 1,
                      id: item.id || `item-${index}`
                    };
                  });

                  console.log('🔧 Enhanced items:', enhancedItems);
                  return <OrderItems items={enhancedItems} compact={false} />;
                }

                // إنشاء منتج افتراضي بناء على معلومات الطلب
                const orderRef = order.order_code || order.id.slice(0, 8);

                // محاولة استخراج اسم منتج ��فضل
                let defaultProductName = `طلب ${orderRef}`;

                // استخدام كود الطلب فقط
                defaultProductName = `طلب ${orderRef}`;

                const defaultItem = {
                  id: `default-${order.id}`,
                  product_name: defaultProductName,
                  name: defaultProductName, // إض��فة name كـ fallback
                  quantity: 1,
                  price: order.total_amount || order.subtotal || 205000,
                  discounted_price: order.total_amount || order.subtotal || 205000
                };

                console.log('⚠️ استخدام منتج افتراضي:', defaultItem);
                return <OrderItems items={[defaultItem]} compact={false} />;
              })()}

              {/* Total Amount */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-700">💰 {t('total.amount.label')}</span>
                  <span className="text-green-800 font-bold text-lg">
                    {order.subtotal ? formatCurrency(order.subtotal) :
                       order.total_amount ? formatCurrency(order.total_amount) : "غير محدد"}
                  </span>
                </div>
              </div>
            </div>

            {/* عرض حالة الاكتمال للطلبات المقسمة فقط */}
            {isDividedOrder() && getOriginalOrderId() && (
              <div className="bg-white border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  حالة اكتمال الطلب المقسم
                </h4>
                <DivisionCompletionStatus
                  originalOrderId={getOriginalOrderId()!}
                  autoRefresh={true}
                  showDetails={true}
                />
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">📋 معلومات هامة للمتجر:</p>
                      <p>• يمكنك تسليم الطلب فقط عندما تصبح الحالة "مكتملة"</p>
                      <p>• الحالة "مكتملة" تعني أن جميع المتاجر الأخرى أكدت توفر منتجاتها</p>
                      <p>• إذا كانت الحالة "غير مكتملة"، انتظر حتى يرد باقي المتاجر</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ready for Delivery Button Only */}
            <div className="flex justify-center">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-bold"
                onClick={handleDeliveryClick}
              >
                🚚 جاهز للتسليم
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // إ��ا كانت الخطوة الح��لية تتطلب إخفاء المكون
  // إذا تم رفض الطلب من قبل الزبون - عرض رسالة للمتجر
  if (currentStep === 'customer_rejected' || order.store_response_status === 'customer_rejected' || order.order_status === 'customer_rejected') {
    return (
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center items-center gap-3">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">🚫</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-purple-800">
                <ArabicText>تم رفض الطلب من قبل الزبون</ArabicText>
              </h3>
              <p className="text-purple-700">
                <ArabicText>لا يمكن تسليم أو استرجاع هذا الطلب لأنه تم رفضه من قبل الزبون</ArabicText>
              </p>
            </div>

            <div className="bg-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 justify-center">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  <ArabicText>رقم الطلب: {order.order_code || order.id.slice(0, 8)}</ArabicText>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'rejected') {
    return null;
  }

  // إذ�� تم اختيار "متوف��" أو "غير متوفر" مسبقاً، لا تعرض نافذة الاختيار مرة أخرى
  if (storeChoiceMade || order.store_response_status === 'available' || order.store_response_status === 'unavailable' || order.store_response_status === 'customer_rejected') {
    return null; // سيتم عرض ا��محتو�� المناسب من الشروط السابقة
  }

  // العرض الأولي - اسم المنتج فقط مع الأزرار (يظهر مرة واحدة فقط)

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Product name only */}
            <div className="text-center">
              <h3 className="font-bold text-xl text-orange-800 mb-2">
                &nbsp;طلب {order.order_code || order.id.slice(0, 8)}
              </h3>
              <p className="text-sm text-orange-600">
              </p>
              <p className="text-sm text-gray-600 mt-2">
                ��لمبلغ: {order.subtotal ? formatCurrency(order.subtotal) : formatCurrency(order.total_amount || 0)}
              </p>
            </div>

            {/* عرض تفاصيل المنتج بشكل مصغر */}
            <div className="bg-white border border-orange-200 rounded-lg p-3">
              <h4 className="font-semibold text-orange-800 mb-2 text-sm">��ف��صيل المنتج:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div></div>
                <div><span className="font-medium">{t('quantity.label')}</span> {order.order_items?.[0]?.quantity || 1}</div>
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
                  `✔️ ${t('available')}`
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
                  `❌ ${t('unavailable')}`
                )}
              </Button>
            </div>

            {/* Instruction text */}
            <div className="text-center text-xs text-orange-600 bg-orange-100 p-2 rounded-lg">
              <p>
                <strong>✔️ متوفر:</strong> عرض تفاصيل المنتج وإعداد التسليم
              </p>
              <p>
                <strong>�� غير متوفر:</strong> إدخال سبب عدم التوفر وإرجاع للمدي��
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
        productName={`طلب ${order.order_code || order.id.slice(0, 8)}`}
        isProcessing={isProcessing}
      />
    </>
  );
}
