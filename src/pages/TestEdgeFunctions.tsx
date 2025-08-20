/**
 * 🧪 صفحة اختبار سريعة لـ Edge Functions
 * للتأكد من عمل الدوال بشكل صحيح
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

const TestEdgeFunctions = () => {
  const [results, setResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [testOrderId, setTestOrderId] = useState('');
  const [testStoreId, setTestStoreId] = useState('');

  // 🧪 اختبار دالة auto-assign-orders
  const testAutoAssign = async () => {
    setIsLoading('auto-assign');
    setResults(prev => ({ ...prev, autoAssign: null }));
    
    try {
      console.log('🔵 Testing auto-assign-orders...');
      
      const response = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // بدون Authorization header كما هو مقترح
        },
        body: JSON.stringify({})
      });

      console.log('📨 Response status:', response.status);
      
      // Read response only once and store it
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log('✅ Success:', data);

      setResults(prev => ({
        ...prev,
        autoAssign: { 
          success: true, 
          data,
          message: `تم تعيين ${data.assigned_count || 0} طلب بنجاح`
        } 
      }));
      
    } catch (error) {
      console.error('❌ Error:', error);
      setResults(prev => ({ 
        ...prev, 
        autoAssign: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(null);
    }
  };

  // 🧪 اختبار دالة get-order
  const testGetOrder = async () => {
    if (!testOrderId.trim()) {
      alert('ي��جى إدخال معرف الطلب');
      return;
    }

    setIsLoading('get-order');
    setResults(prev => ({ ...prev, getOrder: null }));
    
    try {
      console.log('🔵 Testing get-order with orderId:', testOrderId);

      // Use GET method with query parameters as per documentation
      const url = new URL('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order');
      url.searchParams.append('orderId', testOrderId.trim());
      url.searchParams.append('adminMode', 'true'); // Admin mode for testing

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // بدون Authorization header كما هو مقترح
        }
      });

      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Success:', data);

      // Check for merged products
      if (data.order_items) {
        const mergedItems = data.order_items.filter(item => item.merged_quantity);
        if (mergedItems.length > 0) {
          console.log('🔀 Detected merged products:', mergedItems.map(item => ({
            product_id: item.product_id,
            merged_quantity: item.merged_quantity,
            total_price: item.total_price
          })));
        }
      }

      setResults(prev => ({
        ...prev,
        getOrder: {
          success: true,
          data,
          message: `تم جلب بيانات العميل: ${data.order?.customer_name || 'غير محدد'}`
        }
      }));
      
    } catch (error) {
      console.error('❌ Error:', error);
      setResults(prev => ({ 
        ...prev, 
        getOrder: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(null);
    }
  };

  // 🧪 اختبار دالة auto-assign-orders (manual mode)
  const testAssignOrder = async () => {
    if (!testOrderId.trim() || !testStoreId.trim()) {
      alert('يرجى إدخال معرف الطلب ومعرف المتجر');
      return;
    }

    setIsLoading('assign-order');
    setResults(prev => ({ ...prev, assignOrder: null }));
    
    try {
      console.log('🧪 Testing auto-assign-orders (manual mode) with:', { orderId: testOrderId, storeId: testStoreId });

      const response = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders', {
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

      console.log('📨 Response status:', response.status);
      
      // Read response only once and store it
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log('✅ Success:', data);

      setResults(prev => ({
        ...prev,
        assignOrder: { 
          success: true, 
          data,
          message: data.message || 'تم تعيين الطلب بنجاح'
        } 
      }));
      
    } catch (error) {
      console.error('❌ Error:', error);
      setResults(prev => ({ 
        ...prev, 
        assignOrder: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(null);
    }
  };

  // 🧪 اختبار الاتصال بالدوال (بدون body)
  const testConnection = async () => {
    setIsLoading('connection');
    const functions = ['assign-order', 'auto-assign-orders', 'get-order'];
    const connectionResults = {};
    
    try {
      for (const funcName of functions) {
        try {
          console.log(`🔵 Testing connection to ${funcName}...`);
          
          const response = await fetch(`https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/${funcName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          connectionResults[funcName] = {
            status: response.status,
            ok: response.status !== 404,
            message: response.status === 400 ? 'متاحة ✅' : `Status: ${response.status}`
          };
          
        } catch (error) {
          connectionResults[funcName] = {
            status: 'error',
            ok: false,
            message: error.message
          };
        }
      }
      
      setResults(prev => ({ 
        ...prev, 
        connection: { 
          success: true, 
          data: connectionResults 
        } 
      }));
      
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        connection: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(null);
    }
  };

  const renderResult = (testName: string, result: any) => {
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
              {result.success ? '✅ نجح' : '�� فشل'}: {testName}
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
    <div className="max-w-4xl mx-auto p-6 space-y-6" dir="rtl">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🧪 اختبار Edge Functions</h1>
        <p className="text-muted-foreground">
          اختبار سريع للتأكد من عمل جميع الدوال
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>📋 العناوين:</strong>
          <br />• assign-order: تعيين طلب لمتجر
          <br />• auto-assign-orders: تعيين تلقائي لجميع الطلبات
          <br />• get-order: جلب تفاصيل طلب معين
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* اختبار الاتصال */}
        <Card>
          <CardHeader>
            <CardTitle>🔗 اختبار الاتصال</CardTitle>
            <CardDescription>
              التأكد من وجود الدوال
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testConnection}
              disabled={isLoading === 'connection'}
              className="w-full"
            >
              {isLoading === 'connection' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الاختبار...
                </>
              ) : (
                'اختبار الاتصال'
              )}
            </Button>
            {renderResult('اختبار الاتصال', results.connection)}
          </CardContent>
        </Card>

        {/* اختبار auto-assign */}
        <Card>
          <CardHeader>
            <CardTitle>⚡ auto-assign-orders</CardTitle>
            <CardDescription>
              تعيين تلقائي (بدون باراميترات)
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
                  جاري التعيين...
                </>
              ) : (
                'تشغيل التعيين التلقائي'
              )}
            </Button>
            {renderResult('auto-assign-orders', results.autoAssign)}
          </CardContent>
        </Card>

        {/* اختبار get-order */}
        <Card>
          <CardHeader>
            <CardTitle>📋 get-order</CardTitle>
            <CardDescription>
              جلب تفاصيل طلب معين
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="معرف الطلب (orderId)"
              value={testOrderId}
              onChange={(e) => setTestOrderId(e.target.value)}
              className="text-right"
            />
            <Button 
              onClick={testGetOrder}
              disabled={isLoading === 'get-order'}
              className="w-full"
            >
              {isLoading === 'get-order' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الجلب...
                </>
              ) : (
                'جلب الطلب'
              )}
            </Button>
            {renderResult('get-order', results.getOrder)}
          </CardContent>
        </Card>

        {/* اختبار assign-order */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 assign-order</CardTitle>
            <CardDescription>
              تعيين طلب لمتجر معين
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="معرف الطلب (orderId)"
              value={testOrderId}
              onChange={(e) => setTestOrderId(e.target.value)}
              className="text-right"
            />
            <Input
              placeholder="معرف المتجر (storeId)"
              value={testStoreId}
              onChange={(e) => setTestStoreId(e.target.value)}
              className="text-right"
            />
            <Button 
              onClick={testAssignOrder}
              disabled={isLoading === 'assign-order'}
              className="w-full"
            >
              {isLoading === 'assign-order' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري التعيين...
                </>
              ) : (
                'تعيين الطلب'
              )}
            </Button>
            {renderResult('assign-order', results.assignOrder)}
          </CardContent>
        </Card>
      </div>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>📊 معلومات الاختبار</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>✅ نجح:</strong>
              <div className="text-green-600">الدالة تعمل بشكل صحيح</div>
            </div>
            <div>
              <strong>❌ فشل:</strong>
              <div className="text-red-600">خطأ في الدالة أو الاتصال</div>
            </div>
            <div>
              <strong>�� نصائح:</strong>
              <div className="text-blue-600">تحقق من Console للتفاصيل</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestEdgeFunctions;
