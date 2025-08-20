/**
 * Order Filtering Utilities
 * دوال مساعدة موحدة لتصنيف الطلبات في جميع أنحاء التطبيق
 */

// تعريف حالات الطلبات المقبولة
export type OrderStatus = 'pending' | 'assigned' | 'delivered' | 'completed' | 'returned' | 'customer_rejected' | 'rejected';

// دالة موحدة لتصنيف الطلبات
export const filterOrdersByStatus = (orders: any[], status: OrderStatus): any[] => {
  switch (status) {
    case 'pending':
      return orders.filter(order => order.order_status === 'pending');
    
    case 'assigned':
      return orders.filter(order => order.order_status === 'assigned');
    
    case 'delivered':
      // معالجة unified للطلبات المسلمة - تشمل delivered و completed
      return orders.filter(order => 
        order.order_status === 'delivered' || order.order_status === 'completed'
      );
    
    case 'completed':
      // alias للطلبات المسلمة
      return orders.filter(order => 
        order.order_status === 'delivered' || order.order_status === 'completed'
      );
    
    case 'returned':
      return orders.filter(order => order.order_status === 'returned');

    case 'customer_rejected':
      return orders.filter(order => order.order_status === 'customer_rejected');

    default:
      console.warn(`⚠️ حالة طلب غير معروفة: ${status}`);
      return [];
  }
};

// دالة موحدة لحساب إحصائيات الطلبات
export const calculateOrderStats = (orders: any[]) => {
  return {
    total: orders.length,
    pending: filterOrdersByStatus(orders, 'pending').length,
    assigned: filterOrdersByStatus(orders, 'assigned').length,
    delivered: filterOrdersByStatus(orders, 'delivered').length,
    returned: filterOrdersByStatus(orders, 'returned').length,
    customer_rejected: filterOrdersByStatus(orders, 'customer_rejected').length,
    rejected: filterOrdersByStatus(orders, 'rejected').length,
  };
};

// دالة للتحقق من صحة حالة الطلب
export const isValidOrderStatus = (status: string): status is OrderStatus => {
  return ['pending', 'assigned', 'delivered', 'completed', 'returned', 'customer_rejected', 'rejected'].includes(status);
};

// دالة للحصول على النص المناسب لحالة الطلب
export const getOrderStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    pending: 'معلقة',
    assigned: 'معينة',
    delivered: 'مسلمة',
    completed: 'مسلمة', // نفس تسمية delivered
    returned: 'مرتجعة',
    customer_rejected: 'مرفوض من الزبون',
    rejected: 'مرفوض من المدير',
  };

  return statusLabels[status] || `حالة غير معروفة: ${status}`;
};

// دالة للحصول على لون حالة الطلب
export const getOrderStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    pending: 'text-yellow-600',
    assigned: 'text-blue-600',
    delivered: 'text-green-600',
    completed: 'text-green-600',
    returned: 'text-red-600',
    customer_rejected: 'text-purple-600',
  };

  return statusColors[status] || 'text-gray-600';
};

// دالة للحصول على رمز حالة الطلب
export const getOrderStatusIcon = (status: string): string => {
  const statusIcons: Record<string, string> = {
    pending: '⏳',
    assigned: '📦',
    delivered: '✅',
    completed: '✅',
    returned: '🔄',
    customer_rejected: '🚫',
  };

  return statusIcons[status] || '❓';
};

// دالة متقدمة للبحث والتصفية
export interface OrderFilterOptions {
  status?: OrderStatus | 'all';
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
  storeId?: string;
}

export const filterOrders = (orders: any[], options: OrderFilterOptions = {}): any[] => {
  let filtered = [...orders];

  // تصفية حسب الحالة
  if (options.status && options.status !== 'all') {
    filtered = filterOrdersByStatus(filtered, options.status);
  }

  // تصفية حسب النص البحثي
  if (options.searchTerm) {
    const searchLower = options.searchTerm.toLowerCase();
    filtered = filtered.filter(order => 
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.customer_phone?.includes(searchLower) ||
      order.order_code?.toLowerCase().includes(searchLower) ||
      order.main_store_name?.toLowerCase().includes(searchLower)
    );
  }

  // تصفية حسب التاريخ
  if (options.dateFrom || options.dateTo) {
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.created_at);
      if (options.dateFrom && orderDate < options.dateFrom) return false;
      if (options.dateTo && orderDate > options.dateTo) return false;
      return true;
    });
  }

  // تصفية حسب المتجر
  if (options.storeId) {
    filtered = filtered.filter(order => 
      order.assigned_store_id === options.storeId ||
      order.main_store_name === options.storeId
    );
  }

  return filtered;
};

export default {
  filterOrdersByStatus,
  calculateOrderStats,
  isValidOrderStatus,
  getOrderStatusLabel,
  getOrderStatusColor,
  getOrderStatusIcon,
  filterOrders,
};
