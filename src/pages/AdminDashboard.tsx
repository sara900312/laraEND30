import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedEdgeFunctions } from "@/hooks/useEnhancedEdgeFunctions";
import OrderDetails from "@/components/OrderDetails";
import {
  LogOut,
  Plus,
  Users,
  Package,
  Settings,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  RefreshCw,
  Target,
  UserX,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { ArabicText } from "@/components/ui/arabic-text";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OrderCard } from "@/components/orders/OrderCard";
import { orderNotificationService } from "@/services/orderNotificationService";
import { adminNotificationService } from "@/services/adminNotificationService";
import { AdminNotificationBell } from "@/components/ui/admin-notification-bell";
import { EnhancedOrderCard } from "@/components/orders/EnhancedOrderCard";
import { OrderStatusDashboard } from "@/components/orders/OrderStatusDashboard";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { realtimeService, subscribeToOrderChanges } from "@/services/realtimeService";
import { realtimeDebugger } from "@/utils/realtimeDebugger";
import { useRealtimeChannels } from "@/hooks/useRealtimeChannels";

import { AutoAssignButton } from "@/components/orders/AutoAssignButton";
import { EdgeFunctionStatus } from "@/components/debug/EdgeFunctionStatus";
import { EdgeFunctionFilter } from "@/components/admin/EdgeFunctionFilter";
import { RejectedOrdersPanel } from "@/components/admin/RejectedOrdersPanel";

import { Order } from "@/types/order";
import { OrderService } from "@/services/orderService";
import { formatCurrency, calculateFinalPrice } from "@/utils/currency";
import { deleteFakeOrders, checkForFakeOrders } from "@/utils/cleanupFakeOrders";
import {
  filterOrdersByStatus,
  calculateOrderStats,
  getOrderStatusLabel,
  isValidOrderStatus
} from "@/utils/orderFilters";
import { handleError, logError } from "@/utils/errorHandling";
import { StoreInventoryStatus } from "@/components/admin/StoreInventoryStatus";
import { StoreResponseNotification } from "@/components/admin/StoreResponseNotification";
import { RejectedOrdersManagement } from "@/components/admin/RejectedOrdersManagement";
import { OrderDivisionPanelUpdated } from "@/components/admin/OrderDivisionPanelUpdated";
import { extractStoreError, extractSupabaseError } from "@/utils/errorMessageExtractor";
import debugErrorExtraction from "@/utils/debugErrorExtraction";

// Environment variable for Edge Functions base URL
const EDGE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE || 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

type Order = Tables<"orders">;
type Store = Tables<"stores">;

type OrderWithProduct = {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  product_name: string;
  product_price: number;
  store_name: string;
  assigned_store_name: string;
  main_store_name: string;
  created_at: string;
  order_code: string;
  order_status: string;
  assigned_store_id: string;
  store_response_status?: string;
  store_response_at?: string;
  rejection_reason?: string;
  total_amount: number;
  order_details: string;
  customer_notes: string;
  return_reason?: string;
  returned_at?: string;
  items: {
    name?: string;
    price?: number;
    quantity?: number;
    product_id?: number;
  }[] | null;
  order_items?: {
    id: string;
    product_name: string;
    quantity: number;
    price: number;
    discounted_price?: number;
    availability_status?: string;
    product_id?: string;
    products?: {
      id: string;
      name: string;
    };
  }[] | null;
  stores?: {
    name: string;
  };
};

const AdminDashboard = () => {
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStorePassword, setNewStorePassword] = useState("");
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [isToggleLoading, setIsToggleLoading] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  // Enhanced Edge Functions integration
  const {
    assignOrder: enhancedAssignOrder,
    autoAssignOrders: enhancedAutoAssignOrders,
    isAssigningOrder: isEnhancedAssigning,
    isAutoAssigning: isEnhancedAutoAssigning,
    autoAssignResults,
    clearAutoAssignResults,
    setAutoAssignResults // تم إضافة setAutoAssignResults لحل مشكلة "is not defined"
  } = useEnhancedEdgeFunctions();
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, dir } = useLanguage();

  // 🔥 إعداد القنوات المباشرة للطلبات والإشعارات
  const { sendOrderUpdate, sendNotificationUpdate, isConnected } = useRealtimeChannels({
    onOrderUpdate: (payload) => {
      console.log('📦 تحديث طلب مباشر:', payload);

      // تحديث قائمة الطلبات محلياً حسب نوع التحديث
      if (payload.type === 'new_order') {
        // إعادة تحميل الطلبات للطلبات الجديدة
        fetchOrders();
        toast({
          title: "📦 طلب جديد!",
          description: `طلب جديد من ${payload.customer_name || 'عميل غير محدد'}`,
        });
      } else if (payload.type === 'assignment') {
        // تحديث فوري للتعيين
        setOrders(prev => prev.map(order =>
          order.order_id === payload.orderId
            ? {
                ...order,
                order_status: 'assigned',
                assigned_store_id: payload.storeId
              }
            : order
        ));
        toast({
          title: "🎯 تم تعيين طلب",
          description: `الطلب ${payload.order_code} ��م ��عيينه لمتجر`,
        });
      } else if (payload.type === 'store_response') {
        // تحديث رد المتجر
        setOrders(prev => prev.map(order =>
          order.order_id === payload.orderId
            ? {
                ...order,
                store_response_status: payload.data?.store_response_status,
                store_response_at: payload.data?.store_response_at,
                rejection_reason: payload.data?.rejection_reason
              }
            : order
        ));

        const statusText = {
          'available': '✅ متوفر',
          'unavailable': '❌ غير متوفر',
          'accepted': '✅ مقبول',
          'rejected': '❌ مرفوض'
        }[payload.data?.store_response_status] || payload.data?.store_response_status;

        toast({
          title: "🏪 رد من المتجر",
          description: `${payload.order_code}: ${statusText}`,
        });
      } else if (payload.type === 'status_change') {
        // تحديث حالة الطلب
        setOrders(prev => prev.map(order =>
          order.order_id === payload.orderId
            ? { ...order, order_status: payload.status }
            : order
        ));
        toast({
          title: "🔄 تحديث حالة الطلب",
          description: `${payload.order_code}: ${payload.status}`,
        });
      }
    },
    onNotificationUpdate: (payload) => {
      console.log('🔔 إشعار مباشر:', payload);

      // عرض الإشعارات للأدمن
      if (payload.recipient_type === 'admin') {
        toast({
          title: "🔔 إشعار جديد",
          description: payload.message,
        });
      }

      // يم��نك إضافة معالجة أخرى للإشعارات هنا
      // مثل تحديث عداد الإشعارات أو قائمة الإشعارات
    },
    enableLogging: true
  });

  // دالة تشخيص لمراجعة بيانا�� الطلبا�� - ��جب ��ن تكون قبل أي conditional returns
  React.useEffect(() => {
    console.log("🔍 تشخيص شامل للطلبات:");
    console.log("📊 ��جمالي الطلبات:", orders.length);

    if (orders.length > 0) {
      // تجميع الطلبات حسب الحالة
      const statusGroups = orders.reduce((acc, order) => {
        const status = order.order_status || 'غير محدد';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log("📋 تفصيل الحالات الفعلية:", statusGroups);

      // حساب الإحصائيات للمراجعة
      const stats = calculateOrderStats(orders);
      console.log("📊 الإحصائيا��� المحسوبة:", stats);

      // تحلي�� الطلبات المعل��ة ��التفص��ل
      const pendingOrders = orders.filter(o =>
        o.order_status === "pending" ||
        o.order_status === "قيد الانتظار" ||
        o.order_status === null ||
        o.order_status === undefined ||
        o.order_status === ""
      );

      console.log("🔍 تحليل الطلبات المعلقة:", {
        count: pendingOrders.length,
        details: pendingOrders.map(o => ({
          id: o.order_id,
          status: o.order_status,
          statusType: typeof o.order_status,
          customer: o.customer_name
        }))
      });

      // عرض عين�� من البيانات للمراجعة
      console.log("📋 عينة طلب كامل:", orders[0]);
    } else {
      console.log("⚠️ لا توجد ط��بات لعرضها");
    }
  }, [orders]); // تبسيط التبع��ات

  // حذف الطلبات المزيفة من قاعدة البيانات
  const handleDeleteFakeOrders = async () => {
    try {
      setIsLoading(true);

      // ال��حقق ��ن وج��د طلبات مزي��ة أولاً
      const checkResult = await checkForFakeOrders();

      if (!checkResult.found) {
        toast({
          title: "لا توجد طلبات ��زيفة",
          description: "ل�� يتم العثور على أي طلبات مزيفة لحذفها",
        });
        return;
      }

      console.log(`🗑️ سيتم حذف ${checkResult.count} طلب مزيف`);

      // ��ذف الطلبات الم��يفة
      const result = await deleteFakeOrders();

      if (result.success) {
        toast({
          title: "تم الحذف بنجاح",
          description: `تم حذف ${checkResult.count} طلب مزيف من قا��دة البيانات`,
        });

        // إعادة تحميل الطلبات
        await fetchOrders();
      } else {
        toast({
          title: "خطأ في الحذف",
          description: result.error || "فشل في حذف الطلبات المزيفة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ خطأ في حذف الطلبات المزيفة:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الطلبات المزيفة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("🟢 AdminDashboard useEffect started");
    console.log("🔵 Current URL:", window.location.href);
    console.log("🔍 Environment check:", {
      supabase: !!supabase,
      localStorage: !!localStorage,
      navigate: !!navigate
    });

    const adminAuth = localStorage.getItem("adminAuth");
    console.log("🔵 adminAuth from localStorage:", adminAuth);
    
    if (!adminAuth) {
      console.log("❌ No adminAuth found, redirecting to login");
      navigate("/admin-login");
      return;
    }

    console.log("✅ adminAuth found, proceeding with dashboard initialization");

    // Get current session and listen for changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("الجلسة الحالية Current session:", session);
      setUserSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🔵 Auth state changed:", event, session);
        setUserSession(session);
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem("adminAuth");
          navigate("/admin-login");
        }
      }
    );

    // بدء خدمة إشعارات الطلبيات
    orderNotificationService.startListening();
    adminNotificationService.startListening();
    console.log("🔔 Notification services started");

    // Load initial data
    console.log("🚀 Starting to load initial data...");

    // حل مؤقت: إذا لم تنتهي ��ملية التحميل في 10 ثوان��، اعتبرها منتهية
    const loadingTimeout = setTimeout(() => {
      console.warn("⚠️ Loading timeout reached, forcing isLoading to false");
      setIsLoading(false);
    }, 10000);

    Promise.all([
      fetchOrders().catch(e => console.error("❌ fetchOrders failed:", e)),
      fetchStores().catch(e => console.error("❌ fetchStores failed:", e)),
      fetchSettings().catch(e => console.error("❌ fetchSettings failed:", e))
    ]).finally(() => {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      console.log("✅ All initial data loading completed");
    });

    // إعداد نظام Realtime محسن مع تشخيص المشاكل
    console.log('🔄 Setting up enhanced Realtime with diagnostics...');

    // تشخيص النظام أولاً
    realtimeDebugger.runDiagnostics().then(diagnostics => {
      console.log('📊 Realtime Diagnostics:', diagnostics);

      if (!diagnostics.realtimeConnection) {
        toast({
          title: "⚠️ مشكلة في الاتصال المباشر",
          description: "سي��م تحديث البيانات يدوياً. تحقق من إعدادات Supabase Realtime.",
          variant: "destructive"
        });
      }
    });

    // إعداد اشتراك مباشر بدلاً من الخدمة المركزية (للتشخيص)
    const ordersChannel = supabase
      .channel('admin-orders-direct')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📥 [DIRECT] طلب جديد:', payload);
          const newOrder = payload.new as any;

          // إعادة تحميل البيانات لضمان التحديث
          fetchOrders();

          toast({
            title: "📦 طلب جديد وصل!",
            description: `من ${newOrder.customer_name || 'عميل غير محدد'}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🔄 [DIRECT] تحديث طلب:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          // تحديث فوري للبيان��ت
          setOrders(prevOrders => {
            const updatedOrders = prevOrders.map(order => {
              if (order.order_id === newRecord.id) {
                // دمج البيانات الجديدة مع الموجودة
                return {
                  ...order,
                  ...newRecord,
                  order_id: newRecord.id // تأكد من المعرف
                };
              }
              return order;
            });

            console.log('📝 تم تحديث الطلبات محلياً:', {
              orderId: newRecord.id,
              oldStatus: oldRecord.order_status,
              newStatus: newRecord.order_status,
              totalOrders: updatedOrders.length
            });

            return updatedOrders;
          });

          // إشعارات للتحديثات المهمة
          if (newRecord.order_status !== oldRecord.order_status) {
            toast({
              title: "🔄 تحديث حالة الطلب",
              description: `الطلب ${newRecord.order_code || newRecord.id.slice(0, 8)}: ${newRecord.order_status}`,
            });
          }

          if (newRecord.store_response_status !== oldRecord.store_response_status) {
            const statusText = {
              'available': '✅ متو��ر',
              'unavailable': '❌ غير متوفر',
              'accepted': '✅ مقبول',
              'rejected': '❌ مرفوض'
            }[newRecord.store_response_status] || newRecord.store_response_status;

            toast({
              title: "🏪 رد من المتجر",
              description: `الطلب ${newRecord.order_code || newRecord.id.slice(0, 8)}: ${statusText}`,
            });
          }

          if (newRecord.assigned_store_id !== oldRecord.assigned_store_id && newRecord.assigned_store_id) {
            toast({
              title: "🎯 تعيين طلب",
              description: `تم تعيين الطلب ${newRecord.order_code || newRecord.id.slice(0, 8)} لمتجر`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🗑️ [DIRECT] حذف طلب:', payload);
          const deletedOrder = payload.old as any;

          setOrders(prevOrders => {
            const filteredOrders = prevOrders.filter(order => order.order_id !== deletedOrder.id);
            console.log('🗑️ تم حذف الطلب محلياً:', {
              deletedOrderId: deletedOrder.id,
              remainingOrders: filteredOrders.length
            });
            return filteredOrders;
          });

          // إخفاء رسالة الحذف إذا كان الحذف بسبب التقسيم
          const isFromSplitting = deletedOrder.order_status === 'splitting' ||
                                 deletedOrder.order_details?.includes('طلب قيد التقسيم') ||
                                 deletedOrder.order_details?.includes('تقسيم') ||
                                 deletedOrder.order_details?.includes('split');

          if (!isFromSplitting) {
            toast({
              title: "🗑️ تم حذف طلب",
              description: `الطلب ${deletedOrder.order_code || deletedOrder.id.slice(0, 8)} تم حذفه`,
              variant: "destructive"
            });
          } else {
            console.log('ℹ️ تم إخفاء رسالة الحذف لأن الطلب حُذف بسبب التقسيم');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Orders channel status:', status);
        realtimeDebugger.updateConnectionStatus('admin-orders', status);

        if (status === 'SUBSCRIBED') {
          toast({
            title: "✅ متصل بالتحديثات المباشرة",
            description: "ستصلك التحديثات فورياً دون حاجة لتحديث ال��فحة",
          });
        } else if (status === 'CHANNEL_ERROR') {
          toast({
            title: "❌ خطأ في الاتصال المباشر",
            description: "سيتم تحديث البيانات يدوياً",
            variant: "destructive"
          });
        }
      });

    realtimeDebugger.trackConnection('admin-orders', ordersChannel);

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🧹 Cleaning up Realtime subscriptions...');
      subscription.unsubscribe();

      // إزالة القناة المباشرة
      if (ordersChannel) {
        supabase.removeChannel(ordersChannel);
      }

      // تنظيف المتتبع
      realtimeDebugger.cleanup();

      // تنظيف الخدمة المركزية
      realtimeService.unsubscribeAll();
    };
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      setIsOrdersLoading(true);
      console.log("🔵 fetchOrders started");
      console.log("🔵 Supabase client available:", !!supabase);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_phone,
          customer_address,
          customer_city,
          customer_notes,
          main_store_name,
          assigned_store_id,
          status,
          order_status,
          store_response_status,
          store_response_at,
          rejection_reason,
          total_amount,
          subtotal,
          order_code,
          order_details,
          items,
          created_at,
          updated_at,
          order_items:order_items(
            id,
            product_name,
            quantity,
            price,
            discounted_price,
            availability_status,
            product_id,
            products:product_id(
              id,
              name
            )
          ),
          stores!assigned_store_id(name)
        `)
        .order('created_at', { ascending: false });

      console.log("🔵 fetchOrders raw response:", {
        dataLength: data?.length,
        error: error,
        firstItem: data?.[0]
      });

      // تشخيص ��ضافي لفهم بنية البيانات
      if (data && data.length > 0) {
        console.log("🔍 تحليل بيانات الطلبات:");
        data.forEach((order, index) => {
          if (index < 3) { // عرض أ��ل 3 طلبات فقط
            console.log(`طلب ${index + 1}:`, {
              id: order.id,
              status: order.status,
              order_status: order.order_status,
              customer_name: order.customer_name
            });
          }
        });
      }

      if (error) {
        console.error("❌ Supabase query error:", error);
        console.error("❌ Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // في حالة الخطأ، لا نستخدم بيانات تجريبية - أظهر قائمة فارغة
        console.log("🔄 Database error - showing empty list");
        setOrders([]);
        return;
      }

      console.log("✅ Orders fetched successfully:", {
        count: data?.length || 0,
        sample: data?.[0],
      });

      // ��طبيع البيانات للتعامل مع حقول الحالة المختلفة
      const normalizedData = data?.map(order => {
        // استخدام order_status كحقل أساسي، مع الاع��ماد على status كبديل
        const normalizedStatus = order.order_status || order.status || 'pending';

        return {
          ...order,
          order_id: order.id, // تحويل id إلى order_id للتوافق
          order_status: normalizedStatus,
          // تأكد من وجود القيم ا��أساسية
          customer_name: order.customer_name || 'غير محد��',
          total_amount: Number(order.total_amount) || 0
        };
      }) || [];

      console.log("🔄 Data normalized:", {
        count: normalizedData.length,
        statusDistribution: normalizedData.reduce((acc, order) => {
          acc[order.order_status] = (acc[order.order_status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        storeResponseStatuses: normalizedData.map(order => ({
          id: order.id,
          store_response_status: order.store_response_status,
          assigned_store_id: order.assigned_store_id
        })).filter(o => o.store_response_status)
      });

      // Process orders with currency conversion
      const processedOrders = normalizedData.length > 0 ? OrderService.processOrderData(normalizedData) : [];
      console.log("🔄 Orders processed:", {
        count: processedOrders.length,
        sampleProcessed: processedOrders[0]
      });

      setOrders(processedOrders);
    } catch (error) {
      console.log("🔄 Error fetching orders - showing empty list");
      setOrders([]);

      handleError(
        'تحميل الطلبات',
        error,
        toast
      );
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      console.log("🔵 fetchStores started");
      console.log("🔗 Supabase client:", supabase ? 'available' : 'not available');

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      console.log("🔵 fetchStores raw response:", { data, error });

      if (error) {
        console.error("❌ Error fetching stores:", error);
        console.error("�� Error details:", { message: error.message, details: error.details, hint: error.hint });
        throw error;
      }

      console.log("✅ Stores fetched successfully:", data?.length || 0, "stores");
      setStores(data || []);
    } catch (error) {
      console.error("❌ Error fetching stores:", error);
      console.log("Raw error object for stores:", JSON.stringify(error, null, 2));

      const errorMessage = extractSupabaseError(error, 'تحميل المتاجر');

      toast({
        title: "خطأ في تحميل المتاجر",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.log("🔵 fetchStores completed");
    }
  };

  const fetchSettings = async () => {
    try {
      console.log("⚙️ fetchSettings started");
      const { data, error } = await supabase
        .from("settings")
        .select("auto_assign_enabled")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching settings:", error);
        throw error;
      }

      console.log("�� Settings fetched:", data);
      if (data) {
        setAutoAssignEnabled(data.auto_assign_enabled);
      }
    } catch (error) {
      console.error("❌ Error fetching settings:", error);
    }
  };

  const refreshOrdersData = async () => {
    try {
      await fetchOrders();
    } catch (error) {
      console.error("❌ Error refreshing orders data:", error);
    }
  };

  const handleAssignOrder = async (orderId: string, storeId: string) => {
    try {
      setIsAssigning(orderId);

      // 🟢 لوج مفصل للتأكد من القيم قبل الطلب
      console.log('🔵 Assign Order:', { orderId, storeId });
      console.log('📦 Sending assignment request:');
      console.log('orderId:', orderId, typeof orderId);
      console.log('storeId:', storeId, typeof storeId);
      console.log('Request body:', JSON.stringify({ orderId, storeId }));
      console.log('URL:', 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders (manual mode)');

      // تأكد من أن ا��قيم ليست undefined
      if (!orderId || !storeId) {
        console.error('❌ Missing values:', { orderId, storeId });
        toast({
          title: "خطأ في البيانات",
          description: "معر�� الطلب أو معرف الم��ج�� غير صحيح",
          variant: "destructive",
        });
        return;
      }

      // التحقق من وجود البيان��ت المطلوبة
      console.log('📊 Current state:', {
        ordersCount: orders.length,
        storesCount: stores.length,
        targetOrder: orders.find(o => o.order_id === orderId),
        targetStore: stores.find(s => s.id === storeId)
      });

      const targetStore = stores.find(s => s.id === storeId);
      if (!targetStore) {
        console.error('❌ Store not found:', { storeId, availableStores: stores.map(s => ({ id: s.id, name: s.name })) });
        toast({
          title: "خطأ",
          description: `المتجر المحدد غير موجود (ID: ${storeId})`,
          variant: "destructive",
        });
        return;
      }

      const targetOrder = orders.find(o => o.order_id === orderId);
      if (!targetOrder) {
        console.error('❌ Order not found:', { orderId, availableOrders: orders.map(o => ({ id: o.order_id, status: o.order_status })) });
        toast({
          title: "خطأ",
          description: `الطلب المحدد غير موجود (ID: ${orderId.substring(0, 8)}...)`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Pre-assignment validation passed:', {
        order: { id: targetOrder.order_id, status: targetOrder.order_status, customer: targetOrder.customer_name },
        store: { id: targetStore.id, name: targetStore.name }
      });

      // استخدا�� ال����دمة المحسنة بدلاً من Edge Function المعطل
      console.log('🔄 Using enhanced OrderAssignmentService (fixing "[object Object]" error)...');

      const { OrderAssignmentService } = await import('@/services/orderAssignmentService');

      const result = await OrderAssignmentService.assignOrderToStore({
        orderId,
        storeId,
        assignedBy: 'admin',
        mode: 'manual'
      });

      console.log('📨 Assignment result:', result);

      if (result.success) {
        const storeName = result.store_name || targetStore.name;
        toast({
          title: "تم التعيين بنجاح",
          description: result.message || `تم تعيين الطلب إلى متجر "${storeName}"`
        });

        // تحديث الطلب محلياً
        setOrders(prev => prev.map(order =>
          order.order_id === orderId
            ? {
                ...order,
                order_status: 'assigned',
                assigned_store_id: storeId,
                assigned_store_name: storeName
              }
            : order
        ));

        // إعادة جلب البيانات لضمان التحديث
        await refreshOrdersData();

        console.log('🎉 Order assignment completed successfully:', {
          orderId: orderId.substring(0, 8) + '...',
          storeName: storeName,
          newStatus: 'assigned'
        });
      } else {
        throw new Error(result.error || "فشل في تعيين الطلب");
      }

    } catch (error) {
      // معالجة محسنة للأخطاء
      let errorMessage = "فشل الاتص��ل بالسيرفر";
      let errorDetails = {};

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n') // أول 3 أسطر فقط
        };
      } else if (typeof error === 'string') {
        errorMessage = error;
        errorDetails = { message: error };
      } else if (error && typeof error === 'object') {
        // للأخطاء التي تأتي كـ objects
        errorMessage = error.message || error.error || error.toString() || "خطأ غير معروف";
        errorDetails = {
          type: typeof error,
          keys: Object.keys(error),
          stringified: JSON.stringify(error, null, 2)
        };
      } else {
        errorMessage = String(error);
        errorDetails = { type: typeof error, value: error };
      }

      console.error('🔴 Error in handleAssignOrder:', {
        errorMessage,
        errorDetails,
        orderId,
        storeId,
        timestamp: new Date().toISOString(),
        edgeFunctionUrl: `${EDGE_FUNCTIONS_BASE}/auto-assign-orders`
      });

      // تحسين رسالة الخطأ للمستخدم
      if (errorMessage.includes('fetch')) {
        errorMessage = "خطأ في الشبكة - تحقق من الاتصال بالإنترنت";
      } else if (errorMessage.includes('timeout')) {
        errorMessage = "انتهت مهلة ال��تصال - يرجى المحاولة مرة أخرى";
      } else if (errorMessage.includes('Failed to fetch')) {
        errorMessage = "فشل الاتصال بالخادم - تحقق من حالة الخدمة";
      }

      toast({
        title: "خطأ في الاتصال",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAssigning(null);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newStorePassword.trim()) return;

    try {
      setIsCreatingStore(true);
      const { error } = await supabase.from("stores").insert([
        {
          name: newStoreName.trim(),
          password: newStorePassword.trim(),
        },
      ]);

      if (error) throw error;

      toast({
        title: "تم إنشاء ال����جر",
        description: `تم إنشاء ��تجر "${newStoreName}" بنجاح`,
      });

      setNewStoreName("");
      setNewStorePassword("");
      fetchStores();
    } catch (error) {
      console.error("Error creating store:", error);
      console.log("Error type:", typeof error);
      console.log("Error constructor:", error?.constructor?.name);
      console.log("Error keys:", error ? Object.keys(error) : 'no keys');
      console.log("Raw error object:", JSON.stringify(error, null, 2));

      // Test the error extraction
      const errorMessage = extractStoreError(error);
      console.log("Extracted error message:", errorMessage);
      console.log("Message length:", errorMessage.length);

      // Fallback for debugging
      const fallbackMessage = error?.message || error?.details || error?.hint || String(error) || "خطأ غير معروف في إنشاء المتجر";
      console.log("Fallback message:", fallbackMessage);

      toast({
        title: "خطأ في إنشاء المتجر",
        description: errorMessage || fallbackMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingStore(false);
    }
  };

  const handleToggleAutoAssign = async () => {
    const adminAuth = localStorage.getItem("adminAuth");
    if (!adminAuth) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون ��سجل الدخول كمشرف",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsToggleLoading(true);

      const newValue = !autoAssignEnabled;
      console.log('��� Updating auto-assign setting:', { current: autoAssignEnabled, new: newValue });

      // إذا كان المستخدم يفعل التعيين التلقائي، نفذ التعيين أولاً
      if (newValue) {
        console.log('🚀 Starting auto-assignment process with notifications...');

        // عد الطلبات ال��علقة قبل التعيين
        const pendingOrdersCount = getOrdersByStatus("pending").length;
        const autoAssignableCount = getAutoAssignableOrdersCount();

        if (autoAssignableCount === 0) {
          toast({
            title: "لا توجد طلبات للتعيي��",
            description: "جميع الطلبات المعلقة معينة أو لا تحتوي على اسم متجر رئي��ي",
            variant: "default",
          });
          // تحدي�� الإعداد فقط
          const { error } = await supabase.from("settings").upsert({
            id: 1,
            auto_assign_enabled: newValue,
            updated_at: new Date().toISOString(),
          });
          if (!error) {
            setAutoAssignEnabled(newValue);
          }
          return;
        }

        // عرض رسالة بدء التعيين
        toast({
          title: "🚀 بدء التعيين التلقائ��",
          description: `بدء تعيين ${autoAssignableCount} طلب من أصل ${pendingOrdersCount} طلب معلق...`,
        });

        // تنفيذ التعيين التلقائي مع الإشعا��ات
        const response = await fetch(`${EDGE_FUNCTIONS_BASE}/auto-assign-orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
            // بدون Authorization header كما هو مقترح
          },
          body: JSON.stringify({}),
        });

        // Read response only once and store it
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'فشل في التعيين التلقائي');
        }
        console.log('✅ Auto-assignment completed with notifications:', result);

        const assignedCount = result.assigned_count || 0;
        const unmatchedCount = result.unmatched_count || 0;
        const errorCount = result.error_count || 0;
        const notificationResults = result.results || [];

        // حساب عدد الإشعارات المرسلة
        const notifiedCount = notificationResults.filter(r => r.notified === true).length;
        const notificationFailedCount = notificationResults.filter(r => r.status === 'assigned' && r.notified !== true).length;

        // إعداد رسالة النتيجة
        let detailedMessage = `تم ��عيين ${assignedCount} طلب بنجاح`;
        if (notifiedCount > 0) {
          detailedMessage += `\n✓ تم إرسال ${notifiedCount} إشعار`;
        }
        if (notificationFailedCount > 0) {
          detailedMessage += `\n⚠️ ${notificationFailedCount} ��ت��ر بدون إيم��ل - لم يتم إرسال إشعا��`;
        }
        if (unmatchedCount > 0) {
          detailedMessage += `\n⚠️ ${unmatchedCount} طلب لم يتم العثور على متجر مطابق`;
        }
        if (errorCount > 0) {
          detailedMessage += `\n❌ ${errorCount} طلب حدث به��� خطأ`;
        }

        // عرض نت��جة مفصلة
        toast({
          title: "✅ ��م التعيين التلقائي مع الإشع��رات",
          description: detailedMessage,
        });

        // حف�� نتائج التعيي�� لعرضها
        setAutoAssignResults({
          assigned_count: assignedCount,
          unmatched_count: unmatchedCount,
          error_count: errorCount,
          notified_count: notifiedCount,
          notification_failed_count: notificationFailedCount
        });

        // إ��ادة تحميل الطلبات
        await fetchOrders();
      }

      // تحديث إعدا��� ق��عدة البيانا��
      const { error } = await supabase.from("settings").upsert({
        id: 1,
        auto_assign_enabled: newValue,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('❌ Error updating settings:', error);
        throw error;
      }

      console.log('✅ Auto-assign setting updated successfully to:', newValue);
      setAutoAssignEnabled(newValue);

      if (!newValue) {
        toast({
          title: "تم إلغاء التعيين التلقائي",
          description: "لن يتم تعيين الطلبات ��لجديدة تلقائياً",
        });
        // ��سح ن��ائ�� التعيين السابقة
        setAutoAssignResults(null);
      }

    } catch (error) {
      console.error("Error in handleToggleAutoAssign:", error);
      toast({
        title: "خطأ في التعيي�� ا��تلقائي",
        description: error instanceof Error ? error.message : "فشل في تحديث الإعدادات",
        variant: "destructive",
      });
    } finally {
      setIsToggleLoading(false);
    }
  };

  const handleAutoAssignOrders = async () => {
    try {
      setIsAutoAssigning(true);

      console.log('🔎 Calling auto-assign-orders (bulk mode)');

      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/auto-assign-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // بدون Authorization header كما هو مقترح
        },
        body: JSON.stringify({})
      });

      console.log('📨 Auto-assign response status:', res.status, res.statusText);

      // Read response only once and store it
      const data = await res.json();

      if (!res.ok) {
        console.error('🔴 Auto-assign Error:', data);
        toast({
          title: "خطأ في التعيين التلقائي",
          description: data.error || res.statusText || "فشل في الت��يين التلقائي",
          variant: "destructive",
        });
        return;
      }
      console.log('✅ Auto-assign completed:', data);

      if (data.success) {
        const assignedCount = data.assigned_count || 0;
        const unmatchedCount = data.unmatched_count || 0;
        const errorCount = data.error_count || 0;

        let message = `تم تعيين ${assignedCount} طلب بنجاح`;
        if (unmatchedCount > 0) {
          message += `\n${unmatchedCount} ط��ب لم يتم العثور على متجر مطابق`;
        }
        if (errorCount > 0) {
          message += `\n${errorCount} طلب حدث ��هم خطأ`;
        }



        toast({
          title: "تم التعيين التلقا��ي",
          description: message,
        });

        // إعادة تحميل الطلبات
        console.log('🔄 Refreshing orders after auto-assign...');
        await fetchOrders();
      } else {
        toast({
          title: "فشل في التعيين الت��قائي",
          description: data.error || 'خطأ غير محدد',
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('❌ Error in handleAutoAssignOrders:', error);

      toast({
        title: "��طأ في التعيين التلقائي",
        description: error instanceof Error ? error.message : "فشل ��لاتصال بالسيرفر للتعيين التلقائي",
        variant: "destructive",
      });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // دالة التعيين التلقائي المحسنة مع التنبيهات بالعربية
  const handleAutoAssignOrdersWithAlert = async () => {
    try {
      setIsAutoAssigning(true);

      console.log('🔎 Calling enhanced auto-assign-orders (bulk mode) with Arabic alerts');

      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/auto-assign-orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
          // بدون Authorization header كما هو مقترح
        }
      });

      // Read response only once and store it
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "حدث خطأ أثناء التعي��ن ال��لقائي");
      }

      // عرض الن��ائج بالعربي��
      const assignedCount = result.assigned_count || 0;
      const totalOrders = result.total_orders || 0;

      alert(`✅ ��م تعيين ${assignedCount} م�� أصل ${totalOrders} طلب بنج����ح`);
      console.log("📦 النتائج:", result);

      // إعادة تحميل الطلبات
      console.log('🔄 Refreshing orders after auto-assign...');
      await fetchOrders();

      // ��رض toast إضافي
      toast({
        title: "تم التعي��ن التلقائي بنجاح",
        description: `تم تعيين ${assignedCount} ��ن أصل ${totalOrders} طلب`,
      });

    } catch (error) {
      console.error("تفاصيل الخطأ:", error);
      alert("❌ فشل التعيين التلقائي: " + (error instanceof Error ? error.message : "خطأ غير معروف"));

      toast({
        title: "فشل ا��تعيين التلقائ���",
        description: error instanceof Error ? error.message : "حدث خ��أ غي�� مت��قع",
        variant: "destructive",
      });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // دالة ل��حويل طلب واحد تلقائياً إلى المتجر المناسب
  const handleAutoAssignSingleOrder = async (order: OrderWithProduct) => {
    if (!order.main_store_name) {
      toast({
        title: "خطأ",
        description: "لا يم��ن تحد��د المتجر المناسب لهذا ال���لب",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAssigning(order.order_id);

      // البحث ��ن المتجر المطابق ��اسم المتجر الرئيسي
      const matchingStore = stores.find(store =>
        store.name.toLowerCase().trim() === order.main_store_name.toLowerCase().trim()
      );

      if (!matchingStore) {
        toast({
          title: "لم يتم العثور على المتجر",
          description: `لا يوجد متجر مطابق لـ "${order.main_store_name}"`,
          variant: "destructive",
        });
        return;
      }

      console.log('🎯 ت��ويل تلقائي للطلب:', {
        orderId: order.order_id,
        mainStoreName: order.main_store_name,
        matchingStore: matchingStore.name,
        storeId: matchingStore.id
      });

      // ا��تخدام دالة handleAssignOrder المحسنة بدل��ً من enhancedAssignOrder
      console.log('🚀 Using improved handleAssignOrder for auto-assignment');
      await handleAssignOrder(order.order_id, matchingStore.id);

    } catch (error) {
      console.error('❌ Error in auto-assign single order:', error);
      toast({
        title: "خطأ في ��لتحويل",
        description: "فشل في تحويل الطلب إلى ��لمتجر المناسب",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(null);
    }
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
    fetchOrders();
  };

  const handleLogout = async () => {
    localStorage.removeItem("adminAuth");
    await supabase.auth.signOut();
    navigate("/admin-login");
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: {
        label: "معل��ة",
        message: "⏳ في الانتظار: لم يتم تعيين هذا ��لطلب لأي متجر بعد.",
        variant: "secondary" as const,
        icon: Clock,
      },
      assigned: {
        label: t('assigned'),
        message: `📦 ${t('order')} ${t('assigned')} إل�� ��لمتجر، جاري المعالجة.`,
        variant: "default" as const,
        icon: Package,
      },
      delivered: {
        label: t('delivered'),
        message: `✅ تم تسليم ${t('order')} بنجاح.`,
        variant: "default" as const,
        icon: CheckCircle,
      },
      completed: {
        label: t('delivered'),
        message: `✅ تم تسليم ${t('order')} بنجاح.`,
        variant: "default" as const,
        icon: CheckCircle,
      },
      returned: {
        label: t('returned'),
        message: `🔄 تم إرجاع ${t('order')}.`,
        variant: "destructive" as const,
        icon: XCircle,
      },
    };

    return (
      statusMap[status as keyof typeof statusMap] || {
        label: status,
        message: `⚠️ ��الة غير معروفة: ${status}`,
        variant: "secondary" as const,
        icon: Package,
      }
    );
  };

  const getOrdersByStatus = (status: string) => {
    console.log(`���� تصفية الطلبات حسب الحالة: ${status}`, {
      totalOrders: orders.length,
      orderStatuses: orders.map(o => o.order_status)
    });

    // معالجة خاصة للطلبات المعلقة مع تجربة قيم مختلفة
    if (status === "pending") {
      const pendingOrders = orders.filter(order =>
        order.order_status === "pending" ||
        order.order_status === "ق��د الانتظار" ||
        order.order_status === null ||
        order.order_status === undefined ||
        order.order_status === ""
      );

      console.log(`📊 الطلبات المعلقة الموجودة:`, {
        count: pendingOrders.length,
        orders: pendingOrders.map(o => ({
          id: o.order_id,
          status: o.order_status,
          customer: o.customer_name
        }))
      });

      return pendingOrders;
    }

    // استخدام الدالة الموحدة للتصنيف للحا��ات الأخرى
    if (isValidOrderStatus(status)) {
      const filtered = filterOrdersByStatus(orders, status);
      console.log(`📊 طلبات ${status}:`, filtered.length);
      return filtered;
    }

    console.warn(`⚠️ محاولة تصفية بحالة غير صحيحة: ${status}`);
    return [];
  };

  // Convert OrderWithProduct to Order type for new components
  const convertToOrder = (order: OrderWithProduct): Order => {
    const baseOrder = {
      id: order.order_id,
      order_code: order.order_code,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      customer_city: order.customer_city,
      customer_notes: order.customer_notes,
      order_details: order.order_details,
      order_status: order.order_status as Order['order_status'],
      assigned_store_id: order.assigned_store_id,
      assigned_store_name: order.assigned_store_name,
      main_store_name: order.main_store_name,
      store_response_status: order.store_response_status,
      store_response_at: order.store_response_at,
      rejection_reason: order.rejection_reason,
      items: order.items,
      order_items: order.order_items, // إضافة order_items لعرض أسماء المنتجات
      total_amount: order.total_amount,
      created_at: order.created_at
    };

    // Apply currency conversion through OrderService
    return OrderService.normalizeOrderAmounts(baseOrder);
  };

  const getOrderStats = () => {
    // استخدام الدالة الموحدة لحساب ا��إحصائيات
    return calculateOrderStats(orders);
  };

  // حساب ع��د الطلبات التي ي��كن تحويلها تلقائ��اً
  const getAutoAssignableOrdersCount = () => {
    const pendingOrders = getOrdersByStatus("pending");
    return pendingOrders.filter(order => {
      if (!order.main_store_name) return false;
      return stores.some(store =>
        store.name.toLowerCase().trim() === order.main_store_name.toLowerCase().trim()
      );
    }).length;
  };

  const renderOrderCard = (order: OrderWithProduct) => {
    // تحقق من صحة البيانات قبل العرض
    if (!order.order_id || !order.customer_name) {
      console.error("بيانات الطلب غير مكتملة:", order);
      return (
        <div key={`error-${order.order_id || 'unknown'}`} className="p-4 border border-red-200 rounded bg-red-50">
          <p className="text-red-600 text-sm">بي��نات الطل�� غير مكتملة</p>
          <pre className="text-xs text-gray-600 mt-2">{JSON.stringify(order, null, 2)}</pre>
        </div>
      );
    }

    try {
      const convertedOrder = convertToOrder(order);
      const isPending = order.order_status === "pending";

      return (
        <ErrorBoundary key={order.order_id}>
          <div className="bg-card border rounded-lg p-4 space-y-4">
            <EnhancedOrderCard
              order={convertedOrder}
              onViewDetails={(orderId) => handleViewOrder(orderId)}
              onAssign={async (orderId, storeId) => {
                await handleAssignOrder(orderId, storeId);
              }}
              onSplitComplete={() => {
                fetchOrders(); // إعادة تحميل الطلبات بعد التقسي��
              }}
              showAssignButton={isPending}
              compact={false}
            />

          </div>
        </ErrorBoundary>
      );
    } catch (error) {
      console.error("خطأ في عرض الطل��:", error, order);
      return (
        <div key={`error-${order.order_id}`} className="p-4 border border-red-200 rounded bg-red-50">
          <p className="text-red-600 text-sm">خطأ ف�� ��رض الطلب: {order.order_id}</p>
          <p className="text-xs text-gray-600 mt-1">{error instanceof Error ? error.message : 'خطأ غير معروف'}</p>
        </div>
      );
    }
  };

  const renderOrderCardOld = (order: OrderWithProduct) => (
    <div
      key={order.order_id}
      className="flex flex-col lg:flex-row lg:items-start lg:justify-between p-4 lg:p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow gap-4"
    >
      <div className="flex-1">
        <div className="bg-card border rounded-lg p-4 flex flex-col">
          {/* رأس الطلب */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 pb-3 border-b gap-2">
            <h3 className="font-bold text-lg text-primary">
              طلب #{order.order_code || order.order_id.slice(0, 8)}
            </h3>
            <div className="flex items-center gap-2">
              <Badge {...getStatusBadge(order.order_status || "pending")}>
                {getStatusBadge(order.order_status || "pending").label}
              </Badge>
            </div>
          </div>

          {/* معلوم����ت مختصرة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 min-w-[80px]">اسم ��لعميل:</span>
                <span className="font-medium">{order.customer_name || "غير محدد"}</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 min-w-[80px]">📞 الها��ف:</span>
                <span className="font-medium" dir="ltr">{order.customer_phone || "غير محدد"}</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-semibold text-indigo-600 min-w-[80px]">📍 العنوان:</span>
                <span className="font-medium">{order.customer_address || "غير محدد"}</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-semibold text-pink-600 min-w-[80px]">📝 م��اح��ات:</span>
                <span className="font-medium">{order.customer_notes || "لا توجد"}</span>
              </div>

              {order.return_reason && order.order_status === 'returned' && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="font-semibold text-red-600 min-w-[80px]">🔄 سبب الإرجاع:</span>
                  <span className="font-medium text-red-700">{order.return_reason}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-green-600 min-w-[80px]">💰 المبلغ:</span>
                <span className="text-green-700 font-bold">
                  {order.total_amount ? formatCurrency(order.total_amount) : "غير محدد"}
                </span>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="font-semibold text-purple-600 min-w-[80px]">🏪 المتجر الرئيسي:</span>
                <span className="font-medium text-blue-600">
                  {order.main_store_name || "غير محدد"}
                </span>
              </div>

              {order.assigned_store_name && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-green-600 min-w-[80px]">🎯 المتجر المعين:</span>
                  <span className="font-medium text-green-600">
                    {order.assigned_store_name}
                  </span>
                </div>
              )}

              {/* حالة المخزون من المتجر */}
              {order.assigned_store_name && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600 min-w-[80px]">
                    {order.store_response_status === 'available' || order.store_response_status === 'accepted'
                      ? '✅ حالة التوفر:'
                      : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                      ? '❌ حالة التوفر:'
                      : '⏳ حالة التوفر:'
                    }
                  </span>
                  <div className="flex-1">
                    <span className={`font-medium ${
                      order.store_response_status === 'available' || order.store_response_status === 'accepted'
                        ? 'text-green-600'
                        : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {order.store_response_status === 'available' || order.store_response_status === 'accepted'
                        ? t('available')
                        : order.store_response_status === 'unavailable' || order.store_response_status === 'rejected'
                        ? t('unavailable')
                        : t('waiting.for.store.response')
                      }
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      المتجر المعين: {order.assigned_store_name}
                    </div>
                    {order.store_response_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        تم الرد: {new Date(order.store_response_at).toLocaleDateString('ar-IQ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600 min-w-[80px]">🆔 الطلب:</span>
                <span className="font-medium">{order.order_code || "غير محدد"}</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600 min-w-[80px]">📅 التاريخ:</span>
                <span className="font-medium">
                  {new Date(order.created_at).toLocaleString("ar-EG", {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* حالة الطلب */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold text-sm mb-2">📊 حالة الطلب:</h4>
            <div className="flex items-center gap-2">
              <span className="font-medium">{getStatusBadge(order.order_status || "pending").label}</span>
              <span className="text-sm text-muted-foreground">
                {getStatusBadge(order.order_status || "pending").message}
              </span>
            </div>
          </div>

          {/* عناصر الطلب - تفاصيل المنتجات */}
          {order.items && order.items.length > 0 ? (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-3 text-blue-700">
                منت��ات الطلب ({order.items.length} منتج)
              </h4>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-blue-800 mb-1">
                          {item.product_name || item.name || 'منتج غير محدد'}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {(() => {
                            const originalPrice = item.price || 0;
                            const discountedPrice = item.discounted_price || 0;
                            const priceInfo = discountedPrice > 0 && discountedPrice < originalPrice
                              ? {
                                  finalPrice: discountedPrice,
                                  hasDiscount: true,
                                  discountAmount: originalPrice - discountedPrice,
                                  savings: originalPrice - discountedPrice
                                }
                              : {
                                  finalPrice: originalPrice,
                                  hasDiscount: false,
                                  discountAmount: 0,
                                  savings: 0
                                };
                            return (
                              <div className="font-medium">
                                {priceInfo.hasDiscount ? (
                                  <div>
                                    <div className="text-red-600">
                                      السعر بعد الخصم: {formatCurrency(priceInfo.finalPrice)}
                                    </div>
                                    <div className="text-gray-500 line-through text-xs">
                                      السعر الأص��ي: {formatCurrency(item.price || 0)}
                                    </div>
                                    <div className="text-green-600 text-xs">
                                      ��فرت: {formatCurrency(priceInfo.savings)}
                                    </div>
                                  </div>
                                ) : (
                                  <div>السع��: {item.price ? formatCurrency(item.price) : 'غير محدد'}</div>
                                )}
                              </div>
                            );
                          })()}
                          <div className="font-medium">
                            الكمية: {item.quantity || 1}
                          </div>
                          {item.description && (
                            <div className="text-gray-500 italic">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-green-700">
                        {(() => {
                          const originalPrice = item.price || 0;
                          const discountedPrice = item.discounted_price || 0;
                          const priceInfo = discountedPrice > 0 && discountedPrice < originalPrice
                            ? {
                                finalPrice: discountedPrice,
                                hasDiscount: true,
                                discountAmount: originalPrice - discountedPrice,
                                savings: originalPrice - discountedPrice
                              }
                            : {
                                finalPrice: originalPrice,
                                hasDiscount: false,
                                discountAmount: 0,
                                savings: 0
                              };
                          const totalPrice = priceInfo.finalPrice * (item.quantity || 1);
                          return item.price && item.quantity ? formatCurrency(totalPrice) : 'غير محدد';
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-blue-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">إجمالي الطلب:</span>
                  <span className="font-bold text-lg text-green-700">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm text-yellow-700 font-medium">تفاصيل المنتجات ��ير متاحة</p>
                </div>
                <p className="text-xs text-yellow-600">لعرض تفاصيل المنتجات انق�� على زر "تفاصيل" لفت�� ��افذة التفاصي�� الكاملة</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewOrder(order.order_id)}
                  className="mt-2 text-xs"
                >
                  👁️ عرض تفاصيل المنتجا��
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {order.order_status === "pending" && (
        <div className="w-full lg:w-auto lg:mr-4 flex flex-col items-stretch lg:items-center gap-2 lg:min-w-[160px]">
          <div className="text-xs text-muted-foreground font-medium text-center">
            تعيين إلى متجر
          </div>
          <Select
            onValueChange={(storeId) =>
              handleAssignOrder(order.order_id, storeId)
            }
            disabled={isAssigning === order.order_id || isEnhancedAssigning}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={
                (isAssigning === order.order_id || isEnhancedAssigning) ? "جاري التعيين..." : "اختر متجر"
              } />
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
      )}
    </div>
  );

  if (isLoading) {
    console.log("🔵 Showing loading screen, isLoading =", isLoading);
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-lg">جا��ي التحميل...</div>
        <div className="text-sm text-muted-foreground">
          جاري تح��يل الب��انات، يرجى المراجعة في وحدة تحكم المط��ر (F12) للمزيد من التفاصيل
        </div>
      </div>
    );
  }

  const stats = getOrderStats();

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6 arabic-text"
      dir={dir}
    >
      {/* إشعارات رد��د المتاجر */}
      <StoreResponseNotification />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {t('admin.dashboard')}
            </h1>
            <p className="text-muted-foreground">
              {t('admin.stores.management')}
            </p>

            {/* Debug: Show orders with store responses */}
            {process.env.NODE_ENV === 'development' && orders.length > 0 && (
              <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
                <div>📊 <span className="font-medium">{t('total.assigned.orders')}:</span> {orders.filter(o => o.assigned_store_name).length}</div>
                <div>⏳ <span className="font-medium">{t('waiting.for.store.response')}:</span> {orders.filter(o => o.assigned_store_name && !o.store_response_status).length}</div>
                <div>✅ <span className="font-medium">{t('available')}:</span> {orders.filter(o => o.store_response_status === 'available' || o.store_response_status === 'accepted').length}</div>
                <div>❌ <span className="font-medium">{t('unavailable')}:</span> {orders.filter(o => o.store_response_status === 'unavailable' || o.store_response_status === 'rejected').length}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* مؤشر حالة الاتصال المباشر */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'متصل مباشر' : 'غير متصل'}
              </span>
            </div>

            <div className="flex gap-2">
              <AdminNotificationBell />
              <ThemeToggle />
              <LanguageToggle />
            </div>

            <Button
              onClick={() => {
                console.log("🔄 تحديث يدوي للطلبات...");
                fetchOrders();
              }}
              variant="outline"
              className="gap-2"
              disabled={isOrdersLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isOrdersLoading ? 'animate-spin' : ''}`} />
              {isOrdersLoading ? t('loading') : t('admin.refresh')}
            </Button>

            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              {t('admin.logout')}
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
                  <p className="text-muted-foreground">
{t('admin.orders.total')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-muted-foreground">
                    {t('admin.orders.pending')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.assigned}</p>
                  <p className="text-muted-foreground">{t('assigned')}</p>
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
                  <p className="text-muted-foreground">{t('delivered')}</p>
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
                  <p className="text-muted-foreground">{t('returned')}</p>
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

        {/* Debug Tools - أدوات التطوير والاختبار */}
        <div className="space-y-4">

          <EdgeFunctionFilter />


        </div>

        {/* Order Status Dashboard */}
        <OrderStatusDashboard
          orders={orders}
          onRefreshOrders={fetchOrders}
          totalOrdersCount={orders.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings & Create Store */}
          <div className="space-y-6">
            {/* Create Store */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  إنشاء متجر جديد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateStore} className="space-y-4">
                  <div>
                    <Label htmlFor="storeName">اسم المتجر</Label>
                    <Input
                      id="storeName"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="أدخل اسم المتجر"
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="storePassword"
                      className="flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      كلمة المرور
                    </Label>
                    <Input
                      id="storePassword"
                      type="password"
                      value={newStorePassword}
                      onChange={(e) => setNewStorePassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      className="text-right"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isCreatingStore || !newStoreName.trim() || !newStorePassword.trim()}
                  >
                    {isCreatingStore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        جار�� إنشاء المتجر...
                      </>
                    ) : (
                      'إنشاء المتجر'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Orders List with Tabs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('admin.orders.list')}</CardTitle>
              <CardDescription>
                {t('admin.orders.all.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
                  <TabsTrigger value="pending">
                    {t('pending')} ({stats.pending})
                  </TabsTrigger>
                  <TabsTrigger value="assigned">
                    {t('assigned')} ({stats.assigned})
                  </TabsTrigger>
                  <TabsTrigger value="delivered">
                    {t('delivered')} ({stats.delivered})
                  </TabsTrigger>
                  <TabsTrigger value="returned">
                    {t('returned')} ({stats.returned})
                  </TabsTrigger>
                  <TabsTrigger value="customer_rejected" className="text-purple-600">
                    🚫 <ArabicText>رفض الزبون</ArabicText> ({stats.customer_rejected})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="text-red-600">
                  {t('rejected')}
                </TabsTrigger>
                <TabsTrigger value="order_divisions" className="text-blue-600">
                  📦 <ArabicText>التقسيمات</ArabicText>
                </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="pending"
                  className="space-y-4 max-h-96 overflow-y-auto"
                >
                  {/* رأس قسم الطلبات المعلقة مع أزرار التحويل */}
                  {getOrdersByStatus("pending").length > 0 && (
                    <div className="hidden">
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-800 text-sm">
                          <ArabicText>تحويل ��ريع للطلبات المعلقة</ArabicText>
                        </h4>
                        <p className="text-xs text-yellow-600">
                          <ArabicText>يمكنك تحويل ج��يع الطلبات المعلقة تلقائي��ً إلى متاجرها المناسبة</ArabicText>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAutoAssignOrders}
                          disabled={isAutoAssigning || isEnhancedAutoAssigning || getAutoAssignableOrdersCount() === 0}
                          className="gap-2 bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                          size="sm"
                        >
                          {(isAutoAssigning || isEnhancedAutoAssigning) ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <ArabicText>جاري التحويل...</ArabicText>
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4" />
                              <ArabicText>تحويل ت��قائي ({getAutoAssignableOrdersCount()})</ArabicText>
                            </>
                          )}
                        </Button>

                        {getAutoAssignableOrdersCount() < getOrdersByStatus("pending").length && (
                          <div className="text-xs text-orange-600 self-center">
                            <ArabicText>
                              {getOrdersByStatus("pending").length - getAutoAssignableOrdersCount()} طلب يحتاج تعيين يدوي
                            </ArabicText>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isOrdersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      جاري تحميل الطلبات...
                    </div>
                  ) : (
                    <>
                      {getOrdersByStatus("pending").map(renderOrderCard)}
                      {getOrdersByStatus("pending").length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          {t('no.orders.pending')}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent
                  value="assigned"
                  className="space-y-4 max-h-96 overflow-y-auto"
                >
                  {isOrdersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      {t('loading')}
                    </div>
                  ) : (
                    <>
                      {getOrdersByStatus("assigned").map(renderOrderCard)}
                      {getOrdersByStatus("assigned").length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          {t('no.orders.assigned')}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent
                  value="delivered"
                  className="space-y-4 max-h-96 overflow-y-auto"
                >
                  {isOrdersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      جاري تح��يل الطلبات...
                    </div>
                  ) : (
                    <>
                      {getOrdersByStatus("delivered").map(renderOrderCard)}
                      {getOrdersByStatus("delivered").length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          {t('no.orders.delivered')}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent
                  value="returned"
                  className="space-y-4 max-h-96 overflow-y-auto"
                >
                  {isOrdersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      {t('loading')}
                    </div>
                  ) : (
                    <>
                      {getOrdersByStatus("returned").map(renderOrderCard)}
                      {getOrdersByStatus("returned").length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          {t('no.orders.returned')}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent
                  value="customer_rejected"
                  className="space-y-4 max-h-96 overflow-y-auto"
                >
                  {isOrdersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      {t('loading')}
                    </div>
                  ) : (
                    <>
                      {getOrdersByStatus("customer_rejected").map(renderOrderCard)}
                      {getOrdersByStatus("customer_rejected").length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <ArabicText>لا توجد طلبات مرفوضة من الزبائن</ArabicText>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent
                  value="rejected"
                  className="space-y-4"
                >
                  <RejectedOrdersPanel />
                </TabsContent>

                <TabsContent
                  value="order_divisions"
                  className="space-y-4"
                >
                  <OrderDivisionPanelUpdated />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('admin.order.details')}</DialogTitle>
          </DialogHeader>
          {selectedOrderId && (
            <OrderDetails
              orderId={selectedOrderId}
              stores={stores}
              onOrderUpdated={handleOrderUpdated}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
