import { supabase } from '@/integrations/supabase/client';
import { updateOrderStoreResponse } from '@/services/orderStatusService';

/**
 * إنشاء طلب تجريبي لاختبار نظام التأكيد/الرفض
 */
export async function createTestOrderForStoreResponse(storeId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    console.log('🧪 إنشاء طلب تجريبي لاختبار النظام...');

    // منتجات تجريبية عراقية
    const testProducts = [
      {
        name: "تلفزيون سامسونغ 55 بوصة QLED 4K",
        price: 1200000,
        quantity: 1
      },
      {
        name: "جهاز كمبيوتر محمول HP Pavilion 15",
        price: 850000,
        quantity: 1
      },
      {
        name: "هاتف أيفون 14 برو 128GB",
        price: 1500000,
        quantity: 1
      }
    ];

    const randomProduct = testProducts[Math.floor(Math.random() * testProducts.length)];

    // إنشاء الطلب
    const orderData = {
      customer_name: `عميل تجريبي ${Math.floor(Math.random() * 1000)}`,
      customer_phone: `07${Math.floor(Math.random() * 900000000) + 100000000}`,
      customer_address: `شارع ${Math.floor(Math.random() * 100)} - محلة ${Math.floor(Math.random() * 50)} - بغداد`,
      customer_city: 'بغداد',
      customer_notes: 'طلب تجريبي لاختبار نظام تأكيد/رفض المنتجات',
      order_code: `TEST${Math.floor(Math.random() * 10000)}`,
      order_status: 'assigned',
      assigned_store_id: storeId,
      main_store_name: 'hawranj',
      items: [randomProduct],
      total_amount: randomProduct.price,
      subtotal: randomProduct.price,
      store_response_status: null, // لم يتم الرد بعد
      store_response_at: null,
      rejection_reason: null
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id, order_code')
      .single();

    if (error) {
      throw error;
    }

    // إضافة order_items إذا كان الجدول موجود
    try {
      await supabase
        .from('order_items')
        .insert({
          order_id: data.id,
          product_name: randomProduct.name,
          quantity: randomProduct.quantity,
          price: randomProduct.price,
          discounted_price: randomProduct.price
        });
      console.log('✅ تم إضافة order_item بنجاح');
    } catch (orderItemError) {
      console.log('⚠️ لم يتم إضافة order_item (الجدول قد يكون غير موجود):', orderItemError);
    }

    console.log(`✅ تم إنشاء طلب تجريبي ��نجاح: ${data.order_code} (${data.id})`);

    return {
      success: true,
      orderId: data.id
    };

  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب التجريبي:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * اختبار تأكيد طلب
 */
export async function testOrderAcceptance(orderId: string, storeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 اختبار تأكيد الطلب...');

    const result = await updateOrderStoreResponse({
      orderId,
      storeId,
      status: 'accepted'
    });

    if (result.success) {
      console.log('✅ تم تأكيد الطلب بنجاح');
      return { success: true };
    } else {
      throw new Error(result.error || 'فشل في تأكيد الطلب');
    }

  } catch (error) {
    console.error('❌ خطأ في اختبار تأكيد الطلب:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * اختبار رفض طلب
 */
export async function testOrderRejection(orderId: string, storeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔴 اختبار رفض الطلب...');

    const result = await updateOrderStoreResponse({
      orderId,
      storeId,
      status: 'rejected',
      rejectionReason: 'المنتج غير متوفر في المخزن - اختبار تلقائي'
    });

    if (result.success) {
      console.log('✅ تم رفض الطلب بنجاح');
      return { success: true };
    } else {
      throw new Error(result.error || 'فشل في رفض الطلب');
    }

  } catch (error) {
    console.error('❌ خطأ في اختبار رفض الطلب:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * اختبار شامل للنظام
 */
export async function runFullSystemTest(storeId: string): Promise<{ success: boolean; results: any; error?: string }> {
  try {
    console.log('🚀 بدء الاختبار الشامل للنظام...');

    const results = {
      createOrder: { success: false },
      acceptOrder: { success: false },
      createOrder2: { success: false },
      rejectOrder: { success: false }
    };

    // 1. إنشاء طلب للتأكيد
    const order1 = await createTestOrderForStoreResponse(storeId);
    results.createOrder = order1;

    if (order1.success && order1.orderId) {
      // 2. تأكيد الطلب الأول
      const accept = await testOrderAcceptance(order1.orderId, storeId);
      results.acceptOrder = accept;
    }

    // 3. إنشاء طلب للرفض
    const order2 = await createTestOrderForStoreResponse(storeId);
    results.createOrder2 = order2;

    if (order2.success && order2.orderId) {
      // 4. رفض الطلب الثاني
      const reject = await testOrderRejection(order2.orderId, storeId);
      results.rejectOrder = reject;
    }

    const allSuccess = Object.values(results).every(r => r.success);

    console.log('📊 نتائج الاختبار الشامل:', results);

    return {
      success: allSuccess,
      results
    };

  } catch (error) {
    console.error('❌ خطأ في الاختبار الشامل:', error);
    return {
      success: false,
      results: {},
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}
