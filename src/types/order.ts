/**
 * Comprehensive types for orders, stores, and related entities
 */

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: number;
  product_name: string;
  quantity: number;
  price_sar: number;
  price_iqd?: number;
  discounted_price?: number;
  total_price?: number;
  created_at?: string;
}

export interface Store {
  id: string;
  name: string;
  owner_name?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  order_code?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  customer_city?: string;
  customer_notes?: string;
  order_details?: string;
  order_status: 'pending' | 'assigned' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'returned' | 'customer_rejected' | 'rejected';
  store_id?: string;
  assigned_store_id?: string;
  store_response_status?: 'available' | 'unavailable' | 'accepted' | 'rejected' | 'pending' | 'customer_rejected';
  store_response_at?: string;
  rejection_reason?: string;
  store?: Store;
  assigned_store_name?: string;
  main_store_name?: string;
  order_items?: OrderItem[];
  items?: Array<{
    name?: string;
    quantity?: number;
    price?: number;
    discounted_price?: number;
    total_price?: number;
    main_store?: string;
    product_id?: number;
    merged_quantity?: number;
  }>;
  total_amount: number;
  total_amount_sar?: number;
  total_amount_iqd?: number;
  created_at: string;
  updated_at?: string;
}

export interface OrderFilters {
  status?: string;
  storeId?: string;
  limit?: number;
  offset?: number;
}

export interface OrderStats {
  total: number;
  pending: number;
  assigned: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
}

export const ORDER_STATUS_LABELS: Record<Order['order_status'], string> = {
  pending: 'في الانتظار',
  assigned: 'معين',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  returned: 'مرتجعة',
  customer_rejected: 'مرفوض من الزبون',
  rejected: 'مرفوض من المدير'
};

export const ORDER_STATUS_COLORS: Record<Order['order_status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
  customer_rejected: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800'
};
