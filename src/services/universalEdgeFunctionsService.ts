/**
 * خدمة شاملة للتعامل مع Edge Functions
 * Universal Edge Functions Service
 * 
 * 🚀 الميزات:
 * - استدعاء عام لأي Edge Function
 * - معالجة محسنة للأخطاء
 * - دعم headers مخصصة (store-id, admin-mode)
 * - دعم GET و POST
 * - إعادة المحاولة التلقائية
 * - Timeout قابل للتخصيص
 */

import { supabase } from '@/integrations/supabase/client';

// قاعدة URL للـ Edge Functions
const EDGE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE || 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

// ===== TYPES =====

export interface EdgeFunctionOptions {
  /** معرف المتجر (إذا كان مطلوب) */
  storeId?: string;
  /** وضع الأدمن (إذا كان مطلوب) */
  adminMode?: boolean;
  /** مهلة الانتظار بالميلي ثانية */
  timeout?: number;
  /** عدد المحاولات */
  retries?: number;
  /** headers إضافية */
  headers?: Record<string, string>;
  /** HTTP method */
  method?: 'GET' | 'POST';
  /** query parameters للـ GET requests */
  queryParams?: Record<string, string>;
}

export interface EdgeFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  [key: string]: any;
}

// ===== SPECIFIC RESPONSE TYPES =====

export interface GetOrderResponse {
  success: boolean;
  message?: string;
  error?: string;
  order?: {
    id: string;
    order_code: string;
    customer_name?: string; // قد يكون مخفي حسب وضع المتجر
    customer_phone?: string;
    customer_address?: string;
    customer_city?: string;
    customer_notes?: string;
    order_status: string;
    total_amount: number;
    subtotal?: number;
    created_at: string;
    updated_at?: string;
    main_store_name: string;
    assigned_store_id?: string;
    assigned_store_name?: string;
    store_response_status?: string;
    store_response_at?: string;
  };
  order_items?: Array<{
    id: number;
    product_id: number;
    quantity: number;
    merged_quantity?: number;
    price: number;
    total_price: number;
    product_name?: string;
    product?: {
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
  customer_data_hidden?: boolean; // يحدد إذا كانت بيانات العميل مخفية
}

export interface AutoAssignOrdersResponse {
  success: boolean;
  message?: string;
  error?: string;
  assigned_count: number;
  unmatched_count: number;
  error_count: number;
  notified_count?: number;
  notification_failed_count?: number;
  results?: Array<{
    order_id: string;
    status: 'assigned' | 'unmatched' | 'error' | 'returned';
    store_name?: string;
    error_message?: string;
    notified?: boolean;
    warning?: string;
    return_reason?: string;
  }>;
  errors?: string[];
}

export interface InventoryResponse {
  success: boolean;
  message?: string;
  error?: string;
  inventory?: any;
}

// ===== MAIN SERVICE CLASS =====

export class UniversalEdgeFunctionsService {
  private baseURL: string;

  constructor(baseURL = EDGE_FUNCTIONS_BASE) {
    this.baseURL = baseURL;
  }

  /**
   * 🔥 الدالة الأساسية لاستدعاء أي Edge Function
   * Universal method to call any Edge Function
   */
  async callEdgeFunction<T = any>(
    functionName: string,
    body: any = {},
    options: EdgeFunctionOptions = {}
  ): Promise<EdgeFunctionResponse<T>> {
    const {
      storeId,
      adminMode,
      timeout = 30000,
      retries = 2,
      headers: customHeaders = {},
      method = 'POST',
      queryParams = {}
    } = options;

    let lastError: Error | null = null;

    // إعادة المحاولة
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // بناء URL
        const url = new URL(`${this.baseURL}/${functionName}`);
        
        // إضافة query parameters للـ GET requests
        if (method === 'GET') {
          Object.entries(queryParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
          });
          
          // إضافة adminMode للـ GET requests
          if (adminMode !== undefined) {
            url.searchParams.append('adminMode', adminMode.toString());
          }
        }

        // بناء Headers
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...customHeaders
        };

        // إضافة x-store-id header إذا كان متوفراً
        if (storeId && storeId.trim() !== '') {
          headers['x-store-id'] = storeId;
          console.log(`📌 [${functionName}] Adding x-store-id header: ${storeId}`);
        }

        // إضافة admin-mode header إذا كان محدد
        if (adminMode !== undefined) {
          headers['x-admin-mode'] = adminMode.toString();
          console.log(`👨‍💼 [${functionName}] Admin mode: ${adminMode}`);
        }

        console.log(`🔵 [Attempt ${attempt}] Calling Edge Function: ${functionName}`, {
          method,
          url: url.toString(),
          body: method === 'POST' ? body : 'N/A (GET)',
          headers: Object.fromEntries(Object.entries(headers)),
          timeout
        });

        // إرسال الطلب
        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        // إضافة body للـ POST requests فقط
        if (method === 'POST') {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url.toString(), fetchOptions);

        clearTimeout(timeoutId);

        console.log(`📨 [${functionName}] Response status: ${response.status}`);

        // معالجة الاستجابة
        if (!response.ok) {
          let errorMessage: string;
          let errorData: any = {};
          
          try {
            errorData = await response.json();
            errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }

          console.error(`❌ [${functionName}] Failed (attempt ${attempt}):`, {
            status: response.status,
            statusText: response.statusText,
            errorMessage,
            errorData
          });

          lastError = new Error(errorMessage);
          
          // إذا كان الخطأ 4xx، لا تعيد المحاولة
          if (response.status >= 400 && response.status < 500) {
            break;
          }
          
          continue;
        }

        // معالجة الاستجابة الناجحة
        const result = await response.json();
        console.log(`✅ [${functionName}] Success (attempt ${attempt}):`, result);
        
        return result;

      } catch (error) {
        clearTimeout(timeoutId);

        // معالجة محسنة للأخطاء
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error(`انتهت مهلة الاتصال (${timeout}ms) - ${functionName}`);
        } else if (error instanceof Error) {
          lastError = error;
        } else if (typeof error === 'string') {
          lastError = new Error(error);
        } else if (error && typeof error === 'object') {
          // للأخطاء التي تأتي كـ objects
          const errorMessage = error.message || error.error || error.toString() || `خطأ غير معروف في ${functionName}`;
          lastError = new Error(errorMessage);
        } else {
          lastError = new Error(`خطأ غير متوقع في ${functionName}: ${String(error)}`);
        }

        console.warn(`❌ [${functionName}] Attempt ${attempt} failed:`, {
          errorMessage: lastError.message,
          errorType: typeof error,
          originalError: error
        });

        // إذا كانت آخر محاولة، اكسر الحلقة
        if (attempt === retries + 1) break;

        // انتظار قبل إعادة المحاولة
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    console.error(`❌ [${functionName}] All attempts failed:`, lastError?.message);
    throw lastError || new Error(`فشل في استدعاء ${functionName} بعد ${retries + 1} محاولات`);
  }

  // ===== SPECIFIC METHODS =====

  /**
   * 📋 جلب تفاصيل الطلب
   * Get Order Details
   * 
   * @param orderId معرف الطلب
   * @param storeId معرف المتجر (اختياري، للمتاجر)
   * @param adminMode وضع الأدمن (اختياري، للأدمن)
   */
  async getOrder(
    orderId: string,
    storeId?: string,
    adminMode?: boolean
  ): Promise<GetOrderResponse> {
    if (!orderId) {
      throw new Error('معرف الطلب مطلوب');
    }

    try {
      const response = await this.callEdgeFunction<GetOrderResponse>(
        'get-order',
        {},
        {
          method: 'GET',
          queryParams: { orderId },
          storeId,
          adminMode,
          timeout: 15000
        }
      );

      return response;
    } catch (error) {
      console.error('❌ Error in getOrder:', error);
      
      // Fallback: جلب البيانات من قاعدة البيانات مباشرة
      if (adminMode) {
        try {
          console.log('🔄 Attempting database fallback...');
          const { data: order, error: dbError } = await supabase
            .from('orders')
            .select(`
              *,
              order_items (
                id,
                product_id,
                quantity,
                price,
                total_price,
                products (
                  id,
                  name,
                  price,
                  discounted_price,
                  main_store_name
                )
              )
            `)
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
                store_response_status: order.store_response_status,
                store_response_at: order.store_response_at,
              },
              order_items: order.order_items || [],
              assigned_store: order.assigned_store_id ? {
                id: order.assigned_store_id,
                name: order.assigned_store_name || 'متجر غير محدد'
              } : undefined
            };
          }
        } catch (fallbackError) {
          console.error('❌ Database fallback failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * 🤖 التعيين التلقائي للطلبات
   * Auto Assign Orders
   * 
   * @param orderId معرف الطلب (اختياري، للطلب الواحد)
   * @param returnReason سبب الإرجاع (للطلبات المرتجعة)
   */
  async autoAssignOrders(
    orderId?: string,
    returnReason?: string
  ): Promise<AutoAssignOrdersResponse> {
    const body: any = {};
    
    if (orderId) {
      body.orderId = orderId;
    }
    
    if (returnReason) {
      body.return_reason = returnReason;
    }

    try {
      const response = await this.callEdgeFunction<AutoAssignOrdersResponse>(
        'auto-assign-orders',
        body,
        {
          timeout: 60000, // 60 ثانية للمعالجة
          retries: 1 // محاولة واحدة إضافية فقط
        }
      );

      return response;
    } catch (error) {
      console.error('❌ Error in autoAssignOrders:', error);
      throw error;
    }
  }

  /**
   * 📦 جلب حالة المخزون
   * Get Inventory Status
   */
  async getInventory(): Promise<InventoryResponse> {
    try {
      const response = await this.callEdgeFunction<InventoryResponse>(
        'inventory',
        {},
        {
          method: 'GET',
          timeout: 15000
        }
      );

      return response;
    } catch (error) {
      console.error('❌ Error in getInventory:', error);
      throw error;
    }
  }

  /**
   * 🏪 تعيين طلب لمتجر محدد
   * Assign Order to Store
   */
  async assignOrder(orderId: string, storeId: string): Promise<EdgeFunctionResponse> {
    if (!orderId || !storeId) {
      throw new Error('معرف الطلب ومعرف المتجر مطلوبان');
    }

    try {
      const response = await this.callEdgeFunction(
        'assign-order',
        { orderId, storeId },
        { storeId }
      );

      return response;
    } catch (error) {
      console.error('❌ Error in assignOrder:', error);
      throw error;
    }
  }

  /**
   * 🔍 اختبار الاتصال مع Edge Functions
   * Test Connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      await this.callEdgeFunction(
        'get-order',
        {},
        {
          method: 'GET',
          queryParams: { orderId: 'test-connectivity' },
          timeout: 5000,
          retries: 0
        }
      );
      return true;
    } catch (error) {
      // نتوقع خطأ 400 للـ order ID غير صحيح، لكن ليس خطأ شبكة
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('400') || errorMessage.includes('404')) {
        return true; // الخدمة تعمل، لكن البيانات غير صحيحة
      }
      return false;
    }
  }
}

// ===== SINGLETON INSTANCE =====

export const edgeFunctionsService = new UniversalEdgeFunctionsService();

// ===== USAGE EXAMPLES =====

/*
🔥 أمثلة الاستخدام / Usage Examples:

// 1️⃣ جلب تفاصيل طلب (وضع الأدمن)
const orderDetails = await edgeFunctionsService.getOrder('order-123', undefined, true);

// 2️⃣ جلب تفاصيل طلب (وضع المتجر)
const orderForStore = await edgeFunctionsService.getOrder('order-123', 'store-456');

// 3️⃣ التعيين التلقائي لجميع الطلبات
const autoAssignResult = await edgeFunctionsService.autoAssignOrders();

// 4️⃣ التعيين التلقائي لطلب واحد مع سبب الإرجاع
const assignSingleOrder = await edgeFunctionsService.autoAssignOrders(
  'order-123', 
  'العميل غير راضي عن المنتج'
);

// 5️⃣ جلب حالة المخزون
const inventory = await edgeFunctionsService.getInventory();

// 6️⃣ تعيين طلب لمتجر
const assignResult = await edgeFunctionsService.assignOrder('order-123', 'store-456');

// 7️⃣ استدعاء عام لأي Edge Function
const customResult = await edgeFunctionsService.callEdgeFunction(
  'my-custom-function',
  { customData: 'value' },
  {
    storeId: 'store-123',
    adminMode: true,
    timeout: 10000,
    headers: { 'X-Custom-Header': 'value' }
  }
);

// 8️⃣ اختبار الاتصال
const isConnected = await edgeFunctionsService.testConnectivity();
if (!isConnected) {
  console.log('Edge Functions غير متاحة');
}
*/

export default edgeFunctionsService;
