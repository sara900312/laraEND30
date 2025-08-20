import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function TestReturnedOrderCreator() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name');

      if (error) {
        console.error('Error fetching stores:', error);
        return;
      }

      setStores(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const createReturnedOrder = async () => {
    if (stores.length === 0) {
      toast({
        title: "خطأ",
        description: "لا توجد متاجر متاحة",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // أخذ أول متجر متاح
      const store = stores[0];
      const orderCode = `RET-${Date.now()}`;

      // إنشاء طلب مرتجع
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          customer_name: 'عميل تجريبي - طلب مرتجع',
          customer_phone: '07701234567',
          customer_address: 'عنوان تجريبي للطلب المرتجع',
          customer_notes: 'طلب تجريبي لاختبار ميزة الإرجاع',
          total_amount: 150000,
          subtotal: 150000,
          order_status: 'returned', // حالة مرتجعة
          assigned_store_id: store.id,
          store_response_status: 'available',
          store_response_at: new Date().toISOString(),
          order_details: 'Return reason: طلب تجريبي - عدم رضا العميل عن المنتج',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        toast({
          title: "خطأ",
          description: "فشل في إنشاء الطلب: " + orderError.message,
          variant: "destructive"
        });
        return;
      }

      // إنشاء order_items للطلب
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert([
          {
            order_id: order.id,
            product_name: 'تلفزيون سامسونغ 55 بوصة (مرتجع)',
            quantity: 1,
            price: 150000,
            discounted_price: 150000,
            availability_status: 'available',
            main_store_name: store.name
          }
        ]);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // نواصل حتى لو فشل إنشاء العناصر
      }

      toast({
        title: "تم بنجاح ✅",
        description: `تم إنشاء طلب مرتجع تجريبي: ${orderCode}`,
      });

      console.log('✅ تم إنشاء طلب مرتجع تجريبي:', {
        orderId: order.id,
        orderCode: order.order_code,
        storeId: store.id,
        storeName: store.name,
        orderStatus: order.order_status,
        returnReason: order.order_details
      });

    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء الطلب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createMultipleReturnedOrders = async () => {
    for (let i = 0; i < 3; i++) {
      await createReturnedOrder();
      // تأخير قصير بين الطلبات
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const checkReturnedOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          order_status,
          store_response_status,
          assigned_store_id,
          customer_name,
          order_details,
          created_at
        `)
        .eq('order_status', 'returned')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error:', error);
        return;
      }

      console.log('🔍 الطلبات المرتجعة في قاعدة البيانات:', data);
      
      toast({
        title: "فحص الطلبات المرتجعة",
        description: `تم العثور على ${data?.length || 0} طلب مرتجع. تحقق من Console للتفاصيل.`,
      });

    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>إنشاء طلبات مرتجعة تجريبية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={createReturnedOrder} 
              disabled={loading || stores.length === 0}
              className="w-full"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء طلب مرتجع واحد'}
            </Button>

            <Button 
              onClick={createMultipleReturnedOrders} 
              disabled={loading || stores.length === 0}
              variant="outline"
              className="w-full"
            >
              إنشاء 3 طلبات مرتجعة
            </Button>

            <Button 
              onClick={checkReturnedOrders} 
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              فحص الطلبات المرتجعة
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">المتاجر المتاحة:</h4>
            {stores.length > 0 ? (
              <div className="space-y-1">
                {stores.map(store => (
                  <div key={store.id} className="text-sm">
                    📦 {store.name} ({store.id.slice(0, 8)})
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">جاري تحميل المتاجر...</p>
            )}
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">ملاحظات:</h4>
            <ul className="text-sm space-y-1">
              <li>• سيتم إنشاء طلبات بحالة "returned" مباشرة</li>
              <li>• ستكون مرتبطة بأول متجر في القائمة</li>
              <li>• تحتوي على سبب إرجاع تجريبي</li>
              <li>• يمكن رؤيتها في لوحة تحكم المتجر تحت تبويب "مرتجع"</li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">روابط مفيدة:</h4>
            <div className="space-y-2">
              <a 
                href="/store-dashboard" 
                target="_blank"
                className="block text-blue-600 hover:underline"
              >
                🔗 لوحة تحكم المتجر
              </a>
              <a 
                href="/check-returned-orders" 
                target="_blank"
                className="block text-blue-600 hover:underline"
              >
                🔗 صفحة فحص الطلبات المرتجعة
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
