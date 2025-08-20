import { supabase } from '@/integrations/supabase/client';

/**
 * إصلاح أسماء المتاجر المرمزة في قاعدة البيانات
 * يستبدل "hawranj" باسم المتجر الصحيح
 */
export async function fixStoreNames() {
  console.log('🔧 بدء إصلاح أسماء المتاجر...');

  try {
    // الحصول على جميع المتاجر
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name');

    if (storesError) {
      console.error('❌ خطأ في جلب المتاجر:', storesError);
      return;
    }

    console.log('📋 المتاجر المتاحة:', stores);

    // البحث عن المنتجات التي تحتوي على "hawranj"
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, main_store_name')
      .eq('main_store_name', 'hawranj');

    if (productsError) {
      console.error('❌ خطأ في جلب المنتجات:', productsError);
      return;
    }

    console.log(`🔍 وجد ${products?.length || 0} منتج يحتوي على "hawranj"`);

    // إصلاح أسماء المتاجر في جدول products
    if (products && products.length > 0) {
      // استخدام أول متجر متاح كبديل
      const defaultStore = stores?.[0];
      if (defaultStore) {
        console.log(`🔧 تحديث المنتجات لاستخدام المتجر: ${defaultStore.name}`);

        const { error: updateError } = await supabase
          .from('products')
          .update({ main_store_name: defaultStore.name })
          .eq('main_store_name', 'hawranj');

        if (updateError) {
          console.error('❌ خطأ في تحديث المنتجات:', updateError);
        } else {
          console.log(`✅ تم تحديث ${products.length} منتج بنجاح`);
        }
      }
    }

    // البحث عن order_items التي تحتوي على "hawranj"
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id, order_id, main_store_name')
      .eq('main_store_name', 'hawranj');

    if (orderItemsError) {
      console.error('❌ خطأ في جلب order_items:', orderItemsError);
      return;
    }

    console.log(`🔍 وجد ${orderItems?.length || 0} order_item يحتوي على "hawranj"`);

    // إصلاح أسماء المتاجر في جدول order_items
    if (orderItems && orderItems.length > 0) {
      // محاولة ربط كل order_item بالمتجر المعين للطلب
      for (const item of orderItems) {
        // الحصول على معلومات الطلب
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('assigned_store_id, stores!assigned_store_id(name)')
          .eq('id', item.order_id)
          .single();

        if (!orderError && order?.stores?.name) {
          // تحديث اسم المتجر بناءً على المتجر المعين للطلب
          const { error: updateItemError } = await supabase
            .from('order_items')
            .update({ main_store_name: order.stores.name })
            .eq('id', item.id);

          if (updateItemError) {
            console.error(`❌ خطأ في تحديث order_item ${item.id}:`, updateItemError);
          } else {
            console.log(`✅ تم تحديث order_item ${item.id} للمتجر: ${order.stores.name}`);
          }
        } else {
          // استخدام أول متجر متاح كبديل
          const defaultStore = stores?.[0];
          if (defaultStore) {
            const { error: updateItemError } = await supabase
              .from('order_items')
              .update({ main_store_name: defaultStore.name })
              .eq('id', item.id);

            if (!updateItemError) {
              console.log(`✅ تم تحديث order_item ${item.id} للمتجر الافتراضي: ${defaultStore.name}`);
            }
          }
        }
      }
    }

    // البحث عن orders التي تحتوي على "hawranj" في main_store_name
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, main_store_name, assigned_store_id, stores!assigned_store_id(name)')
      .eq('main_store_name', 'hawranj');

    if (ordersError) {
      console.error('❌ خطأ في جلب الطلبات:', ordersError);
      return;
    }

    console.log(`🔍 ��جد ${orders?.length || 0} طلب يحتوي على "hawranj"`);

    // إصلاح أسماء المتاجر في جدول orders
    if (orders && orders.length > 0) {
      for (const order of orders) {
        let newStoreName = null;

        // إذا كان الطلب معين لمتجر، استخدم اسم ذلك المتجر
        if (order.stores?.name) {
          newStoreName = order.stores.name;
        } else {
          // استخدام أول متجر متاح كبديل
          newStoreName = stores?.[0]?.name;
        }

        if (newStoreName) {
          const { error: updateOrderError } = await supabase
            .from('orders')
            .update({ main_store_name: newStoreName })
            .eq('id', order.id);

          if (updateOrderError) {
            console.error(`❌ خطأ في تحديث الطلب ${order.id}:`, updateOrderError);
          } else {
            console.log(`✅ تم تحديث الطلب ${order.id} للمتجر: ${newStoreName}`);
          }
        }
      }
    }

    console.log('✅ تم إكمال إصلاح أسماء المتاجر بنجاح');

  } catch (error) {
    console.error('❌ خطأ عام في إصلاح أسماء المتاجر:', error);
  }
}

/**
 * تشغيل إصلاح أسماء المتاجر فقط في بيئة التطوير
 */
export function runStoreNamesFix() {
  if (import.meta.env.DEV) {
    console.log('🔧 تشغيل إصلاح أسماء المتاجر في بيئة التطوير...');
    fixStoreNames();
  }
}
