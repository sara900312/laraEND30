import { supabase } from '@/integrations/supabase/client';

/**
 * إنشاء طلب تجريبي مع منتجات محددة للاختبار
 */
export async function createSampleOrder(): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    console.log('🔧 إنشاء طلب تجريبي...');

    // إنشاء طلب تجريبي
    const sampleOrder = {
      customer_name: 'أحمد محمد',
      customer_phone: '+964 771 234 5678',
      customer_address: 'شارع الكفاح، منطقة الكرادة',
      customer_city: 'بغداد',
      total_amount: 205000,
      subtotal: 205000,
      customer_notes: 'طلب تجريبي للاختبار',
      order_status: 'assigned',
      order_code: `TEST-${Date.now()}`,
      items: [
        {
          name: 'Intel Core i5-14400F Desktop Processor',
          quantity: 1,
          price: 205000
        }
      ]
    };

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(sampleOrder)
      .select()
      .single();

    if (orderError) {
      console.error('❌ خطأ في إنشاء الطلب:', orderError);
      return { success: false, error: orderError.message };
    }

    console.log('✅ تم إنشاء الطلب التجريبي:', orderData);

    // إنشاء عناصر الطلب
    const orderItems = [
      {
        order_id: orderData.id,
        product_name: 'Intel Core i5-14400F Desktop Processor',
        quantity: 1,
        price: 205000,
        availability_status: 'pending'
      }
    ];

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error('❌ خطأ في إنشاء عناصر الطلب:', itemsError);
      // محاولة حذف الطلب في حالة فشل إنشاء العناصر
      await supabase.from('orders').delete().eq('id', orderData.id);
      return { success: false, error: itemsError.message };
    }

    console.log('✅ تم إنشاء عناصر الطلب:', itemsData);

    return { success: true, orderId: orderData.id };

  } catch (error) {
    console.error('❌ خطأ عام في إنشاء الطلب التجريبي:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * تعيين طلب لمتجر معين
 */
export async function assignOrderToStore(orderId: string, storeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔗 تعيين الطلب للمتجر:', { orderId, storeId });

    const { data, error } = await supabase
      .from('orders')
      .update({ 
        assigned_store_id: storeId,
        order_status: 'assigned'
      })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('❌ خطأ في تعيين الطلب:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ تم تعيين الطلب بنجاح:', data);
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ عام في تعيين الطلب:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * الحصول على قائمة المتاجر المتاحة
 */
export async function getAvailableStores(): Promise<{ id: string; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name')
      .limit(10);

    if (error) {
      console.error('❌ خطأ في جلب المتاجر:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ خطأ عام في جلب المتاجر:', error);
    return [];
  }
}

/**
 * إنشاء طلب كامل وتعيينه لمتجر
 */
export async function createCompleteTestOrder(storeId?: string): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    // إنشاء الطلب
    const createResult = await createSampleOrder();
    if (!createResult.success || !createResult.orderId) {
      return createResult;
    }

    // إذا تم تحديد متجر، قم بتعيين الطلب له
    if (storeId) {
      const assignResult = await assignOrderToStore(createResult.orderId, storeId);
      if (!assignResult.success) {
        return { success: false, error: `تم إنشاء الطلب لكن فشل التعيين: ${assignResult.error}` };
      }
    }

    return { success: true, orderId: createResult.orderId };

  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب الكامل:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}
