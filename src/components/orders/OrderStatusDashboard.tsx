/**
 * Order Status Dashboard Component
 * Provides comprehensive order management interface with Edge Functions integration
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Zap, 
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { useEnhancedEdgeFunctions } from '@/hooks/useEnhancedEdgeFunctions';
import { ArabicText } from '@/components/ui/arabic-text';
import {
  calculateOrderStats,
  getOrderStatusLabel,
  getOrderStatusColor,
  getOrderStatusIcon
} from '@/utils/orderFilters';

interface OrderStatusDashboardProps {
  orders: any[];
  onRefreshOrders: () => void;
  totalOrdersCount?: number;
}

export const OrderStatusDashboard: React.FC<OrderStatusDashboardProps> = ({
  orders,
  onRefreshOrders,
  totalOrdersCount = 0
}) => {
  const [showAutoAssignDetails, setShowAutoAssignDetails] = useState(false);
  
  const {
    autoAssignOrders,
    isAutoAssigning,
    autoAssignResults,
    clearAutoAssignResults
  } = useEnhancedEdgeFunctions();

  // حساب الإحصائيات باستخدام الدالة الموحدة
  const stats = calculateOrderStats(orders);

  const pendingPercentage = stats.total > 0 ? (stats.pending / stats.total) * 100 : 0;
  const assignedPercentage = stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0;
  const completedPercentage = stats.total > 0 ? ((stats.delivered) / stats.total) * 100 : 0;

  const handleAutoAssign = async () => {
    try {
      const results = await autoAssignOrders({
        showDetailedResults: true,
        onProgress: (response) => {
          console.log('📊 Auto-assign progress:', response);
          setShowAutoAssignDetails(true);
        }
      });
      
      if (results) {
        onRefreshOrders();
      }
    } catch (error) {
      console.error('❌ Error in auto-assign:', error);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { 
        icon: Clock, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100',
        label: 'معلقة',
        description: 'في انتظار التعيين'
      },
      assigned: { 
        icon: Package, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100',
        label: 'معينة',
        description: 'تم التعيين للمتجر'
      },
      delivered: { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100',
        label: 'مسلمة',
        description: 'تم التسليم بنجاح'
      },
      completed: { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100',
        label: 'مسلمة',
        description: 'تم التسليم بنجاح'
      },
      returned: { 
        icon: XCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-100',
        label: 'مرتجعة',
        description: 'تم إرجاع الطلب'
      },
    };
    
    return configs[status as keyof typeof configs] || configs.pending;
  };

  return (
    <div className="space-y-6">


      {/* شريط التقدم الإجمالي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <ArabicText>حالة المعالجة الإجمالية</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>الطلبات المعلقة</span>
              <span>{stats.pending} طلب ({pendingPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={pendingPercentage} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>الطلبات المعينة</span>
              <span>{stats.assigned} طلب ({assignedPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={assignedPercentage} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>الطلبات المكتملة</span>
              <span>{stats.delivered} طلب ({completedPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={completedPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>



      {/* نتائج التعيين التلقائي */}
      {autoAssignResults && showAutoAssignDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <ArabicText>نتائج آخر تعيين تلقائي</ArabicText>
              </CardTitle>
              <Button
                onClick={() => {
                  clearAutoAssignResults();
                  setShowAutoAssignDetails(false);
                }}
                variant="ghost"
                size="sm"
              >
                إغلاق
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">
                  {autoAssignResults.assigned_count}
                </p>
                <p className="text-sm text-green-600">طلب تم تعيينه بنجاح</p>
              </div>
              
              {autoAssignResults.unmatched_count > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-yellow-700">
                    {autoAssignResults.unmatched_count}
                  </p>
                  <p className="text-sm text-yellow-600">طلب غير مطابق</p>
                </div>
              )}
              
              {autoAssignResults.error_count > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-red-700">
                    {autoAssignResults.error_count}
                  </p>
                  <p className="text-sm text-red-600">طلب بخطأ</p>
                </div>
              )}
            </div>

            {autoAssignResults.results && autoAssignResults.results.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">تفاصيل النتائج:</h4>
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {autoAssignResults.results.map((result, index) => {
                      const statusConfig = {
                        assigned: { color: 'text-green-600', icon: CheckCircle },
                        unmatched: { color: 'text-yellow-600', icon: AlertCircle },
                        error: { color: 'text-red-600', icon: XCircle }
                      }[result.status];
                      
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                          <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                          <span className="font-mono text-xs">{result.order_id.slice(0, 8)}</span>
                          {result.store_name && (
                            <span className="text-blue-600">→ {result.store_name}</span>
                          )}
                          {result.error_message && (
                            <span className="text-red-600 text-xs">({result.error_message})</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderStatusDashboard;
