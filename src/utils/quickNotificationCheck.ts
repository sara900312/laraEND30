import { supabase } from '@/integrations/supabase/client';

export async function quickCheckNotificationsTable() {
  console.log('🔍 Checking notifications table...');
  
  try {
    // Try to query the notifications table
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title')
      .limit(1);

    if (error) {
      console.error('❌ Notifications table check failed:', error);
      if (error.message.includes('relation "notifications" does not exist')) {
        return {
          exists: false,
          error: 'Table does not exist',
          needsMigration: true
        };
      }
      if (error.message.includes('title')) {
        return {
          exists: true,
          error: 'Title column missing',
          needsMigration: true
        };
      }
      return {
        exists: false,
        error: error.message,
        needsMigration: true
      };
    }

    console.log('✅ Notifications table exists and is accessible');
    return {
      exists: true,
      error: null,
      needsMigration: false
    };

  } catch (error) {
    console.error('❌ Exception checking notifications table:', error);
    return {
      exists: false,
      error: String(error),
      needsMigration: true
    };
  }
}

export async function quickCreateNotificationsTable() {
  console.log('🔧 Creating notifications table...');
  
  const migrationSQL = `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'store', 'customer')),
      recipient_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      order_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      read BOOLEAN DEFAULT false,
      sent BOOLEAN DEFAULT false,
      sent_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
  `;

  try {
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Failed to create notifications table:', error);
      return {
        success: false,
        error: error.message || String(error)
      };
    }

    console.log('✅ Notifications table created successfully');
    return {
      success: true,
      error: null
    };

  } catch (error) {
    console.error('❌ Exception creating notifications table:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}
