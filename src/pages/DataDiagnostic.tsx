import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, Database, Eye } from 'lucide-react';

const DataDiagnostic = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrdersData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Testing direct orders table access...");
      
      // Test 1: Direct orders table access
      const { data: directOrders, error: directError } = await supabase
        .from('orders')
        .select('*')
        .limit(3);
      
      console.log("📋 Direct orders data:", directOrders);
      console.log("❌ Direct orders error:", directError);
      
      // Test 2: RPC function
      const { data: rpcOrders, error: rpcError } = await supabase
        .rpc('get_orders_with_products');
      
      console.log("🔧 RPC orders data:", rpcOrders);
      console.log("❌ RPC orders error:", rpcError);
      
      if (rpcError) {
        setError(`RPC Error: ${rpcError.message}`);
      } else if (directError) {
        setError(`Direct Access Error: ${directError.message}`);
      } else {
        setOrders(rpcOrders || directOrders || []);
      }
      
    } catch (err) {
      console.error("💥 Catch error:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkTableStructure = async () => {
    try {
      console.log("🔍 Checking table structure...");
      
      // Test table existence and basic structure
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
      
      console.log("📊 Table structure test:", { data, error });
      
      if (data && data.length > 0) {
        console.log("📋 Available columns:", Object.keys(data[0]));
        console.log("📋 Sample data:", data[0]);
      }
      
    } catch (err) {
      console.error("💥 Table structure error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-6 h-6" />
              تشخيص بيانات الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={fetchOrdersData} disabled={isLoading}>
                {isLoading ? 'جاري التحميل...' : 'جلب البيانات'}
              </Button>
              <Button onClick={checkTableStructure} variant="outline">
                فحص هيكل الجدول
              </Button>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-800">خطأ:</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>البيانات المسترجعة ({orders.length} طلب)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {orders.slice(0, 2).map((order, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white">
                    <h3 className="font-bold text-lg mb-3 text-blue-600">
                      طلب #{order.order_code || order.order_id?.slice?.(0, 8) || index + 1}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2 text-gray-700">المعلومات الأساسية:</h4>
                        <div className="space-y-1">
                          <p><span className="font-medium">اسم العميل:</span> {order.customer_name || 'غير موجود'}</p>
                          <p><span className="font-medium">رقم الهاتف:</span> {order.customer_phone || 'غير موجود'}</p>
                          <p><span className="font-medium">العنوان:</span> {order.customer_address || 'غير موجود'}</p>
                          <p><span className="font-medium">المبلغ الإجمالي:</span> {order.total_amount || 'غير موجود'}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 text-gray-700">معلومات المتجر:</h4>
                        <div className="space-y-1">
                          <p>
                            <span className="font-medium">المتجر الرئيسي:</span> 
                            <span className={order.main_store_name ? 'text-green-600 font-bold' : 'text-red-600'}>
                              {order.main_store_name || '❌ غير موجود'}
                            </span>
                          </p>
                          <p><span className="font-medium">المتجر المعين:</span> {order.assigned_store_name || 'غير معين'}</p>
                          <p><span className="font-medium">حالة الطلب:</span> {order.order_status || 'غير محدد'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2 text-gray-700">ملاحظات العميل:</h4>
                      <p className={order.customer_notes ? 'text-green-600' : 'text-red-600'}>
                        {order.customer_notes || '❌ لا توجد ملاحظات'}
                      </p>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2 text-gray-700">العناصر (items):</h4>
                      {order.items ? (
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <p className="text-green-700">✅ يوجد {Array.isArray(order.items) ? order.items.length : 'غير معروف'} عنصر</p>
                          <details>
                            <summary className="cursor-pointer text-blue-600">عرض التفاصيل</summary>
                            <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(order.items, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : (
                        <p className="text-red-600">❌ لا توجد عناصر</p>
                      )}
                    </div>
                    
                    <details className="mt-4">
                      <summary className="cursor-pointer text-blue-600 font-medium">عرض جميع الحقول الخام</summary>
                      <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-auto">
                        {JSON.stringify(order, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DataDiagnostic;
