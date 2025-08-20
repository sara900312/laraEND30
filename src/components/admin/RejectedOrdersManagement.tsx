import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Store, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

interface RejectedOrder {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  assigned_store_name: string;
  rejection_reason: string;
  store_response_at: string;
  created_at: string;
  items: any[];
}

interface RejectedOrdersManagementProps {
  onOrderReassigned?: () => void;
}

export function RejectedOrdersManagement({ onOrderReassigned }: RejectedOrdersManagementProps) {
  const [rejectedOrders, setRejectedOrders] = useState<RejectedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const { toast } = useToast();

  const loadRejectedOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          customer_name,
          customer_phone,
          total_amount,
          assigned_store_name,
          rejection_reason,
          store_response_at,
          created_at,
          items
        `)
        .eq('order_status', 'rejected')
        .not('rejection_reason', 'is', null)
        .order('store_response_at', { ascending: false });

      if (error) throw error;
      setRejectedOrders(data || []);
    } catch (error) {
      console.error('خطأ في جلب الطلبات المرفوضة:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب الطلبات المرفوضة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const reassignOrder = async (orderId: string) => {
    setReassigning(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: 'pending',
          assigned_store_id: null,
          assigned_store_name: null,
          store_response_status: null,
          store_response_at: null,
          rejection_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "تم إعادة التعيين بنجاح ✅",
        description: "تم إرجاع الطلب إلى الطلبات المعلقة لإعادة التوزيع"
      });

      await loadRejectedOrders();
      onOrderReassigned?.();
    } catch (error) {
      console.error('خطأ في إعادة تعيين الطلب:', error);
      toast({
        title: "خطأ في إعادة التعيين",
        description: "فشل في إعادة تعيين الطلب",
        variant: "destructive"
      });
    } finally {
      setReassigning(null);
    }
  };

  const deleteRejectedOrder = async (orderId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الطلب نهائياً"
      });

      await loadRejectedOrders();
      onOrderReassigned?.();
    } catch (error) {
      console.error('خطأ في حذف الطلب:', error);
      toast({
        title: "خطأ في الحذف",
        description: "فشل في حذف الطلب",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadRejectedOrders();
  }, []);

  const getProductNames = (items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) {
      return 'لا توجد منتجات';
    }
    
    return items
      .map(item => item.product_name || item.name || 'منتج غير محدد')
      .slice(0, 2)
      .join(', ') + (items.length > 2 ? ` +${items.length - 2} منتجات أخرى` : '');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin ml-2" />
          جاري تحميل الطلبات المرفوضة...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          الطلبات المرفوضة من المتاجر ({rejectedOrders.length})
        </CardTitle>
        <div className="flex gap-2">
          <Button onClick={loadRejectedOrders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 ml-1" />
            تحديث
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {rejectedOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>لا توجد طلبات مرفوضة حالياً</p>
            <p className="text-sm">جميع الطلبات إما معلقة أو تم قبولها من المتاجر</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rejectedOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 bg-red-50 border-red-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      طلب {order.order_code}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.customer_name} - {order.customer_phone}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    مرفوض
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">المنتجات:</span>
                      <span>{getProductNames(order.items)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium">المبلغ الإجمالي:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">المتجر الذي رفض:</span>
                      <span className="text-red-600 font-medium">{order.assigned_store_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">تاريخ الرفض:</span>
                      <span>{new Date(order.store_response_at).toLocaleDateString('ar-IQ')}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-red-100 rounded border border-red-300">
                  <h4 className="font-semibold text-red-800 mb-1">سبب الرفض:</h4>
                  <p className="text-red-700">{order.rejection_reason}</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => reassignOrder(order.id)}
                    disabled={reassigning === order.id}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    {reassigning === order.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin ml-1" />
                    ) : (
                      <RefreshCw className="w-4 h-4 ml-1" />
                    )}
                    إعادة تعيين لمتجر آخر
                  </Button>
                  
                  <Button
                    onClick={() => deleteRejectedOrder(order.id)}
                    variant="destructive"
                    size="sm"
                  >
                    حذف نهائي
                  </Button>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  معرف الطلب: {order.id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RejectedOrdersManagement;
