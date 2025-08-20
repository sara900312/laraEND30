/**
 * Utility to manually run the notifications table migration
 * This should be used when the automatic migration hasn't been applied
 */

import { supabase } from '@/integrations/supabase/client';

const NOTIFICATIONS_MIGRATION_SQL = `
-- Create notifications table
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

-- Create notification_subscriptions table
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'store', 'customer')),
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT true,
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON notification_subscriptions(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_active ON notification_subscriptions(active);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON notification_subscriptions;
DROP POLICY IF EXISTS "Admin can view all subscriptions" ON notification_subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON notification_subscriptions;

-- Create RLS policies for notifications table
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.jwt() ->> 'phone' OR recipient_id = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.jwt() ->> 'phone' OR recipient_id = auth.jwt() ->> 'email');

-- Admin can view all notifications
CREATE POLICY "Admin can view all notifications" ON notifications
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create RLS policies for notification_subscriptions table
CREATE POLICY "Users can manage their own subscriptions" ON notification_subscriptions
  FOR ALL USING (user_id = auth.jwt() ->> 'phone' OR user_id = auth.jwt() ->> 'email');

-- Admin can view all subscriptions
CREATE POLICY "Admin can view all subscriptions" ON notification_subscriptions
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- Service role can manage subscriptions
CREATE POLICY "Service role can manage subscriptions" ON notification_subscriptions
  FOR ALL WITH CHECK (auth.role() = 'service_role');
`;

const FUNCTIONS_SQL = `
-- Create function to get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_id_param TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE recipient_id = user_id_param AND read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = notification_id_param;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const TEMPLATES_SQL = `
-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'store', 'customer')),
  title_ar TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  url_pattern TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(type, recipient_type)
);

-- Insert default notification templates
INSERT INTO notification_templates (type, recipient_type, title_ar, message_ar, url_pattern) VALUES
('order_created', 'customer', 'تم إنشاء طلبك', 'تم إنشاء طلبك رقم {{order_code}} بنجاح، وسيتم معالجته قريباً', '/my-orders/{{order_id}}'),
('order_confirmed', 'customer', 'تم تأكيد طلبك', 'تم تأكيد طلبك رقم {{order_code}} من المتجر وسيتم التوصيل قريباً', '/my-orders/{{order_id}}'),
('order_rejected', 'customer', 'عذراً، تم رفض طلبك', 'تم رفض طلبك رقم {{order_code}} من المتجر. يرجى المحاولة مرة أخرى', '/my-orders/{{order_id}}'),
('order_completed', 'customer', 'تم تسليم طلبك', 'تم تسليم طلبك رقم {{order_code}} بنجاح. شكراً لك', '/my-orders/{{order_id}}'),
('order_assigned', 'store', 'طلب جديد', 'وصل طلب جديد رقم {{order_code}} من {{customer_name}}', '/store/orders/{{order_id}}'),
('order_created', 'admin', 'طلب جديد', 'وصل طلب جديد من {{customer_name}}، رقم الطلب: {{order_code}}', '/admin/orders/{{order_id}}'),
('order_confirmed', 'admin', 'تأكيد طلب', 'تم تأكيد الطلب رقم {{order_code}} من المتجر', '/admin/orders/{{order_id}}'),
('order_rejected', 'admin', 'رفض طلب', 'تم رفض الطلب رقم {{order_code}} من المتجر', '/admin/orders/{{order_id}}')
ON CONFLICT (type, recipient_type) DO NOTHING;
`;

export async function runNotificationsMigration(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('�� Starting notifications table migration...');

    // Step 1: Create the main tables
    console.log('Creating notifications and notification_subscriptions tables...');
    const { error: tablesError } = await supabase.rpc('execute_sql', {
      sql_query: NOTIFICATIONS_MIGRATION_SQL
    });

    if (tablesError) {
      console.error('❌ Error creating tables:', tablesError);
      return {
        success: false,
        message: 'Failed to create notifications tables',
        details: tablesError
      };
    }

    // Step 2: Create the functions
    console.log('Creating notification functions...');
    const { error: functionsError } = await supabase.rpc('execute_sql', {
      sql_query: FUNCTIONS_SQL
    });

    if (functionsError) {
      console.error('❌ Error creating functions:', functionsError);
      return {
        success: false,
        message: 'Failed to create notification functions',
        details: functionsError
      };
    }

    // Step 3: Create templates
    console.log('Creating notification templates...');
    const { error: templatesError } = await supabase.rpc('execute_sql', {
      sql_query: TEMPLATES_SQL
    });

    if (templatesError) {
      console.error('❌ Error creating templates:', templatesError);
      return {
        success: false,
        message: 'Failed to create notification templates',
        details: templatesError
      };
    }

    console.log('✅ Notifications migration completed successfully!');
    return {
      success: true,
      message: 'Notifications migration completed successfully'
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      message: 'Migration failed with exception',
      details: error
    };
  }
}

export async function checkNotificationsTableExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (error) {
      // If we get a "relation does not exist" error, the table doesn't exist
      if (error.message.includes('relation "notifications" does not exist')) {
        return false;
      }
      // Other errors might indicate the table exists but there are permission issues
      console.warn('Error checking notifications table:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking notifications table:', error);
    return false;
  }
}

export async function testNotificationsTable(): Promise<{
  exists: boolean;
  canInsert: boolean;
  error?: any;
}> {
  try {
    // First check if table exists
    const exists = await checkNotificationsTableExists();
    
    if (!exists) {
      return { exists: false, canInsert: false };
    }

    // Test if we can insert a test notification
    const testNotification = {
      recipient_type: 'admin',
      recipient_id: 'test-admin',
      message: 'Test notification for migration verification',
      prompt: {
        title: 'Test',
        message: 'Test message',
        type: 'test',
        action_required: false
      }
    };

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(testNotification);

    if (insertError) {
      return { exists: true, canInsert: false, error: insertError };
    }

    // Clean up test notification
    await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', 'test-admin')
      .eq('message', 'Test notification for migration verification');

    return { exists: true, canInsert: true };

  } catch (error) {
    return { exists: false, canInsert: false, error };
  }
}
