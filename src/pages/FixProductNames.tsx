import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  fixProductNames, 
  needsProductNameFix, 
  generateRealisticProductName,
  getProductNameWithPriority 
} from '@/utils/productNameFixer';
import { Package, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface OrderWithIssues {
  id: string;
  order_code: string;
  items: any[];
  order_items: any[];
  issues: string[];
  suggested_fixes: { field: string; old_value: string; new_value: string }[];
}

export default function FixProductNames() {
  const [orders, setOrders] = useState<OrderWithIssues[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [stats, setStats] = useState({
    total_orders: 0,
    orders_with_issues: 0,
    total_items_needing_fix: 0
  });
  const { toast } = useToast();

  const analyzeOrders = async () => {
    setLoading(true);
    try {
      // جلب الطلبات مع العناصر
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_code, items')
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;

      // جلب order_items
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('*');

      if (orderItemsError) {
        console.warn('جدول order_items غير متاح:', orderItemsError.message);
      }

      const analysis = ordersData?.map(order => {
        const itemsFromJson = Array.isArray(order.items) ? order.items : [];
        const orderItemsFromTable = orderItemsData?.filter(item => item.order_id === order.id) || [];

        const issues: string[] = [];
        const suggested_fixes: { field: string; old_value: string; new_value: string }[] = [];

        // فحص عناصر JSON
        itemsFromJson.forEach((item, index) => {
          if (item.name && needsProductNameFix(item.name)) {
            issues.push(`عنصر JSON ${index + 1}: اسم المنتج يحتاج إصلاح`);
            suggested_fixes.push({
              field: `items[${index}].name`,
              old_value: item.name,
              new_value: generateRealisticProductName(index, order.order_code)
            });
          }
          
          if (item.product_name && needsProductNameFix(item.product_name)) {
            issues.push(`عنصر JSON ${index + 1}: product_name يحتاج إصلاح`);
            suggested_fixes.push({
              field: `items[${index}].product_name`,
              old_value: item.product_name,
              new_value: generateRealisticProductName(index, order.order_code)
            });
          }
        });

        // فحص عناصر الجدول
        orderItemsFromTable.forEach((item, index) => {
          if (item.product_name && needsProductNameFix(item.product_name)) {
            issues.push(`عنصر جدول ${index + 1}: product_name يحتاج إصلاح`);
            suggested_fixes.push({
              field: `order_items[${item.id}].product_name`,
              old_value: item.product_name,
              new_value: generateRealisticProductName(index, order.order_code)
            });
          }
        });

        return {
          id: order.id,
          order_code: order.order_code || 'غير محدد',
          items: itemsFromJson,
          order_items: orderItemsFromTable,
          issues,
          suggested_fixes
        };
      }) || [];

      const ordersWithIssues = analysis.filter(order => order.issues.length > 0);
      const totalItemsNeedingFix = analysis.reduce((sum, order) => sum + order.suggested_fixes.length, 0);

      setOrders(analysis);
      setStats({
        total_orders: analysis.length,
        orders_with_issues: ordersWithIssues.length,
        total_items_needing_fix: totalItemsNeedingFix
      });

      toast({
        title: "تم التحليل بنجاح",
        description: `تم فحص ${analysis.length} طلب ووجدت ${ordersWithIssues.length} طلب يحتاج إصلاح`
      });

    } catch (error) {
      console.error('خطأ في تحليل الطلبات:', error);
      toast({
        title: "خطأ في التحليل",
        description: "فشل في تحليل الطلبات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fixAllProductNames = async () => {
    setFixing(true);
    let fixedCount = 0;
    
    try {
      for (const order of orders.filter(o => o.issues.length > 0)) {
        // إصلاح عناصر JSON
        if (order.items.length > 0) {
          const fixedItems = fixProductNames(order.items, order.order_code);
          
          const { error: updateOrderError } = await supabase
            .from('orders')
            .update({ items: fixedItems })
            .eq('id', order.id);

          if (updateOrderError) {
            console.error('خطأ في تحديث طلب:', updateOrderError);
          } else {
            fixedCount++;
          }
        }

        // إصلاح عناصر الجدول
        for (const item of order.order_items) {
          if (item.product_name && needsProductNameFix(item.product_name)) {
            const fixedName = generateRealisticProductName(0, order.order_code);
            
            const { error: updateItemError } = await supabase
              .from('order_items')
              .update({ product_name: fixedName })
              .eq('id', item.id);

            if (updateItemError) {
              console.error('خطأ في تحديث عنصر:', updateItemError);
            }
          }
        }

        // تأخير قصير لتجنب الإفراط في الطلبات
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: "تم الإصلاح بنجاح! 🎉",
        description: `تم إصلاح ${fixedCount} طلب بنجاح`
      });

      // إعادة تحليل البيانات
      await analyzeOrders();

    } catch (error) {
      console.error('خطأ في إصلاح أسماء المنتجات:', error);
      toast({
        title: "خطأ في الإصلاح",
        description: "فشل في إصلاح بعض أسماء المنتجات",
        variant: "destructive"
      });
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    analyzeOrders();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-6 h-6" />
            إصلاح أسماء المنتجات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">إجمالي الطلبات</div>
              <div className="text-2xl font-bold text-blue-600">{stats.total_orders}</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-gray-600">طلبات تحتاج إصلاح</div>
              <div className="text-2xl font-bold text-red-600">{stats.orders_with_issues}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-gray-600">عناصر تحتاج إصلاح</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.total_items_needing_fix}</div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={analyzeOrders} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'جاري التحليل...' : 'إعادة تحليل'}
            </Button>
            
            {stats.orders_with_issues > 0 && (
              <Button onClick={fixAllProductNames} disabled={fixing} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className={`w-4 h-4 ml-2 ${fixing ? 'animate-spin' : ''}`} />
                {fixing ? '��اري الإصلاح...' : `إصلاح ${stats.orders_with_issues} طلب`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {orders.filter(order => order.issues.length > 0).map((order) => (
          <Card key={order.id} className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>طلب {order.order_code} - {order.id.slice(0, 8)}</span>
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 ml-1" />
                  {order.issues.length} مشكلة
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-red-800 mb-2">المشاكل المكتشفة:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {order.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-green-800 mb-2">الإصلاح��ت المقترحة:</h4>
                  <div className="space-y-2">
                    {order.suggested_fixes.map((fix, i) => (
                      <div key={i} className="p-2 bg-green-50 rounded text-xs">
                        <div className="font-medium">{fix.field}</div>
                        <div className="text-red-600">القديم: "{fix.old_value}"</div>
                        <div className="text-green-600">الجديد: "{fix.new_value}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.filter(order => order.issues.length === 0).length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              طلبات سليمة ({orders.filter(order => order.issues.length === 0).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              هذه الطلبات لديها أسماء منتجات صحيحة ولا تحتاج إصلاح.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
