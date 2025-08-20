/**
 * أدوات مساعدة لعرض أسماء المتاجر في الطلبات
 */

export interface OrderItem {
  main_store_name?: string;
  main_store?: string;
  store_name?: string;
  product_name?: string;
  name?: string;
}

export interface Order {
  assigned_store_name?: string;
  main_store_name?: string;
  order_items?: OrderItem[];
  items?: OrderItem[];
}

/**
 * تحليل الطلب لتحديد المتاجر المختلفة
 */
export function analyzeOrderStores(order: Order): {
  storesCount: number;
  stores: string[];
  isMultiStore: boolean;
  displayName: string;
} {
  const storesSet = new Set<string>();
  
  // استخدام order_items أولاً، ثم items كبديل
  const itemsToAnalyze = order.order_items && order.order_items.length > 0
    ? order.order_items
    : order.items || [];

  // إذا لم توجد منتجات، استخدم main_store_name من الطلب
  if (itemsToAnalyze.length === 0) {
    if (order.main_store_name) {
      storesSet.add(order.main_store_name);
    }
  } else {
    // تحليل المنتجات لاستخراج أسماء المتاجر
    itemsToAnalyze.forEach((item) => {
      const storeName = item.main_store_name
        || item.main_store
        || item.store_name
        || 'متجر غير محدد';

      // تجاهل القيم الفارغة والغير محددة
      if (storeName && storeName.trim() !== '' && storeName !== 'متجر غير محدد') {
        storesSet.add(storeName);
      }
    });

    // إذا لم نجد أي متاجر من المنتجات، استخدم main_store_name من الطلب كآخر حل
    if (storesSet.size === 0 && order.main_store_name) {
      storesSet.add(order.main_store_name);
    }
  }

  const storesArray = Array.from(storesSet).filter(name => name !== 'متجر غير محدد');
  const storesCount = storesArray.length;
  const isMultiStore = storesCount > 1;

  // تحديد الاسم المعروض
  let displayName: string;
  
  if (order.assigned_store_name) {
    // إذا كان الطلب معين لمتجر، عرض اسم المتجر المعين
    displayName = order.assigned_store_name;
  } else if (isMultiStore) {
    // إذا كان الطلب يحتوي على منتجا�� من متاجر متعددة
    displayName = 'متعدد المتاجر';
  } else if (storesArray.length === 1) {
    // إذا كان هناك متجر واحد فقط
    displayName = storesArray[0];
  } else {
    // احتياطي - التحقق من وجود منتجات متعددة بمتاجر مختلفة حتى لو لم يتم اكتشافها بطريقة صحيحة
    const hasMultipleStoreItems = itemsToAnalyze.length > 1 &&
      itemsToAnalyze.some(item => {
        const itemStore = item.main_store_name || item.main_store || item.store_name;
        return itemStore && itemStore !== order.main_store_name && itemStore.trim() !== '';
      });

    if (hasMultipleStoreItems) {
      displayName = 'متعدد المتاجر';
    } else {
      displayName = order.main_store_name || 'متجر غير محدد';
    }
  }

  return {
    storesCount,
    stores: storesArray,
    isMultiStore,
    displayName
  };
}

/**
 * الحصول على النص التوضيحي لنوع المتجر
 */
export function getStoreTypeLabel(order: Order): string {
  const analysis = analyzeOrderStores(order);

  if (order.assigned_store_name) {
    return 'المتجر المعين: ';
  } else if (analysis.isMultiStore || analysis.displayName === 'متعدد المتاجر') {
    return 'المتاجر: ';
  } else {
    return 'المتجر الرئيسي: ';
  }
}

/**
 * الحصول على اسم المتجر للعرض
 */
export function getDisplayStoreName(order: Order): string {
  return analyzeOrderStores(order).displayName;
}

/**
 * فحص ما إذا كان الطلب يحتاج إلى تقسيم
 */
export function needsSplitting(order: Order): boolean {
  const analysis = analyzeOrderStores(order);
  return analysis.isMultiStore && !order.assigned_store_name;
}
