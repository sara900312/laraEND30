import { supabase } from '@/integrations/supabase/client';

/**
 * خدمة مؤقتة لاستجابة المتجر باستخدام جدول orders فقط
 * هذه خدمة مؤقتة حتى يتم إنشاء الجداول المطلوبة
 */

export interface TempStoreResponse {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * تسجيل استجابة المتجر مباشرة في جدول orders
 */
export async function submitTempStoreResponse(
  orderId: string,
  storeId: string,
  responseType: 'available' | 'unavailable'
): Promise<TempStoreResponse> {
  try {
    console.log('🔄 تسجيل استجابة المتجر (النظام المؤقت):', { 
      orderId, 
      storeId, 
      responseType,
      timestamp: new Date().toISOString()
    });

    // تحديث جدول orders مباشرة
    const updateData: any = {
      store_response_status: responseType,
      store_response_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // إذا كان غير متوفر، تحويل الطلب إلى مرفوض
    if (responseType === 'unavailable') {
      updateData.order_status = 'rejected';
      updateData.rejection_reason = 'المنتج غير متوفر في المتجر المعين';
      // نبقي assigned_store_id لتتبع أي متجر رفض الطلب

      console.log('🔴 رفض الطلب - تحويل إلى حالة مرفوض');
    } else {
      console.log('🟢 قبول الطلب - تأكيد التوفر');
    }

    console.log('📝 بيانات التحديث:', updateData);

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('assigned_store_id', storeId) // التأكد من أن الطلب معين لهذا المتجر
      .select();

    if (error) {
      console.error('❌ خطأ في تحديث الطلب:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        orderId,
        storeId,
        responseType
      });
      return { success: false, error: error.message || 'فشل في تحديث الطلب' };
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ لم يتم العثور على الطلب أو لا ينتمي لهذا المتجر');
      return { success: false, error: 'الطلب غير موجود أو لا ينتمي لهذا المتجر' };
    }

    console.log('✅ تم تحديث استجابة المتجر بنجاح:', data[0]);

    // إضافة سجل في console للتتبع
    console.log(`📊 سجل الاستجابة: متجر ${storeId} رد على طلب ${orderId} بـ ${responseType}`);

    return { success: true, data: data[0] };

  } catch (error) {
    console.error('❌ خطأ غير متوقع في تسجيل استجابة المتجر:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * الحصول على الطلبات المعينة للمتجر مع تصفية محسنة
 */
export async function getTempStoreAssignedOrders(storeId: string) {
  try {
    console.log('🔍 جلب الطلبات المعينة للمتجر (النظام المؤقت):', storeId);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items:order_items(
          id,
          product_name,
          quantity,
          price,
          discounted_price
        ),
        stores:assigned_store_id(name)
      `)
      .eq('assigned_store_id', storeId)
      .eq('order_status', 'assigned')
      .or('store_response_status.is.null,store_response_status.eq.pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ خطأ في جلب الطلبات المعينة:', error);
      throw error;
    }

    console.log('✅ تم جلب الطلبات المعينة بنجاح:', {
      count: data?.length || 0,
      orders: data?.map(o => ({
        id: o.id,
        customer_name: o.customer_name,
        store_response_status: o.store_response_status,
        order_items_count: o.order_items?.length || 0
      }))
    });

    return data || [];

  } catch (error) {
    console.error('❌ خطأ غير متوقع في جلب الطلبات:', error);
    throw error;
  }
}

/**
 * اختبار النظام المؤقت
 */
export async function testTempSystem(): Promise<TempStoreResponse> {
  try {
    console.log('🧪 اختبار النظام المؤقت...');

    // البحث عن طلب موجود للاختبار
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, assigned_store_id, customer_name')
      .eq('order_status', 'assigned')
      .limit(1);

    if (error) {
      return { success: false, error: `خطأ في البحث عن طلب للاختبار: ${error.message}` };
    }

    if (!orders || orders.length === 0) {
      return { success: false, error: 'لا توجد طلبات للاختبار' };
    }

    const testOrder = orders[0];
    console.log('📋 طلب الاختبار:', testOrder);

    return { 
      success: true, 
      data: {
        message: 'النظام المؤقت جاهز للعمل',
        testOrder: testOrder
      }
    };

  } catch (error) {
    console.error('❌ خطأ في اختبار النظام المؤقت:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * فحص حالة النظام
 */
export async function checkTempSystemStatus(): Promise<{
  ordersTable: boolean;
  orderItemsTable: boolean;
  storesTable: boolean;
  canWork: boolean;
  errors: string[];
}> {
  const status = {
    ordersTable: false,
    orderItemsTable: false,
    storesTable: false,
    canWork: false,
    errors: [] as string[]
  };

  try {
    // فحص جدول orders
    const { error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (!ordersError) {
      status.ordersTable = true;
    } else {
      status.errors.push(`جدول orders: ${ordersError.message}`);
    }

    // فحص جدول order_items
    const { error: itemsError } = await supabase
      .from('order_items')
      .select('id')
      .limit(1);
    
    if (!itemsError) {
      status.orderItemsTable = true;
    } else {
      status.errors.push(`جدول order_items: ${itemsError.message}`);
    }

    // فحص جدول stores
    const { error: storesError } = await supabase
      .from('stores')
      .select('id')
      .limit(1);
    
    if (!storesError) {
      status.storesTable = true;
    } else {
      status.errors.push(`جدول stores: ${storesError.message}`);
    }

    // النظام يعمل إذا كانت الجداول الأساسية موجودة
    status.canWork = status.ordersTable && status.storesTable;

    console.log('📊 حالة النظام المؤقت:', status);

  } catch (error) {
    status.errors.push(`خطأ عام: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }

  return status;
}
