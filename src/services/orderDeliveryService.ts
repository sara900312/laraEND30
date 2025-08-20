import { supabase } from '@/integrations/supabase/client';

export interface DeliveryStatusUpdate {
  orderId: string;
  storeId: string;
  status: 'delivered' | 'returned';
  returnReason?: string;
}

export interface DeliveryStatusResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * تحديث حالة التسليم للطلب (مسلم أو مرتجع)
 */
export async function updateOrderDeliveryStatus({
  orderId,
  storeId,
  status,
  returnReason
}: DeliveryStatusUpdate): Promise<DeliveryStatusResult> {
  try {
    console.log('🔄 تحديث حالة التسليم:', {
      orderId,
      storeId,
      status,
      returnReason,
      timestamp: new Date().toISOString()
    });

    // التحقق من وجود الطلب أولاً
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('assigned_store_id', storeId) // للتأكد من أن المتجر مخول للتعديل
      .single();

    if (orderError || !order) {
      console.error('❌ لم يتم العثور على الطلب:', orderError);
      return {
        success: false,
        error: 'لم يتم العثور على الطلب أو المتجر غير مخول للتعديل'
      };
    }

    // إعداد البيانات للتحديث
    const updateData: any = {
      order_status: status,
      updated_at: new Date().toISOString()
    };

    // إضافة بيانات خاصة بكل حالة
    if (status === 'delivered') {
      updateData.completed_at = new Date().toISOString();
      console.log('✅ تحديث الطلب إلى "مسلم"');
    } else if (status === 'returned') {
      if (!returnReason || returnReason.trim() === '') {
        return {
          success: false,
          error: 'سبب الإرجاع مطلوب للطلبات المرتجعة'
        };
      }
      updateData.order_details = `Return reason: ${returnReason.trim()}`;
      console.log('🔄 تحديث الطلب إلى "مرتجع" مع السبب:', returnReason);
    }

    // تحديث الطلب في قاعدة البيانات
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*');

    if (error) {
      console.error('❌ خطأ في تحديث حالة الطلب:', error);
      return {
        success: false,
        error: `فشل في تحديث الطلب: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      console.error('❌ لم يتم تحديث أي طلب');
      return {
        success: false,
        error: 'لم يتم تحديث أي طلب'
      };
    }

    console.log('✅ تم تحديث حالة الطلب بنجاح:', data[0]);

    // إضافة إشعار في notifications (اختياري)
    try {
      const statusMessage = status === 'delivered' ? 'تم تسليم' : 'تم إرجاع';
      const orderCode = order.order_code || order.id.slice(0, 8);
      
      await supabase.from('notifications').insert({
        recipient_type: 'admin',
        recipient_id: null,
        message: `${statusMessage} الطلب ${orderCode} من قبل المتجر`,
        order_id: orderId,
        created_at: new Date().toISOString()
      });

      // إشعار للعميل أيضاً
      if (order.customer_phone) {
        const customerMessage = status === 'delivered' 
          ? `تم تسليم طلبك ${orderCode} بنجاح`
          : `تم إرجاع طلبك ${orderCode} - السبب: ${returnReason}`;
          
        await supabase.from('notifications').insert({
          recipient_type: 'customer',
          recipient_id: order.customer_phone,
          message: customerMessage,
          order_id: orderId,
          created_at: new Date().toISOString()
        });
      }
    } catch (notificationError) {
      console.warn('⚠️ خطأ في إرسال الإشعار (لا يؤثر على التحديث):', notificationError);
    }

    return {
      success: true,
      data: data[0]
    };

  } catch (error) {
    console.error('❌ خطأ عام في تحديث حالة التسليم:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * جلب حالة الطلب الحالية
 */
export async function getOrderDeliveryStatus(orderId: string): Promise<DeliveryStatusResult> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_status, order_details, completed_at, updated_at')
      .eq('id', orderId)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}
