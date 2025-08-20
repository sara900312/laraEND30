/**
 * دوال حساب إجمالي الطلبات
 * تطبق القاعدة: إجمالي الطلب = السعر × الكمية
 */

import { calculateFinalPrice } from './currencyUtils';

export interface OrderItem {
  price?: number;
  price_iqd?: number;
  price_sar?: number;
  quantity?: number;
  discounted_price?: number;
  product?: {
    price?: number;
    discounted_price?: number;
    is_discounted?: boolean;
  };
}

/**
 * حساب إجمالي الطلب من قائمة المنتجات
 * @param items - قائمة منتجات الطلب
 * @param useDiscountedPrice - استخدام السعر المخفض إن وجد
 * @returns إجمالي الطلب
 */
export function calculateOrderTotal(
  items: OrderItem[] | any[], 
  useDiscountedPrice: boolean = true
): number {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((total, item) => {
    const quantity = item.quantity || 1;

    let price = 0;

    // التحقق من وجود سعر مخفض في المنتج مباشرة
    if (useDiscountedPrice && item.discounted_price) {
      const originalPrice = item.product?.price || item.price || 0;
      const discountedPrice = item.discounted_price;
      // التعامل مع discounted_price كسعر نهائي وليس مبلغ خصم
      if (discountedPrice > 0 && discountedPrice < originalPrice) {
        price = discountedPrice;
      } else {
        price = originalPrice;
      }
    }
    // التحقق من وجود سعر مخفض في product object (النظام القديم)
    else if (useDiscountedPrice && item.product?.is_discounted &&
        item.product?.discounted_price &&
        item.product.discounted_price < (item.product.price || 0)) {
      price = item.product.discounted_price;
    } else {
      // استخدام السعر العادي
      price = item.product?.price || item.price || 0;
    }

    // تطبيق القاعدة: إجمالي المنتج = السعر × الكمية
    return total + (price * quantity);
  }, 0);
}

/**
 * حساب إجمالي منتج واحد
 * @param price - سعر المنتج  
 * @param quantity - الكمية
 * @returns إجمالي المنتج
 */
export function calculateItemTotal(price: number, quantity: number): number {
  return (price || 0) * (quantity || 1);
}

/**
 * التحقق من صحة حساب إجمالي الطلب
 * @param items - قائمة منتجات الطلب
 * @param expectedTotal - الإجمالي المتوقع
 * @returns true إذا كان الحساب صحيح
 */
export function validateOrderTotal(items: OrderItem[], expectedTotal: number): boolean {
  const calculatedTotal = calculateOrderTotal(items);
  return Math.abs(calculatedTotal - expectedTotal) < 0.01; // السماح بخطأ صغير للعمليات العشرية
}

/**
 * تنسيق عرض تفاصيل الحساب
 * @param items - قائمة منتجات الطلب
 * @returns تفاصيل الحساب
 */
export function getOrderCalculationDetails(items: OrderItem[]) {
  if (!items || items.length === 0) {
    return {
      items: [],
      total: 0,
      breakdown: "لا توجد منتجات"
    };
  }

  const itemDetails = items.map(item => {
    const quantity = item.quantity || 1;
    const price = item.product?.price || item.price || 0;
    const subtotal = calculateItemTotal(price, quantity);
    
    return {
      name: item.product?.name || 'منتج غير محدد',
      price,
      quantity,
      subtotal,
      calculation: `${price.toLocaleString()} × ${quantity} = ${subtotal.toLocaleString()}`
    };
  });

  const total = calculateOrderTotal(items);
  
  return {
    items: itemDetails,
    total,
    breakdown: itemDetails.map(item => item.calculation).join(' + ')
  };
}
