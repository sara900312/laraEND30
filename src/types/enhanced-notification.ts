export interface EnhancedNotificationPrompt {
  title: string;
  message: string;
  type: 'admin' | 'store' | 'customer';
  order_id?: string;
  order_code?: string;
  customer_name?: string;
  store_name?: string;
  shipping_type?: 'fast' | 'unified';
  order_status?: string;
  product_count?: number;
  total_amount?: number;
  url?: string;
  action_required?: boolean;
}

export interface EnhancedNotificationData {
  id?: string;
  recipient_type: 'admin' | 'store' | 'customer';
  recipient_id: string;
  title: string;
  message: string;
  order_id?: string;
  created_at?: string;
  read?: boolean;
  sent?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface OrderEventData {
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
}

export interface NotificationTemplate {
  type: string;
  recipient_type: 'admin' | 'store' | 'customer';
  title_ar: string;
  message_ar: string;
  url_pattern: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_required: boolean;
}

export const ENHANCED_NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // ===== CUSTOMER NOTIFICATIONS =====
  
  // Fast Order - Customer notifications
  'fast_order_created_customer': {
    type: 'order_created',
    recipient_type: 'customer',
    title_ar: 'تم إنشاء طلبك السريع',
    message_ar: 'تم إنشاء طلبك السريع {{order_code}} بنجاح وسيتم توصيله خلال 30 دقيقة',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'high',
    action_required: false
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
  
  'fast_order_prepared_customer': {
    type: 'order_prepared',
    recipient_type: 'customer',
    title_ar: 'طلبك السريع جاهز للتوصيل',
    message_ar: 'طلبك السريع {{order_code}} ج��هز وسيصل إليك خلال دقائق',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'urgent',
    action_required: false
  },
  
  'fast_order_shipped_customer': {
    type: 'order_shipped',
    recipient_type: 'customer',
    title_ar: 'طلبك السريع في الطريق',
    message_ar: 'طلبك السريع {{order_code}} في الطريق إليك الآن',
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

  // Unified Order - Customer notifications
  'unified_order_created_customer': {
    type: 'order_created',
    recipient_type: 'customer',
    title_ar: 'تم إنشاء طلبك الموحد',
    message_ar: 'تم إنشاء طلبك الموحد {{order_code}} بنجاح وسيتم تجميعه من {{product_count}} متجر',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
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
  
  'unified_order_partial_confirmed_customer': {
    type: 'order_partial_confirmed',
    recipient_type: 'customer',
    title_ar: 'تأكيد جزئي لطلبك الموحد',
    message_ar: 'تم تأكيد جزء من طلبك الموحد {{order_code}}. سنتواصل معك قريباً بخصوص باقي المنتجات',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'medium',
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
  
  'unified_order_delivered_customer': {
    type: 'order_delivered',
    recipient_type: 'customer',
    title_ar: 'تم تسليم طلبك الموحد',
    message_ar: 'تم تسليم طلبك الموحد {{order_code}} بنجاح. شكراً لثقتك',
    url_pattern: '/customer/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  },

  // ===== STORE NOTIFICATIONS =====
  
  // Fast Order - Store notifications
  'fast_order_assigned_store': {
    type: 'order_assigned',
    recipient_type: 'store',
    title_ar: 'طلب سريع جديد - عاجل',
    message_ar: 'وصل طلب سريع جديد {{order_code}} من {{customer_name}}. مطلوب التأكيد فوراً',
    url_pattern: '/store/orders/{{order_id}}',
    priority: 'urgent',
    action_required: true
  },
  
  'fast_order_reminder_store': {
    type: 'order_reminder',
    recipient_type: 'store',
    title_ar: 'تذكير: طلب سريع في انتظار التأكيد',
    message_ar: 'الطلب السريع {{order_code}} لا يزال في انتظار تأكيدكم. يرجى الرد سريعاً',
    url_pattern: '/store/orders/{{order_id}}',
    priority: 'urgent',
    action_required: true
  },

  // Unified Order - Store notifications
  'unified_order_assigned_store': {
    type: 'order_assigned',
    recipient_type: 'store',
    title_ar: 'منتجات جديدة في طلب موحد',
    message_ar: 'تم إضافة {{product_count}} منتج من متجركم للطلب الموحد {{order_code}}',
    url_pattern: '/store/orders/{{order_id}}',
    priority: 'medium',
    action_required: true
  },
  
  'unified_order_reminder_store': {
    type: 'order_reminder',
    recipient_type: 'store',
    title_ar: 'تذكير: منتجات في طلب موحد تنتظر التأكيد',
    message_ar: 'منتجاتكم في الطلب الموحد {{order_code}} لا تزال تنتظر التأكيد',
    url_pattern: '/store/orders/{{order_id}}',
    priority: 'medium',
    action_required: true
  },
  
  'unified_order_ready_for_pickup_store': {
    type: 'order_pickup_ready',
    recipient_type: 'store',
    title_ar: 'جاهز للاستلام من المتجر',
    message_ar: 'منتجاتكم في الطلب الموحد {{order_code}} جاهزة للاستلام من المتجر',
    url_pattern: '/store/orders/{{order_id}}',
    priority: 'high',
    action_required: false
  },

  // ===== ADMIN NOTIFICATIONS =====
  
  // Fast Order - Admin notifications
  'fast_order_created_admin': {
    type: 'order_created',
    recipient_type: 'admin',
    title_ar: 'طلب سريع جديد',
    message_ar: 'طلب سريع جديد {{order_code}} من {{customer_name}} - المبلغ: {{total_amount}} ريال',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  },
  
  'fast_order_rejected_admin': {
    type: 'order_rejected',
    recipient_type: 'admin',
    title_ar: 'تم رفض طلب سريع',
    message_ar: 'تم رفض الطلب السريع {{order_code}} من {{store_name}}',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'high',
    action_required: true
  },
  
  'fast_order_timeout_admin': {
    type: 'order_timeout',
    recipient_type: 'admin',
    title_ar: 'انتهت مهلة الطلب السريع',
    message_ar: 'انتهت مهلة تأكيد الطلب السريع {{order_code}} من {{store_name}}',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'urgent',
    action_required: true
  },

  // Unified Order - Admin notifications
  'unified_order_created_admin': {
    type: 'order_created',
    recipient_type: 'admin',
    title_ar: 'طلب موحد جديد',
    message_ar: 'طلب موحد جديد {{order_code}} من {{customer_name}} - {{product_count}} متجر - {{total_amount}} ريال',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  },
  
  'unified_order_split_completed_admin': {
    type: 'order_split_completed',
    recipient_type: 'admin',
    title_ar: 'تم تقسيم الطلب الموحد',
    message_ar: 'تم تقسيم الطلب الموحد {{order_code}} وإرسال الإشعارات للمتاجر',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  },
  
  'unified_order_all_confirmed_admin': {
    type: 'order_confirmed',
    recipient_type: 'admin',
    title_ar: 'تأكيد كامل للطلب الموحد',
    message_ar: 'تم تأكيد جميع منتجات الطلب الموحد {{order_code}} من جميع المتاجر',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'medium',
    action_required: false
  },
  
  'unified_order_partial_rejection_admin': {
    type: 'order_partial_rejected',
    recipient_type: 'admin',
    title_ar: 'رفض جزئي للطلب الموحد',
    message_ar: 'تم رفض جزء من منتجات الطلب الموحد {{order_code}}. مطلوب متابعة',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'high',
    action_required: true
  },
  
  // System notifications
  'system_error_admin': {
    type: 'system_error',
    recipient_type: 'admin',
    title_ar: 'خطأ في النظام',
    message_ar: 'حدث خطأ في معالجة الطلب {{order_code}}. مطلوب تدخل فوري',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'urgent',
    action_required: true
  },
  
  'payment_issue_admin': {
    type: 'payment_issue',
    recipient_type: 'admin',
    title_ar: 'مشكلة في الدفع',
    message_ar: 'مشكلة في معالجة دفع الطلب {{order_code}} - مبلغ {{total_amount}} ��يال',
    url_pattern: '/admin/orders/{{order_id}}',
    priority: 'urgent',
    action_required: true
  }
};

// Helper functions for creating notifications
export const createOrderNotification = (
  templateKey: string,
  orderData: OrderEventData,
  additionalData?: Record<string, any>
): EnhancedNotificationPrompt | null => {
  const template = ENHANCED_NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    console.error(`Template ${templateKey} not found`);
    return null;
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
    '{{order_id}}': orderData.order_id,
    ...additionalData
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
    action_required: template.action_required
  };
};
