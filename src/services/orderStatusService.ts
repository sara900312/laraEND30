import { supabase } from '@/integrations/supabase/client';
import { updateOriginalOrderBasedOnDivisions } from './divisionCompletionService';

export interface OrderStatusUpdate {
  orderId: string;
  storeId: string;
  status: 'accepted' | 'rejected' | 'available' | 'unavailable';
  rejectionReason?: string;
}

export interface OrderStatusResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * تحديث حالة استجابة المتجر للطلب
 */
export async function updateOrderStoreResponse({
  orderId,
  storeId,
  status,
  rejectionReason
}: OrderStatusUpdate): Promise<OrderStatusResult> {
  try {
    console.log('🔄 تحديث حالة الطلب:', {
      orderId,
      storeId,
      status,
      rejectionReason,
      timestamp: new Date().toISOString()
    });

    // تحويل الحالات الجديدة إلى القديمة للتوافق مع قاعدة البيانات
    let dbStatus = status;
    if (status === 'accepted') {
      dbStatus = 'available';
    } else if (status === 'rejected') {
      dbStatus = 'unavailable';
    }

    // إعداد البيانات للتحديث
    const updateData: any = {
      store_response_status: dbStatus,
      store_response_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // إضافة سبب الرفض إذا كان الطلب مرفوضاً
    if ((status === 'rejected' || status === 'unavailable') && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
      console.log('📝 حفظ سبب ��لرفض وتحويل الطلب إلى مرفوض:', rejectionReason);

      // تحويل الطلب إلى حالة مرفوضة (لا نعيد تعيينه تلقائياً)
      updateData.order_status = 'rejected';
      // نبقي assigned_store_id لتتبع أي متجر رفض الطلب
    }

    // تحديث الطلب في قاعدة البيانات
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('assigned_store_id', storeId) // للتأكد من أن المتجر مخول للتحديث
      .select('*');

    if (error) {
      console.error('❌ خطأ في تحديث حالة الطلب:', error);
      return {
        success: false,
        error: `فشل في تحديث الطلب: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      console.error('❌ لم يتم العثور على الطلب أو المتجر غير مخول');
      return {
        success: false,
        error: 'لم يتم العثور على الطلب أو المتجر غير مخول لتحديث هذا الطلب'
      };
    }

    console.log('✅ تم تحديث حالة الطلب بنجاح:', data[0]);

    // للطلبات المقسمة: تحديث حالة الطلب الأصلي بناءً على حالة التقسيمات
    const orderDetails = data[0].order_details || '';
    if (orderDetails.includes('تم تقسيمه من الطلب الأصلي')) {
      // استخراج معرف الطلب الأصلي من التفاصيل
      const match = orderDetails.match(/تم تقسيمه من الطلب الأصلي (\S+)/);
      if (match && match[1]) {
        const originalOrderId = match[1];
        console.log('🔄 تحديث حالة الطلب الأصلي بناءً على التقسيمات:', originalOrderId);

        // تحديث حالة الطلب الأصلي (بدون انتظار النتيجة لتجنب التأخير)
        updateOriginalOrderBasedOnDivisions(originalOrderId).catch(error => {
          console.error('❌ خطأ في تحديث حالة الطلب الأصلي:', error);
        });
      }
    }

    return {
      success: true,
      data: data[0]
    };

  } catch (error) {
    console.error('❌ خطأ عام في تحديث حالة الطلب:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * الحصول على تفاصيل الطلب مع أسماء المنتجات
 */
export async function getOrderWithProducts(orderId: string): Promise<OrderStatusResult> {
  try {
    console.log('🔍 جلب تفاصيل الطلب:', orderId);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_code,
        customer_name,
        customer_phone,
        customer_address,
        customer_notes,
        total_amount,
        subtotal,
        created_at,
        order_status,
        store_response_status,
        store_response_at,
        rejection_reason,
        assigned_store_id,
        items,
        order_items (
          id,
          product_name,
          quantity,
          price,
          discounted_price
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('❌ خطأ في جلب تفاصيل الطلب:', error);
      return {
        success: false,
        error: `فشل في جلب تفاصيل الطلب: ${error.message}`
      };
    }

    console.log('✅ تم جلب تفاصيل الطلب بنجاح:', data);

    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('❌ خطأ عام في جلب تفاصيل الطلب:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * تحديث حالة الطلب إلى مكتمل (للاستخدام المستقبلي)
 */
export async function markOrderAsCompleted(orderId: string, storeId: string): Promise<OrderStatusResult> {
  try {
    console.log('🏁 تحديد الطلب كمكتمل:', { orderId, storeId });

    const { data, error } = await supabase
      .from('orders')
      .update({
        order_status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('assigned_store_id', storeId)
      .eq('store_response_status', 'accepted') // فقط الطلبات المقبولة يمكن إكمالها
      .select('*');

    if (error) {
      console.error('❌ خطأ في تحديد الطلب كمكتمل:', error);
      return {
        success: false,
        error: `فشل في تحديد الطلب كمكتمل: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'لم يتم العثور على الطلب أو الطلب غير قابل للإكمال'
      };
    }

    console.log('✅ تم تحديد الطلب كمكتمل بنجاح:', data[0]);

    return {
      success: true,
      data: data[0]
    };

  } catch (error) {
    console.error('❌ خطأ عام في تحديد الطلب كمكتمل:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}
