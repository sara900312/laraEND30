import { supabase } from '@/integrations/supabase/client';

// دالة للتحقق من وجود جدول الإشع��رات وصحة هيكله
export const checkNotificationTable = async () => {
  console.log('🔍 Checking notifications table structure...');
  
  try {
    // محاولة جلب بيانات تجريبية للتحقق من وجود الجدول
    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Notifications table check failed:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.log('📝 Creating notifications table...');
        return await createNotificationTable();
      }
      
      return { success: false, error: error.message };
    }

    console.log('✅ Notifications table exists, record count:', count);
    
    // التحقق من الأعمدة المطلوبة
    const tableStructure = await checkTableStructure();
    return { success: true, recordCount: count, structure: tableStructure };
    
  } catch (error) {
    console.error('❌ Exception checking notifications table:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return { success: false, error: String(error) };
  }
};

// دالة للتحقق من هيكل الجدول
const checkTableStructure = async () => {
  try {
    // محاولة إدراج بيانات تجريبية للتحقق من الأعمدة
    const testData = {
      recipient_type: 'store',
      recipient_id: 'test-store-id',
      message: 'Test notification',
      prompt: {
        title: 'Test',
        message: 'Test notification',
        type: 'store'
      },
      created_at: new Date().toISOString(),
      read: false,
      sent: true
    };

    const { error } = await supabase
      .from('notifications')
      .insert(testData)
      .select();

    if (error) {
      console.error('❌ Table structure check failed:', {
        error: error.message,
        details: error.details,
        hint: error.hint
      });
      return { valid: false, error: error.message };
    }

    // حذف البيانات التجريبية
    await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', 'test-store-id')
      .eq('message', 'Test notification');

    console.log('✅ Table structure is valid');
    return { valid: true };
    
  } catch (error) {
    console.error('❌ Exception checking table structure:', error);
    return { valid: false, error: String(error) };
  }
};

// دالة لإنشاء جدول الإشعارات إذا لم يكن موجوداً
const createNotificationTable = async () => {
  console.log('📝 Creating notifications table...');
  
  // ملاحظة: هذه الدالة للتشخيص فقط
  // في الواقع، يجب إنشاء الجدول عبر Supabase Dashboard أو SQL migrations
  
  return { 
    success: false, 
    error: 'Table does not exist. Please create it via Supabase Dashboard with the following structure:\n\n' +
           'CREATE TABLE notifications (\n' +
           '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n' +
           '  recipient_type TEXT NOT NULL CHECK (recipient_type IN (\'admin\', \'store\', \'customer\')),\n' +
           '  recipient_id TEXT NOT NULL,\n' +
           '  title TEXT NOT NULL,\n' +
           '  message TEXT NOT NULL,\n' +
           '  order_id TEXT,\n' +
           '  created_at TIMESTAMPTZ DEFAULT NOW(),\n' +
           '  read BOOLEAN DEFAULT FALSE,\n' +
           '  sent BOOLEAN DEFAULT FALSE\n' +
           ');'
  };
};

// دالة لاختبار إرسال إشعار بسيط
export const testSimpleNotification = async (storeId: string) => {
  console.log('🧪 Testing simple notification insertion...');
  
  try {
    const testNotification = {
      recipient_type: 'store',
      recipient_id: storeId,
      title: 'اختبار النظام',
      message: 'Test notification at ' + new Date().toLocaleTimeString('ar'),
      created_at: new Date().toISOString(),
      read: false,
      sent: true
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (error) {
      console.error('❌ Test notification failed:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        testData: testNotification
      });
      return { success: false, error: error.message };
    }

    console.log('✅ Test notification inserted successfully:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Exception testing notification:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return { success: false, error: String(error) };
  }
};

// دالة لاختبار الصلاحيات
export const testNotificationPermissions = async () => {
  console.log('🔐 Testing notification permissions...');
  
  const tests = [
    { operation: 'SELECT', description: 'قراءة الإشعارات' },
    { operation: 'INSERT', description: 'إنشاء إشعارات جديدة' },
    { operation: 'UPDATE', description: 'تحديث الإشعارات' },
    { operation: 'DELETE', description: 'حذف الإشعارات القديمة' }
  ];

  const results = [];

  for (const test of tests) {
    try {
      let success = false;
      let error = null;

      switch (test.operation) {
        case 'SELECT':
          const { error: selectError } = await supabase
            .from('notifications')
            .select('id')
            .limit(1);
          success = !selectError;
          error = selectError;
          break;

        case 'INSERT':
          const { error: insertError } = await supabase
            .from('notifications')
            .insert({
              recipient_type: 'store',
              recipient_id: 'test-permissions',
              message: 'Permission test',
              created_at: new Date().toISOString(),
              read: false,
              sent: true
            })
            .select();
          success = !insertError;
          error = insertError;
          break;

        case 'UPDATE':
          const { error: updateError } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('recipient_id', 'test-permissions');
          success = !updateError;
          error = updateError;
          break;

        case 'DELETE':
          const { error: deleteError } = await supabase
            .from('notifications')
            .delete()
            .eq('recipient_id', 'test-permissions');
          success = !deleteError;
          error = deleteError;
          break;
      }

      results.push({
        operation: test.operation,
        description: test.description,
        success,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details
        } : null
      });

    } catch (exception) {
      results.push({
        operation: test.operation,
        description: test.description,
        success: false,
        error: {
          message: exception instanceof Error ? exception.message : String(exception)
        }
      });
    }
  }

  console.log('🔐 Permission test results:', results);
  return results;
};

// دالة تشخيص شاملة
export const runNotificationDiagnostics = async (storeId?: string) => {
  console.log('🩺 Running comprehensive notification diagnostics...');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    tableCheck: await checkNotificationTable(),
    permissionTests: await testNotificationPermissions(),
    simpleTest: storeId ? await testSimpleNotification(storeId) : null
  };

  console.log('📊 Diagnostics completed:', diagnostics);
  return diagnostics;
};
