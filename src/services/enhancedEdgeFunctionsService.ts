/**
 * Enhanced Edge Functions Service مع معالجة محسنة للأخطاء
 * يحل مشكلة "FunctionsHttpError: Edge Function returned a non-2xx status code"
 */

import { supabase } from '@/integrations/supabase/client';

// الثوابت
const EDGE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE || 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

// Types
export interface EnhancedOrderDetailResponse {
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
    product_name: string;
    discounted_price?: number;
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

export interface StoreResponseResult {
  success: boolean;
  message?: string;
  error?: string;
  order_id?: string;
  store_id?: string;
  response_type?: 'available' | 'unavailable';
  updated_at?: string;
}

export interface RequestOptions {
  storeId?: string;
  timeout?: number;
  retries?: number;
  adminMode?: boolean;
}

/**
 * Enhanced Edge Functions Service Class
 */
export class EnhancedEdgeFunctionsService {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(baseURL = EDGE_FUNCTIONS_BASE) {
    this.baseURL = baseURL;
    this.defaultTimeout = 30000; // 30 seconds
    this.defaultRetries = 2;
  }

  /**
   * Enhanced method to call Edge Functions with better error handling
   */
  private async callEdgeFunction<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      storeId,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      adminMode = !storeId
    } = options;

    let lastError: Error;

    // محاولة مع إعادة المحاولة
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`🔵 Edge Function Call (attempt ${attempt}):`, {
          endpoint,
          method,
          data,
          storeId,
          adminMode,
          timeout
        });

        const result = await this.performRequest<T>(endpoint, method, data, {
          storeId,
          timeout,
          adminMode
        });

        console.log(`✅ Edge Function Success (attempt ${attempt}):`, result);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Edge Function Failed (attempt ${attempt}):`, lastError.message);

        // إذا كان الخطأ 4xx، لا نعيد المحاولة
        if (lastError.message.includes('400') || 
            lastError.message.includes('401') || 
            lastError.message.includes('403') || 
            lastError.message.includes('404')) {
          break;
        }

        // إذا لم تكن آخر محاولة، انتظر قبل إعادة المحاولة
        if (attempt <= retries) {
          await this.delay(1000 * attempt); // تأخير متزايد
        }
      }
    }

    console.error(`❌ All Edge Function attempts failed:`, lastError!.message);
    throw lastError!;
  }

  /**
   * تنفيذ الطلب الفعلي
   */
  private async performRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: any,
    options: { storeId?: string; timeout?: number; adminMode?: boolean } = {}
  ): Promise<T> {
    const { storeId, timeout = 30000, adminMode = true } = options;

    // إعداد AbortController للـ timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // بناء URL
      let url = `${this.baseURL}/${endpoint}`;

      // إعداد headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // إضافة x-store-id header إذا كان مطلوباً
      if (storeId && storeId.trim() !== '') {
        headers['x-store-id'] = storeId;
        console.log(`📌 Adding x-store-id header: ${storeId}`);
      } else if (!adminMode) {
        throw new Error('x-store-id header مطلوب للمتاجر');
      }

      // إعداد options للطلب
      const requestOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      // معالجة GET requests
      if (method === 'GET' && data) {
        const urlObj = new URL(url);
        Object.keys(data).forEach(key => {
          urlObj.searchParams.append(key, data[key]);
        });
        url = urlObj.toString();
      }
      // معالجة POST requests
      else if (method === 'POST' && data) {
        requestOptions.body = JSON.stringify(data);
      }

      console.log(`📤 Request details:`, {
        url,
        method,
        headers,
        body: requestOptions.body
      });

      // تنفيذ الطلب
      const response = await fetch(url, requestOptions);

      clearTimeout(timeoutId);

      console.log(`📥 Response received:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // معالجة الاستجابة
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result = await response.json();
      
      // التحقق من نجاح العملية في البيانات المُرجعة
      if (result.success === false) {
        throw new Error(result.error || result.message || 'Operation failed');
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`انتهت مهلة الاتصال بعد ${timeout}ms - يرجى المحاولة مرة أخرى`);
      }
      
      throw this.enhanceError(error as Error, endpoint);
    }
  }

  /**
   * معالجة الاستجابات الخاطئة
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage: string;
    let errorDetails: any;

    try {
      errorDetails = await response.json();
      errorMessage = errorDetails.error || errorDetails.message || 'Unknown error';
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    }

    // رسائل أخطاء مفهومة
    const statusMessages: Record<number, string> = {
      400: 'بيانات الطلب غير صحيحة أو مفقودة',
      401: 'غير مصرح - تحقق من الصلاحيات',
      403: 'ممنوع الوصول - تحقق من x-store-id header',
      404: 'الدالة غير موجودة',
      429: 'تم تجاوز حد الطلبات - حاول مرة أخرى لاحقاً',
      500: 'خطأ في الخادم',
      502: 'خطأ في Gateway - مشكلة مؤقتة',
      503: 'الخدمة غير متاحة'
    };

    const statusMessage = statusMessages[response.status] || 'خطأ غير معروف';
    const fullErrorMessage = `${statusMessage} (${response.status}): ${errorMessage}`;

    console.error(`❌ Edge Function Error Response:`, {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      errorDetails
    });

    throw new Error(fullErrorMessage);
  }

  /**
   * تحسين رسائل الأخطاء
   */
  private enhanceError(error: Error, operation: string): Error {
    const message = error.message;
    
    if (message.includes('fetch') || message.includes('network')) {
      return new Error(`خطأ في الاتصال بالشبكة أثناء ${operation}. تحقق من الاتصال بالإنترنت.`);
    }
    
    if (message.includes('timeout') || message.includes('AbortError')) {
      return new Error(`انتهت مهلة الاتصال أثناء ${operation}. يرجى المحاولة مرة أخرى.`);
    }
    
    return error;
  }

  /**
   * تأخير للانتظار بين المحاولات
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET order details مع معالجة محسنة
   */
  async getOrderDetails(orderId: string, options: RequestOptions = {}): Promise<EnhancedOrderDetailResponse> {
    if (!orderId || orderId.trim() === '') {
      throw new Error('orderId مطلوب');
    }

    const { storeId, adminMode = !storeId } = options;

    try {
      // استخدام GET method مع query parameters
      const queryData = {
        orderId: orderId.trim(),
        adminMode: adminMode.toString()
      };

      const result = await this.callEdgeFunction<EnhancedOrderDetailResponse>(
        'get-order',
        'GET',
        queryData,
        { ...options, adminMode }
      );

      return result;

    } catch (error) {
      console.error('❌ Error getting order details:', error);
      
      // Fallback to database if Edge Function fails
      if (adminMode) {
        try {
          console.log('🔄 Attempting database fallback...');
          return await this.getDatabaseFallback(orderId);
        } catch (fallbackError) {
          console.error('❌ Database fallback failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * POST store response مع معالجة محسنة
   */
  async submitStoreResponse(
    orderId: string,
    storeId: string,
    responseType: 'available' | 'unavailable',
    rejectionReason?: string
  ): Promise<StoreResponseResult> {
    // التحقق من صحة البيانات
    if (!orderId || orderId.trim() === '') {
      throw new Error('orderId مطلوب');
    }
    if (!storeId || storeId.trim() === '') {
      throw new Error('storeId مطلوب');
    }
    if (!['available', 'unavailable'].includes(responseType)) {
      throw new Error('response_type يجب أن يكون available أو unavailable');
    }

    try {
      const requestData: any = {
        order_id: orderId.trim(),
        response_type: responseType
      };

      // إضافة سبب الرفض إذا كان متوفراً
      if (responseType === 'unavailable' && rejectionReason) {
        requestData.rejection_reason = rejectionReason.trim();
      }

      const result = await this.callEdgeFunction<StoreResponseResult>(
        'assign-order',
        'POST',
        requestData,
        { storeId: storeId.trim(), adminMode: false }
      );

      return result;

    } catch (error) {
      console.error('❌ Error submitting store response:', error);
      throw error;
    }
  }

  /**
   * Database fallback للحصول على بيانات الطلب
   */
  private async getDatabaseFallback(orderId: string): Promise<EnhancedOrderDetailResponse> {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items:order_items(
          id,
          product_name,
          quantity,
          price,
          discounted_price,
          product_id,
          products:product_id(
            id,
            name,
            price,
            discounted_price,
            main_store_name
          )
        ),
        stores:assigned_store_id(
          id,
          name
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;

    if (!order) {
      throw new Error('الطلب غير موجود');
    }

    // تحويل البيانات إلى الشكل المطلوب
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
        assigned_store_name: order.stores?.name,
        store_response_status: order.store_response_status,
        store_response_at: order.store_response_at,
      },
      order_items: order.order_items?.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product_name: item.product_name,
        discounted_price: item.discounted_price,
        product: {
          id: item.products?.id || 0,
          name: item.products?.name || item.product_name,
          price: item.products?.price || item.price,
          discounted_price: item.products?.discounted_price,
          main_store_name: item.products?.main_store_name || order.main_store_name
        }
      })) || [],
      assigned_store: order.stores ? {
        id: order.stores.id,
        name: order.stores.name
      } : undefined
    };
  }

  /**
   * اختبار الاتصال مع Edge Functions
   */
  async testConnectivity(): Promise<boolean> {
    try {
      // اختبار بسيط للاتصال
      const response = await fetch(`${this.baseURL}/get-order?orderId=test-connectivity&adminMode=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // نتوقع 400 أو مشابه للـ test data، لكن ليس خطأ شبكة
      return response.status < 500;
    } catch (error) {
      console.error('❌ Connectivity test failed:', error);
      return false;
    }
  }
}

// إنشاء instance مُشترك
export const enhancedEdgeFunctionsService = new EnhancedEdgeFunctionsService();

export default enhancedEdgeFunctionsService;
