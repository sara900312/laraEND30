import { supabase } from '@/integrations/supabase/client';

/**
 * اختبار وجود جدول store_order_responses
 */
export async function checkStoreOrderResponsesTable(): Promise<{ exists: boolean; error?: string }> {
  try {
    // محاولة استعلام بسيط لاختبار وجود الجدول
    const { error } = await supabase
      .from('store_order_responses')
      .select('id')
      .limit(1);

    if (error) {
      // إذا كان الخطأ متعلق بعدم وجود الجدول
      if (error.message.includes('does not exist') ||
          error.message.includes('relation') ||
          error.code === '42P01') {
        return { exists: false };
      }
      return { exists: false, error: error.message };
    }

    return { exists: true };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * إنشاء بيانات تجريبية لجدول store_order_responses (محاكاة الجدول)
 */
export async function createStoreOrderResponsesTable(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔧 فحص جدول store_order_responses...');

    const checkResult = await checkStoreOrderResponsesTable();

    if (checkResult.exists) {
      console.log('✅ جدول store_order_responses موجود بالفعل');
      return { success: true };
    }

    console.log('❌ جدول store_order_responses غير موجود');
    return {
      success: false,
      error: 'جدول store_order_responses غير موجود. يجب إنشاؤه من لوحة تحكم Supabase أو من خلال SQL Editor'
    };

  } catch (error) {
    console.error('❌ خطأ عام في فحص الجدول:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * إنشاء جدول order_store_history إذا لم يكن موجوداً
 */
export async function createOrderStoreHistoryTable(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔧 محاولة إنشاء جدول order_store_history...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS order_store_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        from_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
        to_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        transfer_reason TEXT,
        transferred_by TEXT,
        transferred_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- إنشاء فهارس
      CREATE INDEX IF NOT EXISTS idx_order_store_history_order_id ON order_store_history(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_store_history_from_store ON order_store_history(from_store_id);
      CREATE INDEX IF NOT EXISTS idx_order_store_history_to_store ON order_store_history(to_store_id);
    `;

    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });

    if (error) {
      console.error('❌ خطأ في إنشاء جدول التاريخ:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ تم إنشاء جدول order_store_history بنجاح');
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ عام في إنشاء جدول التاريخ:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * إضافة الأعمدة المفقودة في جدول orders
 */
export async function addMissingOrderColumns(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔧 إضافة الأعمدة المفقودة في جدول orders...');

    const addColumnsSQL = `
      -- إضافة أعمدة استجابة المتجر إذا لم تكن موجودة
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='store_response_status') THEN
          ALTER TABLE orders ADD COLUMN store_response_status TEXT CHECK (store_response_status IN ('available', 'unavailable', 'pending'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='store_response_at') THEN
          ALTER TABLE orders ADD COLUMN store_response_at TIMESTAMPTZ;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='rejection_reason') THEN
          ALTER TABLE orders ADD COLUMN rejection_reason TEXT;
        END IF;
      END $$;

      -- إنشاء فهارس
      CREATE INDEX IF NOT EXISTS idx_orders_store_response_status ON orders(store_response_status);
      CREATE INDEX IF NOT EXISTS idx_orders_assigned_store_id ON orders(assigned_store_id);
    `;

    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: addColumnsSQL 
    });

    if (error) {
      console.error('❌ خطأ في إضافة الأعمدة:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ تم إضافة الأعمدة المفقودة بنجاح');
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ عام في إضافة الأعمدة:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * إصلاح شامل لقاعدة البيانات
 */
export async function fixDatabase(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  console.log('🔧 بدء الإصلاح الشامل لقاعدة البيانات...');

  // 1. إضافة أعمدة orders المفقودة
  const ordersResult = await addMissingOrderColumns();
  if (!ordersResult.success && ordersResult.error) {
    errors.push(`أعمدة Orders: ${ordersResult.error}`);
  }

  // 2. إنشاء جدول store_order_responses
  const responseTableResult = await createStoreOrderResponsesTable();
  if (!responseTableResult.success && responseTableResult.error) {
    errors.push(`جدول الاستجابات: ${responseTableResult.error}`);
  }

  // 3. إنشاء جدول order_store_history
  const historyTableResult = await createOrderStoreHistoryTable();
  if (!historyTableResult.success && historyTableResult.error) {
    errors.push(`جدول التاريخ: ${historyTableResult.error}`);
  }

  const success = errors.length === 0;
  
  if (success) {
    console.log('✅ تم الإصلاح الشامل بنجاح');
  } else {
    console.log('❌ حدثت أخطاء في الإصلاح:', errors);
  }

  return { success, errors };
}

/**
 * اختبار إدخال بيانات تجريبية
 */
export async function testStoreResponseInsert(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🧪 اختبار إدخال استجابة متجر...');

    const testData = {
      order_id: '00000000-0000-0000-0000-000000000001', // UUID تجريبي
      store_id: '00000000-0000-0000-0000-000000000002', // UUID تجريبي
      response_type: 'available',
      responded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('store_order_responses')
      .insert(testData)
      .select();

    if (error) {
      console.error('❌ فشل الاختبار:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ نجح الا��تبار:', data);

    // حذف البيانات التجريبية
    await supabase
      .from('store_order_responses')
      .delete()
      .eq('order_id', testData.order_id);

    return { success: true };

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}
