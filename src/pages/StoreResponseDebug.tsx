import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { updateOrderStoreResponse } from '@/services/orderStatusService';

interface DebugOrder {
  id: string;
  order_code: string;
  assigned_store_id: string | null;
  assigned_store_name: string | null;
  store_response_status: string | null;
  store_response_at: string | null;
  order_status: string;
}

export default function StoreResponseDebug() {
  const [orders, setOrders] = useState<DebugOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [testing, setTesting] = useState(false);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          assigned_store_id,
          assigned_store_name,
          store_response_status,
          store_response_at,
          order_status
        `)
        .not('assigned_store_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
    }
  };

  const testStoreResponse = async (orderId: string, storeId: string, status: 'available' | 'unavailable') => {
    setTesting(true);
    try {
      console.log('🧪 اختبار رد ا��متجر:', { orderId, storeId, status });
      
      const result = await updateOrderStoreResponse({
        orderId,
        storeId,
        status,
        rejectionReason: status === 'unavailable' ? 'اختبار - غير متوفر' : undefined
      });

      console.log('📊 نتيجة الاختبار:', result);
      
      // إعادة تحميل البيانات
      await loadOrders();
      
      alert(`نتيجة الاختبار: ${result.success ? 'نجح' : 'فشل'}\n${result.error || 'تم التحديث بنجاح'}`);
    } catch (error) {
      console.error('خطأ في الاختبار:', error);
      alert(`خطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setTesting(false);
    }
  };

  const resetOrderStatus = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          store_response_status: null,
          store_response_at: null,
          rejection_reason: null
        })
        .eq('id', orderId);

      if (error) throw error;
      
      await loadOrders();
      alert('تم إعادة تعيين حالة الطلب');
    } catch (error) {
      console.error('خطأ في إعادة التعيين:', error);
      alert('فشل في إعادة التعيين');
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>تشخيص ردود المتاجر 🔍</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={loadOrders} className="mb-4">
            🔄 تحديث البيانات
          </Button>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">الطلبات المعينة للمتاجر:</h3>
            
            {orders.map((order) => (
              <div key={order.id} className="p-4 border rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>رقم الطلب:</strong> {order.order_code}</div>
                  <div><strong>حالة الطلب:</strong> {order.order_status}</div>
                  <div><strong>ID المتجر المعين:</strong> {order.assigned_store_id || 'غير معين'}</div>
                  <div><strong>اسم المتجر:</strong> {order.assigned_store_name || 'غير محدد'}</div>
                  <div><strong>رد المتجر:</strong> {order.store_response_status || 'لم يرد بعد'}</div>
                  <div><strong>تاريخ الرد:</strong> {order.store_response_at ? new Date(order.store_response_at).toLocaleString('ar-IQ') : 'لا يوجد'}</div>
                </div>
                
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => testStoreResponse(order.id, order.assigned_store_id!, 'available')}
                    disabled={!order.assigned_store_id || testing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✅ اختبار متوفر
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => testStoreResponse(order.id, order.assigned_store_id!, 'unavailable')}
                    disabled={!order.assigned_store_id || testing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    ❌ اختبار غير متوفر
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resetOrderStatus(order.id)}
                    disabled={testing}
                  >
                    🔄 إعادة تعيين
                  </Button>
                </div>
                
                <div className="mt-2 text-xs text-gray-600">
                  Order ID: {order.id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
          
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد طلبات معينة للمتاجر
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>اختبار يدوي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Order ID:</label>
              <input
                type="text"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="أدخل Order ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Store ID:</label>
              <input
                type="text"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="أدخل Store ID"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => testStoreResponse(selectedOrderId, selectedStoreId, 'available')}
                disabled={!selectedOrderId || !selectedStoreId || testing}
                className="bg-green-600 hover:bg-green-700"
              >
                اختبار متوفر
              </Button>
              
              <Button
                onClick={() => testStoreResponse(selectedOrderId, selectedStoreId, 'unavailable')}
                disabled={!selectedOrderId || !selectedStoreId || testing}
                className="bg-red-600 hover:bg-red-700"
              >
                اختبار غير متوفر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
