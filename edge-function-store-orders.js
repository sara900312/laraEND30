import { createClient } from 'npm:@supabase/supabase-js@2.42.0';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  try {
    const storeId = req.headers.get('x-store-id');
    if (!storeId) {
      return new Response(JSON.stringify({
        error: "Missing x-store-id header"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log(`📊 جلب طلبات المتجر: ${storeId}`);

    // جلب الطلبات أولاً
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_address,
        customer_city,
        items,
        total_amount,
        subtotal,
        customer_notes,
        order_details,
        order_code,
        order_status,
        status,
        assigned_store_id,
        store_response_status,
        store_response_at,
        created_at,
        stores!assigned_store_id(name)
      `)
      .eq("assigned_store_id", storeId)
      .in("order_status", ["assigned", "delivered", "returned"])
      .or("store_response_status.is.null,store_response_status.neq.unavailable")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error('❌ خطأ في جلب الطلبات:', ordersError);
      throw ordersError;
    }

    console.log(`✅ تم جلب ${orders?.length || 0} طلب`);

    // جلب order_items لكل طلب منفصلة
    const enrichedOrders = [];
    
    for (const order of orders || []) {
      console.log(`🔍 جلب order_items للطلب ${order.id}`);
      
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          product_name,
          quantity,
          price,
          discounted_price,
          availability_status,
          product_id,
          main_store_name,
          products!product_id(
            id,
            name
          )
        `)
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error(`❌ خطأ في جلب order_items للطلب ${order.id}:`, itemsError);
        // إضافة الطلب بدون order_items
        enrichedOrders.push({
          ...order,
          order_items: [],
          items_source: 'error'
        });
      } else {
        console.log(`✅ تم جلب ${orderItems?.length || 0} عنصر للطلب ${order.id}`);
        enrichedOrders.push({
          ...order,
          order_items: orderItems || [],
          items_source: 'order_items_table'
        });
      }
    }

    // إحصائيات مفيدة
    const stats = {
      total: enrichedOrders.length,
      assigned: enrichedOrders.filter(o => o.order_status === 'assigned').length,
      delivered: enrichedOrders.filter(o => o.order_status === 'delivered').length,
      returned: enrichedOrders.filter(o => o.order_status === 'returned').length,
      with_order_items: enrichedOrders.filter(o => o.order_items && o.order_items.length > 0).length,
      without_order_items: enrichedOrders.filter(o => !o.order_items || o.order_items.length === 0).length
    };

    console.log('📈 إحصائيات الطلبات:', stats);

    return new Response(JSON.stringify({
      success: true,
      orders: enrichedOrders,
      stats: stats
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ خطأ عام في Edge Function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal Server Error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
