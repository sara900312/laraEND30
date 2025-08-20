export interface NotificationPrompt {
  title: string;
  message: string;
  type: 'admin' | 'store' | 'customer';
  order_id?: string;
  customer_name?: string;
  order_code?: string;
  url?: string;
}

export interface NotificationData {
  id?: string;
  recipient_type: 'admin' | 'store' | 'customer';
  recipient_id: string;
  title: string;
  message: string;
  order_id?: string;
  created_at?: string;
  read?: boolean;
  sent?: boolean;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationSubscription {
  user_id: string;
  user_type: 'admin' | 'store' | 'customer';
  subscription: PushSubscription;
  created_at?: string;
  active?: boolean;
}

export interface NotificationTemplate {
  type: 'order_created' | 'order_assigned' | 'order_confirmed' | 'order_rejected' | 'order_completed';
  recipient_type: 'admin' | 'store' | 'customer';
  title_ar: string;
  message_ar: string;
  url_pattern: string;
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Customer notifications
  order_created_customer: {
    type: 'order_created',
    recipient_type: 'customer',
    title_ar: 'تم إنشاء طلبك',
    message_ar: 'تم إنشاء طلبك رقم {{order_code}} بنجاح، وسيتم معالجته قريباً',
    url_pattern: '/my-orders/{{order_id}}'
  },
  order_confirmed_customer: {
    type: 'order_confirmed',
    recipient_type: 'customer',
    title_ar: 'تم تأكيد طلبك',
    message_ar: 'تم تأكيد طلبك رقم {{order_code}} من المتجر وسيتم التوصيل قريباً',
    url_pattern: '/my-orders/{{order_id}}'
  },
  order_rejected_customer: {
    type: 'order_rejected',
    recipient_type: 'customer',
    title_ar: 'عذراً، تم رفض طلبك',
    message_ar: 'تم رفض طلبك رقم {{order_code}} من المتج��. يرجى المحاولة مرة أخرى',
    url_pattern: '/my-orders/{{order_id}}'
  },
  order_completed_customer: {
    type: 'order_completed',
    recipient_type: 'customer',
    title_ar: 'تم تسليم طلبك',
    message_ar: 'تم تسليم طلبك رقم {{order_code}} بنجاح. شكراً لك',
    url_pattern: '/my-orders/{{order_id}}'
  },

  // Store notifications
  order_assigned_store: {
    type: 'order_assigned',
    recipient_type: 'store',
    title_ar: 'طلب جديد',
    message_ar: 'وصل طلب جديد رقم {{order_code}} من {{customer_name}}',
    url_pattern: '/store/orders/{{order_id}}'
  },

  // Admin notifications
  order_created_admin: {
    type: 'order_created',
    recipient_type: 'admin',
    title_ar: 'طلب جديد',
    message_ar: 'وصل طلب جديد من {{customer_name}}، رقم الطلب: {{order_code}}',
    url_pattern: '/admin/orders/{{order_id}}'
  },
  order_confirmed_admin: {
    type: 'order_confirmed',
    recipient_type: 'admin',
    title_ar: 'تأكيد طلب',
    message_ar: 'تم تأكيد الطلب رقم {{order_code}} من المتجر',
    url_pattern: '/admin/orders/{{order_id}}'
  },
  order_rejected_admin: {
    type: 'order_rejected',
    recipient_type: 'admin',
    title_ar: 'رفض طلب',
    message_ar: 'تم رفض الطلب رقم {{order_code}} من المتجر',
    url_pattern: '/admin/orders/{{order_id}}'
  }
};
