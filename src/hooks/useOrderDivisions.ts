import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  customer_name: string;
  customer_phone: string;
  created_at: string;
  main_store_name?: string;
  order_code?: string;
  order_details?: string;
}

interface UseOrderDivisionsResult {
  divisions: OrderDivision[];
  loading: boolean;
  error: string | null;
  refreshDivisions: () => Promise<void>;
  getDivisionsByOriginalOrder: (originalOrderCode?: string) => OrderDivision[];
}

export const useOrderDivisions = (originalOrderId?: string): UseOrderDivisionsResult => {
  const [divisions, setDivisions] = useState<OrderDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // دالة جلب التقسيمات
  const fetchDivisions = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_phone,
          order_status,
          assigned_store_id,
          store_response_status,
          store_response_at,
          rejection_reason,
          main_store_name,
          total_amount,
          created_at,
          order_details,
          items,
          order_code
        `)
        .order('created_at', { ascending: false });

      // إذا تم تحديد معرف الطلب الأصلي، ابحث عن التقسيمات الخاصة به
      if (originalOrderId) {
        console.log('🔍 Searching for divisions of order:', originalOrderId);
        // البحث عن الطلبات المقسمة التي تحتوي على معرف الطلب الأصلي
        query = query.like('order_details', `%تم تقسيمه من الطلب الأصلي ${originalOrderId}%`);
      } else {
        // إذا لم يتم تحديد originalOrderId، لا تجلب أي طلبات (عدم استهلاك الذاكرة)
        console.log('ℹ️ No originalOrderId provided, skipping division fetch');
        setDivisions([]);
        setLoading(false);
        return; // الخروج مبكراً إذا لم يتم تحديد originalOrderId
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        throw ordersError;
      }

      // تحويل البيانات إلى تنسيق OrderDivision
      const formattedDivisions: OrderDivision[] = ordersData?.map(order => {
        // حساب عدد المنتجات
        const itemsCount = Array.isArray(order.items)
          ? order.items.length
          : 0;

        return {
          id: order.id,
          store_name: order.main_store_name || 'متجر غير معروف',
          assigned_store_id: order.assigned_store_id,
          store_response_status: order.store_response_status,
          order_status: order.order_status,
          store_response_at: order.store_response_at,
          rejection_reason: order.rejection_reason,
          items_count: itemsCount,
          total_amount: order.total_amount || 0,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          created_at: order.created_at,
          main_store_name: order.main_store_name,
          order_code: order.order_code,
          order_details: order.order_details
        };
      }) || [];

      console.log('📦 Fetched divisions:', formattedDivisions.length, 'divisions for originalOrderId:', originalOrderId);
      console.log('📦 Division details:', formattedDivisions.map(d => ({
        id: d.id,
        store_name: d.store_name,
        order_status: d.order_status,
        store_response_status: d.store_response_status
      })));

      setDivisions(formattedDivisions);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في جلب تقسيمات الطلبات';
      setError(errorMessage);
      console.error('❌ جلب تقسيمات الطلب:', {
        message: err instanceof Error ? err.message : String(err),
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        originalOrderId: originalOrderId
      });
      
      toast({
        title: "خطأ في جلب البيانات",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // دالة البحث عن تقسيمات طلب معين بواسطة رمز الطلب الأصلي
  const getDivisionsByOriginalOrder = (originalOrderCode?: string): OrderDivision[] => {
    if (!originalOrderCode) return [];

    return divisions.filter(division => {
      // البحث في order_details عن الطلب الأصلي
      const orderDetails = (division as any).order_details || '';
      return orderDetails.includes(`تم تقسيمه من الطلب الأصلي ${originalOrderCode}`) ||
             orderDetails.includes(originalOrderCode);
    });
  };

  // دالة تحديث البيانات
  const refreshDivisions = async () => {
    await fetchDivisions();
  };

  // تأثير تحميل البيانات عند بدء التشغيل
  useEffect(() => {
    fetchDivisions();
  }, [originalOrderId]);

  // الاشتراك في التحديثات المباشرة
  useEffect(() => {
    const subscription = supabase
      .channel('order-divisions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📡 Real-time order division update:', payload);
          
          // تحديث البيانات عند حدوث تغيير
          fetchDivisions();
        }
      )
      .subscribe();

    // تنظيف الاشتراك عند إلغاء المكون
    return () => {
      subscription.unsubscribe();
    };
  }, [originalOrderId]);

  return {
    divisions,
    loading,
    error,
    refreshDivisions,
    getDivisionsByOriginalOrder
  };
};

export default useOrderDivisions;
