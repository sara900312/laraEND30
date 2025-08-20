import { supabase } from '@/integrations/supabase/client';
import { NotificationData, NotificationPrompt, NotificationSubscription, NOTIFICATION_TEMPLATES } from '@/types/notification';

// VAPID public key - يجب الحصول عليه من Supabase dashboard
const VAPID_PUBLIC_KEY = 'BJKVWqP8D6cD2I7zK8Y5gSQXb_sFJ7y5QS9n2k8Qy1X6rKs4nTdULmO7P8Y9cS3vN4b5M6qKs4nTdULmO7P8Y9cS';

class NotificationService {
  private isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  async subscribeToPushNotifications(userId: string, userType: 'admin' | 'store' | 'customer'): Promise<boolean> {
    try {
      const registration = await this.registerServiceWorker();
      if (!registration) {
        throw new Error('Service Worker registration failed');
      }

      // Check if user is already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('User is already subscribed');
        return true;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Save subscription to database
      const subscriptionData: NotificationSubscription = {
        user_id: userId,
        user_type: userType,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh || '',
            auth: subscription.toJSON().keys?.auth || ''
          }
        },
        active: true
      };

      const { error } = await supabase
        .from('notification_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' });

      if (error) {
        console.error('Failed to save subscription:', error);
        return false;
      }

      console.log('Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  async unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return true;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove subscription from database
      const { error } = await supabase
        .from('notification_subscriptions')
        .update({ active: false })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to remove subscription from database:', error);
        return false;
      }

      console.log('Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async sendNotification(data: NotificationData): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: data
      });

      if (error) {
        console.log('Notification service not available:', error.message);
        return false;
      }

      console.log('Notification sent successfully');
      return true;
    } catch (error) {
      console.log('Notification service not available');
      return false;
    }
  }

  /**
   * Create notification directly in the database using the new table structure
   */
  async createNotification(data: NotificationData): Promise<boolean> {
    try {
      const notificationData = {
        recipient_type: data.recipient_type,
        recipient_id: data.recipient_id,
        title: data.title,
        message: data.message,
        order_id: data.order_id || null,
        read: false,
        sent: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (error) {
        console.error('❌ Failed to create notification:', error);
        return false;
      }

      console.log('✅ Notification created successfully');
      return true;
    } catch (error) {
      console.error('❌ Exception creating notification:', error);
      return false;
    }
  }

  createNotificationFromTemplate(
    templateKey: string,
    data: {
      order_id?: string;
      order_code?: string;
      customer_name?: string;
    }
  ): NotificationPrompt | null {
    const template = NOTIFICATION_TEMPLATES[templateKey];
    if (!template) {
      console.error(`Template ${templateKey} not found`);
      return null;
    }

    let message = template.message_ar;
    let url = template.url_pattern;

    // Replace placeholders
    if (data.order_code) {
      message = message.replace(/\{\{order_code\}\}/g, data.order_code);
    }
    if (data.customer_name) {
      message = message.replace(/\{\{customer_name\}\}/g, data.customer_name);
    }
    if (data.order_id) {
      url = url.replace(/\{\{order_id\}\}/g, data.order_id);
    }

    return {
      title: template.title_ar,
      message,
      type: template.recipient_type,
      order_id: data.order_id,
      customer_name: data.customer_name,
      order_code: data.order_code,
      url
    };
  }

  async sendOrderNotification(
    templateKey: string,
    recipientId: string,
    orderData: {
      order_id: string;
      order_code: string;
      customer_name?: string;
    }
  ): Promise<boolean> {
    const prompt = this.createNotificationFromTemplate(templateKey, orderData);
    if (!prompt) {
      return false;
    }

    const notificationData: NotificationData = {
      recipient_type: prompt.type,
      recipient_id: recipientId,
      title: prompt.title,
      message: prompt.message,
      order_id: orderData.order_id
    };

    // Use the direct database method instead of edge function to avoid issues
    return await this.createNotification(notificationData);
  }

  async getNotificationHistory(userId: string, limit: number = 50): Promise<NotificationData[]> {
    try {
      console.log('📜 Fetching notification history for userId:', userId, 'limit:', limit);

      const { data, error } = await supabase
        .from('notifications')
        .select('id, recipient_type, recipient_id, title, message, order_id, created_at, read, sent')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      console.log('📜 Supabase response:', { data: data?.length || 0, error });

      if (error) {
        // If table doesn't exist or any other error, return empty array silently
        if (error.code === 'PGRST116' ||
            error.message?.includes('does not exist') ||
            (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
          console.log('📜 Notifications table not available. Returning empty array.');
          return [];
        }

        console.log('📜 Notifications service not available:', error.message);
        return [];
      }

      const notifications = data || [];
      console.log('📜 Returning notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('📜 Exception in getNotificationHistory:', {
        error,
        message: error?.message,
        stack: error?.stack,
        userId,
        limit
      });
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.log('Notification service not available:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  async markNotificationAsSent(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ sent: true })
        .eq('id', notificationId);

      if (error) {
        console.log('Failed to mark notification as sent:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark notification as sent:', error);
      return false;
    }
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    try {
      console.log('📊 Fetching unread count for userId:', userId);

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false);

      console.log('📊 Supabase response:', { count, error });

      if (error) {
        // If table doesn't exist or any other error, return 0 silently
        if (error.code === 'PGRST116' ||
            error.message?.includes('does not exist') ||
            (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
          console.log('📊 Notifications table not available. Returning 0.');
          return 0;
        }

        console.log('📊 Notifications service not available:', error.message);
        return 0;
      }

      const finalCount = count || 0;
      console.log('📊 Final unread count:', finalCount);
      return finalCount;
    } catch (error) {
      console.log('📊 Notifications feature not available');
      return 0;
    }
  }

  async getUnsentNotificationsCount(userId: string): Promise<number> {
    try {
      console.log('📊 Fetching unsent count for userId:', userId);

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('sent', false);

      if (error) {
        console.log('📊 Notifications service not available:', error.message);
        return 0;
      }

      const finalCount = count || 0;
      console.log('📊 Final unsent count:', finalCount);
      return finalCount;
    } catch (error) {
      console.log('📊 Notifications feature not available');
      return 0;
    }
  }

  async checkNotificationPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }
    return await Notification.requestPermission();
  }

  // For testing and debugging
  async testDatabaseConnection(): Promise<{success: boolean, error?: string, tableExists?: boolean}> {
    try {
      console.log('🔗 Testing database connection...');

      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);

      if (error) {
        console.error('🔗 Database connection test failed:', error);
        return {
          success: false,
          error: error.message,
          tableExists: false
        };
      }

      console.log('🔗 Database connection test successful');
      return {
        success: true,
        tableExists: true
      };
    } catch (error) {
      console.error('🔗 Database connection test exception:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error',
        tableExists: false
      };
    }
  }

  async createTestNotification(recipientId: string): Promise<boolean> {
    try {
      const testNotification: NotificationData = {
        recipient_type: 'admin',
        recipient_id: recipientId,
        title: 'إشعار تجريبي',
        message: 'إشعار تجريبي - ' + new Date().toLocaleTimeString('ar'),
        order_id: 'test-' + Date.now()
      };

      return await this.createNotification(testNotification);
    } catch (error) {
      console.error('Exception creating test notification:', error);
      return false;
    }
  }

  /**
   * Setup realtime subscription for notifications
   */
  setupRealtimeSubscription(userId: string, onNotification: (notification: NotificationData) => void): () => void {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('🔔 New notification received:', payload);
          if (payload.new) {
            onNotification(payload.new as NotificationData);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const notificationService = new NotificationService();
