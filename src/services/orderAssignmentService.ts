/**
 * خدمة تحويل الطلبات المحسنة
 * Enhanced Order Assignment Service
 * 
 * هذه الخدمة تحل مشكلة "[object Object]" في handleAssignOrder
 * وتقوم بتحويل الطلبات مباشرة عبر قاعدة البيانات كبديل للـ Edge Function
 */

import { supabase } from '@/integrations/supabase/client';

export interface AssignOrderRequest {
  orderId: string;
  storeId: string;
  assignedBy?: string;
  mode?: 'manual' | 'auto';
}

export interface AssignOrderResponse {
  success: boolean;
  message?: string;
  error?: string;
  order_status?: string;
  store_name?: string;
  assigned_at?: string;
}

export interface AutoAssignRequest {
  orderId?: string;
  returnReason?: string;
  mode?: 'single' | 'all';
}

export interface AutoAssignResponse {
  success: boolean;
  message?: string;
  error?: string;
  assigned_count: number;
  unmatched_count: number;
  error_count: number;
  results?: Array<{
    order_id: string;
    status: 'assigned' | 'unmatched' | 'error';
    store_name?: string;
    error_message?: string;
  }>;
}

/**
 * خدمة تحويل الطلبات المحسنة
 */
export class OrderAssignmentService {
  
  /**
   * تحويل طلب واحد لمتجر محدد
   */
  static async assignOrderToStore(request: AssignOrderRequest): Promise<AssignOrderResponse> {
    const { orderId, storeId, assignedBy = 'system', mode = 'manual' } = request;
    
    try {
      console.log('🔄 Starting order assignment:', { orderId, storeId, mode });
      
      // 1. التحقق من وجود الطلب
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, order_code, order_status, main_store_name, assigned_store_id')
        .eq('id', orderId)
        .single();
      
      if (orderError || !order) {
        throw new Error(`ال��لب غير موجود: ${orderError?.message || 'Order not found'}`);
      }
      
      // 2. التحقق من وجود المتجر
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name, status')
        .eq('id', storeId)
        .single();
      
      if (storeError || !store) {
        throw new Error(`المتجر غير موجود: ${storeError?.message || 'Store not found'}`);
      }
      
      // 3. التحقق من حالة المتجر
      if (store.status !== 'active') {
        throw new Error(`المتجر غير نشط: ${store.name}`);
      }
      
      // 4. التحقق من حالة الطلب
      if (order.order_status === 'delivered' || order.order_status === 'returned') {
        throw new Error(`لا يمكن تحويل طلب بحالة: ${order.order_status}`);
      }
      
      // 5. تحديث الطلب
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          assigned_store_id: storeId,
          assigned_store_name: store.name,
          order_status: 'assigned',
          updated_at: new Date().toISOString(),
          // إضافة معلومات التحويل
          assignment_metadata: {
            assigned_by: assignedBy,
            assignment_mode: mode,
            assigned_at: new Date().toISOString(),
            previous_status: order.order_status
          }
        })
        .eq('id', orderId);
      
      if (updateError) {
        throw new Error(`فشل تحديث الطلب: ${updateError.message}`);
      }
      
      console.log('✅ Order assigned successfully:', {
        orderId,
        storeName: store.name,
        previousStatus: order.order_status
      });
      
      return {
        success: true,
        message: `تم تحويل الطلب ${order.order_code} إلى متجر "${store.name}" بنجاح`,
        order_status: 'assigned',
        store_name: store.name,
        assigned_at: new Date().toISOString()
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in assignOrderToStore:', {
        error: errorMessage,
        orderId,
        storeId
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * التحويل التلقائي للطلبات حسب اسم المتجر الأصلي
   */
  static async autoAssignOrders(request: AutoAssignRequest = {}): Promise<AutoAssignResponse> {
    const { orderId, returnReason, mode = 'all' } = request;
    
    try {
      console.log('🤖 Starting auto-assignment:', { orderId, mode, returnReason });
      
      // 1. جلب المتاجر النشطة
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name, status')
        .eq('status', 'active');
      
      if (storesError) {
        throw new Error(`فشل جلب المتاجر: ${storesError.message}`);
      }
      
      if (!stores || stores.length === 0) {
        throw new Error('لا توجد متاجر نشطة');
      }
      
      // 2. تحديد الطلبات المراد معالجتها
      let ordersQuery = supabase
        .from('orders')
        .select('id, order_code, main_store_name, order_status, assigned_store_id');
      
      if (mode === 'single' && orderId) {
        ordersQuery = ordersQuery.eq('id', orderId);
      } else {
        // جلب الطلبات المعلقة أو غير المحولة
        ordersQuery = ordersQuery.or('order_status.eq.pending,order_status.eq.processing');
      }
      
      const { data: orders, error: ordersError } = await ordersQuery;
      
      if (ordersError) {
        throw new Error(`فشل جلب الطلبات: ${ordersError.message}`);
      }
      
      if (!orders || orders.length === 0) {
        return {
          success: true,
          message: 'لا توجد طلبات للمعالجة',
          assigned_count: 0,
          unmatched_count: 0,
          error_count: 0,
          results: []
        };
      }
      
      // 3. معالجة كل طلب
      const results = [];
      let assignedCount = 0;
      let unmatchedCount = 0;
      let errorCount = 0;
      
      for (const order of orders) {
        try {
          // البحث عن متجر مطابق
          const matchingStore = stores.find(store => 
            store.name.toLowerCase().trim() === order.main_store_name?.toLowerCase().trim()
          );
          
          if (!matchingStore) {
            unmatchedCount++;
            results.push({
              order_id: order.id,
              status: 'unmatched' as const,
              error_message: `لا يوجد متجر مطابق لـ "${order.main_store_name}"`
            });
            continue;
          }
          
          // تحويل الطلب
          const assignResult = await this.assignOrderToStore({
            orderId: order.id,
            storeId: matchingStore.id,
            assignedBy: 'auto-system',
            mode: 'auto'
          });
          
          if (assignResult.success) {
            assignedCount++;
            results.push({
              order_id: order.id,
              status: 'assigned' as const,
              store_name: matchingStore.name
            });
          } else {
            errorCount++;
            results.push({
              order_id: order.id,
              status: 'error' as const,
              error_message: assignResult.error || 'خطأ غير معروف'
            });
          }
          
        } catch (error) {
          errorCount++;
          results.push({
            order_id: order.id,
            status: 'error' as const,
            error_message: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      console.log('✅ Auto-assignment completed:', {
        total: orders.length,
        assigned: assignedCount,
        unmatched: unmatchedCount,
        errors: errorCount
      });
      
      return {
        success: true,
        message: `تم معالجة ${orders.length} طلب: ${assignedCount} محول، ${unmatchedCount} غير مطابق، ${errorCount} خطأ`,
        assigned_count: assignedCount,
        unmatched_count: unmatchedCount,
        error_count: errorCount,
        results
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in autoAssignOrders:', {
        error: errorMessage,
        request
      });
      
      return {
        success: false,
        error: errorMessage,
        assigned_count: 0,
        unmatched_count: 0,
        error_count: 1
      };
    }
  }
  
  /**
   * إلغاء تحويل طلب
   */
  static async unassignOrder(orderId: string): Promise<AssignOrderResponse> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          assigned_store_id: null,
          assigned_store_name: null,
          order_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) {
        throw new Error(`فشل إلغاء التحويل: ${error.message}`);
      }
      
      return {
        success: true,
        message: 'تم إلغاء تحويل الطلب بنجاح',
        order_status: 'pending'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * جلب إحصائيات التحويل
   */
  static async getAssignmentStats() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_status, assigned_store_id, main_store_name');
      
      if (error) throw error;
      
      const stats = {
        total: data.length,
        assigned: data.filter(o => o.assigned_store_id).length,
        pending: data.filter(o => o.order_status === 'pending').length,
        processing: data.filter(o => o.order_status === 'processing').length,
        delivered: data.filter(o => o.order_status === 'delivered').length,
        returned: data.filter(o => o.order_status === 'returned').length
      };
      
      return { success: true, stats };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export default OrderAssignmentService;
