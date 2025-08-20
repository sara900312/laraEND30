import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OrderDetails from "@/components/OrderDetails";
import { EnhancedOrderCard } from "@/components/orders/EnhancedOrderCard";
import { OrderItems } from "@/components/orders/OrderItems";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ArabicText } from "@/components/ui/arabic-text";
import { ReturnReasonDialog } from "@/components/orders/ReturnReasonDialog";
import { handleError, logError } from "@/utils/errorHandling";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { runStoreNamesFix } from "@/utils/fixStoreNames";
import {
  LogOut,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  RefreshCw,
  User,
  UserX,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/utils/currency";
import { getProductNameWithPriority } from "@/utils/productNameFixer";
import { StoreProductAvailabilityCheck } from "@/components/stores/StoreProductAvailabilityCheck";
import { CustomerDeliveryDetails } from "@/components/stores/CustomerDeliveryDetails";
import { CustomerInfoDisplay } from "@/components/stores/CustomerInfoDisplay";
import { submitStoreResponse } from "@/services/storeResponseService";
import { submitTempStoreResponse } from "@/services/temporaryStoreResponseService";
import DivisionCompletionStatus from "@/components/orders/DivisionCompletionStatus";
import { useDivisionCompletion, extractOriginalOrderId, isDividedOrder as checkIsDividedOrder } from "@/hooks/useDivisionCompletion";
import { DeliveryControlForDividedOrder, DeliveryStatusMessage } from "@/components/orders/DeliveryControlForDividedOrder";
import { StoreNotificationBell } from "@/components/ui/store-notification-bell";

type OrderWithProduct = {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  product_name: string;
  product_price: number;
  assigned_store_name: string;
  created_at: string;
  order_code: string;
  order_status: string;
  assigned_store_id: string;
  total_amount: number;
  subtotal: number;
  customer_notes: string;
  order_details?: string;
  store_response_status?: string;
  store_response_at?: string;
  order_items?: any[];
  items: {
    name: string;
    price: number;
    quantity: number;
    product_id: number;
  }[];
};

const StoreDashboard = () => {
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [storeInfo, setStoreInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [pendingReturnOrder, setPendingReturnOrder] = useState<{id: string, code: string} | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerDetailsOrderId, setCustomerDetailsOrderId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, dir } = useLanguage();

  // دالة مساعدة لتشخيص بيانات الطلب
  const diagnoseOrderData = (order: any) => {
    const diagnosis = {
      order_id: order.id,
      order_code: order.order_code,
      has_order_items: !!order.order_items,
      order_items_count: order.order_items?.length || 0,
      has_items_json: !!order.items,
      items_json_count: Array.isArray(order.items) ? order.items.length : 0,
      data_source: 'unknown'
    };

    if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
      diagnosis.data_source = 'order_items_table';
    } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      diagnosis.data_source = 'items_json';
    } else {
      diagnosis.data_source = 'no_data';
    }

    console.log('📊 تشخيص بيانات الطل��:', diagnosis);
    return diagnosis;
  };

  useEffect(() => {
    console.log("🔵 StoreDashboard: Checking authentication...");

    // تشغيل إصلاح أسماء المتاجر في بيئة التطوير
    runStoreNamesFix();

    const storeAuth = localStorage.getItem("storeAuth");

    if (!storeAuth) {
      console.log("No storeAuth found, redirecting to login...");
      navigate("/store-login-space9003", { replace: true });
      return;
    }

    try {
      const store = JSON.parse(storeAuth);
      console.log("✅ Store authenticated:", store);
      setStoreInfo(store);
      fetchOrders(store.id);
    } catch (error) {
      logError('تحليل ��يانات ت��جيل ال���خول', error, { storeAuth });
      localStorage.removeItem("storeAuth");
      navigate("/store-login-space9003", { replace: true });
    }
  }, [navigate]);

  const fetchOrders = async (storeId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      console.log('📊 جلب طلبات المتجر:', storeId);

      // Query orders directly from the orders table with proper filtering
      // إخ��اء الطلبات التي تم رفضها (��ير متوفرة)
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          customer_name,
          customer_phone,
          customer_address,
          customer_city,
          items,
          total_amount,
          subtotal,
          customer_notes,
          order_details,
          order_code,
          order_status,
          status,
          assigned_store_id,
          store_response_status,
          store_response_at,
          created_at,
          stores!assigned_store_id(name),
          order_items(
            id,
            product_name,
            quantity,
            price,
            discounted_price,
            availability_status,
            product_id,
            main_store_name,
            products!product_id(
              id,
              name
            )
          )
        `,
        )
        .eq("assigned_store_id", storeId)
        .in("order_status", ["assigned", "delivered", "returned", "customer_rejected"]) // جميع حالات الطلبات بما في ذلك رفض الزبون
        .or("store_response_status.is.null,store_response_status.neq.unavailable,store_response_status.eq.customer_rejected") // إظهار جميع الطلبات بما في ذلك المرفوضة من الزبون
        .order("created_at", { ascending: false });

      if (error) {
        console.error('❌ خطأ في استعلام Supabase:', error);
        throw error;
      }

      // إذا لم نحصل على order_items من join، جلبها منفص��ة
      if (data && data.length > 0) {
        for (const order of data) {
          if (!order.order_items || order.order_items.length === 0) {
            console.log(`🔧 جلب order_items منفصلة للطلب ${order.id}`);

            const { data: orderItems, error: itemsError } = await supabase
              .from('order_items')
              .select(`
                id,
                product_name,
                quantity,
                price,
                discounted_price,
                availability_status,
                product_id,
                main_store_name,
                products!product_id(
                  id,
                  name
                )
              `)
              .eq('order_id', order.id);

            if (!itemsError && orderItems) {
              order.order_items = orderItems;
              console.log(`✅ تم جلب ${orderItems.length} عنصر للطل�� ${order.id}`);
            } else {
              console.error(`��� فشل جلب order_items للطلب ${order.id}:`, itemsError);
            }
          }
        }
      }

      console.log('✅ تم جلب الطلبات بنجاح:', {
        storeId,
        totalOrders: data?.length || 0,
        ordersByStatus: {
          assigned: data?.filter(o => o.order_status === 'assigned').length || 0,
          delivered: data?.filter(o => o.order_status === 'delivered').length || 0,
          returned: data?.filter(o => o.order_status === 'returned').length || 0
        },
        sampleOrderItems: data?.[0]?.order_items || 'no order_items',
        sampleOrder: data?.[0] ? {
          id: data[0].id,
          order_code: data[0].order_code,
          total_amount: data[0].total_amount,
          order_items_count: data[0].order_items?.length || 0,
          items_count: data[0].items ? (Array.isArray(data[0].items) ? data[0].items.length : 'not array') : 'no items'
        } : 'no orders'
      });

      // تتبع الطلبات بدون أ��ماء عملاء صالحة
      const ordersWithoutValidCustomerNames = data?.filter(o =>
        !o.customer_name || o.customer_name.trim() === ''
      );

      if (ordersWithoutValidCustomerNames && ordersWithoutValidCustomerNames.length > 0) {
        console.log(`🔧 إصلاح ${ordersWithoutValidCustomerNames.length} طلب بدون أسماء عملاء`);

        // محاولة إ��لاح البيانات بإضافة أسماء تجريبية
        for (const order of ordersWithoutValidCustomerNames) {
          try {
            const tempName = `${t('customer')} ${order.order_code || order.id.slice(0, 8)}`;

            const { error: updateError } = await supabase
              .from('orders')
              .update({ customer_name: tempName })
              .eq('id', order.id);

            if (updateError) {
              console.error('❌ فشل في تحديث اسم العميل:', updateError);
            }
          } catch (error) {
            console.error('حدث خطأ في إص��اح اسم العميل:', error);
          }
        }
      }

      // تتبع إضا��ي للطلب��ت ��لتي لا تحتوي على أسماء منتجات صالحة
      const ordersWithoutValidProducts = data?.filter(o => {
        const hasValidOrderItems = o.order_items && o.order_items.some(item =>
          item.product_name && item.product_name.trim() !== '' && item.product_name !== 'م��تج غير ��ح��د'
        );
        const hasValidItems = Array.isArray(o.items) && o.items.some(item =>
          item.name && item.name.trim() !== '' && item.name !== 'منتج غير محدد'
        );
        return !hasValidOrderItems && !hasValidItems;
      });

      if (ordersWithoutValidProducts && ordersWithoutValidProducts.length > 0) {
        console.warn('⚠️ Orders without valid product names:', ordersWithoutValidProducts);
      }

      // تحويل البيانات إلى الشكل المطلوب

      // Transform the data to match the expected format
      const transformedOrders: OrderWithProduct[] =
        data?.map((order) => {
          // تشخيص بيانات كل طلب
          diagnoseOrderData(order);

          return {
          order_id: order.id,
          customer_name: (() => {
            const name = order.customer_name?.trim();
            if (name && name !== '') {
              return name;
            }
            // إذا ��م يك�� هناك اسم، استخدم اسم تجريبي مبني على order_code أو id
            const orderRef = order.order_code || order.id.slice(0, 8);
            return `${t('customer')} ${orderRef}`;
          })(),
          customer_phone: order.customer_phone || "",
          customer_address: order.customer_address || "",
          customer_city: order.customer_city || "",
          product_name: (() => {
            // استخدام ن��س منطق لوحة المدير: order_items أو��اً، ثم items ك��حتياط
            if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
              const productNames = order.order_items.map((item) => getProductNameWithPriority(item))
                .filter(name => name && name.trim() !== '' && name !== 'منتج غير محدد');

              if (productNames.length > 0) {
                return productNames.join(', ');
              }
            }

            // اح��ياطي: استخدام items إذا لم تنجح order_items
            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
              const productNames = order.items.map((item) => getProductNameWithPriority(item))
                .filter(name => name && name.trim() !== '' && name !== 'منتج غير محدد');

              if (productNames.length > 0) {
                return productNames.join(', ');
              }
            }

            return `منتج طلب ${order.order_code || order.id.slice(0, 8)}`;
          })(),
          product_price:
            order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0
              ? order.order_items[0]?.price || 0
              : order.items && Array.isArray(order.items) && order.items.length > 0
              ? order.items[0]?.price || 0
              : 0,
          assigned_store_name: order.stores?.name || "غير معي��",
          created_at: order.created_at,
          order_code: order.order_code || "",
          order_status: order.order_status || order.status || "pending",
          assigned_store_id: order.assigned_store_id || "",
          total_amount: order.total_amount || 0,
          subtotal: order.subtotal || 0,
          customer_notes: order.customer_notes || "",
          order_details: order.order_details || "",
          store_response_status: order.store_response_status,
          store_response_at: order.store_response_at,
          order_items: order.order_items || [],
          items:
            // أولوية مطل��ة لـ order_items من قاعدة البيانات
            order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0
              ? order.order_items.map((item: any) => {
                  console.log('🔧 معالجة order_item من قاعدة البيانات:', {
                    id: item.id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price,
                    discounted_price: item.discounted_price,
                    product_id: item.product_id,
                    products_name: item.products?.name
                  });

                  return {
                    id: item.id,
                    name: getProductNameWithPriority(item),
                    product_name: getProductNameWithPriority(item),
                    price: item.price || 0,
                    quantity: item.quantity || 1,
                    discounted_price: item.discounted_price || 0,
                    product_id: item.product_id || 0,
                    products: item.products || null,
                    main_store_name: item.main_store_name || storeInfo?.name || 'ا��متجر',
                  };
                })
              // احتياطي: استخدام items JSON إذا لم تكن order_items متوفرة
              : order.items && Array.isArray(order.items) && order.items.length > 0
              ? order.items.map((item: any, index: number) => {
                  console.log(`⚠️ است��دام items JSON احتياطي للعنصر ${index}:`, item);
                  return {
                    id: `json-item-${index}`,
                    name: getProductNameWithPriority(item),
                    product_name: getProductNameWithPriority(item),
                    price: item.price || 0,
                    quantity: item.quantity || 1,
                    product_id: item.product_id || 0,
                  };
                })
              : [],
          };
        }) || [];

      setOrders(transformedOrders);
    } catch (error) {
      console.error('❌ خطأ في تحميل الطلبات:', {
        error,
        message: error?.message || error,
        stack: error?.stack,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        storeId,
        timestamp: new Date().toISOString()
      });

      const formattedError = handleError(
        'تحمي�� الطلبات',
        error,
        toast,
        { storeId }
      );
      setError(formattedError.message);
      setOrders([]);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    // البحث ع�� ا��طلب الحالي للتحقق م�� حالته
    const currentOrder = orders.find(order => order.order_id === orderId);
    if (!currentOrder) {
      toast({
        title: "خطأ",
        description: "لم يتم ��لعثور على الطلب",
        variant: "destructive",
      });
      return;
    }

    // منع تغيير حالة الطلب إذا كان "مسلمة" أو "مرتجعة"
    if (currentOrder.order_status === 'delivered') {
      toast({
        title: "غير مسموح",
        description: "ل�� يمكن تغيير حالة الطلب بعد تسليمه",
        variant: "destructive",
      });
      return;
    }

    if (currentOrder.order_status === 'returned') {
      toast({
        title: "غير مسموح",
        description: "لا يمكن تغي��ر ��الة الطلب المرتجع",
        variant: "destructive",
      });
      return;
    }

    // إذا كان المستخدم يريد تحويل الطلب إل�� "مرتجعة"، اط��ب سبب الإرجاع
    if (newStatus === 'returned') {
      setPendingReturnOrder({
        id: orderId,
        code: currentOrder.order_code || orderId
      });
      setShowReturnDialog(true);
      return;
    }

    // ��لتحديث العا��ي للحالات الأخرى
    await updateOrderStatus(orderId, newStatus);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, returnReason?: string) => {
    try {
      console.log('🔄 بدء تحديث حالة الطلب:', {
        orderId,
        newStatus,
        returnReason,
        storeId: storeInfo?.id,
        timestamp: new Date().toISOString()
      });

      const updateData: any = {
        order_status: newStatus,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // إضاف�� سبب الإرجاع في order_details إ��ا كان متوفراً
      if (returnReason && newStatus === 'returned') {
        updateData.order_details = `Return reason: ${returnReason}`;
        console.log('📝 إضافة سبب الإرجاع:', { returnReason, order_details: updateData.order_details });
      }

      console.log('📤 إرسال التحديث إلى قاعدة البيانات:', updateData);

      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select();

      if (error) {
        console.error('�� خطأ ف�� تحديث ق��عدة البيانات:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          orderId,
          updateData
        });
        throw error;
      }

      console.log('✅ تم تحديث الطلب بنجاح:', { data, orderId, newStatus });

      const statusMessages = {
        delivered: "تم تسل��م الطلب بنجاح",
        returned: "تم إرجاع الطلب بنجاح",
        assigned: "تم تحديث حالة الطلب"
      };

      toast({
        title: "تم ا��تحديث",
        description: statusMessages[newStatus as keyof typeof statusMessages] || "تم تحديث حالة الطلب بنجاح",
      });

      fetchOrders(storeInfo!.id, false);
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة الطلب:', {
        error,
        message: error?.message || error,
        stack: error?.stack,
        orderId,
        newStatus,
        returnReason,
        storeId: storeInfo?.id,
        timestamp: new Date().toISOString()
      });

      handleError(
        'تحديث حالة الطلب',
        error,
        toast,
        { orderId, newStatus, returnReason }
      );
    }
  };

  const handleReturnConfirm = async (reason: string) => {
    if (pendingReturnOrder) {
      console.log('🔄 تأكيد إرجاع الطلب:', {
        orderId: pendingReturnOrder.id,
        orderCode: pendingReturnOrder.code,
        reason,
        timestamp: new Date().toISOString()
      });

      try {
        await updateOrderStatus(pendingReturnOrder.id, 'returned', reason);
        setPendingReturnOrder(null);
        setShowReturnDialog(false);
        console.log('✅ تم إرجاع ��لطلب ب��جاح');
      } catch (error) {
        console.error('❌ خطأ في إرجاع الطلب:', error instanceof Error ? error.message : error);
        // لا نحتاج لعرض toast هنا لأن updateOrderStatus سيت��لى ذلك
      }
    }
  };

  const handleReturnCancel = () => {
    setPendingReturnOrder(null);
    setShowReturnDialog(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("storeAuth");
    navigate("/store-login-space9003");
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderDetails(true);
  };

  const handleCloseOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrderId(null);
  };

  const handleOrderUpdated = () => {
    if (storeInfo?.id) {
      fetchOrders(storeInfo.id, false);
    }
  };

  const handleRefreshOrders = () => {
    if (storeInfo?.id) {
      fetchOrders(storeInfo.id, false);
    }
  };

  // معالج استجاب�� المتجر بال��وافقة (المن��ج متوفر)
  const handleStoreAvailableResponse = async (orderId: string) => {
    try {
      console.log('🟢 تأكيد توفر المنتج - تحديث البيانات:', { orderId, storeId: storeInfo?.id });

      // تحد��ث قا��مة ا��طلبات لإظهار التغيير
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }

    } catch (error) {
      console.error('�� خطأ في callback توفر ا��منتج:', error instanceof Error ? error.message : error);
    }
  };

  // معالج استجاب�� المتجر بالرفض (المنتج غير متوفر)
  const handleStoreUnavailableResponse = async (orderId: string) => {
    try {
      console.log('🔴 رفض الطلب - تحديث البيانات:', { orderId, storeId: storeInfo?.id });

      // تحديث قائم�� ا��طلبات لإظهار ا��تغيي��
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }

      // إغلاق Dialog إذا كا�� مفتوحاً
      setShowOrderDetails(false);

    } catch (error) {
      console.error('❌ ��طأ في callback رفض الطلب:', error instanceof Error ? error.message : error);
    }
  };

  // معالج تأكيد التسليم
  const handleDeliveryConfirm = async (orderId: string) => {
    try {
      console.log('🚚 ت��كيد جاهزية الطلب للتسليم:', { orderId, storeId: storeInfo?.id });

      setCustomerDetailsOrderId(orderId);
      setShowCustomerDetails(true);
      setShowOrderDetails(false); // إ����ل��ق dialog تفاصيل الط��ب

      toast({
        title: "��اهز للتسليم",
        description: "تم تأكيد جاهزية الطلب لل��سلي��. تفاصيل العميل متا��ة الآن.",
      });

    } catch (error) {
      console.error('❌ خ��أ في تأكيد التسل��م:', error instanceof Error ? error.message : error);
      handleError('تأكيد التسليم', error, toast, { orderId });
    }
  };

  // معالج إكمال التسليم
  const handleDeliveryComplete = async (orderId: string) => {
    try {
      console.log('✅ إك��ال تسليم ��لطلب:', { orderId, storeId: storeInfo?.id });

      setShowCustomerDetails(false);
      setCustomerDetailsOrderId(null);

      // تحديث قائمة الطلب��ت
      if (storeInfo?.id) {
        fetchOrders(storeInfo.id, false);
      }

      toast({
        title: "تم التسليم ب��جاح ✅",
        description: "تم تأكيد تسليم الطلب لل��ميل بنجاح",
      });

    } catch (error) {
      console.error('❌ خطأ في إكمال التسليم:', error instanceof Error ? error.message : error);
      handleError('إكمال التس��يم', error, toast, { orderId });
    }
  };

  // معالج إرجاع الطلب
  const handleReturnOrder = async (orderId: string, returnReason: string) => {
    try {
      console.log('🔄 إرجاع الط��ب:', { orderId, storeId: storeInfo?.id, returnReason });

      setShowCustomerDetails(false);
      setCustomerDetailsOrderId(null);
      setShowOrderDetails(false);

      // تحديث قائمة الطلبات
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }

      toast({
        title: "تم إرجاع الطلب 🔄",
        description: `تم إرجاع الطلب بنجاح - السبب: ${returnReason}`,
        variant: "destructive",
      });

    } catch (error) {
      console.error('❌ خطأ في إرجاع الطلب:', error instanceof Error ? error.message : error);
      handleError('إرجاع الطلب', error, toast, { orderId, returnReason });
    }
  };

  // التحقق من كون الطلب مقسماً (استخدام Hook الجديد)
  const isDividedOrder = (order: OrderWithProduct) => {
    return checkIsDividedOrder(order.order_details);
  };

  // استخراج معرف الطلب الأصلي (استخدام Hook الجديد)
  const getOriginalOrderId = (order: OrderWithProduct) => {
    return extractOriginalOrderId(order.order_details);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: {
        label: "معلقة",
        message: "⏳ في الانتظار: لم يتم تعيين هذا الطلب لأي متجر بعد.",
        variant: "secondary" as const,
        icon: Clock,
      },
      assigned: {
        label: t('assigned'),
        message: `�� ${t('order')} ${t('assigned')} إلى المتجر، جاري الم��الجة.`,
        variant: "default" as const,
        icon: Package,
      },
      delivered: {
        label: t('delivered'),
        message: `✅ تم ت��ليم ${t('order')} بنجاح.`,
        variant: "default" as const,
        icon: CheckCircle,
      },
      completed: {
        label: t('delivered'),
        message: `✅ ��م تسليم ${t('order')} بنجا��.`,
        variant: "default" as const,
        icon: CheckCircle,
      },
      returned: {
        label: t('returned'),
        message: `🔄 تم إرجاع ${t('order')}.`,
        variant: "destructive" as const,
        icon: XCircle,
      },
      customer_rejected: {
        label: "رفض الزبون",
        message: "🚫 تم رفض الطلب من قبل الزبون.",
        variant: "destructive" as const,
        icon: UserX,
      },
    };

    return (
      statusMap[status as keyof typeof statusMap] || {
        label: status,
        message: `⚠️ حالة غير معر��فة: ${status}`,
        variant: "secondary" as const,
        icon: Package,
      }
    );
  };

  const getStatusStats = () => {
    const assignedOrders = orders.filter((order) => order.order_status === "assigned");
    const returnedOrders = orders.filter((order) => order.order_status === "returned");

    // Debug logging للطلبات المرتجعة
    console.log('🔍 StoreDashboard - getStatusStats:', {
      totalOrders: orders.length,
      returnedCount: returnedOrders.length,
      returnedOrders: returnedOrders.map(o => ({
        id: o.order_id,
        status: o.order_status,
        code: o.order_code
      })),
      allOrderStatuses: orders.map(o => o.order_status)
    });

    const stats = {
      total: orders.length,
      assigned: assignedOrders.length,
      delivered: orders.filter((order) => order.order_status === "delivered")
        .length,
      returned: returnedOrders.length,
      customer_rejected: orders.filter((order) => order.order_status === "customer_rejected")
        .length,
    };

    return stats;
  };

  const getOrdersByStatus = (status: string) => {
    const filteredOrders = orders.filter((order) => order.order_status === status);

    // Debug logging للطلبات حسب الحالة
    if (status === 'returned') {
      console.log('🔍 StoreDashboard - getOrdersByStatus (returned):', {
        status,
        totalOrders: orders.length,
        filteredCount: filteredOrders.length,
        filteredOrders: filteredOrders.map(o => ({
          id: o.order_id,
          status: o.order_status,
          code: o.order_code
        }))
      });
    }

    return filteredOrders;
  };

  // دالة محسّنة لعرض اسم المنتج مع إصلاح الأسماء ا��فارغة أو الم��لدة تلقائياً
  // (نفس ��نطق AdminDashboard)
  function getProductName(item: any) {
    return getProductNameWithPriority(item);
  }

  const renderOrderCard = (order: OrderWithProduct) => {
    const statusInfo = getStatusBadge(order.order_status || "assigned");
    const StatusIcon = statusInfo.icon;

    // Get product information
    const getProductInfo = () => {
      // أولاً: ��ستخدام order_items إذا كانت موجودة
      if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
        return order.order_items.map(item => ({
          name: getProductNameWithPriority(item),
          quantity: item.quantity || 1,
          price: item.price || 0
        }));
      }
      // ثاني��ً: استخدام items كبديل
      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
        return order.items.map(item => ({
          name: getProductNameWithPriority(item),
          quantity: item.quantity || 1,
          price: item.price || 0
        }));
      }
      // ثالث���ً: إذا كان product_name يحتوي على ��نتجا�� متعددة مفصولة بفاصلة
      // لا نقسم السعر، بل نعرض كمنتج واح�� مدمج
      if (order.product_name && order.product_name.includes(',')) {
        const productNames = order.product_name.split(',').map(name => name.trim()).filter(name => name.length > 0);
        return productNames.map(productName => {
          // أسعار تقديرية بناءً عل�� نوع المنتج
          let estimatedPrice = 0;
          const lowerName = productName.toLowerCase();

          if (lowerName.includes('ryzen') || lowerName.includes('معالج')) {
            estimatedPrice = 300000; // معالجات
          } else if (lowerName.includes('logitech') || lowerName.includes('keyboard') || lowerName.includes('لوحة')) {
            estimatedPrice = 120000; // لوحات المفاتيح
          } else if (lowerName.includes('شاشة') || lowerName.includes('monitor') || lowerName.includes('بوصة')) {
            estimatedPrice = 250000; // شاشات
          } else if (lowerName.includes('mouse') || lowerName.includes('فأرة')) {
            estimatedPrice = 50000; // الفأرة
          } else {
            // توزيع متساوي للمنتجات غير ال��عروفة
            estimatedPrice = Math.floor((order.total_amount || 0) / productNames.length);
          }

          return {
            name: productName,
            quantity: 1,
            price: estimatedPrice
          };
        });
      }

      // أخيراً: منتج واحد اف��را��ي
      const orderRef = order.order_code || order.order_id.slice(0, 8);
      return [{
        name: order.product_name || `منتج طلب ${orderRef}`,
        quantity: 1,
        price: order.total_amount || 0
      }];
    };

    const products = getProductInfo();

    return (
      <div
        key={order.order_id}
        className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex flex-col space-y-3">
          {/* Header with status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <StatusIcon className="w-5 h-5 text-muted-foreground" />
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-blue-800">
                  {(() => {
                    const name = order.customer_name?.trim();
                    if (name && name !== '') {
                      return name;
                    }
                    // استخدام كود ا��طلب لإنشاء اسم مؤقت
                    const orderRef = order.order_code || order.order_id.slice(0, 8);
                    return `${t('customer')} ${orderRef}`;
                  })()}
                </h3>
                <p className="text-sm text-gray-600">طلب #{order.order_code || order.order_id.slice(0, 8)}</p>
              </div>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewOrder(order.order_id)}
                className="flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                {t('details')}
              </Button>
              {(order.order_status === 'delivered' || order.order_status === 'returned') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCustomerDetailsOrderId(order.order_id);
                    setShowCustomerDetails(true);
                  }}
                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <User className="w-4 h-4" />
                  {t('customer.details.delivery')}
                </Button>
              )}
              <Select
                value={order.order_status || "assigned"}
                onValueChange={(newStatus) =>
                  handleStatusUpdate(order.order_id, newStatus)
                }
                disabled={order.order_status === 'delivered' || order.order_status === 'returned' || order.order_status === 'customer_rejected'}
              >
                <SelectTrigger className={`w-40 ${
                  order.order_status === 'delivered' || order.order_status === 'returned' || order.order_status === 'customer_rejected'
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">{t('assigned')}</SelectItem>
                  <DeliveryControlForDividedOrder
                    orderDetails={order.order_details}
                    storeResponseStatus={order.store_response_status}
                  >
                    <SelectItem
                      value="delivered"
                      disabled={order.store_response_status !== 'available'}
                    >
                      {t('delivered')}
                    </SelectItem>
                  </DeliveryControlForDividedOrder>
                </SelectContent>
              </Select>
              {(order.order_status === 'delivered' || order.order_status === 'returned' || order.order_status === 'customer_rejected') && (
                <span className="text-xs text-muted-foreground">
                  ({order.order_status === 'customer_rejected' ? 'مرفوض من الزبون' : t('cannot.change')})
                </span>
              )}
              {order.order_status !== 'delivered' &&
               order.order_status !== 'returned' &&
               order.order_status !== 'customer_rejected' && (
                <DeliveryStatusMessage
                  orderDetails={order.order_details}
                  storeResponseStatus={order.store_response_status}
                />
              )}
            </div>
          </div>

          {/* Customer Rejection Information */}
          {order.order_status === 'customer_rejected' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-800">تم رفض الطلب من قبل الزبون</h4>
              </div>
              <div className="text-sm text-purple-700">
                <p>هذا الطلب تم رفضه من قبل الزبون ولا يمكن معالجته.</p>
                {order.store_response_at && (
                  <p className="mt-1 text-xs text-purple-600">
                    تاريخ الرفض: {new Date(order.store_response_at).toLocaleDateString('ar-IQ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Product Details Section - Using OrderItems component like admin dashboard */}
          <div className="space-y-3">
            {(() => {
              console.log('🔍 StoreDashboard renderOrderCard - تش��يص بيان��ت الطلب:', {
                order_id: order.order_id,
                order_code: order.order_code,
                total_amount: order.total_amount,
                has_order_items: !!order.order_items,
                order_items_count: order.order_items?.length || 0,
                order_items_details: order.order_items?.map(item => ({
                  id: item.id,
                  product_name: item.product_name,
                  name: item.name,
                  price: item.price,
                  discounted_price: item.discounted_price,
                  quantity: item.quantity,
                  product_id: item.product_id,
                  products_name: item.products?.name
                })),
                has_items_json: !!order.items,
                items_json_count: Array.isArray(order.items) ? order.items.length : 'not_array',
                items_json_sample: Array.isArray(order.items) ? order.items[0] : order.items,
                product_name: order.product_name
              });

              // است��دام نفس منطق AdminDashboard لع��ض المنتجات
              let itemsToShow = [];

              // أولاً: محاولة استخدام order_items إذا كانت موجودة ومعالجة بشكل صحيح
              if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
                itemsToShow = order.order_items.map((item, index) => {
                  // استخدام السعر الصحيح: إذا كان هناك خصم، استخدم السعر المخفض، وإلا است��دم السعر الأصلي
                  let finalPrice = item.price || 0;
                  let discountPrice = item.discounted_price || 0;

                  console.log(`🔍 Processing item ${index}:`, {
                    product_name: getProductNameWithPriority(item),
                    original_price: item.price,
                    discounted_price: item.discounted_price,
                    quantity: item.quantity
                  });

                  return {
                    id: item.id || `order-item-${index}`,
                    product_name: getProductNameWithPriority(item),
                    name: getProductNameWithPriority(item),
                    quantity: item.quantity || 1,
                    price: finalPrice,
                    discounted_price: discountPrice,
                    product_id: item.product_id
                  };
                });

                console.log('✅ Using order_items:', itemsToShow);
              }
              // ث��نياً: استخدام items كبديل
              else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                itemsToShow = order.items.map((item, index) => {
                  console.log(`🔍 Processing legacy item ${index}:`, {
                    product_name: getProductNameWithPriority(item),
                    price: item.price,
                    quantity: item.quantity
                  });

                  return {
                    id: item.product_id || `item-${index}`,
                    product_name: getProductNameWithPriority(item),
                    name: getProductNameWithPriority(item),
                    quantity: item.quantity || 1,
                    price: item.price || 0,
                    discounted_price: 0,
                    product_id: item.product_id
                  };
                });

                console.log('✅ Using items:', itemsToShow);
              }
              // ثالثاً: إذا كان product_name يحتوي على منتجات متعددة مفصولة بفاصلة
              else if (order.product_name && order.product_name.includes(',')) {
                const productNames = order.product_name.split(',').map(name => name.trim()).filter(name => name.length > 0);

                // محاولة الحصول على أسعار تقديرية لكل منتج بناءً على نوع المنتج
                itemsToShow = productNames.map((productName, index) => {
                  // أسعار تقديرية بناءً على نوع المنتج
                  let estimatedPrice = 0;
                  const lowerName = productName.toLowerCase();

                  if (lowerName.includes('ryzen') || lowerName.includes('معالج')) {
                    estimatedPrice = 300000; // معالجات
                  } else if (lowerName.includes('logitech') || lowerName.includes('keyboard') || lowerName.includes('لوحة')) {
                    estimatedPrice = 120000; // لوحات ا��مفاتيح
                  } else if (lowerName.includes('��اشة') || lowerName.includes('monitor') || lowerName.includes('بوص��')) {
                    estimatedPrice = 250000; // شاشات
                  } else if (lowerName.includes('mouse') || lowerName.includes('فأرة')) {
                    estimatedPrice = 50000; // الفأرة
                  } else {
                    // توزيع متساوي للمنتجات غير المعروفة
                    estimatedPrice = Math.floor((order.total_amount || 0) / productNames.length);
                  }

                  return {
                    id: `split-product-${index}`,
                    product_name: productName,
                    name: productName,
                    quantity: 1,
                    price: estimatedPrice,
                    discounted_price: 0
                  };
                });

                console.log('✅ Split product_name with estimated prices:', itemsToShow);
              }
              // أخيراً: منتج واحد افتراضي
              else {
                itemsToShow = [{
                  id: `default-${order.order_id}`,
                  product_name: order.product_name || `منتج طلب ${order.order_code || order.order_id.slice(0, 8)}`,
                  name: order.product_name || `منتج طلب ${order.order_code || order.order_id.slice(0, 8)}`,
                  quantity: 1,
                  price: order.total_amount || 0,
                  discounted_price: 0
                }];

                console.log('✅ Using fallback product:', itemsToShow);
              }

              return itemsToShow && itemsToShow.length > 0 && (
                <OrderItems
                  items={itemsToShow}
                  compact={true}
                  hidePrices={false}
                  assignedStoreName={order.assigned_store_name || storeInfo?.name}
                />
              );
            })()}
          </div>

          {/* عرض حالة الاكتمال للطلبات المقسمة فقط */}
          {isDividedOrder(order) && getOriginalOrderId(order) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-blue-800 flex items-center gap-2">
                <Package className="w-4 h-4" />
                حالة اكتمال الطلب المقسم
              </h4>
              <DivisionCompletionStatus
                originalOrderId={getOriginalOrderId(order)!}
                autoRefresh={true}
                showDetails={false}
              />
              <div className="mt-2 text-xs text-blue-700">
                💡 يمكن تسليم الطلب فقط عندما تصبح الحالة "مكت��لة" (جميع المتاجر أكدت توفر منتجاتها)
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-lg">
          <Loader2 className="w-6 h-6 animate-spin" />
          جاري الت��ميل...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-destructive mb-4">{error}</div>
          <Button onClick={() => fetchOrders(storeInfo?.id || "")}>
            الم��اولة مرة أخرى
          </Button>
        </div>
      </div>
    );
  }

  const stats = getStatusStats();

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6"
      dir={dir}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {t('store.name')}: {storeInfo?.name}
            </h1>
            <p className="text-muted-foreground">{t('store.dashboard')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>

            {/* Store Notification Bell */}
            {storeInfo?.id && (
              <StoreNotificationBell
                storeId={storeInfo.id}
                refreshInterval={30}
              />
            )}

            <Button
              onClick={handleRefreshOrders}
              variant="outline"
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  {t('loading')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {t('store.refresh')}
                </>
              )}
            </Button>
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              {t('store.logout')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-muted-foreground">{t('store.orders.total')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.assigned}</p>
                  <p className="text-muted-foreground">{t('store.orders.assigned')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                  <p className="text-muted-foreground">{t('store.orders.delivered')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.returned}</p>
                  <p className="text-muted-foreground">{t('store.orders.returned')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <UserX className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.customer_rejected}</p>
                  <p className="text-muted-foreground">
                    <ArabicText>رفض الزبون</ArabicText>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>{t('store.orders')}</CardTitle>
            <CardDescription>
              {t('store.orders.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="assigned" className="w-full">
              <TabsList className="grid w-full grid-cols-4 md:grid-cols-4 lg:grid-cols-4">
                <TabsTrigger value="assigned">
                  📦 {t('store.tab.assigned')} ({stats.assigned})
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  ✅ {t('delivered')} ({stats.delivered})
                </TabsTrigger>
                <TabsTrigger value="returned">
                  🔁 مرتجع ({stats.returned})
                </TabsTrigger>
                <TabsTrigger value="customer_rejected">
                  🚫 <ArabicText>رفض الزبون</ArabicText> ({stats.customer_rejected})
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="assigned"
                className="space-y-4 max-h-96 overflow-y-auto"
              >
                {getOrdersByStatus("assigned").map((order) =>
                  renderOrderCard(order),
                )}
                {getOrdersByStatus("assigned").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('no.orders.assigned')}
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="delivered"
                className="space-y-4 max-h-96 overflow-y-auto"
              >
                {getOrdersByStatus("delivered").map((order) =>
                  renderOrderCard(order),
                )}
                {getOrdersByStatus("delivered").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('no.orders.delivered')}
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="returned"
                className="space-y-4 max-h-96 overflow-y-auto"
              >
                {getOrdersByStatus("returned").map((order) =>
                  renderOrderCard(order),
                )}
                {getOrdersByStatus("returned").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا ��وجد طلبات مرتجعة
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="customer_rejected"
                className="space-y-4 max-h-96 overflow-y-auto"
              >
                {getOrdersByStatus("customer_rejected").map((order) =>
                  renderOrderCard(order),
                )}
                {getOrdersByStatus("customer_rejected").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArabicText>لا توجد طلبات مرفوضة من ��لزبون</ArabicText>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                if (!selectedOrderId) return t('store.order.details');
                const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
                if (selectedOrder?.order_status === "assigned") {
                  if (!selectedOrder?.store_response_status) {
                    return t('store.dialog.inventory.status');
                  } else if (selectedOrder?.store_response_status === "available") {
                    return t('store.dialog.available.customer');
                  }
                }
                return t('store.order.details');
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedOrderId && (() => {
            const selectedOrder = orders.find(o => o.order_id === selectedOrderId);

            console.log('🔍 Dialog selectedOrder:', {
              selectedOrderId,
              selectedOrder: selectedOrder ? {
                id: selectedOrder.order_id,
                order_status: selectedOrder.order_status,
                store_response_status: selectedOrder.store_response_status,
                order_items: selectedOrder.order_items?.length || 0,
                order_items_data: selectedOrder.order_items,
                items: selectedOrder.items?.length || 0,
                items_data: selectedOrder.items
              } : null
            });

            // إذا كان الطلب معين��� عرض مكون التحقق من ال��خزون
            if (selectedOrder?.order_status === "assigned") {
              return (
                <StoreProductAvailabilityCheck
                  storeId={storeInfo?.id || ""}
                  order={{
                    id: selectedOrder.order_id,
                    order_code: selectedOrder.order_code,
                    customer_name: selectedOrder.customer_name,
                    customer_phone: selectedOrder.customer_phone,
                    customer_address: selectedOrder.customer_address,
                    customer_notes: selectedOrder.customer_notes,
                    total_amount: selectedOrder.total_amount,
                    subtotal: selectedOrder.subtotal,

                    created_at: selectedOrder.created_at,
                    order_status: selectedOrder.order_status,
                    store_response_status: selectedOrder.store_response_status,
                    order_items: (() => {
                      console.log('🔧 معالجة order_items للطلب:', selectedOrder.order_id, {
                        order_items_raw: selectedOrder.order_items,
                        items_raw: selectedOrder.items,
                        order_items_count: selectedOrder.order_items?.length || 0,
                        items_count: selectedOrder.items?.length || 0
                      });

                      // تشخيص مفصل لكل منتج في order_items
                      if (selectedOrder.order_items) {
                        console.log('📋 تحليل مفصل لـ order_items:');
                        selectedOrder.order_items.forEach((item, index) => {
                          console.log(`  🔍 منتج ${index + 1}:`, {
                            id: item.id,
                            product_name: item.product_name,
                            name: item.name,
                            products: item.products,
                            products_name: item.products?.name,
                            quantity: item.quantity,
                            price: item.price
                          });
                        });
                      }

                      // التأكد من وجود أ��ماء منتجات صحيحة في order_items
                      if (selectedOrder.order_items && Array.isArray(selectedOrder.order_items) && selectedOrder.order_items.length > 0) {
                        const processedItems = selectedOrder.order_items.map((item, index) => {
                          // استخدام دالة getProductNameWithPriority ��لموحدة (نفس منطق AdminDashboard)
                          const productName = getProductNameWithPriority(item);

                          const processedItem = {
                            ...item,
                            product_name: productName,
                            name: productName // إضافة name كـ backup
                          };

                          console.log(`  ✅ معالج منتج ${index + 1}:`, {
                            original: {
                              product_name: item.product_name,
                              name: item.name,
                              products_name: item.products?.name
                            },
                            final: {
                              product_name: processedItem.product_name,
                              name: processedItem.name
                            }
                          });

                          return processedItem;
                        });

                        console.log('✅ تم معالجة order_items:', processedItems);
                        return processedItems;
                      }

                      // إنشاء منتج افتراضي من بيانات الطلب إذا لم تكن هناك order_items
                      if (selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0) {
                        console.log('🔄 استخدام items كبديل ��ن order_items:', selectedOrder.items);

                        const processedItems = selectedOrder.items.map((item, index) => {
                          // استخ��ام دالة getProductNameWithPriority الموحدة
                          const productName = getProductNameWithPriority(item);

                          return {
                            id: `item-${index}`,
                            product_name: productName,
                            name: productName,
                            quantity: item.quantity || 1,
                            price: item.price || selectedOrder.total_amount || 205000,
                            discounted_price: item.price || selectedOrder.total_amount || 205000
                          };
                        });

                        console.log('✅ تم م��الجة items كبديل:', processedItems);
                        return processedItems;
                      }

                      // إنشاء منتج افتراضي واحد
                      console.log('⚠️ لا توجد order_items أو items صالحة، إنشاء م��تج افتراضي');

                      const orderRef = selectedOrder.order_code || selectedOrder.order_id.slice(0, 8);

                      // استخدام دالة getProductNameWithPriority للمنتج الافتراضي أيضاً
                      const productName = selectedOrder.product_name && selectedOrder.product_name.trim() !== '' && selectedOrder.product_name !== '��نتج غير محدد'
                        ? selectedOrder.product_name
                        : `منتج ال��لب ${orderRef}`;

                      const defaultItem = {
                        id: `default-${selectedOrder.order_id}`,
                        product_name: productName,
                        name: productName,
                        quantity: 1,
                        price: selectedOrder.total_amount || selectedOrder.subtotal || 205000,
                        discounted_price: selectedOrder.total_amount || selectedOrder.subtotal || 205000
                      };

                      console.log('✅ تم إنشاء منتج افتراضي:', defaultItem);
                      return [defaultItem];
                    })()
                  }}
                  onAvailableResponse={handleStoreAvailableResponse}
                  onUnavailableResponse={handleStoreUnavailableResponse}
                  onDeliveryConfirm={handleDeliveryConfirm}
                  onReturnOrder={handleReturnOrder}
                  onOrderUpdated={handleOrderUpdated}
                />
              );
            }

            // في باقي الحا��ات، عرض التفاصيل ��لعادية
            return (
              <OrderDetails
                orderId={selectedOrderId}
                stores={[]} // Store dashboard doesn't need store assignment functionality
                onOrderUpdated={handleOrderUpdated}
                storeId={storeInfo?.id} // تمرير storeId للـ x-store-id header
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      <ReturnReasonDialog
        isOpen={showReturnDialog}
        onClose={handleReturnCancel}
        onConfirm={handleReturnConfirm}
        orderCode={pendingReturnOrder?.code}
      />

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const selectedOrder = orders.find(o => o.order_id === customerDetailsOrderId);
                if (selectedOrder?.order_status === 'delivered') {
                  return 'تفاصيل الطلب المس��م';
                } else if (selectedOrder?.order_status === 'returned') {
                  return t('order.details.returned');
                } else {
                  return t('store.dialog.customer.delivery');
                }
              })()}
            </DialogTitle>
          </DialogHeader>
          {customerDetailsOrderId && (() => {
            const selectedOrder = orders.find(o => o.order_id === customerDetailsOrderId);
            if (selectedOrder) {
              // إذا كان الطلب "مسلمة" أو "مسترجعة"، اعرض معلومات العميل فقط
              if (selectedOrder.order_status === 'delivered' || selectedOrder.order_status === 'returned') {
                return (
                  <CustomerInfoDisplay
                    order={{
                      id: selectedOrder.order_id,
                      order_code: selectedOrder.order_code,
                      customer_name: selectedOrder.customer_name,
                      customer_phone: selectedOrder.customer_phone,
                      customer_address: selectedOrder.customer_address,
                      customer_city: selectedOrder.customer_city,
                      customer_notes: selectedOrder.customer_notes,
                      total_amount: selectedOrder.total_amount,
                      subtotal: selectedOrder.subtotal,
                      created_at: selectedOrder.created_at,
                      order_status: selectedOrder.order_status,
                      store_response_status: selectedOrder.store_response_status,
                      order_items: selectedOrder.order_items,
                      items: selectedOrder.items,
                      order_details: selectedOrder.order_details,
                      store_response_at: selectedOrder.store_response_at
                    }}
                    storeName={storeInfo?.name}
                  />
                );
              }

              // إذا كان الطلب جاهز ��لتسليم، اعرض صفحة التسليم
              const productName = (() => {
                if (selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0) {
                  const productNames = selectedOrder.items.map(item => item.name)
                    .filter(name => name && name.trim() !== '')
                    .join(', ');
                  if (productNames) return productNames;
                }
                const orderRef = selectedOrder.order_code || selectedOrder.order_id.slice(0, 8);
                return `منتج طلب ${orderRef}`;
              })();

              return (
                <CustomerDeliveryDetails
                  order={{
                    id: selectedOrder.order_id,
                    order_code: selectedOrder.order_code,
                    customer_name: selectedOrder.customer_name,
                    customer_phone: selectedOrder.customer_phone,
                    customer_address: selectedOrder.customer_address,
                    customer_notes: selectedOrder.customer_notes,
                    total_amount: selectedOrder.total_amount,
                    subtotal: selectedOrder.subtotal,
                    created_at: selectedOrder.created_at,
                    order_status: selectedOrder.order_status,
                    store_response_status: selectedOrder.store_response_status,
                    order_items: selectedOrder.order_items
                  }}
                  productName={productName}
                  onDeliveryComplete={handleDeliveryComplete}
                  storeName={storeInfo?.name}
                />
              );
            }
            return null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreDashboard;
