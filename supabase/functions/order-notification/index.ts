import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderEventData {
  order_id: string;
  order_code: string;
  customer_id?: string;
  customer_name?: string;
  store_id?: string;
  store_name?: string;
  shipping_type: 'fast' | 'unified';
  order_status: 'pending' | 'confirmed' | 'prepared' | 'shipped' | 'delivered' | 'cancelled' | 'rejected';
  product_count?: number;
  total_amount?: number;
  rejection_reason?: string;
  estimated_delivery?: string;
  event_type: 'created' | 'assigned' | 'status_changed' | 'split' | 'reminder';
  store_ids?: string[]; // For unified orders
  previous_status?: string;
}

interface NotificationTemplate {
  type: string;
  recipient_type: 'admin' | 'store' | 'customer';
  title_ar: string;
  message_ar: string;
  url_pattern: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_required: boolean;
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Fast Order Templates
  'fast_order_created_customer': {
    type: 'order_created',
    recipient_type: 'customer',
    title_ar: 'تم إنشاء طلبك السريع',
    message_ar: 'تم إنشاء طلبك السريع {{order_code}} بنجاح وسيتم توصيله خلال 30 دقيقة',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'high',
    action_required: false
  },
  'fast_order_assigned_store': {
    type: 'order_assigned',
    recipient_type: 'store',
    title_ar: 'طلب سريع جديد - عاجل',
    message_ar: 'وصل طلب سريع جديد {{order_code}} من {{customer_name}}. مطلوب التأكيد فوراً',
    url_pattern: '/store/orders/{{order_id}}',
    priority: 'urgent',
    action_required: true
  },
  'fast_order_confirmed_customer': {
    type: 'order_confirmed',
    recipient_type: 'customer',
    title_ar: 'تم تأكيد طلبك السريع',
    message_ar: 'تم تأكيد طلبك السريع {{order_code}} من {{store_name}} وجاري التحضير',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'high',
    action_required: false
  },
  'fast_order_shipped_customer': {
    type: 'order_shipped',
    recipient_type: 'customer',
    title_ar: 'طلبك السريع في الطريق',
    message_ar: 'طلبك الس��يع {{order_code}} في الطريق إليك الآن',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'urgent',
    action_required: false
  },
  'fast_order_delivered_customer': {
    type: 'order_delivered',
    recipient_type: 'customer',
    title_ar: 'تم تسليم طلبك السريع',
    message_ar: 'تم تسليم طلبك السريع {{order_code}} بنجاح. شكراً لاختيارك خدمتنا',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  },
  'fast_order_rejected_customer': {
    type: 'order_rejected',
    recipient_type: 'customer',
    title_ar: 'عذراً، تم رفض طلبك السريع',
    message_ar: 'تم رفض طلبك السريع {{order_code}} من {{store_name}}. {{rejection_reason}}',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'high',
    action_required: true
  },

  // Unified Order Templates
  'unified_order_created_customer': {
    type: 'order_created',
    recipient_type: 'customer',
    title_ar: 'تم إنشاء طلبك الموحد',
    message_ar: 'تم إنشاء طلبك الموحد {{order_code}} بنجاح وسيتم تجميعه من {{product_count}} متجر',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  },
  'unified_order_assigned_store': {
    type: 'order_assigned',
    recipient_type: 'store',
    title_ar: 'منتجات جديدة في طلب موحد',
    message_ar: 'تم إضافة {{product_count}} منتج من متجركم للطلب الموحد {{order_code}}',
    url_pattern: '/store/orders/{{order_id}}',
    priority: 'medium',
    action_required: true
  },
  'unified_order_all_confirmed_customer': {
    type: 'order_confirmed',
    recipient_type: 'customer',
    title_ar: 'تم تأكيد طلبك الموحد بالكامل',
    message_ar: 'تم تأكيد جميع منتجات طلبك الموحد {{order_code}} وجاري التحضير للشحن',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'high',
    action_required: false
  },
  'unified_order_shipped_customer': {
    type: 'order_shipped',
    recipient_type: 'customer',
    title_ar: 'تم شحن طلبك الموحد',
    message_ar: 'تم شحن طلبك الموحد {{order_code}} وسيصل إليك خلال {{estimated_delivery}}',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'high',
    action_required: false
  },

  // Admin Templates
  'fast_order_created_admin': {
    type: 'order_created',
    recipient_type: 'admin',
    title_ar: 'طلب سريع جديد',
    message_ar: 'طلب سريع جديد {{order_code}} من {{customer_name}} - المبلغ: {{total_amount}} ريال',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  },
  'unified_order_created_admin': {
    type: 'order_created',
    recipient_type: 'admin',
    title_ar: 'طلب موحد جديد',
    message_ar: 'طلب موحد جديد {{order_code}} من {{customer_name}} - {{product_count}} متجر - {{total_amount}} ريال',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  }
};

function createNotification(templateKey: string, orderData: OrderEventData): any {
  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Template ${templateKey} not found`);
  }

  let message = template.message_ar;
  let url = template.url_pattern;

  // Replace placeholders
  const replacements = {
    '{{order_code}}': orderData.order_code,
    '{{customer_name}}': orderData.customer_name || 'العميل',
    '{{store_name}}': orderData.store_name || 'المتجر',
    '{{product_count}}': orderData.product_count?.toString() || '0',
    '{{total_amount}}': orderData.total_amount?.toString() || '0',
    '{{rejection_reason}}': orderData.rejection_reason || 'لم يتم تحديد السبب',
    '{{estimated_delivery}}': orderData.estimated_delivery || 'يوم واحد',
    '{{order_id}}': orderData.order_id
  };

  Object.entries(replacements).forEach(([placeholder, value]) => {
    if (value) {
      message = message.replace(new RegExp(placeholder, 'g'), value);
      url = url.replace(new RegExp(placeholder, 'g'), value);
    }
  });

  return {
    title: template.title_ar,
    message,
    type: template.recipient_type,
    order_id: orderData.order_id,
    order_code: orderData.order_code,
    customer_name: orderData.customer_name,
    store_name: orderData.store_name,
    shipping_type: orderData.shipping_type,
    order_status: orderData.order_status,
    product_count: orderData.product_count,
    total_amount: orderData.total_amount,
    url,
    action_required: template.action_required,
    priority: template.priority
  };
}

async function sendNotificationToUser(
  supabaseClient: any,
  recipientId: string,
  recipientType: 'admin' | 'store' | 'customer',
  prompt: any
): Promise<boolean> {
  try {
    // Save notification to database
    const { error } = await supabaseClient
      .from('notifications')
      .insert({
        recipient_type: recipientType,
        recipient_id: recipientId,
        title: prompt.title,
        message: prompt.message,
        order_id: prompt.order_id,
        created_at: new Date().toISOString(),
        read: false,
        sent: true
      });

    if (error) {
      console.error('❌ Failed to save notification:', error);
      return false;
    }

    console.log(`✅ Notification saved for ${recipientType} ${recipientId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
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

    const orderData: OrderEventData = await req.json();
    console.log('📧 Processing order notification:', orderData);

    const results: any[] = [];

    // Process based on event type and shipping type
    if (orderData.event_type === 'created') {
      if (orderData.shipping_type === 'fast') {
        // Fast order creation notifications
        
        // Notify customer
        if (orderData.customer_id) {
          const customerPrompt = createNotification('fast_order_created_customer', orderData);
          const customerResult = await sendNotificationToUser(
            supabaseClient, 
            orderData.customer_id, 
            'customer', 
            customerPrompt
          );
          results.push({ recipient: 'customer', success: customerResult });
        }

        // Notify admin
        const adminPrompt = createNotification('fast_order_created_admin', orderData);
        const adminResult = await sendNotificationToUser(
          supabaseClient, 
          'admin', 
          'admin', 
          adminPrompt
        );
        results.push({ recipient: 'admin', success: adminResult });

      } else if (orderData.shipping_type === 'unified') {
        // Unified order creation notifications
        
        // Notify customer
        if (orderData.customer_id) {
          const customerPrompt = createNotification('unified_order_created_customer', orderData);
          const customerResult = await sendNotificationToUser(
            supabaseClient, 
            orderData.customer_id, 
            'customer', 
            customerPrompt
          );
          results.push({ recipient: 'customer', success: customerResult });
        }

        // Notify admin
        const adminPrompt = createNotification('unified_order_created_admin', orderData);
        const adminResult = await sendNotificationToUser(
          supabaseClient, 
          'admin', 
          'admin', 
          adminPrompt
        );
        results.push({ recipient: 'admin', success: adminResult });
      }

    } else if (orderData.event_type === 'assigned') {
      // Order assignment notifications
      if (orderData.store_id) {
        const templateKey = orderData.shipping_type === 'fast' 
          ? 'fast_order_assigned_store' 
          : 'unified_order_assigned_store';
        
        const storePrompt = createNotification(templateKey, orderData);
        const storeResult = await sendNotificationToUser(
          supabaseClient, 
          orderData.store_id, 
          'store', 
          storePrompt
        );
        results.push({ recipient: 'store', success: storeResult });
      }

    } else if (orderData.event_type === 'split' && orderData.shipping_type === 'unified') {
      // Unified order split notifications
      if (orderData.store_ids) {
        for (const storeId of orderData.store_ids) {
          const storePrompt = createNotification('unified_order_assigned_store', orderData);
          const storeResult = await sendNotificationToUser(
            supabaseClient, 
            storeId, 
            'store', 
            storePrompt
          );
          results.push({ recipient: `store_${storeId}`, success: storeResult });
        }
      }

    } else if (orderData.event_type === 'status_changed') {
      // Status change notifications
      if (orderData.shipping_type === 'fast') {
        switch (orderData.order_status) {
          case 'confirmed':
            if (orderData.customer_id) {
              const prompt = createNotification('fast_order_confirmed_customer', orderData);
              const result = await sendNotificationToUser(supabaseClient, orderData.customer_id, 'customer', prompt);
              results.push({ recipient: 'customer', success: result });
            }
            break;
          case 'shipped':
            if (orderData.customer_id) {
              const prompt = createNotification('fast_order_shipped_customer', orderData);
              const result = await sendNotificationToUser(supabaseClient, orderData.customer_id, 'customer', prompt);
              results.push({ recipient: 'customer', success: result });
            }
            break;
          case 'delivered':
            if (orderData.customer_id) {
              const prompt = createNotification('fast_order_delivered_customer', orderData);
              const result = await sendNotificationToUser(supabaseClient, orderData.customer_id, 'customer', prompt);
              results.push({ recipient: 'customer', success: result });
            }
            break;
          case 'rejected':
            if (orderData.customer_id) {
              const prompt = createNotification('fast_order_rejected_customer', orderData);
              const result = await sendNotificationToUser(supabaseClient, orderData.customer_id, 'customer', prompt);
              results.push({ recipient: 'customer', success: result });
            }
            break;
        }
      } else if (orderData.shipping_type === 'unified') {
        switch (orderData.order_status) {
          case 'confirmed':
            if (orderData.customer_id) {
              const prompt = createNotification('unified_order_all_confirmed_customer', orderData);
              const result = await sendNotificationToUser(supabaseClient, orderData.customer_id, 'customer', prompt);
              results.push({ recipient: 'customer', success: result });
            }
            break;
          case 'shipped':
            if (orderData.customer_id) {
              const prompt = createNotification('unified_order_shipped_customer', orderData);
              const result = await sendNotificationToUser(supabaseClient, orderData.customer_id, 'customer', prompt);
              results.push({ recipient: 'customer', success: result });
            }
            break;
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} notifications, ${successCount} successful`,
        results,
        order_code: orderData.order_code,
        event_type: orderData.event_type,
        shipping_type: orderData.shipping_type
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in order-notification function:', error);
    
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
