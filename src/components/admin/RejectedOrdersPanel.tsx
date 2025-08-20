import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Package, 
  Clock, 
  RefreshCw,
  Eye,
  ArrowLeft,
  Store 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/currency';
import { safeFormatDate } from '@/utils/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';

interface RejectedOrder {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_amount: number;
  subtotal: number;
  created_at: string;
  rejection_reason: string;
  store_response_at: string;
  store_name: string;
  product_name: string;
  product_quantity: number;
}

export const RejectedOrdersPanel: React.FC = () => {
  const { t } = useLanguage();
  const [rejectedOrders, setRejectedOrders] = useState<RejectedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchRejectedOrders = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      console.log('📊 جلب الطلبات المرفوضة...');

      // استخدام Supabase مباشرة لجلب قائمة الطلبات المرفوضة (الأنسب لوحة الإدارة)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          customer_name,
          customer_phone,
          customer_address,
          total_amount,
          subtotal,
          created_at,
          rejection_reason,
          store_response_at,
          main_store_name,
          assigned_store_id,
          items,
          stores:assigned_store_id (
            id,
            name
          ),
          order_items (
            id,
            product_name,
            quantity,
            price
          )
        `)
        .eq('store_response_status', 'unavailable')
        .not('rejection_reason', 'is', null)
        .order('store_response_at', { ascending: false });

      if (error) {
        console.error('❌ خطأ في جلب الطلبات المرفوضة:', error);
        throw error;
      }

      // تحويل البيانات للشكل المطلوب
      const transformedOrders: RejectedOrder[] = data?.map((order) => ({
        id: order.id,
        order_code: order.order_code || `ORD-${order.id.slice(0, 8)}`,
        customer_name: order.customer_name || `${t('customer')} ${order.order_code || order.id.slice(0, 8)}`,
        customer_phone: order.customer_phone || 'غير محدد',
        customer_address: order.customer_address || 'غير محدد',
        total_amount: order.total_amount || 0,
        subtotal: order.subtotal || 0,
        created_at: order.created_at,
        rejection_reason: order.rejection_reason || 'لم يتم تحديد السبب',
        store_response_at: order.store_response_at,
        store_name: order.stores?.name || order.main_store_name || 'متجر غير محدد', // استخدام اسم المتجر مع fallback
        product_quantity: (() => {
          // حساب إجمالي الكمية من order_items
          if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
            return order.order_items.reduce((total: number, item: any) => {
              return total + (item.quantity || 1);
            }, 0);
          }

          // احتياطي من items
          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            return order.items.reduce((total: number, item: any) => {
              return total + (item.quantity || 1);
            }, 0);
          }

          return 1; // قيمة افتراضية
        })(),
        product_name: (() => {
          // أولوية لـ order_items
          if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
            const productNames = order.order_items
              .map((item: any) => item.product_name || item.name)
              .filter((name: string) => name && name.trim() !== '' && name !== 'منتج غير محدد')
              .join(', ');

            if (productNames) return productNames;
          }

          // احتياطي من items
          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            const productNames = order.items
              .map((item: any) => item.name || item.product_name)
              .filter((name: string) => name && name.trim() !== '' && name !== 'منتج غير محدد')
              .join(', ');

            if (productNames) return productNames;
          }

          return `منتج طلب ${order.order_code || order.id.slice(0, 8)}`;
        })()
      })) || [];

      setRejectedOrders(transformedOrders);
      
      console.log('✅ تم جلب الطلبات المرفوضة:', {
        count: transformedOrders.length,
        orders: transformedOrders.slice(0, 3).map(o => ({
          id: o.id,
          order_code: o.order_code,
          rejection_reason: o.rejection_reason,
          store_name: o.store_name
        }))
      });

    } catch (error) {
      console.error('❌ خطأ في جلب الطلبات المرفوضة:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب الطلبات المرفوضة",
        variant: "destructive"
      });
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const handleReassignOrder = async (orderId: string) => {
    try {
      console.log('🔄 إعادة تعيين الطلب:', orderId);

      const { error } = await supabase
        .from('orders')
        .update({
          order_status: 'pending',
          store_response_status: null,
          store_response_at: null,
          rejection_reason: null,
          assigned_store_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      toast({
        title: "تم إعادة التعيين ✅",
        description: "تم إرجاع الطلب للطلبات المعلقة لإعادة التوزيع"
      });

      // إعادة جلب البيانات
      fetchRejectedOrders(false);

    } catch (error) {
      console.error('❌ خطأ في إعادة تعيين الطلب:', error);
      toast({
        title: "خطأ",
        description: "فشل في إعادة تعيين الطلب",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchRejectedOrders();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 animate-spin" />
              جاري تحميل الطلبات المرفوضة...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <CardTitle className="text-red-800">
              الطلبات المرفوضة ({rejectedOrders.length})
            </CardTitle>
          </div>
          <Button
            onClick={() => fetchRejectedOrders(false)}
            variant="outline"
            disabled={isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                جاري التحديث...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                تحديث
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rejectedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>لا توجد طلبات مرفوضة</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {rejectedOrders.map((order) => (
              <Card key={order.id} className="border-red-100 bg-red-50/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-lg text-red-800">
                          {order.product_name}
                        </h4>
                        <p className="text-sm text-red-600">
                          طلب #{order.order_code}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        مرفوض
                      </Badge>
                    </div>

                    {/* Order Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div>
                          <div className="flex flex-row">
                            <span style={{ margin: 'auto -249px 0 auto' }}>{order.customer_name}</span>
                            <span className="font-medium" style={{ marginLeft: 'auto' }}>&nbsp;:العميل&nbsp;</span>
                          </div>
                        </div>
                        <div><span className="font-medium">الهاتف:</span> <span style={{ paddingRight: '5px' }}>{order.customer_phone}</span></div>
                        <div><span className="font-medium">العنوان:</span> {order.customer_address || 'غير محدد'}</div>
                        <div><span className="font-medium">المبلغ:</span> {formatCurrency(order.total_amount)}</div>
                      </div>
                      <div className="space-y-1">
                        <div><span className="font-medium">المتجر المعين:</span> {order.store_name}</div>
                        <div><span className="font-medium">{t('quantity.label')}</span> {order.product_quantity}</div>
                        <div><span className="font-medium">تاريخ الرفض:</span> {safeFormatDate(order.store_response_at)}</div>
                        <div><span className="font-medium">تاريخ الطلب:</span> {safeFormatDate(order.created_at)}</div>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-red-800">سبب الرفض:</span>
                          <p className="text-red-700 mt-1">{order.rejection_reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => handleReassignOrder(order.id)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        إعادة تعيين
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RejectedOrdersPanel;
