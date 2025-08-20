import { supabase } from '@/integrations/supabase/client';

export interface StoreOrderResponse {
  id?: string;
  order_id: string;
  store_id: string;
  response_type: 'available' | 'unavailable' | 'pending';
  responded_at?: string;
  created_at?: string;
}

export interface Order {
  id: string;
  order_code?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_notes?: string;
  total_amount?: number;
  subtotal?: number;
  created_at: string;
  order_status?: string;
  store_response_status?: string;
  assigned_store_id?: string;
  order_items?: any[];
}

/**
 * تسجيل استجابة المتجر لطلب معين
 */
export async function submitStoreResponse(
  orderId: string,
  storeId: string,
  responseType: 'available' | 'unavailable'
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 بدء تسجيل استجابة المتجر:', {
      orderId,
      storeId,
      responseType,
      timestamp: (() => {
        try {
          return new Date().toISOString();
        } catch (error) {
          return new Date().toString();
        }
      })()
    });

    // إرسال الاستجابة للـ edge function أولاً (كما هو موضح في التوثيق)
    try {
      console.log('📡 Calling edge function for store response...');

      const response = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/assign-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId // لازم يكون UUID الخاص بالمتجر
        },
        body: JSON.stringify({
          order_id: orderId,     // رقم الطلب اللي عايز تأكد عليه
          response_type: responseType  // 'available' أو 'unavailable' حسب الحالة
        })
      });

      const edgeResult = await response.json();
      console.log('📨 Edge function response:', edgeResult);

      if (!response.ok) {
        console.warn('⚠️ Edge function failed, continuing with database update...', edgeResult);
      }
    } catch (edgeError) {
      console.warn('⚠️ Edge function call failed, continuing with database update...', edgeError);
    }

    // تحديث حالة الاستجابة في جدول orders مباشرة
    const updateData = {
      store_response_status: responseType === 'available' ? 'accepted' : 'rejected',
      store_response_at: new Date().toISOString()
    };

    console.log('📝 تحديث استجابة المتجر في جدول orders:', updateData);

    const { error: responseError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('assigned_store_id', storeId);

    // إضافة منطق إضافي للطلبات غير المتوفرة
    if (responseType === 'unavailable') {
      updateData.order_status = 'rejected';
      updateData.rejection_reason = 'المنتج غير متوفر في المتجر المعين';
      // نبقي assigned_store_id لتتبع أي متجر رفض الطلب
    }

    console.log('✅ تم تحديث استجابة المتجر:', { responseError: responseError ? 'موجود' : 'لا يوجد' });

    if (responseError) {
      console.error('❌ خطأ في تحديث استجابة المتجر:', {
        error: responseError,
        message: responseError?.message,
        details: responseError?.details,
        hint: responseError?.hint,
        code: responseError?.code,
        orderId,
        storeId,
        responseType,
        updateData: {
          ...updateData,
          store_response_at: updateData.store_response_at ? new Date(updateData.store_response_at).toISOString() : null
        }
      });
      return { success: false, error: responseError.message || 'فشل في تحديث استجابة المتجر' };
    }

    console.log('✅ تم تسجيل استجابة المتجر بنجاح');
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ غير متوقع في تسجيل استجابة المتجر:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

/**
 * الحصول على استجابة المتجر لطلب معين
 */
export async function getStoreResponse(
  orderId: string,
  storeId: string
): Promise<StoreOrderResponse | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        assigned_store_id,
        store_response_status,
        store_response_at,
        rejection_reason
      `)
      .eq('id', orderId)
      .eq('assigned_store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ خط�� في الحصول على استجابة المتجر:', error);
      return null;
    }

    if (!data) return null;

    // تحويل البيانات إلى تنسيق StoreOrderResponse
    return {
      id: data.id,
      order_id: orderId,
      store_id: storeId,
      response_type: data.store_response_status === 'accepted' ? 'available' :
                    data.store_response_status === 'rejected' ? 'unavailable' : 'pending',
      responded_at: data.store_response_at,
      created_at: data.store_response_at
    };
  } catch (error) {
    console.error('❌ خطأ غير متوقع في الحصول على استجابة المتجر:', error);
    return null;
  }
}

/**
 * الحصول على جميع الطلبات المعينة للمتجر مع حالة الاستجابة
 */
export async function getStoreAssignedOrders(storeId: string): Promise<Order[]> {
  try {
    console.log('🔍 جلب الطلبات المعينة للمتجر:', storeId);

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
        )
      `)
      .eq('assigned_store_id', storeId)
      .eq('order_status', 'assigned')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ خطأ في جلب الطلبات المعينة:', error);
      throw error;
    }

    console.log('✅ تم جلب الطلبات المعينة بنجاح:', data?.length || 0);
    return data || [];

  } catch (error) {
    console.error('❌ خطأ غير متوقع في جلب الطلبات:', error);
    throw error;
  }
}

/**
 * الحصول على تاريخ تحويل الطلبات بين المتاجر
 */
export async function getOrderStoreHistory(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('order_store_history')
      .select(`
        *,
        from_store:stores!from_store_id(name),
        to_store:stores!to_store_id(name)
      `)
      .eq('order_id', orderId)
      .order('transferred_at', { ascending: false });

    if (error) {
      console.error('❌ خطأ في جلب تاريخ تحويل الطلب:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ خطأ غير متوقع في جلب تاريخ التحويل:', error);
    return [];
  }
}

/**
 * ت��ويل طلب من متجر إلى آخر (للمشرفين)
 */
export async function transferOrderToStore(
  orderId: string,
  fromStoreId: string,
  toStoreId: string,
  reason: string,
  transferredBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 تحويل الطلب بين المتاجر:', {
      orderId, fromStoreId, toStoreId, reason
    });

    // 1. تسجيل التحويل في التاريخ
    const { error: historyError } = await supabase
      .from('order_store_history')
      .insert({
        order_id: orderId,
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        transfer_reason: reason,
        transferred_by: transferredBy,
        transferred_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('❌ خطأ في تسجيل تاريخ التحويل:', historyError);
      return { success: false, error: historyError.message };
    }

    // 2. تحديث ا��طلب بالمتجر الجديد
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        assigned_store_id: toStoreId,
        store_response_status: 'pending',
        store_response_at: null,
        rejection_reason: null
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ خطأ في تحديث الطلب:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ تم تحويل الطلب بنجاح');
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ غير متوقع في تحويل الطلب:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * الحصول على آخر استجابة متجر لطلب معين (للمشرفين)
 */
export async function getLatestStoreResponseForAdmin(
  orderId: string,
  storeId?: string
): Promise<{
  response: StoreOrderResponse | null;
  storeName?: string;
  error?: string;
}> {
  try {
    console.log('🔍 جلب آخر استجابة متجر للطلب:', { orderId, storeId });

    let query = supabase
      .from('orders')
      .select(`
        id,
        assigned_store_id,
        store_response_status,
        store_response_at,
        rejection_reason,
        stores:assigned_store_id(name)
      `)
      .eq('id', orderId);

    // إذا تم تحديد متجر معين، فلتر بناءً عليه
    if (storeId) {
      query = query.eq('assigned_store_id', storeId);
    }

    const { data, error } = await query
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ خطأ ��ي جلب استجابة المتجر:', error);
      return { response: null, error: error.message };
    }

    if (!data) {
      return { response: null };
    }

    // تحويل البيانات إلى تنسيق StoreOrderResponse
    const response: StoreOrderResponse = {
      id: data.id,
      order_id: orderId,
      store_id: data.assigned_store_id || storeId || '',
      response_type: data.store_response_status === 'accepted' ? 'available' :
                    data.store_response_status === 'rejected' ? 'unavailable' : 'pending',
      responded_at: data.store_response_at,
      created_at: data.store_response_at
    };

    return {
      response,
      storeName: data.stores?.name
    };

  } catch (error) {
    console.error('❌ خطأ غير متوقع في جلب استجابة ا��متجر:', error);
    return {
      response: null,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * الحصول عل�� تاريخ تحويلات الطلب بين المتاجر مع أسماء المتاجر (للمشرفين)
 */
export async function getOrderStoreHistoryForAdmin(orderId: string) {
  try {
    console.log('🔍 جلب تاريخ تحويل الطلب:', orderId);

    const { data, error } = await supabase
      .from('order_store_history')
      .select(`
        *,
        from_store:stores!from_store_id(name),
        to_store:stores!to_store_id(name)
      `)
      .eq('order_id', orderId)
      .order('transferred_at', { ascending: false });

    if (error) {
      console.error('❌ خطأ في ج��ب تاريخ تحويل الطلب:', error);
      return [];
    }

    console.log('✅ تم جلب تاريخ التحويل بنجاح:', data?.length || 0);
    return data || [];

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('❌ خطأ غير متوقع في جلب تاريخ التحويل:', errorMessage);
    return [];
  }
}

/**
 * الحصول على جميع استجابات المتاجر لطلب معين (للمشرفين)
 */
export async function getAllStoreResponsesForOrder(orderId: string) {
  try {
    console.log('���� جلب جميع استجابات المتاجر للطلب:', orderId);

    // نظراً لأن الطلب الآن لديه متجر واحد مخصص فقط، نحصل على استجابة الطلب الحالي
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        assigned_store_id,
        store_response_status,
        store_response_at,
        rejection_reason,
        stores:assigned_store_id(name)
      `)
      .eq('id', orderId);

    if (error) {
      console.error('❌ خطأ في جلب استجابة المتجر:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // تحويل البيانات إلى تنسيق استجابات المتاجر
    const responses = data.filter(order => order.store_response_status).map(order => ({
      id: order.id,
      order_id: orderId,
      store_id: order.assigned_store_id,
      response_type: order.store_response_status === 'accepted' ? 'available' :
                    order.store_response_status === 'rejected' ? 'unavailable' : 'pending',
      responded_at: order.store_response_at,
      created_at: order.store_response_at,
      stores: order.stores
    }));

    console.log('✅ تم جلب استجابات المتاجر بنجاح:', responses.length);
    return responses;

  } catch (error) {
    console.error('❌ خطأ غير متوقع في جلب استجابات المتاجر:', error);
    return [];
  }
}
