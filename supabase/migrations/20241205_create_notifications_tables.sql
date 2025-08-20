-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'store', 'customer')),
  recipient_id TEXT NOT NULL,
  message TEXT NOT NULL,
  prompt JSONB NOT NULL,
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

-- Create a scheduled job to clean old notifications (if pg_cron is available)
-- This would need to be run manually or via a cron job:
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications();');

-- Insert sample notification templates data (optional)
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE notifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE notification_subscriptions TO anon, authenticated;
GRANT SELECT ON TABLE notification_templates TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notifications_count(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read(UUID) TO anon, authenticated;
