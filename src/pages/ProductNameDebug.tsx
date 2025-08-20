import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ProductNameDebug = () => {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrdersData = async () => {
    setLoading(true);
    try {
      // جلب الطلبات مع order_items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          customer_name,
          order_status,
          assigned_store_id,
          items,
          order_items:order_items(
            id,
            product_name,
            quantity,
            price,
            order_id
          )
        `)
        .eq('order_status', 'assigned')
        .order('created_at', { ascending: false })
        .limit(5);

      if (ordersError) {
        console.error('خطأ في جلب الطلبات:', ordersError);
      } else {
        console.log('بيانات الطلبات:', ordersData);
        setOrders(ordersData || []);
      }

      // جلب جميع order_items مباشرة
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (itemsError) {
        console.error('❌ خطأ في جلب order_items:', {
          message: itemsError.message || String(itemsError),
          code: itemsError.code,
          details: itemsError.details,
          hint: itemsError.hint
        });
      } else {
        console.log('بيانات order_items:', itemsData);
        setOrderItems(itemsData || []);
      }

    } catch (error) {
      console.error('خطأ في العملية:', error);
    }
    setLoading(false);
  };

  const addSampleProductNames = async () => {
    try {
      // إضافة أسماء منتجات تجريبية لـ order_items الموجودة
      const sampleProducts = [
        'تلفزيون سامسونغ 55 بوصة QLED 4K',
        'لابتوب HP Pavilion 15.6 بوصة',
        'هاتف iPhone 14 Pro Max 256GB',
        'مكيف هواء LG 2.25 حصان بارد',
        'ثلاجة سامسونغ نوفروست 18 قدم'
      ];

      for (let i = 0; i < Math.min(orderItems.length, sampleProducts.length); i++) {
        const item = orderItems[i];
        const productName = sampleProducts[i];

        const { error } = await supabase
          .from('order_items')
          .update({ product_name: productName })
          .eq('id', item.id);

        if (error) {
          console.error(`خطأ في تحديث العنصر ${item.id}:`, error);
        } else {
          console.log(`تم تحديث العنصر ${item.id} باسم المنتج: ${productName}`);
        }
      }

      alert('تم تحديث أسماء المنتجات! يرجى تحديث الصفحة.');
      fetchOrdersData();
    } catch (error) {
      console.error('خطأ في إضافة أسماء المنتجات:', error);
    }
  };

  useEffect(() => {
    fetchOrdersData();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>تشخيص أسماء المنتجات</CardTitle>
          <div className="flex gap-2">
            <Button onClick={fetchOrdersData} disabled={loading}>
              {loading ? 'جاري التحميل...' : 'تحديث البيانات'}
            </Button>
            <Button onClick={addSampleProductNames} variant="outline">
              إضافة أسماء منتجات تجريبية
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الطلبات مع order_items */}
        <Card>
          <CardHeader>
            <CardTitle>الطلبات المعينة ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.map((order) => (
              <div key={order.id} className="border p-3 mb-3 rounded">
                <div className="font-bold">طلب: {order.order_code}</div>
                <div className="text-sm text-gray-600">العميل: {order.customer_name}</div>
                <div className="text-sm text-gray-600">المتجر: {order.assigned_store_id}</div>
                
                <div className="mt-2">
                  <strong>order_items ({order.order_items?.length || 0}):</strong>
                  {order.order_items && order.order_items.length > 0 ? (
                    <ul className="list-disc list-inside ml-4 text-sm">
                      {order.order_items.map((item, index) => (
                        <li key={index}>
                          <strong>product_name:</strong> "{item.product_name || 'فارغ'}" | 
                          <strong> السعر:</strong> {item.price} | 
                          <strong> الكمية:</strong> {item.quantity}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-red-500 text-sm">لا توجد order_items</span>
                  )}
                </div>

                <div className="mt-2">
                  <strong>items (JSON):</strong>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(order.items, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* جميع order_items */}
        <Card>
          <CardHeader>
            <CardTitle>جميع order_items ({orderItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orderItems.map((item) => (
              <div key={item.id} className="border p-3 mb-3 rounded">
                <div className="text-sm">
                  <strong>ID:</strong> {item.id} | 
                  <strong> Order ID:</strong> {item.order_id}
                </div>
                <div className="text-sm">
                  <strong>product_name:</strong> 
                  <span className={item.product_name ? 'text-green-600' : 'text-red-500'}>
                    "{item.product_name || 'فارغ'}"
                  </span>
                </div>
                <div className="text-sm">
                  <strong>السعر:</strong> {item.price} | 
                  <strong> الكمية:</strong> {item.quantity}
                </div>
                <div className="text-xs text-gray-500">
                  تم الإنشاء: {new Date(item.created_at).toLocaleString('ar-EG')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductNameDebug;
