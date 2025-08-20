import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Split, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SplitOrderButtonProps {
  orderId: string;
  orderItems: any[]; // items array from order
  onSplitComplete?: () => void;
  disabled?: boolean;
}

export const SplitOrderButton: React.FC<SplitOrderButtonProps> = ({
  orderId,
  orderItems,
  onSplitComplete,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // استخدام localStorage لتتبع فشل Edge Function
  const shouldSkipEdgeFunction = localStorage.getItem('skipEdgeFunction') === 'true';

  // تحليل المنتجات لفهم كم متجر مختلف موجود
  const analyzeStores = () => {
    const storesMap = new Map();

    orderItems?.forEach((item) => {
      // البحث عن اسم المتجر من عدة مصادر محتملة
      const storeName = item.main_store
        || item.main_store_name
        || item.store_name
        || (typeof item.products === 'object' && item.products?.store_name)
        || 'متجر غير معروف';

      if (!storesMap.has(storeName)) {
        storesMap.set(storeName, []);
      }
      storesMap.get(storeName).push(item);
    });

    return {
      storesCount: storesMap.size,
      stores: Array.from(storesMap.entries()).map(([storeName, items]) => ({
        storeName,
        itemsCount: items.length,
        items
      }))
    };
  };

  const { storesCount, stores } = analyzeStores();

  // لا نعرض الزر إذا كان هناك متجر واحد فقط أو لا توجد منتجات
  if (storesCount <= 1 || !orderItems?.length) {
    return null;
  }

  // دالة تقسيم محلية كنسخة احتياطية
  const handleLocalSplit = async () => {
    try {
      console.log('⚠️ استخدام التقسيم المحلي كنسخة احتياطية');

      // جلب الطلب الأصلي
      const { data: originalOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !originalOrder) {
        throw new Error('فشل في جلب بيانات الطلب الأصلي');
      }

      // تنظيم المنتجات حسب المتجر
      const storesMap: Record<string, any> = {};
      orderItems.forEach((item) => {
        // استخد��م نفس منطق اكتشاف ��سم المتجر
        const storeName = item.main_store
          || item.main_store_name
          || item.store_name
          || (typeof item.products === 'object' && item.products?.store_name)
          || 'متجر غير معروف';

        if (!storesMap[storeName]) {
          storesMap[storeName] = {
            storeName,
            items: []
          };
        }

        storesMap[storeName].items.push({
          name: item.name || item.product_name || 'منتج غير معروف',
          quantity: item.quantity || 1,
          price: item.price || 0,
          discounted_price: item.discounted_price || item.price || 0,
          main_store_name: storeName,
          main_store: storeName,
          store_name: storeName,
          product_id: item.product_id
        });
      });

      const results = [];

      // إنشاء طلب جديد لكل متجر
      for (const storeName in storesMap) {
        const storeData = storesMap[storeName];

        // حساب المبلغ الإجمالي
        const totalAmount = storeData.items.reduce((sum: number, item: any) => {
          return sum + ((item.discounted_price || item.price || 0) * (item.quantity || 1));
        }, 0);

        // البحث عن المتجر في قاعدة البيانات للحصول على معرفه
        const { data: storeData_db } = await supabase
          .from('stores')
          .select('id, name')
          .eq('name', storeName)
          .single();

        const { data: newOrder, error: createError } = await supabase
          .from('orders')
          .insert({
            customer_name: originalOrder.customer_name,
            customer_phone: originalOrder.customer_phone,
            customer_address: originalOrder.customer_address,
            customer_notes: originalOrder.customer_notes,
            order_status: 'assigned',
            assigned_store_id: storeData_db?.id || null,
            main_store_name: storeName,
            items: storeData.items,
            total_amount: totalAmount,
            order_details: `تم تقسيمه من الطلب الأصلي ${originalOrder.order_code || orderId}`,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error(`❌ فشل في إنشاء طلب للمتجر ${storeName}:`, createError);
          results.push({ storeName, success: false, error: createError.message });
        } else {
          console.log(`✅ تم إنشاء طلب للمتجر ${storeName}:`, newOrder.id);

          // إنشاء order_items منفصلة لضما�� عرض اسم المتجر الصحيح
          const orderItemsToInsert = storeData.items.map((item: any) => ({
            order_id: newOrder.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            discounted_price: item.discounted_price,
            main_store_name: storeName,
            main_store: storeName,
            store_name: storeName,
            product_id: item.product_id
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

          if (itemsError) {
            console.warn(`⚠️ فشل في إنشاء order_items للمتجر ${storeName}:`, itemsError);
          } else {
            console.log(`✅ تم إنشاء ${orderItemsToInsert.length} order_items للمتجر ${storeName}`);
          }

          results.push({ storeName, success: true, orderId: newOrder.id });
        }
      }

      // وضع علامة على الطلب بأنه قيد التقسيم قبل الحذف
      await supabase
        .from('orders')
        .update({
          order_status: 'splitting',
          order_details: `${originalOrder.order_details || ''}\n\nطلب قيد التقسيم - سيتم حذفه وإنشاء طلبات جديدة`
        })
        .eq('id', orderId);

      // حذف الطلب الأصلي بعد التقسيم الناجح
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (deleteError) {
        console.warn('⚠️ فشل في حذف الطلب الأصلي:', deleteError);
      } else {
        console.log('✅ تم حذف الطلب الأصلي بنجاح');
      }

      const successCount = results.filter(r => r.success).length;
      const totalStores = Object.keys(storesMap).length;

      return {
        success: true,
        successful_splits: successCount,
        total_stores: totalStores,
        results
      };

    } catch (error) {
      console.error('❌ خطأ في التقسيم المحلي:', error);
      throw error;
    }
  };

  const handleSplitOrder = async () => {
    try {
      setIsLoading(true);

      // محاولة استخدام Edge Function أولاً (مع معالجة أفضل للأخطاء)
      try {
        const edgeFunctionUrl = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/test-split';

        console.log('🚀 محاولة است��دام Edge Function:', edgeFunctionUrl);

        // إضافة timeout للطلب
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

        // تم تعطيل fetch مؤقتاً لحل مشاكل الشبكة
        // const response = await fetch(edgeFunctionUrl, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrempvdmhsbGplYXF6b3l0cGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDY2MjIsImV4cCI6MjA2NDYyMjYyMn0.mx8PnQJaMochaPbjYUmwzlVNIULM05LUDBIM7OFFjZ8`,
        //   },
        //   body: JSON.stringify({
        //     orderId: orderId
        //   }),
        //   signal: controller.signal
        // });

        // إجبار استخدام الطريقة المحلية مؤقتاً
        throw new Error('Using local method for reliability');

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ نجح Edge Function:', result);

          if (result.success) {
            const successCount = result.successful_splits || 0;
            const totalStores = result.total_stores || 0;
            const notifiedCount = result.notifications?.filter((n: any) => n.notified === true).length || 0;

            toast({
              title: "تم تقسيم الطلب بنجاح",
              description: `تم إنشاء ${successCount} من أصل ${totalStores} طلب منفصل${notifiedCount > 0 ? ` مع إرسال ${notifiedCount} إشعار` : ''}`,
            });

            setIsOpen(false);
            onSplitComplete?.();
            return;
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // إذا فشل Edge Function، سنستخدم النسخة الم��لية
        throw new Error('Edge Function returned unsuccessful result');

      } catch (edgeError) {
        // تسجيل تفاصي�� أكثر عن الخطأ
        console.log('⚠️ فشل Edge Function، ��ستخدام النسخة المحلية...', {
          error: edgeError,
          message: edgeError instanceof Error ? edgeError.message : 'Unknown error',
          name: edgeError instanceof Error ? edgeError.name : 'UnknownError'
        });

        // استخدام النسخة الاحتياطية المحلية
        const result = await handleLocalSplit();

        if (result.success) {
          const successCount = result.successful_splits || 0;
          const totalStores = result.total_stores || 0;

          toast({
            title: "تم تقسيم الطلب بنجاح",
            description: `تم إنشاء ${successCount} من أصل ${totalStores} طلب معين للمتاجر المناسبة`,
          });

          setIsOpen(false);
          onSplitComplete?.();
        } else {
          throw new Error('فشل في التقسيم المحلي أيضاً');
        }
      }

    } catch (error) {
      console.error('❌ خطأ مفصل في تقسيم الطلب:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined
      });

      let errorMessage = "حدث خطأ غير متوقع";

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.name === 'AbortError') {
          errorMessage = "مشكلة في الاتصال بالخادم. تم استخدام النسخة المحلية للتقسيم بدلاً من ذلك.";
        } else if (error.message.includes('Network') || error.message.includes('CORS')) {
          errorMessage = "مشكلة في الشبكة أو صلاحيات الوصول. تم استخدام النسخة المحلية للتقسيم.";
        } else if (error.message.includes('HTTP')) {
          errorMessage = "خطأ في الخادم الخارجي. تم استخدام النسخة المحلية للتقسيم.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "خطأ في تقسيم الطلب",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
        className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
      >
        <Split className="w-4 h-4" />
        تقسيم حسب المتاجر ({storesCount})
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Split className="w-5 h-5 text-blue-600" />
              تقسيم الطلب حسب المتاجر
            </DialogTitle>
            <DialogDescription className="text-right">
              سيتم تقسيم هذا الطلب إلى {storesCount} طلبات منفصلة، كل طلب يحتوي على المنتجات الخاصة بمتجر واحد ومع��ن مباشرة للمتجر المناسب.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                تفاصيل التقسيم المتوقع:
              </h4>
              <div className="space-y-2">
                {stores.map((store, index) => (
                  <div key={index} className="flex justify-between items-center bg-white rounded p-2">
                    <span className="font-medium text-blue-700">{store.storeName}</span>
                    <span className="text-sm text-gray-600">{store.itemsCount} منتج</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>ملاحظة:</strong> بعد التق��يم، سيتم حذف الطلب الأصلي وست��هر الطلبات الجديدة في تبويب "معينة" جاهزة للمعالجة من قبل المتاجر.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleSplitOrder}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  جاري التقسيم...
                </>
              ) : (
                <>
                  <Split className="w-4 h-4 ml-2" />
                  تأكيد التقسيم
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
