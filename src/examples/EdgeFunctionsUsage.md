# 🚀 دليل استخدام Edge Functions Service

## الاستيراد والإعداد

```typescript
import { edgeFunctionsService } from '@/services/universalEdgeFunctionsService';
import { useUniversalEdgeFunctions } from '@/hooks/useUniversalEdgeFunctions';
```

## 1️⃣ جلب تفاصيل الطلب (get-order)

### للأدمن (إظهار جميع البيانات):

```typescript
// باستخدام الخدمة مباشرة
const orderDetails = await edgeFunctionsService.getOrder(
  'order-id-123',    // معرف الطلب
  undefined,         // لا يوجد متجر محدد
  true              // وضع الأدمن
);

// باستخدام الـ Hook
const { getOrder } = useUniversalEdgeFunctions();
const order = await getOrder('order-id-123', undefined, true);
```

### للمتجر (إخفاء بيانات العميل حسب الحالة):

```typescript
// باستخدام الخدمة مباشرة
const orderDetails = await edgeFunctionsService.getOrder(
  'order-id-123',    // معرف الطلب
  'store-456'        // معرف المتجر
);

// باستخدام الـ Hook
const { getOrder } = useUniversalEdgeFunctions();
const order = await getOrder('order-id-123', 'store-456');
```

### معالجة النتيجة:

```typescript
if (orderDetails.success) {
  console.log('تفاصيل الطلب:', orderDetails.order);
  console.log('منتجات الطلب:', orderDetails.order_items);
  
  // فحص إذا كانت بيانات العميل مخفية
  if (orderDetails.customer_data_hidden) {
    console.log('بيانات العميل مخفية (وضع المتجر)');
  }
} else {
  console.error('خطأ:', orderDetails.error);
}
```

## 2️⃣ التعيين التلقائي (auto-assign-orders)

### تعيين جميع الطلبات المعلقة:

```typescript
// باستخدام الخدمة مباشرة
const results = await edgeFunctionsService.autoAssignOrders();

// باستخدام الـ Hook
const { autoAssignOrders } = useUniversalEdgeFunctions();
const results = await autoAssignOrders();

console.log(`تم تعيين ${results.assigned_count} طلب`);
console.log(`${results.unmatched_count} طلب غير مطابق`);
console.log(`${results.error_count} خطأ`);
```

### تعيين طلب واحد مع سبب الإرجاع:

```typescript
const results = await edgeFunctionsService.autoAssignOrders(
  'order-id-123',           // معرف الطلب
  'العميل غير راضي عن المنتج'  // سبب الإرجاع
);

// معالجة النتائج التفصيلية
if (results.results) {
  results.results.forEach(result => {
    console.log(`الطلب ${result.order_id}: ${result.status}`);
    if (result.store_name) {
      console.log(`تم التعيين للمتجر: ${result.store_name}`);
    }
    if (result.return_reason) {
      console.log(`سبب الإرجاع: ${result.return_reason}`);
    }
  });
}
```

## 3️⃣ جلب حالة المخزون (inventory)

```typescript
// باستخدام الخدمة مباشرة
const inventory = await edgeFunctionsService.getInventory();

// باستخدام الـ Hook
const { getInventory } = useUniversalEdgeFunctions();
const inventory = await getInventory();

if (inventory.success) {
  console.log('بيانات المخزون:', inventory.inventory);
}
```

## 4️⃣ تعيين طلب لمتج�� محدد (assign-order)

```typescript
// باستخدام الخدمة مباشرة
const result = await edgeFunctionsService.assignOrder(
  'order-id-123',  // معرف الطلب
  'store-456'      // معرف المتجر
);

// باستخدام الـ Hook
const { assignOrder } = useUniversalEdgeFunctions();
const result = await assignOrder('order-id-123', 'store-456');
```

## 5️⃣ استدعاء دالة مخصصة

```typescript
// لأي Edge Function أخرى
const customResult = await edgeFunctionsService.callEdgeFunction(
  'my-custom-function',     // اسم الدالة
  { customData: 'value' },  // البيانات المرسلة
  {
    storeId: 'store-123',   // معرف المتجر (اختياري)
    adminMode: true,        // وضع الأدمن (اختياري)
    timeout: 10000,         // مهلة الانتظار (اختياري)
    method: 'POST',         // الطريقة (افتراضي: POST)
    headers: {              // headers إضافية (اختياري)
      'X-Custom-Header': 'value'
    }
  }
);
```

## 6️⃣ اختبار الاتصال

```typescript
// فحص إذا كانت Edge Functions متاحة
const isConnected = await edgeFunctionsService.testConnectivity();

if (isConnected) {
  console.log('✅ Edge Functions متاحة');
} else {
  console.log('❌ Edge Functions غير متاحة');
}
```

## 7️⃣ استخدام الـ React Hook (موصى به)

```tsx
import React from 'react';
import { useUniversalEdgeFunctions } from '@/hooks/useUniversalEdgeFunctions';

function MyComponent() {
  const {
    loading,           // حالة التحميل
    orderDetails,      // نتائج الطلب
    autoAssignResults, // نتائج التعيين التلقائي
    getOrder,          // دالة جلب الطلب
    autoAssignOrders,  // دالة التعيين التلقائي
    testConnectivity   // دالة اختبار الاتصال
  } = useUniversalEdgeFunctions();

  const handleGetOrder = async () => {
    try {
      const order = await getOrder('order-123', undefined, true);
      console.log('تم جلب الطلب:', order);
    } catch (error) {
      // تم معالجة الخطأ تلقائياً وإظهار Toast
    }
  };

  return (
    <div>
      <button 
        onClick={handleGetOrder} 
        disabled={loading.getOrder}
      >
        {loading.getOrder ? 'جاري التحميل...' : 'جلب الطلب'}
      </button>
      
      {orderDetails && (
        <div>
          <h3>تفاصيل الطلب:</h3>
          <p>كود الطلب: {orderDetails.order?.order_code}</p>
          <p>حالة الطلب: {orderDetails.order?.order_status}</p>
        </div>
      )}
    </div>
  );
}
```

## 8️⃣ معالجة الأخطاء

```typescript
try {
  const order = await edgeFunctionsService.getOrder('order-123');
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('انتهت مهلة الاتصال');
  } else if (error.message.includes('404')) {
    console.log('الطلب غير موجود');
  } else if (error.message.includes('500')) {
    console.log('خطأ في الخادم');
  } else {
    console.log('خطأ عام:', error.message);
  }
}
```

## 9️⃣ إعدادات متقدمة

```typescript
// استدعاء مع إعدادات مخصصة
const result = await edgeFunctionsService.callEdgeFunction(
  'get-order',
  {},
  {
    method: 'GET',                    // GET بدلاً من POST
    queryParams: {                   // معاملات للـ GET
      orderId: 'order-123'
    },
    timeout: 5000,                   // 5 ثوانٍ timeout
    retries: 1,                      // محاولة إضافية واحدة فقط
    headers: {                       // headers مخصصة
      'X-Source': 'admin-dashboard'
    }
  }
);
```

## 🌟 نصائح مهمة

1. **استخدم الـ Hook للمكونات**: يوفر إدارة تلقائية للحالة والأخطاء
2. **استخدم الخدمة مباشرة للـ utilities**: خارج المكونات أو في الخدمات الأخرى
3. **adminMode**: استخدمه للأدمن لرؤية جميع البيانات
4. **storeId**: استخدمه للمتاجر لرؤية بيانات محدودة
5. **معالجة الأخطاء**: دائماً استخدم try/catch أو اعتمد على الـ Hook
6. **Timeout**: اضبط مهلة مناسبة حسب العملية (auto-assign يحتاج وقت أطول)

## 📝 ملاحظات

- الخدمة تدعم إعادة المحاولة التلقائية
- يوجد fallback لقاعدة البيانات للأدمن
- جميع الاستجابات تتبع نفس الهيكل: `{ success, data, message, error }`
- الـ Toast notifications تظهر تلقائياً عند استخدام الـ Hook
