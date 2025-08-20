import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw, Zap, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  duration?: number;
}

interface EdgeFunctionStatus {
  name: string;
  url: string;
  status: 'unknown' | 'working' | 'error' | 'deploying';
  lastTest?: Date;
  error?: string;
}

const EdgeFunctionDebugger = () => {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [testOrderId, setTestOrderId] = useState('');
  const [testStoreId, setTestStoreId] = useState('');
  const [functionStatuses, setFunctionStatuses] = useState<EdgeFunctionStatus[]>([
    { name: 'get-order', url: '/functions/v1/get-order', status: 'unknown' },
    { name: 'auto-assign-orders', url: '/functions/v1/auto-assign-orders', status: 'unknown' },
  ]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [availableStores, setAvailableStores] = useState<any[]>([]);

  const { toast } = useToast();
  const EDGE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE || 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

  useEffect(() => {
    loadTestData();
    checkAllFunctionStatuses();
  }, []);

  const loadTestData = async () => {
    try {
      // Load sample orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_code, customer_name, order_status')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (orders) {
        setAvailableOrders(orders);
        if (orders.length > 0 && !testOrderId) {
          setTestOrderId(orders[0].id);
        }
      }

      // Load sample stores
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name')
        .order('name')
        .limit(10);
      
      if (stores) {
        setAvailableStores(stores);
        if (stores.length > 0 && !testStoreId) {
          setTestStoreId(stores[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading test data:', error);
    }
  };

  const checkAllFunctionStatuses = async () => {
    const updatedStatuses = [...functionStatuses];
    
    for (let i = 0; i < updatedStatuses.length; i++) {
      try {
        const response = await fetch(`${EDGE_FUNCTIONS_BASE}${updatedStatuses[i].url}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        updatedStatuses[i].status = response.status < 500 ? 'working' : 'error';
        updatedStatuses[i].lastTest = new Date();
        updatedStatuses[i].error = response.status >= 500 ? `HTTP ${response.status}` : undefined;
      } catch (error) {
        updatedStatuses[i].status = 'error';
        updatedStatuses[i].lastTest = new Date();
        updatedStatuses[i].error = error.message;
      }
    }
    
    setFunctionStatuses(updatedStatuses);
  };

  const testGetOrder = async () => {
    if (!testOrderId.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار معرف الطلب",
        variant: "destructive"
      });
      return;
    }

    setIsLoading('get-order');
    const startTime = Date.now();
    
    try {
      const url = new URL(`${EDGE_FUNCTIONS_BASE}/get-order`);
      url.searchParams.append('orderId', testOrderId.trim());
      url.searchParams.append('adminMode', 'true');

      console.log('🔵 Testing get-order:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResults(prev => ({
        ...prev,
        getOrder: {
          success: true,
          data,
          message: `تم جلب بيانات الطلب بنجاح في ${duration}ms`,
          duration
        }
      }));

      toast({
        title: "نجح الاختبار",
        description: `تم جلب بيانات العميل: ${data.order?.customer_name || 'غير محدد'}`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ get-order test failed:', error);
      
      setResults(prev => ({
        ...prev,
        getOrder: {
          success: false,
          error: error.message,
          duration
        }
      }));

      toast({
        title: "فشل الاختبار",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const testAutoAssign = async () => {
    setIsLoading('auto-assign');
    const startTime = Date.now();
    
    try {
      console.log('🔵 Testing auto-assign-orders');

      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/auto-assign-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // بدون Authorization header كما هو مقترح
        },
        body: JSON.stringify({})
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResults(prev => ({
        ...prev,
        autoAssign: {
          success: true,
          data,
          message: `تم تعيين ${data.assigned_count || 0} طلب بنجاح في ${duration}ms`,
          duration
        }
      }));

      toast({
        title: "نجح التعيين التلقائي",
        description: `تم تعيين ${data.assigned_count || 0} طلب من أصل ${data.total_orders || 0}`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ auto-assign test failed:', error);
      
      setResults(prev => ({
        ...prev,
        autoAssign: {
          success: false,
          error: error.message,
          duration
        }
      }));

      toast({
        title: "فشل التعيين التلقائي",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const testManualAssign = async () => {
    if (!testOrderId.trim() || !testStoreId.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار معرف الطلب ومعرف المتجر",
        variant: "destructive"
      });
      return;
    }

    setIsLoading('manual-assign');
    const startTime = Date.now();
    
    try {
      console.log('🔵 Testing manual assignment:', { orderId: testOrderId, storeId: testStoreId });

      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/auto-assign-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': testStoreId.trim() // إضافة x-store-id كما هو مطلوب
          // بدون Authorization header كما هو مقترح
        },
        body: JSON.stringify({
          orderId: testOrderId.trim(),
          storeId: testStoreId.trim(),
          mode: 'manual'
        })
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResults(prev => ({
        ...prev,
        manualAssign: {
          success: true,
          data,
          message: `تم تعيين الطلب للمتجر "${data.store_name}" في ${duration}ms`,
          duration
        }
      }));

      toast({
        title: "نجح التعيين اليدوي",
        description: data.message || `تم تعيين الطلب للمتجر "${data.store_name}"`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ manual assign test failed:', error);
      
      setResults(prev => ({
        ...prev,
        manualAssign: {
          success: false,
          error: error.message,
          duration
        }
      }));

      toast({
        title: "فشل التعيين اليدوي",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const renderResult = (testName: string, result?: TestResult) => {
    if (!result) return null;
    
    return (
      <Alert className={result.success ? "border-green-500" : "border-red-500"}>
        {result.success ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-semibold">
              {result.success ? '✅ نجح' : '❌ فشل'}: {testName}
              {result.duration && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({result.duration}ms)
                </span>
              )}
            </div>
            {result.message && (
              <div className="text-sm">{result.message}</div>
            )}
            {result.error && (
              <div className="text-sm text-red-600">خطأ: {result.error}</div>
            )}
            {result.data && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">عرض التفاصيل</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" dir="rtl">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🐛 مُصحح Edge Functions</h1>
        <p className="text-muted-foreground">
          أداة شاملة لاختبار وتشخيص مشاكل Edge Functions
        </p>
      </div>

      {/* Function Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            حالة الدوال
            <Button
              variant="outline"
              size="sm"
              onClick={checkAllFunctionStatuses}
              className="mr-auto"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {functionStatuses.map((func) => (
              <div key={func.name} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{func.name}</div>
                  <div className="text-sm text-muted-foreground">{func.url}</div>
                  {func.lastTest && (
                    <div className="text-xs text-muted-foreground">
                      آخر فحص: {func.lastTest.toLocaleTimeString('ar')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      func.status === 'working' ? 'default' : 
                      func.status === 'error' ? 'destructive' : 
                      'secondary'
                    }
                  >
                    {func.status === 'working' ? '✅ يعمل' : 
                     func.status === 'error' ? '❌ خطأ' : 
                     '❓ غير معروف'}
                  </Badge>
                  {func.error && (
                    <span className="text-xs text-red-600">{func.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test">الاختبارات</TabsTrigger>
          <TabsTrigger value="data">بيانات الاختبار</TabsTrigger>
          <TabsTrigger value="deployment">النشر</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Get Order Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  get-order
                </CardTitle>
                <CardDescription>
                  جلب تفاصيل طلب معين مع إخفاء/إظهار بيانات العميل حسب الصلاحيات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">معرف الطلب</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded"
                    value={testOrderId}
                    onChange={(e) => setTestOrderId(e.target.value)}
                  >
                    <option value="">اختر طلب</option>
                    {availableOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.order_code || order.id.slice(0, 8)} - {order.customer_name} ({order.order_status})
                      </option>
                    ))}
                  </select>
                </div>
                <Button 
                  onClick={testGetOrder}
                  disabled={isLoading === 'get-order'}
                  className="w-full"
                >
                  {isLoading === 'get-order' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري جلب الطلب...
                    </>
                  ) : (
                    'اختبار جلب الطلب'
                  )}
                </Button>
                {renderResult('get-order', results.getOrder)}
              </CardContent>
            </Card>

            {/* Auto Assign Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  auto-assign-orders
                </CardTitle>
                <CardDescription>
                  تعيين تلقائي لجميع الطلبات المعلقة للمتاجر المناسبة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testAutoAssign}
                  disabled={isLoading === 'auto-assign'}
                  className="w-full"
                >
                  {isLoading === 'auto-assign' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التعيين التلقائي...
                    </>
                  ) : (
                    'اختبار التعيين التلقائي'
                  )}
                </Button>
                {renderResult('auto-assign-orders', results.autoAssign)}
              </CardContent>
            </Card>

            {/* Manual Assign Test */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>تعيين يدوي</CardTitle>
                <CardDescription>
                  تعيين طلب محدد لمتجر محدد
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">معرف الطلب</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded"
                      value={testOrderId}
                      onChange={(e) => setTestOrderId(e.target.value)}
                    >
                      <option value="">اختر طلب</option>
                      {availableOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.order_code || order.id.slice(0, 8)} - {order.customer_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">معرف المتجر</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded"
                      value={testStoreId}
                      onChange={(e) => setTestStoreId(e.target.value)}
                    >
                      <option value="">اختر متجر</option>
                      {availableStores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button 
                  onClick={testManualAssign}
                  disabled={isLoading === 'manual-assign'}
                  className="w-full"
                >
                  {isLoading === 'manual-assign' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التعيين اليدوي...
                    </>
                  ) : (
                    'اختبار التعيين اليدوي'
                  )}
                </Button>
                {renderResult('manual-assign', results.manualAssign)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>الطلبات المتاحة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableOrders.map((order) => (
                    <div key={order.id} className="p-2 border rounded text-sm">
                      <div className="font-medium">{order.order_code || order.id.slice(0, 8)}</div>
                      <div className="text-muted-foreground">{order.customer_name}</div>
                      <div className="text-xs">حالة: {order.order_status}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>المتاجر المتاحة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableStores.map((store) => (
                    <div key={store.id} className="p-2 border rounded text-sm">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-muted-foreground text-xs">{store.id}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deployment">
          <Card>
            <CardHeader>
              <CardTitle>معلومات النشر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-semibold">للنشر على Supabase:</div>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>تأكد من تثبيت Supabase CLI</li>
                      <li>قم بربط المشروع: <code className="bg-gray-100 px-1 rounded">supabase link --project-ref your-project-ref</code></li>
                      <li>انشر الدوال: <code className="bg-gray-100 px-1 rounded">supabase functions deploy</code></li>
                      <li>أو انشر دالة واحدة: <code className="bg-gray-100 px-1 rounded">supabase functions deploy get-order</code></li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 border rounded">
                  <div className="font-medium mb-2">🔗 URLs الحالية:</div>
                  <div className="space-y-1 text-xs">
                    <div>get-order: {EDGE_FUNCTIONS_BASE}/get-order</div>
                    <div>auto-assign-orders: {EDGE_FUNCTIONS_BASE}/auto-assign-orders</div>
                  </div>
                </div>

                <div className="p-3 border rounded">
                  <div className="font-medium mb-2">📁 ملفات الدوال:</div>
                  <div className="space-y-1 text-xs">
                    <div>supabase/functions/get-order/index.ts</div>
                    <div>supabase/functions/auto-assign-orders/index.ts</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EdgeFunctionDebugger;
