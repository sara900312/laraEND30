import { EDGE_FUNCTIONS_BASE } from './edgeFunctionsService';

export interface StoreOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  discounted_price?: number;
  availability_status?: string;
  product_id: number;
  main_store_name?: string;
  products?: {
    id: number;
    name: string;
  };
}

export interface StoreOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  items?: any[];
  total_amount: number;
  subtotal: number;
  customer_notes: string;
  order_details: string;
  order_code: string;
  order_status: string;
  status: string;
  assigned_store_id: string;
  store_response_status?: string;
  store_response_at?: string;
  created_at: string;
  stores?: {
    name: string;
  };
  order_items: StoreOrderItem[];
  items_source: 'order_items_table' | 'items_json' | 'error';
}

export interface StoreOrdersResponse {
  success: boolean;
  orders: StoreOrder[];
  stats: {
    total: number;
    assigned: number;
    delivered: number;
    returned: number;
    with_order_items: number;
    without_order_items: number;
  };
}

export const fetchStoreOrders = async (storeId: string): Promise<StoreOrdersResponse> => {
  console.log('📞 استدعاء Edge Function لجلب طلبات المتجر:', storeId);

  const response = await fetch(`${EDGE_FUNCTIONS_BASE}/store-orders`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-store-id': storeId,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  
  console.log('✅ تم استلام البيانات من Edge Function:', {
    total_orders: data.orders?.length || 0,
    stats: data.stats
  });

  return data;
};
