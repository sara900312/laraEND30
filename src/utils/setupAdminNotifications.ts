import { supabase } from '@/integrations/supabase/client';

export async function setupAdminNotificationsTable() {
  try {
    console.log('🔧 Setting up admin_notifications table...');
    
    // Create the table
    const { error: createError } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Create admin_notifications table
        CREATE TABLE IF NOT EXISTS admin_notifications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('new_order', 'pending_order', 'store_response', 'system')),
          order_id UUID NULL,
          customer_name TEXT NULL,
          order_code TEXT NULL,
          url TEXT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications (is_read);
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications (type);

        -- Enable RLS
        ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
      `
    });

    if (createError) {
      console.error('❌ Error creating table:', createError);
      return { success: false, error: createError };
    }

    // Create RLS policy (separate call due to potential permission issues)
    const { error: policyError } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Admin can manage notifications" ON admin_notifications;
        
        -- Create policy for admin access
        CREATE POLICY "Admin can manage notifications" ON admin_notifications
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.is_admin = true
            )
          );
      `
    });

    if (policyError) {
      console.warn('⚠️  Warning creating RLS policy (table still created):', policyError);
    }

    console.log('✅ admin_notifications table setup completed');
    return { success: true };

  } catch (error) {
    console.error('❌ Exception during table setup:', error);
    return { success: false, error };
  }
}

export async function testAdminNotificationsTable() {
  try {
    console.log('🧪 Testing admin_notifications table...');
    
    // Test if table exists and is accessible
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.error('❌ Table test failed:', error);
      return { success: false, error };
    }

    console.log('✅ admin_notifications table is accessible');
    return { success: true, data };

  } catch (error) {
    console.error('❌ Exception during table test:', error);
    return { success: false, error };
  }
}
