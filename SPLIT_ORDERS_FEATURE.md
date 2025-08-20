# ميزة تقسيم الطلبات حسب المتاجر

## الوصف
هذه الميزة تسمح بتقسيم طلب واحد يحتوي على منتجات من متاجر مختلفة إلى طلبات منفصلة، بحيث كل طلب يحتوي على المنتجات الخاصة بمتجر واحد فقط.

## الملفات المضافة/المعدلة

### Edge Function الجديد
- `code/supabase/functions/split-order-by-stores/index.ts` - Edge Function لتقسيم الطلبات
- `code/supabase/functions/split-order-by-stores/deno.json` - تكوين Deno

### مكونات React جديدة
- `code/src/components/orders/SplitOrderButton.tsx` - زر تقسيم الطلبات مع dialog تأكيد

### ملفات معدلة
- `code/src/components/orders/EnhancedOrderCard.tsx` - إضافة زر التقسيم
- `code/src/pages/AdminDashboard.tsx` - إضافة تبويب للطلبات المقسمة
- `code/src/types/order.ts` - إضافة حالة 'split'
- `code/src/utils/orderFilters.ts` - دعم حالة 'split'

### صفحة اختبار
- `code/src/pages/TestSplitOrder.tsx` - صفحة اختبار للميزة
- يمكن الوصول إليها عبر: `/test-split-order`

## كيفية العمل

### 1. تحليل الطلب
- يتم فحص منتجات الطلب من حقل `items` (JSON array)
- كل منتج يحتوي على `main_store` أو `main_store_name`
- يتم تجميع المنتجات حسب اسم المتجر

### 2. إنشاء طلبات منفصلة
- لكل متجر، يتم إنشاء طلب جديد في قاعدة البيانات
- الطلب الجديد يحتوي على:
  - نفس بيانات العميل
  - المنتجات الخاصة بذلك المتجر فقط
  - المبلغ الإجمالي المحسوب للمنتجات
  - حالة 'assigned'
  - `main_store_name` و `assigned_store_id` محددين

### 3. حذف الطلب الأصلي
- يتم حذف الطلب الأصلي بعد التقسيم الناجح
- هذا يتجنب ازدواجية الطلبات ويحافظ على وضوح النظام

### 4. إرسال الإشعارات (اختياري)
- إذا كان للمتجر إيميل، يتم إرسال إشعار
- استخدام EmailJS لإرسال الإشعارات

## متطلبات البيئة

### متغيرات البيئة المطلوبة في Edge Function:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
EMAILJS_SERVICE_ID
EMAILJS_TEMPLATE_ID  
EMAILJS_USER_ID
EMAILJS_ACCESS_TOKEN
```

## كيفية الاستخدام

### للمديرين:
1. في لوحة المدير، ستظهر أزرار "تقسيم حسب المتاجر" للطلبات المعلقة
2. الزر يظهر فقط إذا كان الطلب يحتوي على منتجات من أكثر من متجر واحد
3. عند الضغط على الزر، يظهر dialog تأكيد يوضح كيفية التقسيم
4. بعد التأكيد، يتم تقسيم الطلب وإنشاء طلبات منفصلة

### نتيجة التقسيم:
- الطلب الأصلي يتم حذفه
- تظهر طلبات جديدة في تبويب "معينة" - كل طلب معين مباشرة للمتجر المناسب
- كل طلب جاهز للمعالجة من قبل المتجر المخصص له

## الاختبار

### صفحة الاختبار:
- اذهب إلى `/test-split-order`
- تحتوي على طلب تجريبي بمنتجات من 3 متاجر مختلفة
- يمكن اختبار زر التقسيم

### اختبار Edge Function مباشرة:
```bash
curl -X POST [SUPABASE_URL]/functions/v1/split-order-by-stores \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_ID_HERE"}'
```

## ملاحظات تقنية

### بنية البيانات المتوقعة:
- الطلب يجب أن يحتوي على حقل `items` (JSON array)
- كل item يجب أن يحتوي على:
  ```json
  {
    "name": "اسم المنتج",
    "quantity": 2,
    "price": 100,
    "discounted_price": 90, // اختياري
    "main_store": "اسم المتجر"
  }
  ```

### أمان:
- Edge Function محمي بـ CORS headers
- يتم التحقق من وجود الطلب قبل التقسيم
- معالجة أخطاء شاملة مع رسائل واضحة

### الأداء:
- العملية تتم بشكل متزامن لضمان تكامل البيانات
- Edge Function سريع ويعمل على شبكة Supabase العالمية

## استكشاف الأخطاء

### الأخطاء الشائعة:
1. **"Order has no items to split"** - الطلب لا يحتوي على منتجات
2. **"Missing environment variables"** - متغيرات البيئة غير مكتملة  
3. **"Order not found"** - معرف الطلب غير صحيح

### تسجيل الأخطاء:
- جميع الأخطاء مسجلة في console الـ Edge Function
- رسائل الخطأ تُرجع باللغة العربية للمستخدم النهائي
