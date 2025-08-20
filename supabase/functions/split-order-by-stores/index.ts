import { createClient } from 'npm:@supabase/supabase-js@2.42.0';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_USER_ID, EMAILJS_ACCESS_TOKEN } = Deno.env.toObject();

    const missingVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'EMAILJS_SERVICE_ID',
      'EMAILJS_TEMPLATE_ID',
      'EMAILJS_USER_ID',
      'EMAILJS_ACCESS_TOKEN'
    ].filter((key) => !Deno.env.get(key));

    if (missingVars.length > 0) {
      return new Response(JSON.stringify({
        error: 'Missing environment variables',
        missing: missingVars
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { orderId, return_reason } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({
        error: 'Missing orderId'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // جلب الطلب الأصلي
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // تحليل منتجات الطلب من حقل items (JSON)
    if (!order.items || !Array.isArray(order.items)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order has no items to split'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // تنظيم المنتجات حسب المتجر الأصلي
    const storesMap: Record<string, any> = {};
    order.items.forEach((item: any) => {
      const storeName = item.main_store || item.main_store_name || 'متجر غير معروف';

      if (!storesMap[storeName]) {
        storesMap[storeName] = {
          storeName,
          items: []
        };
      }

      storesMap[storeName].items.push({
        product_name: item.name || 'منتج غير معروف',
        quantity: item.quantity || 1,
        price: item.price || 0,
        discounted_price: item.discounted_price || item.price || 0
      });
    });

    const notificationResults = [];

    // إنشاء طلب ج��يد لكل متجر وإضافة المنتجات
    for (const storeName in storesMap) {
      const storeData = storesMap[storeName];

      // حساب المبلغ الإجمالي للطلب الفرعي
      const totalAmount = storeData.items.reduce((sum: number, item: any) => {
        return sum + ((item.discounted_price || item.price || 0) * (item.quantity || 1));
      }, 0);

      // البحث عن المتجر للحصول على معرفه
      const { data: storeInfo } = await supabase
        .from('stores')
        .select('id, name')
        .eq('name', storeName)
        .single();

      // إنشاء طلب منفصل لكل متجر - معين مباشرة
      const { data: newOrder, error: createOrderError } = await supabase
        .from('orders')
        .insert({
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_address: order.customer_address,
          customer_notes: order.customer_notes,
          order_status: 'assigned',
          assigned_store_id: storeInfo?.id || null,
          main_store_name: storeName,
          items: storeData.items,
          total_amount: totalAmount,
          order_details: `تم تقسيمه من الطلب الأصلي ${order.order_code || orderId}`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createOrderError) {
        notificationResults.push({
          storeName,
          success: false,
          error: createOrderError.message
        });
        continue;
      }

      // إنشاء order_items منفصلة لضمان عرض اسم المتجر الصحيح
      const orderItemsToInsert = storeData.items.map((item: any) => ({
        order_id: newOrder.id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        discounted_price: item.discounted_price,
        main_store_name: storeName
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) {
        console.warn(`⚠️ فشل في إنشاء order_items للمتجر ${storeName}:`, itemsError);
      } else {
        console.log(`✅ تم إنشاء ${orderItemsToInsert.length} order_items للمتجر ${storeName}`);
      }

      // جلب بيانات المتجر لإرسال البريد (البحث بالاسم)
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name, owner_email')
        .eq('name', storeName)
        .single();

      if (storeError || !store) {
        // إذا لم يتم العثور على المتجر، اعتبر العملية ناجحة لكن بدون إشعار
        notificationResults.push({
          storeName,
          success: true,
          warning: 'Store not found in database - order created without notification'
        });
        continue;
      }

      const productsText = storeData.items
        .map((item: any) => `${item.product_name} - الكمية: ${item.quantity} - السعر: ${item.price}${item.discounted_price !== item.price ? ' - السعر بعد الخصم: ' + item.discounted_price : ''}`)
        .join('\n');

      // إرسال البريد الإلكتروني للمتجر إذا كان لديه إيميل
      if (store.owner_email) {
        const emailPayload = {
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_USER_ID,
          accessToken: EMAILJS_ACCESS_TOKEN,
          template_params: {
            to_email: store.owner_email,
            customer_name: order.customer_name,
            product_details: productsText,
            store_name: store.name,
            order_date: new Date(order.created_at).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            return_reason: return_reason || ''
          }
        };

        try {
          const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
          });

          if (!emailRes.ok) {
            throw new Error(await emailRes.text());
          }

          notificationResults.push({
            storeName,
            success: true,
            notified: true
          });
        } catch (emailError) {
          notificationResults.push({
            storeName,
            success: true,
            notified: false,
            error: emailError.message
          });
        }
      } else {
        notificationResults.push({
          storeName,
          success: true,
          notified: false,
          warning: 'No email address for store'
        });
      }
    }

    // حذف الطلب الأصلي بعد التقسيم الناجح
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteError) {
      console.warn('⚠️ Failed to delete original order:', deleteError);
    } else {
      console.log('✅ Original order deleted successfully');
    }

    // حساب الإحصائيات
    const successCount = notificationResults.filter(r => r.success).length;
    const totalStores = Object.keys(storesMap).length;

    return new Response(JSON.stringify({
      success: true,
      message: `تم تقسيم الطلب إلى ${successCount} طلب معين للمتاجر`,
      total_stores: totalStores,
      successful_splits: successCount,
      notifications: notificationResults
    }), {
      headers: corsHeaders
    });

  } catch (err) {
    console.error('❌ Order split failed:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Unexpected error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
