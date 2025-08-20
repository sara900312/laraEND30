import { supabase } from './src/integrations/supabase/client.js';

async function debugDatabase() {
  console.log('🔍 بدء فحص قاعدة البيانات...');
  
  try {
    // 1. فحص جدول orders
    console.log('\n📊 فحص جدول orders:');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_name, items, order_details, created_at')
      .limit(3);
    
    if (ordersError) {
      console.error('❌ خطأ في استرجاع الطلبات:', ordersError);
    } else {
      console.log('✅ عدد الطلبات:', orders?.length || 0);
      orders?.forEach((order, index) => {
        console.log(`\nط��ب ${index + 1}:`);
        console.log('- ID:', order.id);
        console.log('- العميل:', order.customer_name);
        console.log('- تاريخ الإنشاء:', order.created_at);
        console.log('- المنتجات (items):', JSON.stringify(order.items, null, 2));
        console.log('- تفاصيل الطلب:', order.order_details);
      });
    }

    // 2. فحص جدول products
    console.log('\n📦 فحص جدول products:');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, name_en, main_store_name, price')
      .limit(5);
    
    if (productsError) {
      console.error('❌ خطأ في استرجاع المنتجات:', productsError);
    } else {
      console.log('✅ عدد المنتجات:', products?.length || 0);
      products?.forEach((product, index) => {
        console.log(`\nمنتج ${index + 1}:`);
        console.log('- ID:', product.id);
        console.log('- الاسم (عربي):', product.name);
        console.log('- الاسم (إنجليزي):', product.name_en);
        console.log('- المتجر:', product.main_store_name);
        console.log('- السعر:', product.price);
      });
    }

    // 3. فحص order_items إذا كان موجود
    console.log('\n🔗 فحص جدول order_items:');
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')
      .limit(5);
    
    if (orderItemsError) {
      console.log('⚠️ جدول order_items غير موجود أو فارغ:', orderItemsError.message);
    } else {
      console.log('✅ عدد عناصر الطلبات:', orderItems?.length || 0);
      orderItems?.forEach((item, index) => {
        console.log(`\nعنصر طلب ${index + 1}:`, item);
      });
    }

    // 4. استدعاء دالة RPC إذا كانت موجودة
    console.log('\n🔄 فحص دالة get_orders_with_products:');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_orders_with_products');
    
    if (rpcError) {
      console.log('⚠️ دالة get_orders_with_products غير متوفرة:', rpcError.message);
    } else {
      console.log('✅ بيانات من دالة RPC:', rpcData?.slice(0, 2));
    }

    // 5. فحص البيانات في جدول orders مع تفصيل items
    console.log('\n🎯 فحص تفصيلي لحقل items في الطلبات:');
    const { data: detailedOrders, error: detailedError } = await supabase
      .from('orders')
      .select('id, order_code, items, order_status')
      .eq('order_status', 'assigned')
      .limit(3);
    
    if (detailedError) {
      console.error('❌ خطأ في الفحص التفصيلي:', detailedError);
    } else {
      detailedOrders?.forEach((order, index) => {
        console.log(`\n📋 طلب معين ${index + 1}:`);
        console.log('- كود الطلب:', order.order_code);
        console.log('- حالة الطلب:', order.order_status);
        
        if (order.items && Array.isArray(order.items)) {
          console.log('- عدد المنتجات:', order.items.length);
          order.items.forEach((item, itemIndex) => {
            console.log(`  منتج ${itemIndex + 1}:`);
            console.log('    - الاسم:', item.name || 'غير محدد');
            console.log('    - السعر:', item.price || 'غير محدد');
            console.log('    - الكمية:', item.quantity || 'غير محدد');
            console.log('    - معرف المنتج:', item.product_id || 'غير محدد');
          });
        } else {
          console.log('- المنتجات: غير محددة أو ليست مصفوفة');
          console.log('- محتوى items:', order.items);
        }
      });
    }

  } catch (error) {
    console.error('❌ خطأ عام في فحص قاعدة البيانات:', error);
  }
}

// تشغيل الفحص
debugDatabase().then(() => {
  console.log('\n✅ انتهى فحص قاعدة البيانات');
}).catch(error => {
  console.error('❌ فشل في تشغيل فحص قاعدة البيانات:', error);
});
