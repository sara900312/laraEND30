import { supabase } from '@/integrations/supabase/client';
import { 
  EnhancedNotificationData, 
  EnhancedNotificationPrompt,
  OrderEventData,
  createOrderNotification,
  ENHANCED_NOTIFICATION_TEMPLATES 
} from '@/types/enhanced-notification';

class EnhancedNotificationService {
  private baseUrl = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

  // Core notification sending
  async sendNotification(data: EnhancedNotificationData): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Notification sent successfully:', result);
      return true;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }

  // Send order-specific notification using templates
  async sendOrderNotification(
    templateKey: string,
    recipientId: string,
    orderData: OrderEventData,
    additionalData?: Record<string, any>
  ): Promise<boolean> {
    const prompt = createOrderNotification(templateKey, orderData, additionalData);
    if (!prompt) {
      console.error(`Failed to create notification from template: ${templateKey}`);
      return false;
    }

    const template = ENHANCED_NOTIFICATION_TEMPLATES[templateKey];
    const notificationData: EnhancedNotificationData = {
      recipient_type: prompt.type,
      recipient_id: recipientId,
      title: prompt.title,
      message: prompt.message,
      order_id: orderData.order_id,
      priority: template.priority
    };

    return await this.sendNotification(notificationData);
  }

  // ===== FAST ORDER NOTIFICATIONS =====
  
  async notifyFastOrderCreated(orderData: OrderEventData): Promise<void> {
    const promises = [];

    // Notify customer
    if (orderData.customer_id) {
      promises.push(
        this.sendOrderNotification('fast_order_created_customer', orderData.customer_id, orderData)
      );
    }

    // Notify admin
    promises.push(
      this.sendOrderNotification('fast_order_created_admin', 'admin', orderData)
    );

    await Promise.all(promises);
    console.log('📱 Fast order creation notifications sent');
  }

  async notifyFastOrderAssigned(orderData: OrderEventData): Promise<void> {
    if (!orderData.store_id) {
      console.error('Store ID is required for fast order assignment notification');
      return;
    }

    // Notify assigned store with urgent priority
    await this.sendOrderNotification('fast_order_assigned_store', orderData.store_id, orderData);
    console.log('🏪 Fast order assignment notification sent to store');
  }

  async notifyFastOrderConfirmed(orderData: OrderEventData): Promise<void> {
    const promises = [];

    // Notify customer
    if (orderData.customer_id) {
      promises.push(
        this.sendOrderNotification('fast_order_confirmed_customer', orderData.customer_id, orderData)
      );
    }

    await Promise.all(promises);
    console.log('✅ Fast order confirmation notifications sent');
  }

  async notifyFastOrderPrepared(orderData: OrderEventData): Promise<void> {
    if (orderData.customer_id) {
      await this.sendOrderNotification('fast_order_prepared_customer', orderData.customer_id, orderData);
      console.log('👨‍🍳 Fast order preparation notification sent');
    }
  }

  async notifyFastOrderShipped(orderData: OrderEventData): Promise<void> {
    if (orderData.customer_id) {
      await this.sendOrderNotification('fast_order_shipped_customer', orderData.customer_id, orderData);
      console.log('🚚 Fast order shipment notification sent');
    }
  }

  async notifyFastOrderDelivered(orderData: OrderEventData): Promise<void> {
    if (orderData.customer_id) {
      await this.sendOrderNotification('fast_order_delivered_customer', orderData.customer_id, orderData);
      console.log('📦 Fast order delivery notification sent');
    }
  }

  async notifyFastOrderRejected(orderData: OrderEventData): Promise<void> {
    const promises = [];

    // Notify customer about rejection
    if (orderData.customer_id) {
      promises.push(
        this.sendOrderNotification('fast_order_rejected_customer', orderData.customer_id, orderData)
      );
    }

    // Notify admin about rejection
    promises.push(
      this.sendOrderNotification('fast_order_rejected_admin', 'admin', orderData)
    );

    await Promise.all(promises);
    console.log('❌ Fast order rejection notifications sent');
  }

  async notifyFastOrderTimeout(orderData: OrderEventData): Promise<void> {
    // Notify admin about timeout
    await this.sendOrderNotification('fast_order_timeout_admin', 'admin', orderData);
    console.log('⏰ Fast order timeout notification sent');
  }

  // ===== UNIFIED ORDER NOTIFICATIONS =====
  
  async notifyUnifiedOrderCreated(orderData: OrderEventData): Promise<void> {
    const promises = [];

    // Notify customer
    if (orderData.customer_id) {
      promises.push(
        this.sendOrderNotification('unified_order_created_customer', orderData.customer_id, orderData)
      );
    }

    // Notify admin
    promises.push(
      this.sendOrderNotification('unified_order_created_admin', 'admin', orderData)
    );

    await Promise.all(promises);
    console.log('📱 Unified order creation notifications sent');
  }

  async notifyUnifiedOrderSplit(orderData: OrderEventData, storeIds: string[]): Promise<void> {
    const promises = [];

    // Notify each store about their part of the order
    storeIds.forEach(storeId => {
      promises.push(
        this.sendOrderNotification('unified_order_assigned_store', storeId, orderData)
      );
    });

    // Notify admin about successful split
    promises.push(
      this.sendOrderNotification('unified_order_split_completed_admin', 'admin', orderData, {
        '{{store_count}}': storeIds.length.toString()
      })
    );

    await Promise.all(promises);
    console.log(`📦 Unified order split notifications sent to ${storeIds.length} stores`);
  }

  async notifyUnifiedOrderStoreResponse(
    orderData: OrderEventData, 
    storeId: string,
    responseType: 'confirmed' | 'rejected'
  ): Promise<void> {
    // This would be called when individual stores respond to their part of the unified order
    console.log(`🏪 Store ${storeId} ${responseType} their part of unified order ${orderData.order_code}`);
  }

  async notifyUnifiedOrderAllConfirmed(orderData: OrderEventData): Promise<void> {
    const promises = [];

    // Notify customer that all parts are confirmed
    if (orderData.customer_id) {
      promises.push(
        this.sendOrderNotification('unified_order_all_confirmed_customer', orderData.customer_id, orderData)
      );
    }

    // Notify admin
    promises.push(
      this.sendOrderNotification('unified_order_all_confirmed_admin', 'admin', orderData)
    );

    await Promise.all(promises);
    console.log('✅ Unified order full confirmation notifications sent');
  }

  async notifyUnifiedOrderPartialConfirmed(orderData: OrderEventData): Promise<void> {
    if (orderData.customer_id) {
      await this.sendOrderNotification('unified_order_partial_confirmed_customer', orderData.customer_id, orderData);
      console.log('⚠️ Unified order partial confirmation notification sent');
    }
  }

  async notifyUnifiedOrderPartialRejection(orderData: OrderEventData): Promise<void> {
    const promises = [];

    // Notify admin about partial rejection
    promises.push(
      this.sendOrderNotification('unified_order_partial_rejection_admin', 'admin', orderData)
    );

    await Promise.all(promises);
    console.log('❌ Unified order partial rejection notifications sent');
  }

  async notifyUnifiedOrderShipped(orderData: OrderEventData): Promise<void> {
    if (orderData.customer_id) {
      await this.sendOrderNotification('unified_order_shipped_customer', orderData.customer_id, orderData);
      console.log('🚚 Unified order shipment notification sent');
    }
  }

  async notifyUnifiedOrderDelivered(orderData: OrderEventData): Promise<void> {
    if (orderData.customer_id) {
      await this.sendOrderNotification('unified_order_delivered_customer', orderData.customer_id, orderData);
      console.log('📦 Unified order delivery notification sent');
    }
  }

  // ===== HELPER METHODS =====
  
  async sendReminderNotification(orderData: OrderEventData, storeId: string): Promise<void> {
    const templateKey = orderData.shipping_type === 'fast' 
      ? 'fast_order_reminder_store' 
      : 'unified_order_reminder_store';
    
    await this.sendOrderNotification(templateKey, storeId, orderData);
    console.log(`⏰ Reminder notification sent to store ${storeId}`);
  }

  async notifySystemError(orderData: OrderEventData, errorDetails: string): Promise<void> {
    await this.sendOrderNotification('system_error_admin', 'admin', orderData, {
      '{{error_details}}': errorDetails
    });
    console.log('🚨 System error notification sent to admin');
  }

  async notifyPaymentIssue(orderData: OrderEventData): Promise<void> {
    await this.sendOrderNotification('payment_issue_admin', 'admin', orderData);
    console.log('💳 Payment issue notification sent to admin');
  }

  // ===== MAIN ORDER PROCESSING METHODS =====
  
  /**
   * Process all notifications for a new fast order
   */
  async processFastOrderCreation(orderData: OrderEventData): Promise<void> {
    try {
      console.log(`📱 Processing fast order notifications for ${orderData.order_code}`);
      
      // Send creation notifications
      await this.notifyFastOrderCreated(orderData);
      
      // If store is already assigned, notify them immediately
      if (orderData.store_id) {
        await this.notifyFastOrderAssigned(orderData);
      }
      
      console.log(`✅ Fast order notifications completed for ${orderData.order_code}`);
    } catch (error) {
      console.error('❌ Error processing fast order notifications:', error);
      await this.notifySystemError(orderData, error.message);
    }
  }

  /**
   * Process all notifications for a new unified order
   */
  async processUnifiedOrderCreation(orderData: OrderEventData, storeIds: string[]): Promise<void> {
    try {
      console.log(`📱 Processing unified order notifications for ${orderData.order_code}`);
      
      // Send creation notifications
      await this.notifyUnifiedOrderCreated(orderData);
      
      // Send split notifications to all stores
      await this.notifyUnifiedOrderSplit(orderData, storeIds);
      
      console.log(`✅ Unified order notifications completed for ${orderData.order_code}`);
    } catch (error) {
      console.error('❌ Error processing unified order notifications:', error);
      await this.notifySystemError(orderData, error.message);
    }
  }

  /**
   * Process notifications when order status changes
   */
  async processOrderStatusChange(orderData: OrderEventData, previousStatus?: string): Promise<void> {
    try {
      console.log(`📱 Processing status change notifications for ${orderData.order_code}: ${previousStatus} → ${orderData.order_status}`);
      
      if (orderData.shipping_type === 'fast') {
        switch (orderData.order_status) {
          case 'confirmed':
            await this.notifyFastOrderConfirmed(orderData);
            break;
          case 'prepared':
            await this.notifyFastOrderPrepared(orderData);
            break;
          case 'shipped':
            await this.notifyFastOrderShipped(orderData);
            break;
          case 'delivered':
            await this.notifyFastOrderDelivered(orderData);
            break;
          case 'rejected':
            await this.notifyFastOrderRejected(orderData);
            break;
        }
      } else if (orderData.shipping_type === 'unified') {
        switch (orderData.order_status) {
          case 'confirmed':
            await this.notifyUnifiedOrderAllConfirmed(orderData);
            break;
          case 'shipped':
            await this.notifyUnifiedOrderShipped(orderData);
            break;
          case 'delivered':
            await this.notifyUnifiedOrderDelivered(orderData);
            break;
        }
      }
      
      console.log(`✅ Status change notifications completed for ${orderData.order_code}`);
    } catch (error) {
      console.error('❌ Error processing status change notifications:', error);
      await this.notifySystemError(orderData, error.message);
    }
  }
}

// Export singleton instance
export const enhancedNotificationService = new EnhancedNotificationService();
