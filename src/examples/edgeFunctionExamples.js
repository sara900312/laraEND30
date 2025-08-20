/**
 * أمثلة جاهزة لاستخدام Edge Functions مع Supabase
 * هذا الملف يحتوي على أمثلة صحيحة للاستخدام مع fetch و axios
 */

// الثوابت
const EDGE_FUNCTIONS_BASE = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

// ====================================================================
// 1. GET order (مع إدراج x-store-id)
// ====================================================================

/**
 * جلب تفاصيل ا��طلب باستخدام fetch (الطريقة المفضلة)
 */
async function getOrderWithFetch(orderId, storeId) {
  try {
    console.log('🔵 Fetching order details:', { orderId, storeId });

    // بناء URL مع query parameters
    const url = new URL(`${EDGE_FUNCTIONS_BASE}/get-order`);
    url.searchParams.append('orderId', orderId);
    url.searchParams.append('adminMode', storeId ? 'false' : 'true');

    // إعداد headers
    const headers = {
      'Content-Type': 'application/json',
    };

    // إضافة x-store-id header إذا كان متوفراً (مطلوب للمتاجر، اختياري للمشرفين)
    if (storeId && storeId.trim() !== '') {
      headers['x-store-id'] = storeId;
    }

    console.log('📤 Request details:', {
      method: 'GET',
      url: url.toString(),
      headers
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Success:', data);
    return data;

  } catch (error) {
    console.error('❌ Error fetching order:', error);
    throw error;
  }
}

/**
 * جلب تفاصيل الطلب باستخدام axios
 */
async function getOrderWithAxios(orderId, storeId) {
  try {
    const axios = (await import('axios')).default;

    const config = {
      method: 'GET',
      url: `${EDGE_FUNCTIONS_BASE}/get-order`,
      params: {
        orderId: orderId,
        adminMode: storeId ? 'false' : 'true'
      },
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // إضافة x-store-id header إذا كان متوفراً
    if (storeId && storeId.trim() !== '') {
      config.headers['x-store-id'] = storeId;
    }

    console.log('📤 Axios request config:', config);

    const response = await axios(config);
    console.log('✅ Axios success:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Axios error:', error.response?.data || error.message);
    throw error;
  }
}

// ====================================================================
// 2. POST response available (المنتج متوفر)
// ====================================================================

/**
 * إرسال رد "متوفر" باستخدام fetch
 */
async function postResponseAvailableWithFetch(orderId, storeId) {
  try {
    console.log('🔵 Posting available response:', { orderId, storeId });

    const response = await fetch(`${EDGE_FUNCTIONS_BASE}/assign-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': storeId // مطلوب
      },
      body: JSON.stringify({
        order_id: orderId,
        response_type: 'available'
      })
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Available response success:', data);
    return data;

  } catch (error) {
    console.error('❌ Error posting available response:', error);
    throw error;
  }
}

/**
 * إرسال رد "متوفر" باستخدام axios
 */
async function postResponseAvailableWithAxios(orderId, storeId) {
  try {
    const axios = (await import('axios')).default;

    const response = await axios({
      method: 'POST',
      url: `${EDGE_FUNCTIONS_BASE}/assign-order`,
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': storeId
      },
      data: {
        order_id: orderId,
        response_type: 'available'
      }
    });

    console.log('✅ Axios available response success:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Axios available response error:', error.response?.data || error.message);
    throw error;
  }
}

// ====================================================================
// 3. POST response unavailable (المنتج غير متوفر)
// ====================================================================

/**
 * إرسال رد "غير متوفر" باستخدام fetch
 */
async function postResponseUnavailableWithFetch(orderId, storeId, rejectionReason = 'غير متوفر') {
  try {
    console.log('🔵 Posting unavailable response:', { orderId, storeId, rejectionReason });

    const response = await fetch(`${EDGE_FUNCTIONS_BASE}/assign-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': storeId // مطلوب
      },
      body: JSON.stringify({
        order_id: orderId,
        response_type: 'unavailable',
        rejection_reason: rejectionReason // اختياري
      })
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Unavailable response success:', data);
    return data;

  } catch (error) {
    console.error('❌ Error posting unavailable response:', error);
    throw error;
  }
}

/**
 * إرسال رد "غير متوفر" باستخدام axios
 */
async function postResponseUnavailableWithAxios(orderId, storeId, rejectionReason = 'غير متوفر') {
  try {
    const axios = (await import('axios')).default;

    const response = await axios({
      method: 'POST',
      url: `${EDGE_FUNCTIONS_BASE}/assign-order`,
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': storeId
      },
      data: {
        order_id: orderId,
        response_type: 'unavailable',
        rejection_reason: rejectionReason
      }
    });

    console.log('✅ Axios unavailable response success:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Axios unavailable response error:', error.response?.data || error.message);
    throw error;
  }
}

// ====================================================================
// 4. دوال مساعدة للاستخدام المحسن
// ====================================================================

/**
 * دالة شاملة للتعامل مع الطلبات مع معالجة الأخطاء
 */
class EdgeFunctionClient {
  constructor(baseURL = EDGE_FUNCTIONS_BASE) {
    this.baseURL = baseURL;
  }

  /**
   * GET order details
   */
  async getOrder(orderId, storeId = null) {
    try {
      const url = new URL(`${this.baseURL}/get-order`);
      url.searchParams.append('orderId', orderId);
      url.searchParams.append('adminMode', storeId ? 'false' : 'true');

      const headers = {
        'Content-Type': 'application/json',
      };

      if (storeId) {
        headers['x-store-id'] = storeId;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw this.enhanceError(error, 'getOrder');
    }
  }

  /**
   * POST store response
   */
  async postStoreResponse(orderId, storeId, responseType, rejectionReason = null) {
    try {
      const payload = {
        order_id: orderId,
        response_type: responseType
      };

      if (rejectionReason && responseType === 'unavailable') {
        payload.rejection_reason = rejectionReason;
      }

      const response = await fetch(`${this.baseURL}/assign-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId
        },
        body: JSON.stringify(payload)
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw this.enhanceError(error, 'postStoreResponse');
    }
  }

  /**
   * معالجة الاستجابة مع فحص الأخطاء
   */
  async handleResponse(response) {
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || 'Unknown error';
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(`Edge Function Error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    console.log('✅ Success response:', data);
    return data;
  }

  /**
   * تحسين رسائل الأخطاء
   */
  enhanceError(error, operation) {
    const errorMessage = error.message || error.toString();
    console.error(`❌ Error in ${operation}:`, errorMessage);
    
    if (errorMessage.includes('fetch')) {
      return new Error(`خطأ في الاتصال بالخادم أثناء ${operation}. تحقق من الاتصال بالإنترنت.`);
    }
    
    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return new Error(`خطأ في الصلاحيات أثناء ${operation}. تحقق من x-store-id header.`);
    }
    
    if (errorMessage.includes('400')) {
      return new Error(`بيانات غير صحيحة أثناء ${operation}. تحقق من orderId و storeId.`);
    }
    
    return error;
  }
}

// ====================================================================
// 5. أمثلة للاستخدام
// ====================================================================

/**
 * مثال شامل لاستخدام جميع الدوال
 */
async function completeExample() {
  const client = new EdgeFunctionClient();
  const orderId = 'your-order-id-here';
  const storeId = 'your-store-id-here';

  try {
    console.log('🔄 بدء الاختبار الشامل...');

    // 1. جلب تفاصيل الطلب
    console.log('\n1️⃣ جلب تفاصيل الطلب...');
    const orderDetails = await client.getOrder(orderId, storeId);
    console.log('📋 Order details:', orderDetails);

    // 2. إرسال رد "متوفر"
    console.log('\n2️⃣ إرسال رد متوفر...');
    const availableResponse = await client.postStoreResponse(orderId, storeId, 'available');
    console.log('✅ Available response:', availableResponse);

    // 3. إرسال رد "غير متوفر" (في حالة أخرى)
    console.log('\n3️⃣ مثال على رد غير متوفر...');
    // const unavailableResponse = await client.postStoreResponse(orderId, storeId, 'unavailable', 'نفد المخزون');
    // console.log('❌ Unavailable response:', unavailableResponse);

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
  }
}

// ====================================================================
// 6. أمثلة سريعة للنسخ واللصق
// ====================================================================

/*
// مثال سريع - GET order (للمتجر)
fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order?orderId=ORDER_ID&adminMode=false', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-store-id': 'YOUR_STORE_ID'
  }
}).then(response => response.json()).then(data => console.log(data));

// مثال سريع - POST available
fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/assign-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-store-id': 'YOUR_STORE_ID'
  },
  body: JSON.stringify({
    order_id: 'ORDER_ID',
    response_type: 'available'
  })
}).then(response => response.json()).then(data => console.log(data));

// مثال سريع - POST unavailable
fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/assign-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-store-id': 'YOUR_STORE_ID'
  },
  body: JSON.stringify({
    order_id: 'ORDER_ID',
    response_type: 'unavailable',
    rejection_reason: 'غير متوفر في المخزون'
  })
}).then(response => response.json()).then(data => console.log(data));
*/

// التصدير للاستخدام في ملفات أخرى
export {
  EdgeFunctionClient,
  getOrderWithFetch,
  getOrderWithAxios,
  postResponseAvailableWithFetch,
  postResponseAvailableWithAxios,
  postResponseUnavailableWithFetch,
  postResponseUnavailableWithAxios,
  completeExample
};

export default EdgeFunctionClient;
