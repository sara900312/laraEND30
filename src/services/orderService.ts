/**
 * Order service for data processing and currency conversion
 */

import { Order, OrderItem } from '@/types/order';
import { calculateOrderTotal as calculateTotal } from '@/utils/orderCalculations';


export class OrderService {
  /**
   * Convert order prices from SAR to IQD
   */
  static convertOrderPricesToIQD(order: any): Order {
    // Process order items without conversion - treat as Iraqi Dinars
    const convertedOrderItems = order.order_items?.map((item: any) => ({
      ...item,
      price: item.price || 0
    }));

    // Process legacy items format without conversion
    const convertedItems = order.items?.map((item: any) => ({
      ...item,
      price: item.price || 0
    }));

    // Use amounts as-is (treat as Iraqi Dinars)
    const totalAmount = order.total_amount || 0;

    return {
      ...order,
      order_items: convertedOrderItems,
      items: convertedItems,
      total_amount: totalAmount,
      total_amount_sar: totalAmount,
      total_amount_iqd: totalAmount
    };
  }

  /**
   * Process raw order data from database to include currency conversions
   */
  static processOrderData(orders: any[]): Order[] {
    if (!Array.isArray(orders)) {
      console.error('⚠️ processOrderData: البيانات المدخلة ليست مصفوفة:', orders);
      return [];
    }

    return orders.map((order, index) => {
      try {
        // تحقق من البيانات الأساسية
        if (!order || typeof order !== 'object') {
          console.error(`⚠️ processOrderData: طلب غير صحيح في الفهرس ${index}:`, order);
          return null;
        }

        // تحقق من وجود الحقول الأساسية
        if (!order.id && !order.order_id) {
          console.error(`⚠️ processOrderData: طلب بدون معرف في الفهرس ${index}:`, order);
          return null;
        }

        return this.convertOrderPricesToIQD(order);
      } catch (error) {
        console.error(`❌ خطأ في معالجة الطلب ${index}:`, error, order);
        return null;
      }
    }).filter(Boolean) as Order[]; // إزالة القيم null
  }

  /**
   * Calculate order total from items using centralized calculation function
   * تطبيق قاعدة: إجمالي الطلب = السعر × الكمية
   */
  static calculateOrderTotal(items: OrderItem[] | any[], currency: 'SAR' | 'IQD' = 'IQD'): number {
    return calculateTotal(items, true);
  }

  /**
   * Ensure order has both SAR and IQD amounts calculated
   */
  static normalizeOrderAmounts(order: any): Order {
    const processedOrder = this.convertOrderPricesToIQD(order);
    
    // Recalculate totals from items if they exist
    if (processedOrder.order_items?.length > 0) {
      processedOrder.total_amount_iqd = this.calculateOrderTotal(processedOrder.order_items, 'IQD');
      processedOrder.total_amount_sar = this.calculateOrderTotal(processedOrder.order_items, 'SAR');
      processedOrder.total_amount = processedOrder.total_amount_sar;
    } else if (processedOrder.items?.length > 0) {
      processedOrder.total_amount_iqd = this.calculateOrderTotal(processedOrder.items, 'IQD');
      processedOrder.total_amount_sar = this.calculateOrderTotal(processedOrder.items, 'SAR');
      processedOrder.total_amount = processedOrder.total_amount_sar;
    }

    return processedOrder;
  }
}
