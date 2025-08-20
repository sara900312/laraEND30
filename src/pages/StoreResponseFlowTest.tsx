import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { updateOrderStoreResponse } from '@/services/orderStatusService';
import { useToast } from '@/hooks/use-toast';

export default function StoreResponseFlowTest() {
  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ar-IQ');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const loadTestOrders = async () => {
    try {
      addLog('🔍 جاري جلب الطلبات المعينة للمتاجر...');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          assigned_store_id,
          assigned_store_name,
          store_response_status,
          store_response_at,
          order_status,
          created_at
        `)
        .not('assigned_store_id', 'is', null)
        .in('order_status', ['assigned', 'pending'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      setOrders(data || []);
      addLog(`✅ تم جلب ${data?.length || 0} طلب`);
    } catch (error) {
      addLog(`❌ خطأ في جلب الطلبات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  const testStoreResponse = async (orderId: string, storeId: string, status: 'available' | 'unavailable') => {
    setTesting(true);
    try {
      addLog(`🧪 بدء اختبار رد المتجر: Order=${orderId.slice(0, 8)}, Store=${storeId.slice(0, 8)}, Status=${status}`);

      // 1. التحقق من البيانات قبل التحديث
      const { data: beforeData, error: beforeError } = await supabase
        .from('orders')
        .select('id, assigned_store_id, store_response_status, order_status')
        .eq('id', orderId)
        .single();

      if (beforeError) throw beforeError;
      
      addLog(`📋 البيانات قبل التحديث: status=${beforeData.order_status}, store_response=${beforeData.store_response_status}`);

      // 2. تنفيذ التحديث
      const result = await updateOrderStoreResponse({
        orderId,
        storeId,
        status,
        rejectionReason: status === 'unavailable' ? 'اختبار تلقائي' : undefined
      });

      addLog(`📊 نتيجة updateOrderStoreResponse: ${result.success ? 'نجح' : 'فشل'} - ${result.error || 'تم بنجاح'}`);

      // 3. التحقق من البيانات بعد التحديث
      if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // انتظار ثانية واحدة
        
        const { data: afterData, error: afterError } = await supabase
          .from('orders')
          .select('id, assigned_store_id, store_response_status, store_response_at, order_status')
          .eq('id', orderId)
          .single();

        if (afterError) throw afterError;
        
        addLog(`📋 البيانات بعد التحديث: status=${afterData.order_status}, store_response=${afterData.store_response_status}`);
        
        if (afterData.store_response_status === status || 
            (status === 'available' && afterData.store_response_status === 'available') ||
            (status === 'unavailable' && afterData.order_status === 'rejected')) {
          addLog('✅ التحديث تم بنجاح - البيانات محدثة');
          toast({
            title: "نجح الاختبار ✅",
            description: "تم تحديث الطلب بنجاح"
          });
        } else {
          addLog('❌ التحديث لم يتم - البيانات لم تتغير');
          toast({
            title: "فشل الاختبار ❌", 
            description: "التحديث لم ينعكس على قاعدة البيانات",
            variant: "destructive"
          });
        }
      }

      // 4. إعادة تحميل قائمة الطلبات
      await loadTestOrders();

    } catch (error) {
      addLog(`❌ خطأ في الاختبار: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      toast({
        title: "خطأ في الاختبار",
        description: error instanceof Error ? error.message : 'خطأ غير معروف',
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    loadTestOrders();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>اختبار تدفق رد المتجر 🧪</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button onClick={loadTestOrders}>🔄 تحديث البيانات</Button>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">الطلبات المتاحة للاختبار:</h3>
            
            {orders.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                لا توجد طلبات معينة للمتاجر للاختبار
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="border rounded p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><strong>الطلب:</strong> {order.order_code}</div>
                    <div><strong>حالة الطلب:</strong> {order.order_status}</div>
                    <div><strong>المتجر المعين:</strong> {order.assigned_store_name}</div>
                    <div><strong>رد المتجر:</strong> {order.store_response_status || 'لم يرد بعد'}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => testStoreResponse(order.id, order.assigned_store_id, 'available')}
                      disabled={testing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      ✅ اختبار متوفر
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => testStoreResponse(order.id, order.assigned_store_id, 'unavailable')}
                      disabled={testing}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      ❌ اختبار غير متوفر
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل الأحداث 📝</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center">لا توجد أحداث بعد</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
