/**
 * اختبار تدفق رد المتجر على الطلبات
 * Test utility for store order response flow
 */

import { supabase } from '@/integrations/supabase/client';
import { updateOrderStoreResponse } from '@/services/orderStatusService';

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * اختبار تحديث حالة الطلب من "مقبول" إلى "متوفر"
 * Test order status update from "accepted" to "available"
 */
export async function testStoreAcceptFlow(orderId: string, storeId: string): Promise<TestResult> {
  console.log('🧪 بدء اختبار تدفق قبول الطلب:', { orderId, storeId });
  
  try {
    // 1. محاولة تحديث الطلب باستخدام الخدمة
    console.log('📝 Step 1: تحديث حالة الطلب إلى "مقبول"');
    const updateResult = await updateOrderStoreResponse({
      orderId,
      storeId,
      status: 'accepted',
      rejectionReason: undefined
    });

    if (!updateResult.success) {
      return {
        success: false,
        message: 'فشل في تحديث حالة الطلب',
        details: updateResult.error
      };
    }

    console.log('✅ تم تحديث حالة الطلب بنجاح');

    // 2. التحقق من أن البيانات محفوظة بشكل صحيح في قاعدة البيانات
    console.log('🔍 Step 2: التحقق من البيانات في قاعدة البيانات');
    const { data: orderData, error } = await supabase
      .from('orders')
      .select('id, store_response_status, store_response_at, rejection_reason')
      .eq('id', orderId)
      .single();

    if (error) {
      return {
        success: false,
        message: 'فشل في استرجاع بيانات الطلب',
        details: error.message
      };
    }

    // 3. التحقق من أن الحالة تم تحويلها من 'accepted' إلى 'available'
    console.log('✅ بيانات الطلب:', orderData);
    
    if (orderData.store_response_status !== 'available') {
      return {
        success: false,
        message: `الحالة غير صحيحة. متوقع: 'available', الحالي: '${orderData.store_response_status}'`,
        details: orderData
      };
    }

    // 4. التحقق من أن وقت الرد محفوظ
    if (!orderData.store_response_at) {
      return {
        success: false,
        message: 'وقت رد المتجر غير محفوظ',
        details: orderData
      };
    }

    // 5. التحقق من أن سبب الرفض فارغ (للطلبات المقبولة)
    if (orderData.rejection_reason !== null) {
      return {
        success: false,
        message: 'سبب الرفض يجب أن يكون فارغاً للطلبات المقبولة',
        details: orderData
      };
    }

    return {
      success: true,
      message: '✅ اخ��بار تدفق قبول الطلب مكتمل بنجاح',
      details: {
        orderId,
        storeId,
        finalStatus: orderData.store_response_status,
        responseTime: orderData.store_response_at,
        message: 'الطلب متوفر الآن وسيظهر في لوحة المدير كـ "متوفر"'
      }
    };

  } catch (error) {
    return {
      success: false,
      message: 'خطأ في اختبار تدفق قبول الطلب',
      details: error instanceof Error ? error.message : error
    };
  }
}

/**
 * اختبار تحديث حالة الطلب من "مرفوض" إلى "غير متوفر"
 * Test order status update from "rejected" to "unavailable"  
 */
export async function testStoreRejectFlow(orderId: string, storeId: string, rejectionReason: string): Promise<TestResult> {
  console.log('🧪 بدء اختبار تدفق رفض الطلب:', { orderId, storeId, rejectionReason });
  
  try {
    // 1. محاولة تحديث الطلب باستخدام الخدمة
    console.log('📝 Step 1: تحديث حالة الطلب إلى "مرفوض"');
    const updateResult = await updateOrderStoreResponse({
      orderId,
      storeId,
      status: 'rejected',
      rejectionReason
    });

    if (!updateResult.success) {
      return {
        success: false,
        message: 'فشل في تحديث حالة الطلب',
        details: updateResult.error
      };
    }

    console.log('✅ تم تحديث حالة الطلب بنجاح');

    // 2. التحقق من أن البيانات محفوظة بشكل صحيح في قاعدة البيانات
    console.log('🔍 Step 2: التحقق من البيانات في قاعدة البيانات');
    const { data: orderData, error } = await supabase
      .from('orders')
      .select('id, store_response_status, store_response_at, rejection_reason, order_status, assigned_store_id')
      .eq('id', orderId)
      .single();

    if (error) {
      return {
        success: false,
        message: 'فشل في استرجاع بيانات الطلب',
        details: error.message
      };
    }

    console.log('✅ بيانات الطلب:', orderData);
    
    // 3. التحقق من أن الحالة تم تحويلها من 'rejected' إلى 'unavailable'
    if (orderData.store_response_status !== 'unavailable') {
      return {
        success: false,
        message: `الحالة غير صحيحة. متوقع: 'unavailable', الحالي: '${orderData.store_response_status}'`,
        details: orderData
      };
    }

    // 4. التحقق من أن سبب الرفض محفوظ
    if (orderData.rejection_reason !== rejectionReason) {
      return {
        success: false,
        message: 'سبب الرفض غير محفوظ بشكل صحيح',
        details: { expected: rejectionReason, actual: orderData.rejection_reason }
      };
    }

    // 5. التحقق من أن الطلب تم إعادة تعيينه للحالة المعلقة
    if (orderData.order_status !== 'pending') {
      return {
        success: false,
        message: 'الطلب يجب أن يعود لحالة معلقة بعد الرفض',
        details: orderData
      };
    }

    // 6. التحقق من أن تعيين المتجر تم إلغاؤه
    if (orderData.assigned_store_id !== null) {
      return {
        success: false,
        message: 'تعيين المتجر يجب أن يتم إلغاؤه بعد الرفض',
        details: orderData
      };
    }

    return {
      success: true,
      message: '✅ اختبار تدفق رفض الطلب مكتمل بنجاح',
      details: {
        orderId,
        storeId,
        finalStatus: orderData.store_response_status,
        rejectionReason: orderData.rejection_reason,
        responseTime: orderData.store_response_at,
        newOrderStatus: orderData.order_status,
        message: 'تم رفض الطلب وإعادة تعيينه للطلبات المعلقة'
      }
    };

  } catch (error) {
    return {
      success: false,
      message: 'خطأ في اختبار تدفق رفض الطلب',
      details: error instanceof Error ? error.message : error
    };
  }
}

/**
 * دالة مساعدة لإجراء اختبار شامل للنظام
 * Helper function to run comprehensive system test
 */
export async function runComprehensiveTest(): Promise<void> {
  console.log('🚀 بدء اختبار شامل لنظام رد المتجر على الطلبات');
  console.log('📋 هذا الاختبار سيتحقق من:');
  console.log('   1. تحويل حالة "مقبول" إلى "متوفر"');
  console.log('   2. تحويل حالة "مرفوض" إلى "غير متوفر"');
  console.log('   3. إعادة تعيين الطلبات المرفوضة');
  console.log('   4. حفظ أسباب الرفض');
  console.log('');
  console.log('⚠️ ملاحظة: هذا الاختبار يتطلب طلب ومتجر موجودين في قاعدة البيانات');
  console.log('');
  console.log('🔧 لتشغيل الاختبار، استخدم:');
  console.log('   testStoreAcceptFlow("order-id", "store-id")');
  console.log('   testStoreRejectFlow("order-id", "store-id", "سبب الرفض")');
}
