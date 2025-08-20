# 🔔 نظام الإشعارات المباشرة | Push Notification System

نظام إشعارات شامل يدعم الإشعارات المباشرة (Push Notifications) للعملاء والمتاجر والمديرين.

## 📋 المكونات المثبتة | Installed Components

### 1. Service Worker
- **الملف**: `public/service-worker.js`
- **الوظيفة**: يدير الإشعارات في الخلفية ويتعامل مع الأحداث
- **المزايا**:
  - استقبال الإشعارات حتى عند إغلاق المتصفح
  - أزرار تفاعلية (عرض، إغلاق)
  - توجيه المستخدم للصفحة المناسبة عند النقر

### 2. Notification Service
- **الملف**: `src/services/notificationService.ts`
- **الوظيفة**: إدارة شاملة للإشعارات
- **المزايا**:
  - تسجيل وإلغاء تسجيل الإشعارات
  - إرسال إشعارات مخصصة وقوالب
  - إدارة تاريخ الإشعارات
  - التحقق من الصلاحيات

### 3. Edge Function
- **الملف**: `supabase/functions/send-notification/index.ts`
- **الوظيفة**: إرسال الإشعارات للمستخدمين
- **المزايا**:
  - حفظ الإشعارات في قاعدة البيانات
  - إرسال push notifications للمشتركين
  - إدارة الأخطاء والتقارير

### 4. Database Schema
- **الملف**: `supabase/migrations/20241205_create_notifications_tables.sql`
- **الجداول**:
  - `notifications`: تخزين الإشعارات وحالتها
  - `notification_subscriptions`: تخزين اشتراكات المستخدمين
  - `notification_templates`: قوالب الإشعارات المحددة مسبقاً

### 5. UI Components
- **NotificationBell**: أيقونة الجرس مع عداد الإشعارات غير المقروءة
- **NotificationSetup**: إعدادات تفعيل/إلغاء الإشعارات
- **NotificationTest**: واجهة اختبار الإشعارات

### 6. Types & Interfaces
- **الملف**: `src/types/notification.ts`
- **المحتوى**: تعريفات TypeScript للإشعارات والقوالب

## 🚀 خطوات التشغيل | Setup Steps

### 1. تطبيق مخطط قاعدة البيانات
```sql
-- تشغيل الملف في Supabase SQL Editor
psql -f supabase/migrations/20241205_create_notifications_tables.sql
```

### 2. نشر Edge Function
```bash
# من مجلد المشروع
supabase functions deploy send-notification
```

### 3. إعداد VAPID Keys (اختياري للتطوير)
```bash
# توليد VAPID keys جديدة
npm install -g web-push
web-push generate-vapid-keys

# تحديث المفتاح في notificationService.ts
# const VAPID_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
```

### 4. اختبار النظام
1. انتقل إلى: `/notification-test`
2. فعّل الإشعارات في المتصفح
3. أرسل إشعار تجريبي
4. تحقق من ظهور الإشعار

## 🎯 كيفية الاستخدام | Usage Guide

### إرسال إشعار مخصص
```typescript
import { notificationService } from '@/services/notificationService';

await notificationService.sendNotification({
  recipient_type: 'customer',
  recipient_id: '+966123456789',
  message: 'تم إنشاء طلبك بنجاح',
  prompt: {
    title: 'تم إنشا�� طلبك',
    message: 'تم إنشاء طلبك رقم ORD-001 بنجاح',
    type: 'customer',
    order_id: 'order-123',
    url: '/my-orders/order-123'
  }
});
```

### إرسال إشعار بقالب محدد مسبقاً
```typescript
await notificationService.sendOrderNotification(
  'order_created_customer',
  '+966123456789',
  {
    order_id: 'order-123',
    order_code: 'ORD-001',
    customer_name: 'أحمد محمد'
  }
);
```

### تفعيل الإشعارات للمستخدم
```typescript
await notificationService.subscribeToPushNotifications(
  '+966123456789',
  'customer'
);
```

### إضافة NotificationBell للواجهة
```tsx
import { NotificationBell } from '@/components/ui/notification-bell';

<NotificationBell userId="user-id" />
```

## 📝 القوالب المتاحة | Available Templates

### للعملاء (Customers)
- `order_created_customer`: تم إنشاء الطلب
- `order_confirmed_customer`: تم تأكيد الطلب
- `order_rejected_customer`: تم رفض الطلب
- `order_completed_customer`: تم تسليم الطلب

### للمتاجر (Stores)
- `order_assigned_store`: طلب جديد مُكلف للمتجر

### للمديرين (Admins)
- `order_created_admin`: طلب جديد في النظام
- `order_confirmed_admin`: تأكيد طلب من متجر
- `order_rejected_admin`: رفض طلب من متجر

## 🔧 تخصيص النظام | Customization

### إضافة قالب جديد
1. أضف القالب في `src/types/notification.ts`:
```typescript
export const NOTIFICATION_TEMPLATES = {
  // ... قوالب موجودة
  my_custom_template: {
    type: 'custom',
    recipient_type: 'customer',
    title_ar: 'عنوان مخصص',
    message_ar: 'رسالة مخصصة مع {{variable}}',
    url_pattern: '/custom/{{id}}'
  }
};
```

2. أضف القالب في قاعدة البيانات:
```sql
INSERT INTO notification_templates (type, recipient_type, title_ar, message_ar, url_pattern)
VALUES ('custom', 'customer', 'عنوان مخصص', 'رسالة مخصصة مع {{variable}}', '/custom/{{id}}');
```

### تخصيص Service Worker
قم بتعديل `public/service-worker.js` لإضافة:
- أصوات مخصصة للإشعارات
- أيقونات مختلفة حسب نوع الإشعار
- سلوكيات مخصصة عند النقر

### تخصيص واجهة المستخدم
- `NotificationBell`: لتغيير شكل أيقونة الجرس
- `NotificationSetup`: لإضافة إعدادات إضافية
- إضافة مكونات جديدة للإشعارات

## 🐛 استكشا�� الأخطاء | Troubleshooting

### الإشعارات لا تظهر
1. تحقق من أذونات المتصفح
2. تأكد من تسجيل Service Worker
3. راجع console للأخطاء
4. تحقق من تطبيق مخطط قاعدة البيانات

### Edge Function يفشل
1. تحقق من نشر Function
2. راجع logs في Supabase Dashboard
3. تأكد من صحة البيانات المرسلة

### قاعدة البيانات
1. تأكد من تطبيق Migration
2. تحقق من أذونات RLS
3. راجع جداول الإشعارات

## 📚 ملفات مرجعية | Reference Files

- `/notification-test` - صفحة اختبار شاملة
- `src/services/notificationService.ts` - خدمة الإشعارات الرئيسية
- `src/types/notification.ts` - تعريفات TypeScript
- `supabase/functions/send-notification/index.ts` - Edge Function
- `supabase/migrations/20241205_create_notifications_tables.sql` - مخطط قاعدة البيانات

## 🔒 الأمان | Security

- استخدام Row Level Security (RLS) في Supabase
- تشفير بيانات الاشتراكات
- التحقق من صلاحيات المستخدم قبل الإرسال
- حماية Edge Functions من الوصول غير المصرح

## 📈 الأداء | Performance

- تخزين مؤقت للإشعارات
- تجميع الإشعارات المتشابهة
- تنظيف الإشعارات القديمة تلقائياً
- فهرسة قاعدة البيانات للاستعلامات السريعة

## 🔄 التحديثات المستقبلية | Future Updates

- دعم الإشعارات الصوتية
- إشعارات متقدمة مع صور
- جدولة الإشعارات
- تحليلات الإشعارات
- دعم أنواع إضافية من الإشعارات

---

## 📞 الدعم | Support

للمساعدة أو الإبلاغ عن مشاكل، يرجى:
1. مراجعة هذا الدليل أولاً
2. فحص `/notification-test` للاختبار
3. مراجعة console logs في المتصفح
4. التحقق من Supabase Dashboard logs
