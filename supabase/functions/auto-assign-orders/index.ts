import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderData {
  order_id: string;
  order_code: string;
  customer_id: string;
  customer_name?: string;
  shipping_type: 'fast' | 'unified';
  order_items: Array<{
    product_id: string;
    store_id: string;
    quantity: number;
    price: number;
  }>;
  total_amount: number;
}

interface OrderEventData {
  order_id: string;
  order_code: string;
  customer_id?: string;
  customer_name?: string;
  store_id?: string;
  store_name?: string;
  shipping_type: 'fast' | 'unified';
  order_status: string;
  product_count?: number;
  total_amount?: number;
  event_type: 'created' | 'assigned' | 'status_changed' | 'split';
  store_ids?: string[];
}

async function sendOrderNotification(orderEventData: OrderEventData): Promise<boolean> {
  try {
    const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/order-notification`;
    
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify(orderEventData)
    });

    if (!response.ok) {
      console.error('❌ Failed to send notification:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Notification sent:', result);
    return true;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return false;
  }
}

async function createOrder(
  supabaseClient: any, 
  orderData: OrderData
): Promise<{ success: boolean; order_id?: string; error?: string }> {
  try {
    console.log('📦 Creating order:', orderData.order_code);

    // Insert order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        order_code: orderData.order_code,
        customer_id: orderData.customer_id,
        customer_name: orderData.customer_name,
        shipping_type: orderData.shipping_type,
        order_status: 'pending',
        total_amount: orderData.total_amount,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Failed to create order:', orderError);
      return { success: false, error: orderError.message };
    }

    console.log('✅ Order created:', order.id);

    // Insert order items
    const orderItems = orderData.order_items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      store_id: item.store_id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('❌ Failed to create order items:', itemsError);
      return { success: false, error: itemsError.message };
    }

    console.log(`✅ Order items created: ${orderItems.length} items`);

    // Send order creation notification
    const notificationData: OrderEventData = {
      order_id: order.id,
      order_code: orderData.order_code,
      customer_id: orderData.customer_id,
      customer_name: orderData.customer_name,
      shipping_type: orderData.shipping_type,
      order_status: 'pending',
      product_count: orderData.order_items.length,
      total_amount: orderData.total_amount,
      event_type: 'created'
    };

    await sendOrderNotification(notificationData);

    return { success: true, order_id: order.id };

  } catch (error) {
    console.error('❌ Error creating order:', error);
    return { success: false, error: error.message };
  }
}

async function assignFastOrder(
  supabaseClient: any,
  orderId: string,
  orderCode: string,
  customerId: string,
  customerName: string,
  storeId: string
): Promise<boolean> {
  try {
    console.log(`🏪 Assigning fast order ${orderCode} to store ${storeId}`);

    // Update order with assigned store
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        assigned_store_id: storeId,
        assigned_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Failed to assign order:', updateError);
      return false;
    }

    // Get store name
    const { data: store } = await supabaseClient
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .single();

    // Send assignment notification
    const notificationData: OrderEventData = {
      order_id: orderId,
      order_code: orderCode,
      customer_id: customerId,
      customer_name: customerName,
      store_id: storeId,
      store_name: store?.name,
      shipping_type: 'fast',
      order_status: 'pending',
      event_type: 'assigned'
    };

    await sendOrderNotification(notificationData);

    console.log('✅ Fast order assigned successfully');
    return true;

  } catch (error) {
    console.error('❌ Error assigning fast order:', error);
    return false;
  }
}

async function splitUnifiedOrder(
  supabaseClient: any,
  orderId: string,
  orderCode: string,
  customerId: string,
  customerName: string,
  orderItems: any[]
): Promise<boolean> {
  try {
    console.log(`📦 Splitting unified order ${orderCode}`);

    // Group items by store
    const storeGroups = orderItems.reduce((groups, item) => {
      const storeId = item.store_id;
      if (!groups[storeId]) {
        groups[storeId] = [];
      }
      groups[storeId].push(item);
      return groups;
    }, {});

    const storeIds = Object.keys(storeGroups);
    console.log(`📊 Order split into ${storeIds.length} stores:`, storeIds);

    // Create order divisions for each store
    for (const storeId of storeIds) {
      const storeItems = storeGroups[storeId];
      const storeTotal = storeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { error: divisionError } = await supabaseClient
        .from('order_divisions')
        .insert({
          order_id: orderId,
          store_id: storeId,
          items: storeItems,
          total_amount: storeTotal,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (divisionError) {
        console.error(`❌ Failed to create division for store ${storeId}:`, divisionError);
        continue;
      }

      console.log(`✅ Division created for store ${storeId}: ${storeItems.length} items, ${storeTotal} SAR`);
    }

    // Send split notification to all stores
    const notificationData: OrderEventData = {
      order_id: orderId,
      order_code: orderCode,
      customer_id: customerId,
      customer_name: customerName,
      shipping_type: 'unified',
      order_status: 'pending',
      product_count: storeIds.length,
      event_type: 'split',
      store_ids: storeIds
    };

    await sendOrderNotification(notificationData);

    console.log('✅ Unified order split completed');
    return true;

  } catch (error) {
    console.error('❌ Error splitting unified order:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    console.log('📥 Auto-assign request:', requestData);

    if (requestData.action === 'create_order') {
      // Create new order
      const orderData: OrderData = requestData.order_data;
      const result = await createOrder(supabaseClient, orderData);

      if (!result.success) {
        return new Response(
          JSON.stringify({ success: false, error: result.error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Process based on shipping type
      if (orderData.shipping_type === 'fast') {
        // For fast orders, find and assign to the best store
        const storeId = orderData.order_items[0]?.store_id;
        if (storeId) {
          await assignFastOrder(
            supabaseClient,
            result.order_id!,
            orderData.order_code,
            orderData.customer_id,
            orderData.customer_name || 'العميل',
            storeId
          );
        }
      } else if (orderData.shipping_type === 'unified') {
        // For unified orders, split by stores
        await splitUnifiedOrder(
          supabaseClient,
          result.order_id!,
          orderData.order_code,
          orderData.customer_id,
          orderData.customer_name || 'العميل',
          orderData.order_items
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order created and processed successfully',
          order_id: result.order_id,
          order_code: orderData.order_code,
          shipping_type: orderData.shipping_type
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (requestData.action === 'assign_fast_order') {
      // Assign existing fast order to store
      const { order_id, order_code, customer_id, customer_name, store_id } = requestData;
      
      const success = await assignFastOrder(
        supabaseClient,
        order_id,
        order_code,
        customer_id,
        customer_name,
        store_id
      );

      return new Response(
        JSON.stringify({
          success,
          message: success ? 'Fast order assigned successfully' : 'Failed to assign fast order'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: success ? 200 : 400 }
      );

    } else if (requestData.action === 'split_unified_order') {
      // Split existing unified order
      const { order_id, order_code, customer_id, customer_name, order_items } = requestData;
      
      const success = await splitUnifiedOrder(
        supabaseClient,
        order_id,
        order_code,
        customer_id,
        customer_name,
        order_items
      );

      return new Response(
        JSON.stringify({
          success,
          message: success ? 'Unified order split successfully' : 'Failed to split unified order'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: success ? 200 : 400 }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Error in auto-assign function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
