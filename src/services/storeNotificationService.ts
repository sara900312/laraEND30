import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/utils/errorHandler';

interface StoreNotificationData {
  storeId: string;
  title: string;
  message: string;
  type: 'order_assigned' | 'order_reminder' | 'system' | 'general';
  orderId?: string;
  orderCode?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

class StoreNotificationService {
  private baseUrl = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

  async sendNotification(data: StoreNotificationData): Promise<boolean> {
    try {
      console.log('📤 Sending store notification:', data);
      
      // Create notification with new table structure
      const notificationData = {
        recipient_type: 'store',
        recipient_id: data.storeId,
        title: data.title,
        message: data.message,
        order_id: data.orderId || null,
        read: false,
        sent: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (error) {
        console.error('❌ Supabase error in send store notification:', {
          message: error.message || 'Unknown error',
          details: error.details || 'No details available',
          hint: error.hint || 'No hint available',
          code: error.code || 'No code available',
          data
        });
        handleSupabaseError(error, 'send store notification', data);
        return false;
      }

      console.log('✅ Store notification sent successfully:', data);

      // Mark as sent after successful insertion
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ sent: true })
        .eq('recipient_id', data.storeId)
        .eq('title', data.title)
        .eq('message', data.message)
        .eq('sent', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (updateError) {
        console.warn('⚠️ Failed to mark notification as sent:', updateError);
      }

      return true;
    } catch (error) {
      console.error('��� Error sending store notification:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        data
      });
      return false;
    }
  }

  // إشعار طلب جديد للمتجر
  async notifyNewOrder(storeId: string, orderCode: string, customerName: string, orderId?: string): Promise<boolean> {
    return await this.sendNotification({
      storeId,
      title: 'طلب جديد وصل!',
      message: `وصل طلب جديد رقم ${orderCode} من العميل ${customerName}. يرجى المراجعة والرد سريعاً.`,
      type: 'order_assigned',
      orderId,
      orderCode,
      priority: 'high'
    });
  }

  // تذكير للمتجر بطلب لم يتم الرد عليه
  async sendOrderReminder(storeId: string, orderCode: string, orderId?: string): Promise<boolean> {
    return await this.sendNotification({
      storeId,
      title: 'تذكير: طلب في انتظار الرد',
      message: `الطلب رقم ${orderCode} لا يزال في انتظار ردكم. يرجى المراجعة والرد في أقرب وقت.`,
      type: 'order_reminder',
      orderId,
      orderCode,
      priority: 'urgent'
    });
  }

  // إشعار نظام للم��جر
  async sendSystemNotification(storeId: string, title: string, message: string): Promise<boolean> {
    return await this.sendNotification({
      storeId,
      title,
      message,
      type: 'system',
      priority: 'medium'
    });
  }

  // إشعار عام للمتجر
  async sendGeneralNotification(storeId: string, title: string, message: string): Promise<boolean> {
    return await this.sendNotification({
      storeId,
      title,
      message,
      type: 'general',
      priority: 'low'
    });
  }

  // إشعار جماعي لجميع المتاجر
  async sendBroadcastNotification(title: string, message: string, type: 'system' | 'general' = 'general'): Promise<number> {
    try {
      // الحصول على جميع المتاجر
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id');

      if (error || !stores) {
        console.error('❌ Failed to get stores for broadcast:', {
          error: error?.message || JSON.stringify(error) || String(error),
          details: error?.details || 'No details available',
          hint: error?.hint || 'No hint available'
        });
        return 0;
      }

      let successCount = 0;
      
      // إرسال إشعار لكل متجر
      for (const store of stores) {
        const success = await this.sendNotification({
          storeId: store.id,
          title,
          message,
          type,
          priority: type === 'system' ? 'high' : 'medium'
        });
        
        if (success) successCount++;
      }

      console.log(`📢 Broadcast notification sent to ${successCount}/${stores.length} stores`);
      return successCount;
    } catch (error) {
      console.error('❌ Error sending broadcast notification:', error);
      return 0;
    }
  }

  // تشغيل إشعارات تلقائية للطلبات الجديدة
  async processOrderAssignment(orderId: string, orderCode: string, storeId: string, customerName: string): Promise<void> {
    try {
      console.log(`📱 Processing order assignment notification: ${orderCode} → Store ${storeId}`);
      
      await this.notifyNewOrder(storeId, orderCode, customerName, orderId);
      
      // إعداد تذكير تلقائي بعد 10 دقائق إذا لم يتم الرد
      setTimeout(async () => {
        try {
          // التحقق من حالة الطلب
          const { data: order } = await supabase
            .from('orders')
            .select('store_response_status')
            .eq('id', orderId)
            .single();

          // إرسال تذكير فقط إذا لم يتم الرد بعد
          if (!order?.store_response_status) {
            await this.sendOrderReminder(storeId, orderCode, orderId);
            console.log(`⏰ Reminder sent for order ${orderCode}`);
          }
        } catch (error) {
          console.error('❌ Error checking order status for reminder:', error);
        }
      }, 10 * 60 * 1000); // 10 دقائق

    } catch (error) {
      console.error('❌ Error processing order assignment notification:', error);
    }
  }

  // الحصول على إحصائيات الإشعارات للمتجر
  async getNotificationStats(storeId: string): Promise<{
    total: number;
    unread: number;
    unsent: number;
    byType: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('read, sent, recipient_type')
        .eq('recipient_id', storeId)
        .eq('recipient_type', 'store');

      if (error || !data) {
        console.error('❌ Error getting notification stats:', error);
        return { total: 0, unread: 0, unsent: 0, byType: {} };
      }

      const stats = {
        total: data.length,
        unread: data.filter(n => !n.read).length,
        unsent: data.filter(n => !n.sent).length,
        byType: {} as Record<string, number>
      };

      // إحصائيات حسب النوع
      data.forEach(notification => {
        const type = notification.recipient_type || 'general';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting notification stats:', {
        error: error instanceof Error ? error.message : JSON.stringify(error) || String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        storeId
      });
      return { total: 0, unread: 0, unsent: 0, byType: {} };
    }
  }

  // Get notifications for a specific store
  async getStoreNotifications(storeId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, order_id, created_at, read, sent')
        .eq('recipient_id', storeId)
        .eq('recipient_type', 'store')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error getting store notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting store notifications:', error);
      return [];
    }
  }

  // Mark all notifications as read for a store
  async markAllAsRead(storeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', storeId)
        .eq('recipient_type', 'store')
        .eq('read', false);

      if (error) {
        console.error('❌ Error marking all notifications as read:', error);
        return false;
      }

      console.log('✅ All notifications marked as read for store:', storeId);
      return true;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return false;
    }
  }

  // تنظيف الإشعارات القديمة (أكثر من 30 يوم)
  async cleanupOldNotifications(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_type', 'store')
        .lt('created_at', thirtyDaysAgo.toISOString())
        .select('id');

      if (error) {
        console.error('❌ Error cleaning up old notifications:', {
          error: error?.message || JSON.stringify(error) || String(error),
          details: error?.details || 'No details available'
        });
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`🧹 Cleaned up ${deletedCount} old store notifications`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up old notifications:', {
        error: error instanceof Error ? error.message : JSON.stringify(error) || String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return 0;
    }
  }

  /**
   * Setup realtime subscription for store notifications
   */
  setupRealtimeSubscription(storeId: string, onNotification: (notification: any) => void): () => void {
    const channel = supabase
      .channel(`store-notifications-${storeId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${storeId}`
        }, 
        (payload) => {
          console.log('🔔 New store notification received:', payload);
          if (payload.new) {
            onNotification(payload.new);
          }
        }
      )
      .subscribe();

    console.log(`🔔 Realtime subscription setup for store: ${storeId}`);

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
      console.log(`🔔 Realtime subscription removed for store: ${storeId}`);
    };
  }
}

// تصدير مثيل واحد من الخدمة
export const storeNotificationService = new StoreNotificationService();

// معالج الأحداث التلقائي للطلبات الجديدة
export const handleOrderAssignmentNotification = async (
  orderId: string, 
  orderCode: string, 
  storeId: string, 
  customerName: string
) => {
  await storeNotificationService.processOrderAssignment(orderId, orderCode, storeId, customerName);
};

// دالة مساعدة لإرسال إشعار اختبار
export const sendTestNotification = async (storeId: string) => {
  return await storeNotificationService.sendNotification({
    storeId,
    title: 'إشعار تجريبي',
    message: `هذا إشعار تجريبي تم إرساله في ${new Date().toLocaleTimeString('ar')}`,
    type: 'general',
    priority: 'low'
  });
};
