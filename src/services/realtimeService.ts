import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RealtimeEventHandler = (payload: RealtimePostgresChangesPayload<any>) => void;

interface SubscriptionConfig {
  table: string;
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
  handler: RealtimeEventHandler;
}

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, SubscriptionConfig[]> = new Map();
  
  /**
   * Subscribe to realtime changes for a specific table
   */
  subscribe(
    channelName: string,
    table: string,
    event: '*' | 'INSERT' | 'UPDATE' | 'DELETE',
    handler: RealtimeEventHandler,
    filter?: string
  ): void {
    console.log(`📡 Setting up Realtime subscription: ${channelName} -> ${table} (${event})`);
    
    // Store subscription config
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, []);
    }
    
    this.subscriptions.get(channelName)!.push({
      table,
      event,
      filter,
      handler
    });
    
    // Create or update channel
    this.createChannel(channelName);
  }
  
  /**
   * Create a realtime channel with all subscriptions
   */
  private createChannel(channelName: string): void {
    // Remove existing channel if exists
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }
    
    const subscriptions = this.subscriptions.get(channelName);
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }
    
    console.log(`🔗 Creating Realtime channel: ${channelName}`);
    
    let channel = supabase.channel(channelName);
    
    // Add all subscriptions to the channel
    subscriptions.forEach((sub, index) => {
      const config: any = {
        event: sub.event,
        schema: 'public',
        table: sub.table
      };
      
      if (sub.filter) {
        config.filter = sub.filter;
      }
      
      channel = channel.on('postgres_changes', config, (payload) => {
        console.log(`📨 Realtime event ${channelName}[${index}]:`, {
          table: sub.table,
          event: payload.eventType,
          old: payload.old,
          new: payload.new
        });
        
        try {
          sub.handler(payload);
        } catch (error) {
          console.error(`❌ Error in Realtime handler for ${channelName}:`, error);
        }
      });
    });
    
    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`📡 Channel ${channelName} status:`, status);
      
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Successfully subscribed to ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to ${channelName}`);
      } else if (status === 'TIMED_OUT') {
        console.warn(`⏰ Timeout subscribing to ${channelName}, retrying...`);
        // Retry subscription
        setTimeout(() => this.createChannel(channelName), 2000);
      }
    });
    
    this.channels.set(channelName, channel);
  }
  
  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`🔌 Unsubscribing from channel: ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
    
    this.subscriptions.delete(channelName);
  }
  
  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    console.log('🧹 Unsubscribing from all Realtime channels...');
    
    this.channels.forEach((channel, channelName) => {
      console.log(`🔌 Removing channel: ${channelName}`);
      supabase.removeChannel(channel);
    });
    
    this.channels.clear();
    this.subscriptions.clear();
  }
  
  /**
   * Get connection status for all channels
   */
  getStatus(): { [channelName: string]: string } {
    const status: { [channelName: string]: string } = {};
    
    this.channels.forEach((channel, channelName) => {
      // Note: Supabase doesn't expose channel state directly
      // This is a workaround to show if channel exists
      status[channelName] = 'subscribed';
    });
    
    return status;
  }
  
  /**
   * Subscribe to orders table changes
   */
  subscribeToOrders(
    channelName: string,
    onInsert?: RealtimeEventHandler,
    onUpdate?: RealtimeEventHandler,
    onDelete?: RealtimeEventHandler
  ): void {
    if (onInsert) {
      this.subscribe(channelName, 'orders', 'INSERT', onInsert);
    }
    
    if (onUpdate) {
      this.subscribe(channelName, 'orders', 'UPDATE', onUpdate);
    }
    
    if (onDelete) {
      this.subscribe(channelName, 'orders', 'DELETE', onDelete);
    }
  }
  
  /**
   * Subscribe to store order responses table changes
   */
  subscribeToStoreResponses(
    channelName: string,
    handler: RealtimeEventHandler
  ): void {
    this.subscribe(channelName, 'store_order_responses', '*', handler);
  }
  
  /**
   * Subscribe to admin notifications table changes
   */
  subscribeToAdminNotifications(
    channelName: string,
    handler: RealtimeEventHandler
  ): void {
    this.subscribe(channelName, 'admin_notifications', '*', handler);
  }
  
  /**
   * Subscribe to specific store's orders (filtered by assigned_store_id)
   */
  subscribeToStoreOrders(
    channelName: string,
    storeId: string,
    handler: RealtimeEventHandler
  ): void {
    this.subscribe(
      channelName,
      'orders',
      '*',
      handler,
      `assigned_store_id=eq.${storeId}`
    );
  }
  
  /**
   * Subscribe to specific order changes
   */
  subscribeToOrder(
    orderId: string,
    handler: RealtimeEventHandler
  ): void {
    const channelName = `order-${orderId}`;
    this.subscribe(
      channelName,
      'orders',
      '*',
      handler,
      `id=eq.${orderId}`
    );
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

// Helper functions for common use cases
export const subscribeToOrderChanges = (
  channelName: string,
  callbacks: {
    onNewOrder?: (order: any) => void;
    onOrderUpdate?: (oldOrder: any, newOrder: any) => void;
    onOrderDelete?: (deletedOrder: any) => void;
  }
) => {
  realtimeService.subscribeToOrders(
    channelName,
    callbacks.onNewOrder ? (payload) => {
      if (payload.new) callbacks.onNewOrder!(payload.new);
    } : undefined,
    callbacks.onOrderUpdate ? (payload) => {
      if (payload.new && payload.old) {
        callbacks.onOrderUpdate!(payload.old, payload.new);
      }
    } : undefined,
    callbacks.onOrderDelete ? (payload) => {
      if (payload.old) callbacks.onOrderDelete!(payload.old);
    } : undefined
  );
};

export default realtimeService;
