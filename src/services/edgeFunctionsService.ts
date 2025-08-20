/**
 * Enhanced Edge Functions Service
 * Integrates with Supabase Edge Functions for order management
 */

import { supabase } from '@/integrations/supabase/client';

// Environment variable for Edge Functions base URL
const EDGE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE || 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

// Types
export interface OrderDetailResponse {
  success: boolean;
  message?: string;
  error?: string;
  order?: {
    id: string;
    order_code: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    customer_city: string;
    customer_notes?: string;
    order_status: string;
    total_amount: number;
    subtotal?: number;
    created_at: string;
    updated_at?: string;
    main_store_name: string;
    assigned_store_id?: string;
    assigned_store_name?: string;
  };
  order_items?: Array<{
    id: number;
    product_id: number;
    quantity: number;
    merged_quantity?: number;
    price: number;
    total_price: number;
    product: {
      id: number;
      name: string;
      price: number;
      discounted_price?: number;
      main_store_name: string;
    };
  }>;
  assigned_store?: {
    id: string;
    name: string;
  };
}

export interface AssignOrderResponse {
  success: boolean;
  message?: string;
  error?: string;
  store_name?: string;
  order_status?: string;
}

export interface AutoAssignResult {
  order_id: string;
  status: 'assigned' | 'unmatched' | 'error';
  store_name?: string;
  error_message?: string;
  notified?: boolean;
  warning?: string;
}

export interface AutoAssignResponse {
  success: boolean;
  message?: string;
  error?: string;
  assigned_count: number;
  unmatched_count: number;
  error_count: number;
  notified_count?: number;
  notification_failed_count?: number;
  results?: AutoAssignResult[];
  errors?: string[];
}

export class EdgeFunctionsService {
  /**
   * Generic method to call Edge Functions with proper error handling
   */
  private static async callEdgeFunction<T>(
    functionName: string,
    body: any = {},
    options?: { timeout?: number; storeId?: string }
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout || 30000);

    try {
      // بناء headers مع إضافة x-store-id إذا كان متوفراً
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // إضافة x-store-id header إذا كان مت��فراً ولا يساوي undefined أو فارغ
      if (options?.storeId && options.storeId.trim() !== '') {
        headers['x-store-id'] = options.storeId;
        console.log(`📌 Adding x-store-id header: ${options.storeId}`);
      } else {
        console.log(`ℹ️ No storeId provided for function: ${functionName} (admin mode)`);
      }

      console.log(`🔵 Calling Edge Function: ${functionName}`, {
        body,
        headers,
        url: `${EDGE_FUNCTIONS_BASE}/${functionName}`
      });

      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📨 ${functionName} response status:`, response.status);

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || 'Unknown error';

          // إضافة معلومات إضافية للأخطاء المتعلقة بالـ headers
          if (errorMessage.includes('x-store-id')) {
            errorMessage += ` (Headers sent: ${JSON.stringify(headers)})`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        console.error(`❌ Edge Function ${functionName} failed:`, {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          headers,
          body
        });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`✅ ${functionName} success:`, result);
      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
      }
      
      console.error(`❌ Error in ${functionName}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed order information by order ID
   *
   * Customer data visibility:
   * - Admin mode (no storeId): Always shows customer data
   * - Store mode (with storeId): Shows customer data only if order status is 'available', 'delivered', or 'returned'
   *
   * Product merging:
   * - Products with same product_id are merged with combined quantity and total price
   */
  static async getOrderDetails(orderId: string, storeId?: string): Promise<OrderDetailResponse> {
    if (!orderId) {
      throw new Error('معرف الطلب مطلوب');
    }

    try {
      // Use GET method with query parameters as per documentation
      const url = new URL(`${EDGE_FUNCTIONS_BASE}/get-order`);
      url.searchParams.append('orderId', orderId);
      url.searchParams.append('adminMode', storeId ? 'false' : 'true');

      const headers: HeadersInit = {};

      // Add x-store-id header if provided (not needed for admin mode)
      if (storeId && storeId.trim() !== '') {
        headers['x-store-id'] = storeId;
        console.log(`📌 Adding x-store-id header for GET: ${storeId}`);
      }

      console.log(`🔵 GET order details:`, {
        orderId,
        storeId,
        adminMode: storeId ? 'false' : 'true',
        url: url.toString()
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      });

      console.log(`📨 get-order response status:`, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'فشل في جلب تفاصيل الطلب');
      }

      return data;
    } catch (error) {
      console.error('❌ Error getting order details:', error);
      
      // Fallback: Try to get basic order data from database
      try {
        console.log('🔄 Attempting database fallback for order:', orderId);
        const { data: order, error: dbError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (dbError) throw dbError;

        if (order) {
          console.log('✅ Database fallback successful');
          return {
            success: true,
            message: 'تم جلب البيانات من قاعدة البيانات (Edge Function غير متاح)',
            order: {
              id: order.id,
              order_code: order.order_code,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              customer_address: order.customer_address,
              customer_city: order.customer_city,
              customer_notes: order.customer_notes,
              order_status: order.order_status || order.status,
              total_amount: order.total_amount,
              subtotal: order.subtotal,
              created_at: order.created_at,
              updated_at: order.updated_at,
              main_store_name: order.main_store_name,
              assigned_store_id: order.assigned_store_id,
              assigned_store_name: order.assigned_store_name,
            },
            order_items: order.items ? (Array.isArray(order.items) ? order.items : []) : [],
            assigned_store: order.assigned_store_id ? {
              id: order.assigned_store_id,
              name: order.assigned_store_name || 'متجر غير محدد'
            } : undefined
          };
        }
      } catch (fallbackError) {
        console.error('❌ Database fallback failed:', fallbackError);
      }

      throw error;
    }
  }

  /**
   * Assign an order to a specific store
   */
  static async assignOrder(orderId: string, storeId: string): Promise<AssignOrderResponse> {
    if (!orderId || !storeId) {
      throw new Error('معرف الطلب ومعرف المتجر مطلوبان');
    }

    try {
      const response = await this.callEdgeFunction<AssignOrderResponse>('assign-order', {
        orderId,
        storeId
      }, {
        storeId
      });

      if (!response.success) {
        throw new Error(response.error || 'فشل في تعيين الطلب');
      }

      return response;
    } catch (error) {
      console.error('❌ Error assigning order:', error);
      throw error;
    }
  }

  /**
   * Auto-assign all pending orders to matching stores
   */
  static async autoAssignOrders(): Promise<AutoAssignResponse> {
    try {
      const response = await this.callEdgeFunction<AutoAssignResponse>('auto-assign-orders', {}, {
        timeout: 60000 // 60 seconds for auto-assign as it may process many orders
      });

      if (!response.success) {
        throw new Error(response.error || 'فشل في التعيين التلقائي للطلبات');
      }

      return response;
    } catch (error) {
      console.error('❌ Error auto-assigning orders:', error);
      throw error;
    }
  }

  /**
   * Check Edge Functions connectivity
   */
  static async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/get-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': 'test-connectivity' // إضافة header للاختبار
        },
        body: JSON.stringify({ orderId: 'test-connectivity' })
      });

      // We expect a 400 or similar error for invalid order ID, but not network errors
      return response.status < 500;
    } catch (error) {
      console.error('❌ Edge Functions connectivity check failed:', error);
      return false;
    }
  }
}

export default EdgeFunctionsService;
