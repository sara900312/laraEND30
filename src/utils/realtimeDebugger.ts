import { supabase } from '@/integrations/supabase/client';

export class RealtimeDebugger {
  private static instance: RealtimeDebugger;
  private debugMode = true;
  private connections: Map<string, any> = new Map();

  static getInstance(): RealtimeDebugger {
    if (!RealtimeDebugger.instance) {
      RealtimeDebugger.instance = new RealtimeDebugger();
    }
    return RealtimeDebugger.instance;
  }

  log(message: string, data?: any) {
    if (this.debugMode) {
      console.log(`🔍 [Realtime Debug] ${message}`, data || '');
    }
  }

  async testRealtimeConnection(): Promise<boolean> {
    try {
      this.log('Testing Realtime connection...');
      
      // Test basic Supabase connection
      const { data, error } = await supabase.from('orders').select('count').limit(1);
      
      if (error) {
        this.log('❌ Database connection failed', error);
        return false;
      }
      
      this.log('✅ Database connection working');
      
      // Test Realtime permissions
      const testChannel = supabase
        .channel('realtime-test-' + Date.now())
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            this.log('✅ Realtime event received in test', payload);
          }
        );

      return new Promise((resolve) => {
        testChannel.subscribe((status) => {
          this.log('Test channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            this.log('✅ Realtime subscription working');
            supabase.removeChannel(testChannel);
            resolve(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.log('❌ Realtime subscription failed:', status);
            supabase.removeChannel(testChannel);
            resolve(false);
          }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          this.log('⏰ Realtime test timed out');
          supabase.removeChannel(testChannel);
          resolve(false);
        }, 10000);
      });

    } catch (error) {
      this.log('❌ Realtime test exception', error);
      return false;
    }
  }

  async checkTablePermissions(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        this.log(`❌ No read permission for table ${tableName}`, error);
        return false;
      }
      
      this.log(`✅ Read permission OK for table ${tableName}`);
      return true;
    } catch (error) {
      this.log(`❌ Exception checking table ${tableName}`, error);
      return false;
    }
  }

  async runDiagnostics(): Promise<{
    databaseConnection: boolean;
    realtimeConnection: boolean;
    ordersTableAccess: boolean;
    storeResponsesTableAccess: boolean;
    recommendations: string[];
  }> {
    this.log('🔍 Running comprehensive Realtime diagnostics...');
    
    const results = {
      databaseConnection: false,
      realtimeConnection: false,
      ordersTableAccess: false,
      storeResponsesTableAccess: false,
      recommendations: [] as string[]
    };

    // Test database connection
    try {
      const { error } = await supabase.from('orders').select('count').limit(1);
      results.databaseConnection = !error;
      if (error) {
        results.recommendations.push('Database connection failed. Check Supabase configuration.');
      }
    } catch (error) {
      results.recommendations.push('Database connection exception. Check network and Supabase URL.');
    }

    // Test table permissions
    results.ordersTableAccess = await this.checkTablePermissions('orders');
    if (!results.ordersTableAccess) {
      results.recommendations.push('No access to orders table. Check RLS policies.');
    }

    results.storeResponsesTableAccess = await this.checkTablePermissions('store_order_responses');
    if (!results.storeResponsesTableAccess) {
      results.recommendations.push('store_order_responses table may not exist or no access.');
    }

    // Test Realtime connection
    results.realtimeConnection = await this.testRealtimeConnection();
    if (!results.realtimeConnection) {
      results.recommendations.push('Realtime connection failed. Check Supabase Realtime settings.');
    }

    this.log('📋 Diagnostics complete', results);
    return results;
  }

  trackConnection(name: string, channel: any) {
    this.connections.set(name, {
      channel,
      createdAt: new Date(),
      status: 'connecting'
    });
    this.log(`📡 Tracking connection: ${name}`);
  }

  updateConnectionStatus(name: string, status: string) {
    const connection = this.connections.get(name);
    if (connection) {
      connection.status = status;
      connection.lastUpdate = new Date();
      this.log(`🔄 Connection ${name} status: ${status}`);
    }
  }

  getConnectionsStatus(): { [key: string]: any } {
    const status: { [key: string]: any } = {};
    this.connections.forEach((connection, name) => {
      status[name] = {
        status: connection.status,
        createdAt: connection.createdAt,
        lastUpdate: connection.lastUpdate || connection.createdAt
      };
    });
    return status;
  }

  cleanup() {
    this.log('🧹 Cleaning up tracked connections');
    this.connections.clear();
  }
}

export const realtimeDebugger = RealtimeDebugger.getInstance();
