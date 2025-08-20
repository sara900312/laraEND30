import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './notificationService';
import { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;

interface OrderNotificationData {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  itemsCount: number;
  mainStoreName?: string;
}

export class OrderNotificationService {
  private realtimeChannel: any = null;
  private isListening = false;
  private notificationPermission: NotificationPermission = 'default';
  
  // قائمة الإدارة الذين يجب إرسال الإشعارات لهم
  private adminIds = ['admin', 'admin-user', 'admin@laraend.com'];

  constructor() {
    this.checkNotificationPermission();
  }

  private async checkNotificationPermission() {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
      if (this.notificationPermission === 'default') {
        try {
          this.notificationPermission = await Notification.requestPermission();
        } catch (error) {
          console.log('Notification permission request failed:', error);
        }
      }
    }
  }

  /**
   * بدء الاستماع للطلبيات الجديدة
   */
  startListening() {
    if (this.isListening) {
      console.log('🔔 Order notification service already listening');
      return;
    }

    console.log('🔔 Starting order notification service...');

    // إنشاء قناة real-time للاستماع للطلبيات الجديدة
    this.realtimeChannel = supabase
      .channel('new-orders-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🆕 طلب جديد تم إنشاؤه:', payload.new);
          this.handleNewOrder(payload.new as Order);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'order_status=eq.pending'
        },
        (payload) => {
          // التحقق من أن الطلب أصبح معلق (pending) للمرة الأولى
          const oldOrder = payload.old as Order;
          const newOrder = payload.new as Order;
          
          if (oldOrder.order_status !== 'pending' && newOrder.order_status === 'pending') {
            console.log('📋 طلب أصبح معلق:', newOrder);
            this.handlePendingOrder(newOrder);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.isListening = true;
          console.log('✅ بدأ الاستماع للطلبيات الجديدة');
        }
      });
  }

  /**
   * إيقاف الاستماع
   */
  stopListening() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isListening = false;
      console.log('🔇 تم إيقاف الاستماع للطلبيات');
    }
  }

  /**
   * معال��ة الطلب الجديد
   */
  private async handleNewOrder(order: Order) {
    try {
      const orderData = await this.prepareOrderNotificationData(order);
      await this.sendOrderNotification(orderData, 'new');
    } catch (error) {
      console.error('❌ خطأ في معالجة الطلب الجديد:', error);
    }
  }

  /**
   * معالجة الطلب المعلق
   */
  private async handlePendingOrder(order: Order) {
    try {
      const orderData = await this.prepareOrderNotificationData(order);
      await this.sendOrderNotification(orderData, 'pending');
    } catch (error) {
      console.error('❌ خطأ في معالجة الطلب المعلق:', error);
    }
  }

  /**
   * تحضير بيانات الإشعار
   */
  private async prepareOrderNotificationData(order: Order): Promise<OrderNotificationData> {
    // جلب عدد المنتجات في الطلب
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    const itemsCount = orderItems?.length || 0;

    return {
      orderId: order.id,
      orderCode: order.order_code || order.id.slice(0, 8),
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      totalAmount: order.total_amount || 0,
      itemsCount,
      mainStoreName: order.main_store_name || undefined
    };
  }

  /**
   * إرسال إشعار الطلب
   */
  private async sendOrderNotification(orderData: OrderNotificationData, type: 'new' | 'pending') {
    const isNewOrder = type === 'new';
    const title = isNewOrder ? 'طلب جديد وصل!' : 'طلب في انتظار المعالجة';
    const message = `${orderData.customerName} - ${orderData.orderCode}`;
    const body = `${orderData.itemsCount} منتج بقيمة ${orderData.totalAmount} ج.م`;

    // إرسال Browser Notification إذا كانت الصفحة غير نشطة
    if (this.notificationPermission === 'granted' && document.hidden) {
      this.showBrowserNotification(title, body, orderData);
    }

    // إرسال إشعار داخل التطبيق لجميع الإداريين
    for (const adminId of this.adminIds) {
      try {
        await notificationService.sendNotification({
          recipient_type: 'admin',
          recipient_id: adminId,
          title,
          message: `${title}: ${message} (${body})`,
          order_id: orderData.orderId
        });
      } catch (error) {
        console.log('إشعار داخلي غير متاح:', error);
      }
    }

    // تشغيل صوت التنبيه
    this.playNotificationSound();

    console.log(`🔔 تم إرسال إشعار ${isNewOrder ? 'طلب جديد' : 'طلب معلق'}:`, orderData);
  }

  /**
   * عرض Browser Notification
   */
  private showBrowserNotification(title: string, body: string, orderData: OrderNotificationData) {
    if ('Notification' in window && this.notificationPermission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico', // تأكد من وجود أيقونة
        badge: '/favicon.ico',
        tag: `order-${orderData.orderId}`, // لتجنب الإشعارات المكررة
        requireInteraction: true, // يبقى الإشعار حتى يتفاعل المستخدم
        actions: [
          {
            action: 'view',
            title: 'عرض الطلب'
          },
          {
            action: 'dismiss',
            title: 'إغلاق'
          }
        ],
        data: {
          orderId: orderData.orderId,
          url: `/admin-aa-smn-justme9003?orderId=${orderData.orderId}`
        }
      });

      // التعامل مع النقر على الإشعار
      notification.onclick = () => {
        window.focus();
        window.location.href = `/admin-aa-smn-justme9003?orderId=${orderData.orderId}`;
        notification.close();
      };

      // إغلاق الإشعار تلقائياً بعد 10 ثوان
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  }

  /**
   * تشغيل صوت التنبيه
   */
  private playNotificationSound() {
    try {
      // إنشاء ملف صوت بسيط باستخدام Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('لا يمكن تشغيل صوت التنبيه:', error);
    }
  }

  /**
   * اختبار الإشعارات
   */
  async testNotification() {
    const testOrderData: OrderNotificationData = {
      orderId: 'test-' + Date.now(),
      orderCode: 'TEST001',
      customerName: 'عميل تجريبي',
      customerPhone: '01234567890',
      totalAmount: 250,
      itemsCount: 3,
      mainStoreName: 'متجر تجريبي'
    };

    await this.sendOrderNotification(testOrderData, 'new');
    console.log('✅ تم إرسال إشعار تجريبي');
  }

  /**
   * التحقق من حالة الخدمة
   */
  getStatus() {
    return {
      isListening: this.isListening,
      notificationPermission: this.notificationPermission,
      hasNotificationAPI: 'Notification' in window,
      isPageVisible: !document.hidden
    };
  }
}

// إنشاء instance واحد للخدمة
export const orderNotificationService = new OrderNotificationService();

// بدء الخدمة تلقائياً
if (typeof window !== 'undefined') {
  // التأكد من بدء الخدمة عند تحميل الصفحة
  document.addEventListener('DOMContentLoaded', () => {
    orderNotificationService.startListening();
  });

  // إيقاف الخدمة عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    orderNotificationService.stopListening();
  });
}

export default orderNotificationService;
