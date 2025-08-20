import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OrderDebugInfo {
  id: string;
  order_code: string;
  order_status: string;
  store_response_status?: string;
  customer_name: string;
  assigned_store_id?: string;
  created_at: string;
}

export default function CheckReturnedOrders() {
  const [orders, setOrders] = useState<OrderDebugInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    delivered: 0,
    returned: 0,
    customer_rejected: 0,
    rejected: 0
  });

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          order_status,
          store_response_status,
          customer_name,
          assigned_store_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data || []);
      
      // حساب الإحصائيات
      const newStats = {
        total: data?.length || 0,
        pending: data?.filter(o => o.order_status === 'pending').length || 0,
        assigned: data?.filter(o => o.order_status === 'assigned').length || 0,
        delivered: data?.filter(o => o.order_status === 'delivered').length || 0,
        returned: data?.filter(o => o.order_status === 'returned').length || 0,
        customer_rejected: data?.filter(o => o.order_status === 'customer_rejected').length || 0,
        rejected: data?.filter(o => o.order_status === 'rejected').length || 0
      };
      
      setStats(newStats);
      
      console.log('Orders debug info:', {
        total: newStats.total,
        stats: newStats,
        returnedOrders: data?.filter(o => o.order_status === 'returned') || []
      });
      
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // فحص الطلبات المعينة لمتجر معين
  const fetchStoreOrders = async (storeId: string) => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          order_status,
          store_response_status,
          customer_name,
          assigned_store_id,
          created_at
        `)
        .eq('assigned_store_id', storeId)
        .in('order_status', ['assigned', 'delivered', 'returned', 'customer_rejected'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching store orders:', error);
        return;
      }

      console.log(`Orders for store ${storeId}:`, {
        total: data?.length || 0,
        returned: data?.filter(o => o.order_status === 'returned').length || 0,
        returnedOrders: data?.filter(o => o.order_status === 'returned') || []
      });
      
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // إنشاء طلب تجريبي بحالة returned
  const createTestReturnedOrder = async () => {
    setLoading(true);
    try {
      // أولاً نحصل على متجر موجود
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name')
        .limit(1);

      if (!stores || stores.length === 0) {
        alert('لا توجد متاجر في قاعدة البيانات');
        return;
      }

      const store = stores[0];

      // إنشاء طلب جديد بحالة returned
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert({
          customer_name: 'عميل تجريبي - طلب مسترجع',
          customer_phone: '07701234567',
          customer_address: 'عنوان تجريبي',
          total_amount: 50000,
          subtotal: 50000,
          order_status: 'returned',
          assigned_store_id: store.id,
          store_response_status: 'available',
          order_details: 'طلب تجريبي تم إنشاؤه لفحص خيار "مسترجع" - Return reason: عدم رضا العميل',
          order_code: `TEST-RET-${Date.now()}`
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating test order:', error);
        alert('فشل في إنشاء الطلب التجريبي');
        return;
      }

      alert(`تم إنشاء طلب تجريبي مسترجع بنجاح: ${newOrder.order_code}`);
      fetchAllOrders(); // تحديث القائمة
      
    } catch (err) {
      console.error('Error:', err);
      alert('حدث خطأ أثناء إنشاء الطلب التجريبي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'returned': return 'bg-red-100 text-red-800';
      case 'customer_rejected': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'معلق';
      case 'assigned': return 'معين';
      case 'delivered': return 'مسلم';
      case 'returned': return 'مسترجع';
      case 'customer_rejected': return 'رفض الزبون';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>فحص الطلبات المسترجعة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={fetchAllOrders} disabled={loading}>
              تحديث القائمة
            </Button>
            <Button onClick={createTestReturnedOrder} disabled={loading} variant="outline">
              إنشاء طلب تجريبي مسترجع
            </Button>
            <Button onClick={() => fetchStoreOrders('d3b1f7e5-4a2c-4d8b-9e6f-1a2b3c4d5e6f')} disabled={loading} variant="secondary">
              فحص طلبات متجر معين
            </Button>
          </div>

          {/* الإحصائيات */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">إجمالي</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-sm text-gray-600">معلق</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.assigned}</div>
              <div className="text-sm text-gray-600">معين</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.delivered}</div>
              <div className="text-sm text-gray-600">مسلم</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{stats.returned}</div>
              <div className="text-sm text-gray-600">مسترجع</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.customer_rejected}</div>
              <div className="text-sm text-gray-600">رفض الزبون</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.rejected}</div>
              <div className="text-sm text-gray-600">مرفوض</div>
            </div>
          </div>

          {loading && <div className="text-center py-4">جاري التحميل...</div>}
        </CardContent>
      </Card>

      {/* قائمة الطلبات المسترجعة */}
      <Card>
        <CardHeader>
          <CardTitle>الطلبات المسترجعة ({stats.returned})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {orders
              .filter(order => order.order_status === 'returned')
              .map(order => (
                <div key={order.id} className="border rounded-lg p-3 bg-red-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{order.order_code || order.id.slice(0, 8)}</div>
                      <div className="text-sm text-gray-600">{order.customer_name}</div>
                      <div className="text-xs text-gray-500">متجر: {order.assigned_store_id?.slice(0, 8) || 'غير محدد'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getStatusBadgeColor(order.order_status)}>
                        {getStatusLabel(order.order_status)}
                      </Badge>
                      {order.store_response_status && (
                        <Badge variant="outline" className="text-xs">
                          {order.store_response_status}
                        </Badge>
                      )}
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('ar')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            
            {stats.returned === 0 && (
              <div className="text-center py-8 text-gray-500">
                لا توجد طلبات مسترجعة حالياً
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* جميع الطلبات */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الطلبات ({stats.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {orders.map(order => (
              <div key={order.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{order.order_code || order.id.slice(0, 8)}</div>
                    <div className="text-sm text-gray-600">{order.customer_name}</div>
                    <div className="text-xs text-gray-500">متجر: {order.assigned_store_id?.slice(0, 8) || 'غير محدد'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={getStatusBadgeColor(order.order_status)}>
                      {getStatusLabel(order.order_status)}
                    </Badge>
                    {order.store_response_status && (
                      <Badge variant="outline" className="text-xs">
                        {order.store_response_status}
                      </Badge>
                    )}
                    <div className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('ar')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
