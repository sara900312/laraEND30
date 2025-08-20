import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, Package, ShoppingCart, AlertTriangle, Wand2 } from 'lucide-react';
import { setupRealProductSystem } from '@/utils/createRealProducts';
import { quickFixProductNames, updateOrderItemsTable } from '@/utils/quickProductFix';
import { useToast } from '@/hooks/use-toast';

interface DebugResult {
  type: string;
  title: string;
  data: any;
  error?: string;
  status: 'success' | 'error' | 'warning';
}

export const DatabaseDebugger: React.FC = () => {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingProducts, setIsCreatingProducts] = useState(false);
  const [isQuickFixing, setIsQuickFixing] = useState(false);
  const { toast } = useToast();

  const runDatabaseCheck = async () => {
    setIsLoading(true);
    setResults([]);
    const newResults: DebugResult[] = [];

    try {
      // 1. فحص جدول orders
      console.log('🔍 فحص جدول orders...');
      try {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, customer_name, items, order_details, order_code, order_status, total_amount')
          .limit(5);
        
        if (ordersError) throw ordersError;
        
        newResults.push({
          type: 'orders',
          title: `جدول Orders (${orders?.length || 0} طلبات)`,
          data: orders?.map(order => ({
            id: order.id,
            customer_name: order.customer_name,
            order_code: order.order_code,
            order_status: order.order_status,
            total_amount: order.total_amount,
            items: order.items,
            items_count: Array.isArray(order.items) ? order.items.length : 'غير مصفوفة',
            items_sample: Array.isArray(order.items) ? order.items.slice(0, 2) : order.items
          })),
          status: 'success'
        });
      } catch (error: any) {
        newResults.push({
          type: 'orders',
          title: 'خطأ في جدول Orders',
          data: null,
          error: error.message,
          status: 'error'
        });
      }

      // 2. فحص جدول products
      console.log('🔍 فحص جدول products...');
      try {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, name, name_en, main_store_name, price')
          .limit(5);
        
        if (productsError) throw productsError;
        
        newResults.push({
          type: 'products',
          title: `جدول Products (${products?.length || 0} منتجات)`,
          data: products,
          status: 'success'
        });
      } catch (error: any) {
        newResults.push({
          type: 'products',
          title: 'خطأ في جدول Products',
          data: null,
          error: error.message,
          status: 'error'
        });
      }

      // 3. فحص order_items
      console.log('🔍 فحص جدول order_items...');
      try {
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('order_items')
          .select('*')
          .limit(5);
        
        if (orderItemsError) throw orderItemsError;
        
        newResults.push({
          type: 'order_items',
          title: `جدول Order Items (${orderItems?.length || 0} عناصر)`,
          data: orderItems,
          status: 'success'
        });
      } catch (error: any) {
        newResults.push({
          type: 'order_items',
          title: 'جدول Order Items غير موجود',
          data: null,
          error: error.message,
          status: 'warning'
        });
      }

      // 4. فحص دالة RPC
      console.log('🔍 فحص دالة get_orders_with_products...');
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_orders_with_products');
        
        if (rpcError) throw rpcError;
        
        newResults.push({
          type: 'rpc',
          title: `دالة RPC (${rpcData?.length || 0} عناصر)`,
          data: rpcData?.slice(0, 3),
          status: 'success'
        });
      } catch (error: any) {
        newResults.push({
          type: 'rpc',
          title: 'دالة RPC غير متوفرة',
          data: null,
          error: error.message,
          status: 'warning'
        });
      }

      // 5. فحص تفصيلي للطلبات المعينة
      console.log('🔍 فحص الطلبات المعينة...');
      try {
        const { data: assignedOrders, error: assignedError } = await supabase
          .from('orders')
          .select('id, order_code, items, order_status, customer_name')
          .eq('order_status', 'assigned')
          .limit(3);
        
        if (assignedError) throw assignedError;
        
        const processedOrders = assignedOrders?.map(order => {
          let itemsAnalysis = 'غير محدد';
          let hasValidProductNames = false;
          
          if (order.items && Array.isArray(order.items)) {
            itemsAnalysis = `${order.items.length} منتجات`;
            hasValidProductNames = order.items.some(item => 
              item.name && 
              item.name.trim() !== '' && 
              item.name !== 'منتج غير محدد' &&
              item.name !== 'Intel Core i5-14400F Desktop Processor'
            );
          }
          
          return {
            ...order,
            items_analysis: itemsAnalysis,
            has_valid_product_names: hasValidProductNames,
            sample_items: Array.isArray(order.items) ? order.items.slice(0, 2) : order.items
          };
        });
        
        newResults.push({
          type: 'assigned_orders',
          title: `الطلبات المعينة (${assignedOrders?.length || 0} طلبات)`,
          data: processedOrders,
          status: 'success'
        });
      } catch (error: any) {
        newResults.push({
          type: 'assigned_orders',
          title: 'خطأ في فحص الطلبات المعينة',
          data: null,
          error: error.message,
          status: 'error'
        });
      }

    } catch (error: any) {
      newResults.push({
        type: 'general',
        title: 'خطأ عام في فحص قاعدة البيانات',
        data: null,
        error: error.message,
        status: 'error'
      });
    }

    setResults(newResults);
    setIsLoading(false);
  };

  const createRealProducts = async () => {
    setIsCreatingProducts(true);

    try {
      toast({
        title: "جاري الإعداد",
        description: "جاري إنشاء منتجات حقيقية وتحديث الطلبات...",
      });

      const result = await setupRealProductSystem();

      if (result.success) {
        toast({
          title: "تم بنجاح! 🎉",
          description: `تم إنشاء المنتجات وتحديث ${result.results?.orders?.updated || 0} طلب`,
        });
        // إعادة تشغيل فحص قاعدة البيانات لعرض النتائج الجديدة
        await runDatabaseCheck();
      } else {
        toast({
          title: "تم مع بعض المشاكل ⚠️",
          description: "تم الإعداد ولكن هناك بعض المشاكل في التحديث",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الإعداد",
        description: error instanceof Error ? error.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setIsCreatingProducts(false);
    }
  };

  const runQuickFix = async () => {
    setIsQuickFixing(true);

    try {
      toast({
        title: "جاري الإصلاح السريع",
        description: "جاري تحديث أسماء المنتجات في الطلبات الحالية...",
      });

      const ordersResult = await quickFixProductNames();
      const orderItemsResult = await updateOrderItemsTable();

      const totalUpdated = ordersResult.updated + orderItemsResult.updated;

      if (ordersResult.success && orderItemsResult.success) {
        toast({
          title: "تم الإصلاح بنجاح! 🎉",
          description: `تم تحديث ${totalUpdated} عنصر بأسماء منتجات حقيقية`,
        });
        // إعادة تشغيل فحص قاعدة البيانات لعرض النتائج الجديدة
        await runDatabaseCheck();
      } else {
        toast({
          title: "تم الإصلاح جزئياً ⚠️",
          description: `تم تحديث ${totalUpdated} عنصر، لكن هناك بعض المشاكل`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الإصلاح",
        description: error instanceof Error ? error.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setIsQuickFixing(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'orders': return <ShoppingCart className="w-4 h-4" />;
      case 'products': return <Package className="w-4 h-4" />;
      case 'order_items': return <Database className="w-4 h-4" />;
      case 'rpc': return <RefreshCw className="w-4 h-4" />;
      case 'assigned_orders': return <ShoppingCart className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">فحص قاعدة البيانات</h1>
          <p className="text-muted-foreground">تحليل البيانات والبحث عن سبب مشكلة أسماء المنتجات</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={runDatabaseCheck}
            disabled={isLoading || isCreatingProducts || isQuickFixing}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                جاري الفحص...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                بدء الفحص
              </>
            )}
          </Button>

          <Button
            onClick={runQuickFix}
            disabled={isLoading || isCreatingProducts || isQuickFixing}
            variant="outline"
            className="gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
          >
            {isQuickFixing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                جاري الإصلاح...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
            إصلاح سريع للمنتجات
          </>
        )}
      </Button>

      <Button
        onClick={() => window.open('/store-dashboard', '_blank')}
        disabled={isLoading || isCreatingProducts || isQuickFixing}
        variant="outline"
        className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
      >
        <Package className="w-4 h-4" />
        اختبار النظام
      </Button>

          <Button
            onClick={createRealProducts}
            disabled={isLoading || isCreatingProducts || isQuickFixing}
            variant="secondary"
            className="gap-2"
          >
            {isCreatingProducts ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                إنشاء منتجات حقيقية
              </>
            )}
          </Button>
        </div>
      </div>

      {results.map((result, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getIcon(result.type)}
              {result.title}
              <Badge variant={getBadgeVariant(result.status) as any}>
                {result.status === 'success' ? 'نجح' : 
                 result.status === 'error' ? 'خطأ' : 'تحذير'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{result.error}</p>
              </div>
            ) : (
              <div className="bg-gray-50 border rounded-lg p-3">
                <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {results.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">اضغط على "بدء الفحص" لتحليل قاعدة البيانات</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DatabaseDebugger;
