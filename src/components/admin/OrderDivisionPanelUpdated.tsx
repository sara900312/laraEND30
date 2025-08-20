import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArabicText } from '@/components/ui/arabic-text';
import { OrderDivisionStatus } from '@/components/orders/OrderDivisionStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Users
} from 'lucide-react';

interface SplitOrderGroup {
  originalOrderId: string;
  originalOrderCode?: string;
  customerName: string;
  totalAmount: number;
  createdAt: string;
  divisions: any[];
  overallStatus: 'complete' | 'incomplete' | 'delivered' | 'returned' | 'mixed' | 'single';
  isSingleOrder?: boolean; // للتمييز بين الطلبات الفردية والمقسمة
}

export const OrderDivisionPanelUpdated: React.FC = () => {
  const { toast } = useToast();
  const [splitOrderGroups, setSplitOrderGroups] = useState<SplitOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // جلب جميع الطلبات (المقسمة والفردية)
  const fetchSplitOrderGroups = async () => {
    try {
      setLoading(true);
      
      // جلب جميع الطلبات
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_phone,
          order_code,
          order_status,
          assigned_store_id,
          store_response_status,
          store_response_at,
          rejection_reason,
          main_store_name,
          total_amount,
          created_at,
          order_details,
          items
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // تجميع الطلبات حسب النوع (مقسمة أو فردية)
      const groupsMap = new Map<string, SplitOrderGroup>();

      allOrders?.forEach(order => {
        // التحقق من كون الطلب مقسماً
        const isSplitOrder = order.order_details?.includes('تم تقسيمه من الطلب الأصلي');
        
        if (isSplitOrder) {
          // معالجة الطلبات المقسمة
          const match = order.order_details?.match(/تم تقسيمه من الطلب الأصلي (.+)/);
          if (!match) return;
          
          const originalOrderId = match[1].trim();
          
          if (!groupsMap.has(originalOrderId)) {
            groupsMap.set(originalOrderId, {
              originalOrderId,
              originalOrderCode: originalOrderId,
              customerName: order.customer_name,
              totalAmount: 0,
              createdAt: order.created_at,
              divisions: [],
              overallStatus: 'incomplete',
              isSingleOrder: false
            });
          }
          
          const group = groupsMap.get(originalOrderId)!;
          group.totalAmount += order.total_amount || 0;
          group.divisions.push({
            id: order.id,
            store_name: order.main_store_name || 'متجر غير معروف',
            assigned_store_id: order.assigned_store_id,
            store_response_status: order.store_response_status,
            order_status: order.order_status,
            store_response_at: order.store_response_at,
            rejection_reason: order.rejection_reason,
            items_count: Array.isArray(order.items) ? order.items.length : 0,
            total_amount: order.total_amount || 0
          });
        } else {
          // معالجة الطلبات الفردية
          const singleOrderId = order.order_code || order.id;
          
          groupsMap.set(singleOrderId, {
            originalOrderId: singleOrderId,
            originalOrderCode: order.order_code || order.id.slice(0, 8),
            customerName: order.customer_name,
            totalAmount: order.total_amount || 0,
            createdAt: order.created_at,
            divisions: [{
              id: order.id,
              store_name: order.main_store_name || 'متجر غير معروف',
              assigned_store_id: order.assigned_store_id,
              store_response_status: order.store_response_status,
              order_status: order.order_status,
              store_response_at: order.store_response_at,
              rejection_reason: order.rejection_reason,
              items_count: Array.isArray(order.items) ? order.items.length : 0,
              total_amount: order.total_amount || 0
            }],
            overallStatus: calculateSingleOrderStatus(order),
            isSingleOrder: true
          });
        }
      });

      // حساب الحالة الإجمالية لكل مجموعة
      const groups = Array.from(groupsMap.values()).map(group => {
        if (!group.isSingleOrder) {
          group.overallStatus = calculateGroupStatus(group.divisions);
        }
        return group;
      });

      setSplitOrderGroups(groups);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "خطأ في جلب البيانات",
        description: "فشل في جلب الطلبات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // حساب حالة الطلب الفردي
  const calculateSingleOrderStatus = (order: any) => {
    if (order.order_status === 'delivered') return 'delivered';
    if (order.order_status === 'returned') return 'returned';
    if (order.store_response_status === 'available' || order.store_response_status === 'accepted') return 'complete';
    if (order.store_response_status === 'unavailable' || order.store_response_status === 'rejected') return 'mixed';
    return 'incomplete';
  };

  // حساب حالة المجموعة
  const calculateGroupStatus = (divisions: any[]) => {
    if (divisions.length === 0) return 'incomplete';
    
    const allDelivered = divisions.every(div => div.order_status === 'delivered');
    const allReturned = divisions.every(div => div.order_status === 'returned');
    const allStoresResponded = divisions.every(div => 
      div.store_response_status === 'available' || 
      div.store_response_status === 'accepted'
    );
    const anyPending = divisions.some(div => 
      !div.store_response_status || 
      div.store_response_status === 'pending' ||
      div.order_status === 'pending' ||
      div.order_status === 'assigned'
    );
    
    if (allDelivered) return 'delivered';
    if (allReturned) return 'returned';
    if (allStoresResponded && !anyPending) return 'complete';
    if (anyPending) return 'incomplete';
    return 'mixed';
  };

  // الحصول على معلومات الحالة
  const getStatusInfo = (status: string) => {
    const statusMap = {
      'complete': { 
        label: 'مكتملة', 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle,
        description: 'جميع المتاجر وافقت'
      },
      'incomplete': { 
        label: 'غير مكتملة', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Clock,
        description: 'في انتظار ردود المتاجر'
      },
      'delivered': { 
        label: 'مُسلمة', 
        color: 'bg-blue-100 text-blue-800', 
        icon: CheckCircle,
        description: 'تم التسليم بالكامل'
      },
      'returned': { 
        label: 'مسترجعة', 
        color: 'bg-red-100 text-red-800', 
        icon: XCircle,
        description: 'تم الإرجاع'
      },
      'mixed': { 
        label: 'مختلطة', 
        color: 'bg-orange-100 text-orange-800', 
        icon: AlertTriangle,
        description: 'حالات متنوعة'
      },
      'single': { 
        label: 'طلب فردي', 
        color: 'bg-gray-100 text-gray-800', 
        icon: Package,
        description: 'طلب من متجر واحد'
      }
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.incomplete;
  };

  useEffect(() => {
    fetchSplitOrderGroups();
    
    // الاشتراك في التحديثات المباشرة
    const subscription = supabase
      .channel('all-orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📡 Orders update:', payload);
          fetchSplitOrderGroups();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
          <ArabicText>جاري تحميل الطلبات...</ArabicText>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">
            <ArabicText>جميع الطلبات (مقسمة وفردية)</ArabicText>
          </h2>
          <Badge variant="secondary">{splitOrderGroups.length}</Badge>
        </div>
        
        <Button
          onClick={fetchSplitOrderGroups}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <ArabicText>تحديث</ArabicText>
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['complete', 'incomplete', 'delivered', 'mixed', 'single'].map(status => {
          const count = splitOrderGroups.filter(group => {
            if (status === 'single') {
              return group.isSingleOrder;
            }
            return group.overallStatus === status;
          }).length;
          const info = getStatusInfo(status);
          const StatusIcon = info.icon;
          
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      <ArabicText>{info.label}</ArabicText>
                    </p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <StatusIcon className={`w-8 h-8 ${
                    status === 'complete' || status === 'delivered' ? 'text-green-500' :
                    status === 'incomplete' ? 'text-yellow-500' :
                    status === 'mixed' ? 'text-orange-500' :
                    status === 'single' ? 'text-gray-500' : 'text-red-500'
                  }`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* قائمة المجموعات */}
      {splitOrderGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <ArabicText>لا توجد طلبات</ArabicText>
            </h3>
            <p className="text-gray-600">
              <ArabicText>لم يتم العثور على أي طلبات في النظام</ArabicText>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {splitOrderGroups.map((group) => {
            const statusInfo = getStatusInfo(group.isSingleOrder ? 'single' : group.overallStatus);
            const StatusIcon = statusInfo.icon;
            const isSelected = selectedGroup === group.originalOrderId;
            
            return (
              <Card 
                key={group.originalOrderId}
                className={`transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArabicText>
                          طلب #{group.originalOrderCode}
                        </ArabicText>
                        {group.isSingleOrder && (
                          <Badge variant="outline" className="text-xs">
                            <ArabicText>فردي</ArabicText>
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <ArabicText>{group.customerName}</ArabicText>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{group.isSingleOrder ? '1 متجر' : `${group.divisions.length} متجر`}</span>
                        </div>
                        <div>
                          {group.totalAmount.toLocaleString()} د.ع
                        </div>
                        <div>
                          {new Date(group.createdAt).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 ml-1" />
                        <ArabicText>{statusInfo.label}</ArabicText>
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedGroup(
                          isSelected ? null : group.originalOrderId
                        )}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        <ArabicText>{isSelected ? 'إخفاء' : 'عرض'}</ArabicText>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {isSelected && (
                  <CardContent>
                    {group.isSingleOrder ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <ArabicText>تفاصيل الطلب الفردي</ArabicText>
                        </h4>
                        <div className="space-y-2">
                          {group.divisions.map(division => (
                            <div key={division.id} className="bg-white rounded p-3 border">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  <ArabicText>{division.store_name}</ArabicText>
                                </span>
                                <Badge className={getStatusInfo(
                                  division.order_status === 'delivered' ? 'delivered' :
                                  division.order_status === 'returned' ? 'returned' :
                                  division.store_response_status === 'available' || division.store_response_status === 'accepted' ? 'complete' :
                                  division.store_response_status === 'unavailable' || division.store_response_status === 'rejected' ? 'mixed' :
                                  'incomplete'
                                ).color}>
                                  {division.order_status === 'delivered' ? 'مُسلم' :
                                   division.order_status === 'returned' ? 'مسترجع' :
                                   division.store_response_status === 'available' || division.store_response_status === 'accepted' ? 'متوفر' :
                                   division.store_response_status === 'unavailable' || division.store_response_status === 'rejected' ? 'غير متوفر' :
                                   'في الانتظار'}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 mt-2">
                                {division.items_count} منتج - {division.total_amount.toLocaleString()} د.ع
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <OrderDivisionStatus
                        divisions={group.divisions}
                        originalOrderId={group.originalOrderId}
                      />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderDivisionPanelUpdated;
