import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArabicText } from '@/components/ui/arabic-text';
import { OrderDivisionStatus } from '@/components/orders/OrderDivisionStatus';
import { useOrderDivisions } from '@/hooks/useOrderDivisions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Package,
  RefreshCw,
  Eye,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DemoOrder {
  id: string;
  customer_name: string;
  order_code?: string;
  order_status: string;
  created_at: string;
  order_details?: string;
  total_amount: number;
}

export const OrderDivisionDemo: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [splitOrders, setSplitOrders] = useState<DemoOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { 
    divisions, 
    loading: divisionsLoading, 
    refreshDivisions 
  } = useOrderDivisions(selectedOrderId || undefined);

  // جلب الطلبات المقسمة
  const fetchSplitOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, order_code, order_status, created_at, order_details, total_amount')
        .like('order_details', '%تم تقسيمه من الطلب الأصلي%')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setSplitOrders(data || []);
      
      // اختر أول طلب مقسم إذا لم يكن هناك اختيار
      if (data && data.length > 0 && !selectedOrderId) {
        setSelectedOrderId(data[0].id);
      }
      
    } catch (error) {
      console.error('Error fetching split orders:', error);
      toast({
        title: "خطأ في جلب البيانات",
        description: "فشل في جلب الطلبات المقسمة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSplitOrders();
  }, []);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'pending': { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'assigned': { label: 'معين', color: 'bg-blue-100 text-blue-800', icon: Package },
      'preparing': { label: 'قيد التحضير', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      'ready': { label: 'جاهز', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'delivered': { label: 'مُسلم', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'cancelled': { label: 'ملغي', color: 'bg-red-100 text-red-800', icon: XCircle },
      'rejected': { label: 'مرفوض', color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  // إنشاء بيانات تجريبية للعرض
  const createMockDivisions = () => {
    return [
      {
        id: 'div-1',
        store_name: 'متجر الإلكترونيات الحديثة',
        assigned_store_id: 'store-1',
        store_response_status: 'available' as const,
        order_status: 'delivered' as const,
        store_response_at: new Date(Date.now() - 86400000).toISOString(),
        items_count: 3,
        total_amount: 450000
      },
      {
        id: 'div-2',
        store_name: 'متجر الأجهزة المنزلية',
        assigned_store_id: 'store-2',
        store_response_status: 'pending' as const,
        order_status: 'assigned' as const,
        items_count: 2,
        total_amount: 320000
      },
      {
        id: 'div-3',
        store_name: 'متجر الهواتف الذكية',
        assigned_store_id: 'store-3',
        store_response_status: 'unavailable' as const,
        order_status: 'rejected' as const,
        store_response_at: new Date(Date.now() - 3600000).toISOString(),
        rejection_reason: 'المنتج غير متوفر حالياً',
        items_count: 1,
        total_amount: 180000
      }
    ];
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <ArabicText>العودة للوحة الإدارة</ArabicText>
          </Button>
          
          <h1 className="text-2xl font-bold">
            <ArabicText>عرض حالة تقسيمات الطلبات</ArabicText>
          </h1>
        </div>
        
        <Button
          onClick={() => {
            fetchSplitOrders();
            refreshDivisions();
          }}
          disabled={loading || divisionsLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${(loading || divisionsLoading) ? 'animate-spin' : ''}`} />
          <ArabicText>تحديث</ArabicText>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قائمة الطلبات المقسمة */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <ArabicText>الطلبات المقسمة</ArabicText>
              <Badge variant="secondary">{splitOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : splitOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <ArabicText>لا توجد طلبات مقسمة</ArabicText>
              </div>
            ) : (
              <div className="space-y-3">
                {splitOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.order_status);
                  const StatusIcon = statusInfo.icon;
                  const isSelected = selectedOrderId === order.id;
                  
                  return (
                    <Card 
                      key={order.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            <ArabicText>
                              طلب #{order.order_code || order.id.slice(0, 8)}
                            </ArabicText>
                          </span>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            <ArabicText>{statusInfo.label}</ArabicText>
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>
                            <ArabicText>العميل: {order.customer_name}</ArabicText>
                          </div>
                          <div>
                            المبلغ: {order.total_amount.toLocaleString()} د.ع
                          </div>
                          <div>
                            {new Date(order.created_at).toLocaleDateString('ar-SA')}
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <ArabicText>تم الاختيار</ArabicText>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* عرض حالة التقسيمات */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOrderId ? (
            <>
              {/* معلومات الطلب المحدد */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    <ArabicText>تفاصيل الطلب المحدد</ArabicText>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const selectedOrder = splitOrders.find(o => o.id === selectedOrderId);
                    if (!selectedOrder) return <div>طلب غير موجود</div>;
                    
                    return (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">رقم الطلب: </span>
                          <span className="font-medium">
                            #{selectedOrder.order_code || selectedOrder.id.slice(0, 8)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">العميل: </span>
                          <span className="font-medium">
                            <ArabicText>{selectedOrder.customer_name}</ArabicText>
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">المبلغ: </span>
                          <span className="font-medium">
                            {selectedOrder.total_amount.toLocaleString()} د.ع
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">التاريخ: </span>
                          <span className="font-medium">
                            {new Date(selectedOrder.created_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* حالة التقسيمات */}
              {divisions.length > 0 ? (
                <OrderDivisionStatus
                  divisions={divisions}
                  originalOrderId={selectedOrderId}
                />
              ) : divisionsLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
                    <ArabicText>جاري تحميل تقسيمات الطلب...</ArabicText>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-yellow-500" />
                    <ArabicText>لا توجد تقسيمات لهذا الطلب</ArabicText>
                    <p className="text-sm text-gray-600 mt-2">
                      <ArabicText>قد يكون هذا طلباً عادياً غير مقسم أو تم حذف التقسيمات</ArabicText>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* عرض تجريبي للتقسيمات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    <ArabicText>مثال تجريبي للتقسيمات</ArabicText>
                    <Badge variant="outline">عرض تجريبي</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    <ArabicText>
                      هذا مثال تجريبي يوضح كيف تظهر حالات التقسيمات المختلفة:
                    </ArabicText>
                  </p>
                  <OrderDivisionStatus
                    divisions={createMockDivisions()}
                    originalOrderId="mock-order"
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  <ArabicText>اختر طلباً لعرض تقسيماته</ArabicText>
                </h3>
                <p className="text-gray-600">
                  <ArabicText>
                    اختر طلباً من القائمة على اليسار لعرض حالة تقسيماته حسب المتاجر
                  </ArabicText>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* شرح وظائف النظام */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <ArabicText>شرح حالات التقسيمات</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  <ArabicText>مكتملة</ArabicText>
                </span>
              </div>
              <p className="text-sm text-green-700">
                <ArabicText>جميع المتاجر أكملت ردودها بالموافقة</ArabicText>
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  <ArabicText>غير مكتملة</ArabicText>
                </span>
              </div>
              <p className="text-sm text-yellow-700">
                <ArabicText>يوجد متاجر لم ترسل ردودها بعد</ArabicText>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  <ArabicText>مُسلمة</ArabicText>
                </span>
              </div>
              <p className="text-sm text-blue-700">
                <ArabicText>تم تسليم جميع التقسيمات بنجاح</ArabicText>
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">
                  <ArabicText>مسترجعة</ArabicText>
                </span>
              </div>
              <p className="text-sm text-red-700">
                <ArabicText>تم استرجاع جميع التقسيمات</ArabicText>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDivisionDemo;
