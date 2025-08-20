import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OrderAnalysis {
  order_id: string;
  order_code: string;
  items_from_json: any[];
  order_items_from_table: any[];
  analysis: {
    json_items_count: number;
    table_items_count: number;
    product_names_in_json: string[];
    product_names_in_table: string[];
    issues: string[];
  };
}

export default function ProductNameAnalysis() {
  const [orders, setOrders] = useState<OrderAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const analyzeOrders = async () => {
    setLoading(true);
    try {
      // جلب الطلبات من جدول orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_code, items')
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) throw ordersError;

      // جلب عناصر الطلبات من جدول order_items
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderItemsError) {
        console.warn('جدول order_items غير متاح:', orderItemsError.message);
      }

      const analysis = ordersData?.map(order => {
        const itemsFromJson = Array.isArray(order.items) ? order.items : [];
        const orderItemsFromTable = orderItemsData?.filter(item => item.order_id === order.id) || [];

        const jsonProductNames = itemsFromJson
          .map(item => item.product_name || item.name || 'فارغ')
          .filter(name => name && name.trim() !== '');

        const tableProductNames = orderItemsFromTable
          .map(item => item.product_name || 'فارغ')
          .filter(name => name && name.trim() !== '');

        const issues = [];
        
        if (itemsFromJson.length === 0 && orderItemsFromTable.length === 0) {
          issues.push('لا توجد عناصر للطلب في كلا الموقعين');
        }
        
        if (jsonProductNames.some(name => name === 'فارغ' || name === 'منتج غير محدد')) {
          issues.push('أسماء منتجات فارغة في JSON');
        }
        
        if (tableProductNames.some(name => name === 'فارغ' || name === 'من��ج غير محدد')) {
          issues.push('أسماء منتجات فارغة في الجدول');
        }

        if (itemsFromJson.length > 0 && orderItemsFromTable.length > 0 && 
            jsonProductNames.length !== tableProductNames.length) {
          issues.push('عدم تطابق عدد المنتجات بين المصدرين');
        }

        return {
          order_id: order.id,
          order_code: order.order_code || 'غير محدد',
          items_from_json: itemsFromJson,
          order_items_from_table: orderItemsFromTable,
          analysis: {
            json_items_count: itemsFromJson.length,
            table_items_count: orderItemsFromTable.length,
            product_names_in_json: jsonProductNames,
            product_names_in_table: tableProductNames,
            issues
          }
        };
      }) || [];

      setOrders(analysis);
    } catch (error) {
      console.error('خطأ في تحليل الطلبات:', error);
    } finally {
      setLoading(false);
    }
  };

  const fixOrderItemNames = async (orderId: string) => {
    try {
      // جلب الطلب مع العناصر
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const itemsFromJson = Array.isArray(order.items) ? order.items : [];
      
      if (itemsFromJson.length > 0) {
        // محاولة إنشاء أو تحديث عناصر في جدول order_items
        for (let i = 0; i < itemsFromJson.length; i++) {
          const item = itemsFromJson[i];
          const productName = item.product_name || item.name || `منتج ${i + 1}`;
          
          const { error: upsertError } = await supabase
            .from('order_items')
            .upsert({
              order_id: orderId,
              product_name: productName,
              quantity: item.quantity || 1,
              price_sar: item.price || 0,
              discounted_price: item.discounted_price || null
            }, {
              onConflict: 'order_id,product_name'
            });

          if (upsertError) {
            console.error('خطأ في تحديث عنصر الطلب:', upsertError);
          }
        }
        
        console.log('تم تحديث عناصر الطلب بنجاح');
        await analyzeOrders(); // إعادة تحليل البيانات
      }
    } catch (error) {
      console.error('خطأ في إصلاح أسماء المنتجات:', error);
    }
  };

  useEffect(() => {
    analyzeOrders();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>تحليل أسماء المنتجات في الطلبات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button onClick={analyzeOrders} disabled={loading}>
              {loading ? 'جاري التحليل...' : 'تحديث التحليل'}
            </Button>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">ملخص التحليل:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <div className="text-sm text-gray-600">إجمالي الطلبات المحللة</div>
                <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
              </div>
              <div className="p-4 bg-red-50 rounded">
                <div className="text-sm text-gray-600">طلبات بها مشاكل</div>
                <div className="text-2xl font-bold text-red-600">
                  {orders.filter(o => o.analysis.issues.length > 0).length}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">طلبات سليمة</div>
                <div className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.analysis.issues.length === 0).length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {orders.map((order, index) => (
          <Card key={order.order_id} className={order.analysis.issues.length > 0 ? 'border-red-200' : 'border-green-200'}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>طلب {order.order_code} - {order.order_id.slice(0, 8)}</span>
                {order.analysis.issues.length > 0 && (
                  <Button 
                    size="sm" 
                    onClick={() => fixOrderItemNames(order.order_id)}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    إصلاح
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">عناصر من JSON ({order.analysis.json_items_count})</h4>
                  <ul className="text-sm space-y-1">
                    {order.analysis.product_names_in_json.map((name, i) => (
                      <li key={i} className={name === 'فارغ' || name === 'منتج غير محدد' ? 'text-red-600' : 'text-green-600'}>
                        • {name}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">عناصر من الجدول ({order.analysis.table_items_count})</h4>
                  <ul className="text-sm space-y-1">
                    {order.analysis.product_names_in_table.map((name, i) => (
                      <li key={i} className={name === 'فارغ' || name === 'منتج غير محدد' ? 'text-red-600' : 'text-green-600'}>
                        • {name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {order.analysis.issues.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded">
                  <h4 className="font-semibold text-red-800 mb-2">المشاكل المكتشفة:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {order.analysis.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-blue-600">عرض البيانات الخام</summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                  <div className="mb-2">
                    <strong>JSON Items:</strong>
                    <pre className="mt-1 overflow-auto">{JSON.stringify(order.items_from_json, null, 2)}</pre>
                  </div>
                  <div>
                    <strong>Table Items:</strong>
                    <pre className="mt-1 overflow-auto">{JSON.stringify(order.order_items_from_table, null, 2)}</pre>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
