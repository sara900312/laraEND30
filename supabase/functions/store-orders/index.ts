import { createClient } from 'npm:@supabase/supabase-js@2.42.0';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-store-id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({
      error: 'Missing environment variables'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  try {
    const url = new URL(req.url);
    const method = req.method;
    const store_id = req.headers.get('x-store-id');
    const isAdminMode = url.searchParams.get('adminMode') === 'true';

    if (!store_id && !isAdminMode) {
      return new Response(JSON.stringify({
        error: "Missing x-store-id header"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // ===== دوال الإشعارات مع Realtime broadcast =====
    async function notify(recipient_type: string, recipient_id: string | null, message: string, order_id: string) {
      await supabase.from('notifications').insert({
        recipient_type,
        recipient_id: recipient_id || null,
        message,
        order_id
      });

      // بث Realtime للإشعارات
      await supabase.channel('notifications_channel').send({
        type: 'broadcast',
        event: 'notification_update',
        payload: {
          order_id,
          recipient_type,
          recipient_id,
          message
        }
      });
    }

    async function notifyAdmin(message: string, order_id: string) {
      return notify('admin', null, message, order_id);
    }

    async function notifyStore(store_id: string, message: string, order_id: string) {
      return notify('store', store_id, message, order_id);
    }

    async function notifyCustomer(customer_phone: string, message: string, order_id: string) {
      return notify('customer', customer_phone, message, order_id);
    }

    async function notifyAllStores(order_id: string, message: string) {
      const { data: stores } = await supabase.from('stores').select('id');
      for (const store of stores || []) {
        await notifyStore(store.id, message, order_id);
      }
    }

    // ===== دالة Realtime broadcast للطلبات =====
    async function sendRealtimeNotification(orderId: string, type: string, storeId: string) {
      const payload = {
        orderId,
        type,
        storeId
      };

      await supabase.channel('orders_channel').send({
        type: 'broadcast',
        event: 'order_update',
        payload
      });
    }

    // ===== POST: تحديث حالة المتجر (متوفر/غير متوفر) =====
    if (method === 'POST') {
      const body = await req.json();
      const { order_id, response_type } = body;

      if (!order_id || !response_type) {
        return new Response(JSON.stringify({
          error: "Missing order_id or response_type"
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .maybeSingle();

      if (orderError || !order) {
        return new Response(JSON.stringify({
          error: "Order not found"
        }), {
          status: 404,
          headers: corsHeaders
        });
      }

      if (!order.assigned_store_id && !isAdminMode) {
        return new Response(JSON.stringify({
          error: "assigned_store_id is missing for this order"
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      if (!isAdminMode && order.assigned_store_id !== store_id) {
        return new Response(JSON.stringify({
          error: "Order not assigned to your store"
        }), {
          status: 403,
          headers: corsHeaders
        });
      }

      // تحديث store_response_status
      const status = response_type === "available" ? "available" : 
                    response_type === "unavailable" ? "unavailable" : null;

      if (!status) {
        return new Response(JSON.stringify({
          error: "Invalid response_type"
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // تحديث حالة الرد
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          store_response_status: status,
          store_response_at: new Date().toISOString()
        })
        .eq("id", order_id);

      if (updateError) {
        return new Response(JSON.stringify({
          error: updateError.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      // إشعارات
      await notifyAdmin(`تم تحديث رد المتجر للطلب ${order.order_code}: ${status}`, order_id);
      await sendRealtimeNotification(order_id, `store_response_${status}`, store_id);

      return new Response(JSON.stringify({
        success: true,
        message: `Marked as ${status}`
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // ===== PUT: تحديث حالة التسليم (مسلم/مرتجع) =====
    if (method === 'PUT') {
      const body = await req.json();
      const { order_id, delivery_status, return_reason } = body;

      if (!order_id || !delivery_status) {
        return new Response(JSON.stringify({
          error: "Missing order_id or delivery_status"
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .maybeSingle();

      if (orderError || !order) {
        return new Response(JSON.stringify({
          error: "Order not found"
        }), {
          status: 404,
          headers: corsHeaders
        });
      }

      // التحقق من صلاحية المتجر
      if (!isAdminMode && order.assigned_store_id !== store_id) {
        return new Response(JSON.stringify({
          error: "Order not assigned to your store"
        }), {
          status: 403,
          headers: corsHeaders
        });
      }

      // التحقق من الحالات المسموحة
      const allowedStatuses = ['delivered', 'returned'];
      if (!allowedStatuses.includes(delivery_status)) {
        return new Response(JSON.stringify({
          error: "Invalid delivery_status. Must be 'delivered' or 'returned'"
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // إعداد البيانات للتحديث
      const updateData: any = {
        order_status: delivery_status,
        updated_at: new Date().toISOString()
      };

      // إضافة تفاصيل الإرجاع إذا كان الطلب مرتجعاً
      if (delivery_status === 'returned') {
        if (!return_reason) {
          return new Response(JSON.stringify({
            error: "return_reason is required for returned orders"
          }), {
            status: 400,
            headers: corsHeaders
          });
        }
        updateData.order_details = `Return reason: ${return_reason}`;
      } else if (delivery_status === 'delivered') {
        updateData.completed_at = new Date().toISOString();
      }

      // تحديث الطلب
      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order_id);

      if (updateError) {
        return new Response(JSON.stringify({
          error: updateError.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      // إشعارات
      const statusMessage = delivery_status === 'delivered' ? 'تم تسليم' : 'تم إرجاع';
      await notifyAdmin(`${statusMessage} الطلب ${order.order_code}`, order_id);
      await notifyCustomer(
        order.customer_phone, 
        `${statusMessage} طلبك ${order.order_code}${delivery_status === 'returned' ? ` - السبب: ${return_reason}` : ''}`, 
        order_id
      );
      await sendRealtimeNotification(order_id, delivery_status, store_id);

      return new Response(JSON.stringify({
        success: true,
        message: `Order marked as ${delivery_status}`,
        order_status: delivery_status
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // ===== GET: تفاصيل الطلب =====
    if (method === 'GET') {
      const orderId = url.searchParams.get('orderId');

      if (!orderId) {
        return new Response(JSON.stringify({
          error: 'Missing orderId in query'
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (!order) {
        return new Response(JSON.stringify({
          error: 'Order not found'
        }), {
          status: 404,
          headers: corsHeaders
        });
      }

      const { data: items } = await supabase
        .from('order_items')
        .select(`
          quantity, price, discounted_price, product_id, product_name,
          store_id, main_store_name,
          products:product_id (name)
        `)
        .eq('order_id', orderId);

      // تحديد ما إذا كان يجب عرض بيانات العميل
      let showCustomerData = isAdminMode ? true : false;

      if (!isAdminMode && store_id) {
        // للمتاجر: عرض بيانات العميل فقط إذا كان الطلب متوفراً أو مسلماً
        showCustomerData = order.store_response_status === "available" || 
                          order.order_status === "delivered" ||
                          order.order_status === "returned";
      }

      return new Response(JSON.stringify({
        success: true,
        order: {
          ...order,
          customer_name: showCustomerData ? order.customer_name : null,
          customer_phone: showCustomerData ? order.customer_phone : null,
          customer_address: showCustomerData ? order.customer_address : null,
          customer_notes: showCustomerData ? order.customer_notes : null,
          items: items || []
        }
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // ===== Auto-Assign Orders =====
    if (url.pathname.endsWith('/auto-assign-orders')) {
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('order_status', 'pending');

      if (!pendingOrders || pendingOrders.length === 0) {
        return new Response(JSON.stringify({
          message: 'لا توجد طلبات للتخصيص'
        }), {
          status: 200,
          headers: corsHeaders
        });
      }

      const { data: stores } = await supabase.from('stores').select('*');
      const storesMap: any = {};
      stores?.forEach((s: any) => storesMap[s.id] = s.name);

      for (const order of pendingOrders) {
        const storeData = {
          storeId: order.store_id,
          storeName: storesMap[order.store_id] || 'متجر غير معروف',
          items: order.items || []
        };

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            order_status: 'assigned',
            assigned_store_id: storeData.storeId,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          console.error('خطأ عند تحديث الطلب:', updateError);
          continue;
        }

        // إشعارات وبث Realtime
        await notifyAdmin(`تم تخصيص الطلب ${order.order_code} للمتجر ${storeData.storeName}`, order.id);
        await notifyStore(storeData.storeId, `تم تخصيص طلب جديد لك: ${order.order_code}`, order.id);
        await notifyCustomer(order.customer_phone, `تم تخصيص طلبك ${order.order_code} للمتجر ${storeData.storeName}`, order.id);
        await sendRealtimeNotification(order.id, 'order_assigned', storeData.storeId);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'تم تخصيص جميع الطلبات بنجاح'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      error: 'Unsupported request method or path'
    }), {
      status: 405,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || 'Internal Server Error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
