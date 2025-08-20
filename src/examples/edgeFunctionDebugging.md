# دليل إصلاح أخطاء Edge Functions في Supabase

## الأخطاء الشائعة وحلولها

### 1. خطأ "FunctionsHttpError: Edge Function returned a non-2xx status code"

هذا الخطأ يحدث عندما تُرجع Edge Function رمز حالة غير ناجح (ليس 2xx). إليك الأسباب الشائعة والحلول:

#### السبب الأكثر شيوعاً: مشكلة في headers

```javascript
// ❌ خطأ - نقص x-store-id header للمتاجر
fetch('/functions/v1/get-order?orderId=123', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
    // نقص x-store-id
  }
})

// ✅ صحيح - مع x-store-id header
fetch('/functions/v1/get-order?orderId=123&adminMode=false', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-store-id': 'your-store-uuid-here'
  }
})
```

#### السبب الثاني: خطأ في method أو بنية البيانات

```javascript
// ❌ خطأ - استخدام POST للـ get-order
fetch('/functions/v1/get-order', {
  method: 'POST', // خطأ هنا
  body: JSON.stringify({ orderId: '123' })
})

// ✅ صحيح - استخدام GET مع query parameters
fetch('/functions/v1/get-order?orderId=123&adminMode=false', {
  method: 'GET',
  headers: {
    'x-store-id': 'your-store-uuid'
  }
})
```

#### السبب الثالث: بيانات غير صحيحة في POST requests

```javascript
// ❌ خطأ - نقص في البيانات المطلوبة
fetch('/functions/v1/assign-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-store-id': 'store-id'
  },
  body: JSON.stringify({
    orderId: '123' // خطأ: يجب أن يكون order_id
  })
})

// ✅ صحيح - البيانات الصحيحة
fetch('/functions/v1/assign-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-store-id': 'store-id'
  },
  body: JSON.stringify({
    order_id: '123',
    response_type: 'available'
  })
})
```

### 2. رموز الأخطاء الشائعة

#### 400 Bad Request
- **السبب**: بيانات مفقودة أو غير صحيحة
- **الحل**: تحقق من أن جميع الحقول المطلوبة موجودة وصحيحة

```javascript
// تحقق من البيانات قبل الإرسال
function validateOrderRequest(orderId, storeId, responseType) {
  if (!orderId || orderId.trim() === '') {
    throw new Error('orderId مطلوب');
  }
  if (!storeId || storeId.trim() === '') {
    throw new Error('storeId مطلوب');
  }
  if (!['available', 'unavailable'].includes(responseType)) {
    throw new Error('response_type يجب أن يكون available أو unavailable');
  }
}
```

#### 401 Unauthorized / 403 Forbidden
- **السبب**: مشكلة في الصلاحيات أو headers
- **الحل**: تأكد من وجود x-store-id header صحيح

#### 404 Not Found
- **السبب**: URL غير صحيح أو الدالة غير موجودة
- **الحل**: تحقق من URL الصحيح

#### 500 Internal Server Error
- **السبب**: خطأ في Edge Function نفسها
- **الحل**: تحقق من logs في Supabase Dashboard

### 3. نموذج للتحقق من الأخطاء

```javascript
async function safeEdgeFunctionCall(url, options) {
  try {
    console.log('��� إرسال طلب إلى:', url);
    console.log('📤 معطيات الطلب:', options);

    const response = await fetch(url, options);
    
    console.log('📥 رمز الاستجابة:', response.status);
    console.log('📋 headers الاستجابة:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // محاولة قراءة تفاصيل الخطأ
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text().catch(() => 'لا توجد تفاصيل إضافية');
      }

      console.error('❌ فشل الطلب:', {
        status: response.status,
        statusText: response.statusText,
        errorDetails
      });

      // رسائل أخطاء مفهومة بالعربية
      const errorMessages = {
        400: 'بيانات الطلب غير صحيحة أو مفقودة',
        401: 'غير مصرح لك بالوصول - تحقق من الصلاحيات',
        403: 'ممنوع الوصول - تحقق من x-store-id header',
        404: 'الدالة غير موجودة - تحقق من URL',
        500: 'خطأ في الخادم - تحقق من logs',
        502: 'خطأ في Gateway - مشكلة مؤقتة',
        503: 'الخدمة غي�� متاحة - حاول مرة أخرى لاحقاً'
      };

      const userFriendlyMessage = errorMessages[response.status] || 'خطأ غير معروف';
      throw new Error(`${userFriendlyMessage} (${response.status}): ${errorDetails.error || errorDetails.message || errorDetails}`);
    }

    const data = await response.json();
    console.log('✅ نجح الطلب:', data);
    return data;

  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error);
    
    // معالجة أخطاء الشبكة
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('خطأ في الاتصال بالشبكة - تحقق من الاتصال بالإنترنت');
    }
    
    throw error;
  }
}
```

### 4. أمثلة للاستخدام الصحيح

#### للمشرفين (بدون x-store-id):

```javascript
// GET order للمشرف
const orderDetails = await safeEdgeFunctionCall(
  'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order?orderId=123&adminMode=true',
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
      // لا نضع x-store-id للمشرفين
    }
  }
);
```

#### للمتاجر (مع x-store-id مطلوب):

```javascript
// GET order للمتجر
const orderDetails = await safeEdgeFunctionCall(
  'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order?orderId=123&adminMode=false',
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-store-id': 'store-uuid-here' // مطلوب للمتاجر
    }
  }
);

// POST store response
const response = await safeEdgeFunctionCall(
  'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/assign-order',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-store-id': 'store-uuid-here'
    },
    body: JSON.stringify({
      order_id: '123',
      response_type: 'available' // أو 'unavailable'
    })
  }
);
```

### 5. نصائح للتشخيص

1. **استخدم console.log** لرؤية تفاصيل الطلب والاستجابة
2. **تحقق من Supabase Dashboard** لرؤية logs Edge Functions
3. **اختبر مع curl** أولاً للتأكد من أن API يعمل:

```bash
# اختبار GET
curl -X GET "https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order?orderId=123&adminMode=false" \
  -H "x-store-id: your-store-id" \
  -H "Content-Type: application/json"

# اختبار POST
curl -X POST "https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/assign-order" \
  -H "x-store-id: your-store-id" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "123", "response_type": "available"}'
```

### 6. كود تشخيصي للاختبار

```javascript
async function testEdgeFunctions() {
  const testOrderId = 'test-order-id';
  const testStoreId = 'test-store-id';

  console.log('🧪 بدء اختبار Edge Functions...');

  // اختبار 1: GET order
  try {
    console.log('\n1️⃣ اختبار GET order...');
    await safeEdgeFunctionCall(
      `https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order?orderId=${testOrderId}&adminMode=false`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': testStoreId
        }
      }
    );
  } catch (error) {
    console.log('❌ GET order فشل:', error.message);
  }

  // اختبار 2: POST available
  try {
    console.log('\n2️⃣ اختبار POST available...');
    await safeEdgeFunctionCall(
      'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/assign-order',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': testStoreId
        },
        body: JSON.stringify({
          order_id: testOrderId,
          response_type: 'available'
        })
      }
    );
  } catch (error) {
    console.log('❌ POST available فشل:', error.message);
  }

  console.log('\n✅ انتهى الاختبار');
}

// تشغيل الاختبار
// testEdgeFunctions();
```

هذا الدليل يجب أن يساعدك في تشخيص وإصلاح مشكلة "non-2xx status code" وأي أخطاء أخرى في Edge Functions.
