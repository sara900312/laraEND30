import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  ar: {
    // Admin Dashboard
    'admin.dashboard': 'لوحة تحكم الإدارة',
    'admin.logout': 'تسجيل خروج',
    'admin.orders': 'الطلبات',
    'admin.stores': 'المتاجر',
    'admin.users': 'المستخدمين',
    'admin.settings': 'الإعدادات',
    'admin.orders.list': 'قائمة الطلبات',
    'admin.orders.total': 'إجمالي الطلبات',
    'admin.orders.pending': 'طلبات معلقة',
    'admin.orders.processing': 'طلبات قيد ا��معالجة',
    'admin.orders.completed': 'طلبات مكتملة',
    'admin.orders.cancelled': 'طلبات ملغية',
    'admin.order.details': 'تفاصيل الطلب',
    'admin.order.code': 'رمز الطلب',
    'admin.order.customer': 'العميل',
    'admin.order.product': 'المنتج',
    'admin.order.amount': 'المبلغ',
    'admin.order.status': 'حالة الطلب',
    'admin.order.date': 'تاريخ الطلب',
    'admin.refresh': 'تحديث',
    'admin.add.store': 'إضافة متجر',
    'admin.stores.management': 'إدارة المتاجر',
    'admin.orders.all.description': 'جميع الطلبات الواردة من العملاء مجموعة حسب الحالة',

    // Store Dashboard
    'store.dashboard': 'لوحة تحكم المتجر',
    'store.orders': 'طلباتك',
    'store.orders.description': 'عرض وإدارة الطلبات المخصصة لمتجرك',
    'store.order.accept': 'قبول',
    'store.order.reject': 'رفض',
    'store.order.customer.details': 'تفاصيل العميل',
    'store.name': 'اسم المتجر',
    'store.status': 'حالة المتجر',
    'store.orders.assigned': 'طلبات معينة',
    'store.orders.delivered': 'طلبات مسلمة',
    'store.orders.returned': 'طلبات مرتجعة',
    'store.tab.assigned': 'معينة',
    'store.tab.accepted': 'مقبولة',
    'store.tab.rejected': 'مرفوضة',
    'store.dialog.inventory.status': 'حالة المخزون',
    'store.dialog.available.customer': 'طلب متوفر - تفاصيل العميل',
    'store.dialog.customer.delivery': 'تفاصيل العميل للتسليم',
    'store.orders.total': 'إجمالي الطلبات',
    'store.refresh': 'تحديث',
    'store.logout': 'تسجيل خروج',

    // Common
    'language.toggle': 'تبديل اللغة',
    'loading': 'جاري التحميل...',
    'error': 'خطأ',
    'success': 'نجح',
    'cancel': 'إلغاء',
    'save': 'حفظ',
    'delete': 'حذف',
    'edit': 'تعديل',
    'view': 'عرض',
    'close': 'إغلاق',
    'search': 'بحث',
    'filter': 'تصفية',
    'all': 'الكل',
    'yes': 'نعم',
    'no': 'لا',
    'refreshing': 'جاري التحديث...',
    'no.orders': 'لا توجد طلبات',
    'customer': 'العميل',
    'product': 'المنتج',
    'price': 'السعر',
    'amount': 'المبلغ',
    'total': 'المجموع',
    'date': 'التاريخ',
    'status': 'الحالة',
    'details': 'التفاصيل',
    'quantity': 'الكمية',
    'quantity.label': 'الكمية:',
    'customer.label': 'العميل:',
    'customer.notes': 'ملاحظات العميل',

    // Status terms
    'pending': 'معلق',
    'processing': 'قيد المعالجة',
    'assigned': 'مُعيَّن',
    'delivered': 'مُسلم',
    'returned': 'مُرتجع',
    'cancelled': 'ملغي',
    'accepted': 'مقبول',
    'rejected': 'مرفوض',
    'available': 'متوفر',
    'unavailable': 'غير متوفر',

    // Messages
    'no.orders.pending': 'لا توجد طلبات معلقة',
    'no.orders.assigned': 'لا توجد طلبات معينة',
    'no.orders.delivered': 'لا توجد طلبات مسلمة',
    'no.orders.returned': 'لا توج�� طلبات مرتجعة',
    'waiting.for.store.response': 'في انتظار رد المتجر',
    'store.assigned': 'المتجر المعين',
    'not.assigned': 'غير معين',

    // Product Details
    'product.details': 'تفاصيل المنتج',
    'product.name': 'اسم المنتج',
    'product.price': 'سعر المنتج',
    'product.total': 'المجموع الكلي',
    'product.quantity': 'الكمية',
    'grand.total': 'المبلغ الإجمالي',
    'availability.confirmed': 'تم تأكيد التوفر',
    'availability.checking': 'جار�� التحقق من التوفر',
    'inventory.status': 'حالة المخزون',
    'order.items': 'عناصر الطلب',
    'order.summary': 'ملخص الطلب',
    'customer.info': 'معلومات العميل',
    'delivery.details': 'تفاصيل التسليم',
    'order.note': 'ملاحظة الطلب',
    'store.response': 'رد المتجر',
    'assign.to.store': 'تعيين للمتجر',
    'store.selection': 'اختيار المتجر',
    'confirm.order': 'تأكيد الطلب',
    'order.confirmation': 'تأكيد الطلب',

    // Additional interface terms
    'order': 'الطلب',
    'orders': 'الطلبات',
    'card': 'البطاقة',
    'information': 'مع��ومات',
    'notes': 'ملاحظات',
    'about.availability.selection': 'حول اختيار متوفر وغير متوفر',
    'availability.notes': 'ملاحظات التوفر',
    'selection.notes': 'ملاحظات الاختيار',
    'order.card': 'بطاقة الطلب',
    'product.card': 'بطاقة المنتج',
    'information.notes': 'معلومات وملاحظات',
    'total.assigned.orders': 'إجمالي الطلبات المعينة',
    'availability.status': 'حالة التوفر',
    'in.stock': 'في المخزون',
    'out.of.stock': 'غير متوف�� في المخزون',
    'availability.rejected': 'تم رفض التوفر',

    // Rejection dialog
    'reject.order': 'رفض الطلب',
    'order.number': 'رقم الطلب',
    'choose.rejection.reason': 'اختر سبب الرفض',
    'rejection.reason.out.of.stock': 'المنتج غير متوفر في المخزن',
    'rejection.reason.damaged': 'المنتج تالف أو معطل',
    'rejection.reason.price.incorrect': 'السعر غير صحيح',
    'rejection.reason.info.inaccurate': 'معلومات المنتج غير دقيقة',
    'rejection.reason.supply.issue': 'مشكلة في التوريد',
    'rejection.reason.discontinued': 'المنتج متوقف عن الإنتاج',
    'rejection.reason.insufficient.quantity': 'كمية غير كافية',
    'rejection.reason.other': 'أخرى (يرجى التوضيح)',
    'explain.reason': 'وضح السبب',
    'write.custom.reason': 'أو ��كتب سبباً مخصصاً',
    'write.rejection.reason.placeholder': 'يرجى كتابة سبب رفض الطلب...',
    'rejection.warning': 'تنبيه: رفض الطلب سيؤدي إلى إزالته من قائمة متجرك وإعادته للطلبات المعلقة ليتم تحويله لمتجر آخر.',
    'confirm.rejection': 'تأكيد الرفض',
    'rejecting': 'جاري الرفض...',

    // Store specific translations
    'order.total.without.delivery': 'إجمالي الطلب (بدون التوصيل)',
    'customer.details': 'تفاصيل العميل',
    'customer.details.delivery': 'تفاصيل الزبون',
    'order.details.returned': 'تفاصيل الطلب المسترجع',
    'return.reason': 'سبب الإرجاع',
    'products': 'المنتجات',
    'products.required': 'المنتجات المطلوبة',

    // Field labels
    'name.label': 'الاسم:',
    'phone.label': 'الهاتف:',
    'address.label': 'العنوان:',
    'total.amount.label': 'المبلغ الإجمالي:',
    'delivery.date.label': 'تاريخ التسليم:',
    'return.date.label': 'تاريخ الإرجاع:',
    'order.date.label': 'تاريخ الطلب:',
    'cannot.change': 'لا يمكن التغيير'
  },

  en: {
    // Admin Dashboard
    'admin.dashboard': 'Admin Dashboard',
    'admin.logout': 'Logout',
    'admin.orders': 'Orders',
    'admin.stores': 'Stores',
    'admin.users': 'Users',
    'admin.settings': 'Settings',
    'admin.orders.list': 'Orders List',
    'admin.orders.total': 'Total Orders',
    'admin.orders.pending': 'Pending Orders',
    'admin.orders.processing': 'Processing Orders',
    'admin.orders.completed': 'Completed Orders',
    'admin.orders.cancelled': 'Cancelled Orders',
    'admin.order.details': 'Order Details',
    'admin.order.code': 'Order Code',
    'admin.order.customer': 'Customer',
    'admin.order.product': 'Product',
    'admin.order.amount': 'Amount',
    'admin.order.status': 'Order Status',
    'admin.order.date': 'Order Date',
    'admin.refresh': 'Refresh',
    'admin.add.store': 'Add Store',
    'admin.stores.management': 'Store Management',
    'admin.orders.all.description': 'All customer orders grouped by status',

    // Store Dashboard
    'store.dashboard': 'Store Dashboard',
    'store.orders': 'Your Orders',
    'store.orders.description': 'View and manage orders assigned to your store',
    'store.order.accept': 'Accept',
    'store.order.reject': 'Reject',
    'store.order.customer.details': 'Customer Details',
    'store.name': 'Store Name',
    'store.status': 'Store Status',
    'store.orders.assigned': 'Assigned Orders',
    'store.orders.delivered': 'Delivered Orders',
    'store.orders.returned': 'Returned Orders',
    'store.tab.assigned': 'Assigned',
    'store.tab.accepted': 'Accepted',
    'store.tab.rejected': 'Rejected',
    'store.dialog.inventory.status': 'Inventory Status',
    'store.dialog.available.customer': 'Available Order - Customer Details',
    'store.dialog.customer.delivery': 'Customer Delivery Details',
    'store.orders.total': 'Total Orders',
    'store.refresh': 'Refresh',
    'store.logout': 'Logout',

    // Common
    'language.toggle': 'Toggle Language',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'cancel': 'Cancel',
    'save': 'Save',
    'delete': 'Delete',
    'edit': 'Edit',
    'view': 'View',
    'close': 'Close',
    'search': 'Search',
    'filter': 'Filter',
    'all': 'All',
    'yes': 'Yes',
    'no': 'No',
    'refreshing': 'Refreshing...',
    'no.orders': 'No orders',
    'customer': 'Customer',
    'product': 'Product',
    'price': 'Price',
    'amount': 'Amount',
    'total': 'Total',
    'date': 'Date',
    'status': 'Status',
    'details': 'Details',
    'quantity': 'Quantity',
    'quantity.label': 'Quantity:',
    'customer.label': 'Customer:',
    'customer.notes': 'Customer Notes',

    // Status terms
    'pending': 'Pending',
    'processing': 'Processing',
    'assigned': 'Assigned',
    'delivered': 'Delivered',
    'returned': 'Returned',
    'cancelled': 'Cancelled',
    'accepted': 'Accepted',
    'rejected': 'Rejected',
    'available': 'Available',
    'unavailable': 'Unavailable',

    // Messages
    'no.orders.pending': 'No pending orders',
    'no.orders.assigned': 'No assigned orders',
    'no.orders.delivered': 'No delivered orders',
    'no.orders.returned': 'No returned orders',
    'waiting.for.store.response': 'Waiting for store response',
    'store.assigned': 'Assigned Store',
    'not.assigned': 'Not assigned',

    // Product Details
    'product.details': 'Product Details',
    'product.name': 'Product Name',
    'product.price': 'Product Price',
    'product.total': 'Total',
    'product.quantity': 'Quantity',
    'grand.total': 'Grand Total',
    'availability.confirmed': 'Availability Confirmed',
    'availability.checking': 'Checking Availability',
    'inventory.status': 'Inventory Status',
    'order.items': 'Order Items',
    'order.summary': 'Order Summary',
    'customer.info': 'Customer Information',
    'delivery.details': 'Delivery Details',
    'order.note': 'Order Note',
    'store.response': 'Store Response',
    'assign.to.store': 'Assign to Store',
    'store.selection': 'Store Selection',
    'confirm.order': 'Confirm Order',
    'order.confirmation': 'Order Confirmation',

    // Additional interface terms
    'order': 'Order',
    'orders': 'Orders',
    'card': 'Card',
    'information': 'Information',
    'notes': 'Notes',
    'about.availability.selection': 'About Availability Selection',
    'availability.notes': 'Availability Notes',
    'selection.notes': 'Selection Notes',
    'order.card': 'Order Card',
    'product.card': 'Product Card',
    'information.notes': 'Information & Notes',
    'total.assigned.orders': 'Total Assigned Orders',
    'availability.status': 'Availability Status',
    'in.stock': 'In Stock',
    'out.of.stock': 'Out of Stock',
    'availability.rejected': 'Availability Rejected',

    // Rejection dialog
    'reject.order': 'Reject Order',
    'order.number': 'Order Number',
    'choose.rejection.reason': 'Choose rejection reason',
    'rejection.reason.out.of.stock': 'Product not available in stock',
    'rejection.reason.damaged': 'Product is damaged or defective',
    'rejection.reason.price.incorrect': 'Price is incorrect',
    'rejection.reason.info.inaccurate': 'Product information is inaccurate',
    'rejection.reason.supply.issue': 'Supply chain issue',
    'rejection.reason.discontinued': 'Product discontinued',
    'rejection.reason.insufficient.quantity': 'Insufficient quantity',
    'rejection.reason.other': 'Other (please specify)',
    'explain.reason': 'Explain reason',
    'write.custom.reason': 'Or write a custom reason',
    'write.rejection.reason.placeholder': 'Please write the reason for rejecting the order...',
    'rejection.warning': 'Warning: Rejecting the order will remove it from your store list and return it to pending orders to be assigned to another store.',
    'confirm.rejection': 'Confirm Rejection',
    'rejecting': 'Rejecting...',

    // Store specific translations
    'order.total.without.delivery': 'Order Total (without delivery)',
    'customer.details': 'Customer Details',
    'customer.details.delivery': 'Customer Details',
    'order.details.returned': 'Returned Order Details',
    'return.reason': 'Return Reason',
    'products': 'Products',
    'products.required': 'Required Products',

    // Field labels
    'name.label': 'Name:',
    'phone.label': 'Phone:',
    'address.label': 'Address:',
    'total.amount.label': 'Total Amount:',
    'delivery.date.label': 'Delivery Date:',
    'return.date.label': 'Return Date:',
    'order.date.label': 'Order Date:',
    'cannot.change': 'Cannot change'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    // Add smooth transition for direction changes
    document.body.style.transition = 'all 0.3s ease-in-out';
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const t = (key: string): string => {
    const translation = translations[language][key];
    if (translation) {
      return translation;
    }

    // Fallback to the other language if key not found
    const fallbackLanguage = language === 'ar' ? 'en' : 'ar';
    return translations[fallbackLanguage][key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
