import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const TestEdgeFunctionFix = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const EDGE_FUNCTIONS_BASE = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

  const testAutoAssignOrders = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔍 Testing auto-assign-orders function...');
      
      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/auto-assign-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      console.log('📨 Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 Response data:', data);

      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data
      });

      if (response.ok) {
        toast({
          title: "نجح الاختبار",
          description: `تم تعيين ${data.assigned_count || 0} طلب`,
        });
      } else {
        toast({
          title: "فشل الاختبار",
          description: data.error || response.statusText,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      setResult({
        error: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: "خطأ في الاتصال",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testManualAssign = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔍 Testing manual assignment...');
      
      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/auto-assign-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'manual',
          orderId: 'test-order-id',
          storeId: 'test-store-id'
        })
      });

      console.log('📨 Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 Response data:', data);

      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data
      });

      toast({
        title: response.ok ? "رد الاستجابة" : "فشل الاختبار",
        description: data.error || data.message || response.statusText,
        variant: response.ok ? "default" : "destructive",
      });

    } catch (error) {
      console.error('❌ Test failed:', error);
      setResult({
        error: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: "خطأ في الاتصال",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testPing = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔍 Testing ping...');
      
      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/auto-assign-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true })
      });

      console.log('📨 Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 Response data:', data);

      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data
      });

      toast({
        title: "اختبار الاتصال",
        description: `Status: ${response.status} - ${response.statusText}`,
      });

    } catch (error) {
      console.error('❌ Ping failed:', error);
      setResult({
        error: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: "خطأ في الاتصال",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>اختبار Edge Function - التعيين التلقائي</CardTitle>
            <p className="text-sm text-muted-foreground">
              URL: {EDGE_FUNCTIONS_BASE}/auto-assign-orders
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={testPing}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "جاري الاختبار..." : "اختبار الاتصال"}
              </Button>

              <Button 
                onClick={testManualAssign}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "جاري الاختبار..." : "اختبار التعيين اليدوي"}
              </Button>

              <Button 
                onClick={testAutoAssignOrders}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "جاري الاختبار..." : "اختبار التعيين التلقائي"}
              </Button>
            </div>

            {result && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    نتيجة الاختبار
                    <Badge variant={result.ok ? "default" : "destructive"}>
                      {result.status || 'Error'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto" dir="ltr">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">معلومات:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• اختبار الاتصال: يتحقق من استجابة الخادم</li>
                <li>• اختبار التعيين اليدوي: يختبر تعيين طلب محدد لمتجر محدد</li>
                <li>• اختبار التعيين التلقائي: يختبر تعيين جميع الطلبات المعلقة</li>
                <li>• راقب وحدة التحكم (F12) للمزيد من التفاصيل</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestEdgeFunctionFix;
