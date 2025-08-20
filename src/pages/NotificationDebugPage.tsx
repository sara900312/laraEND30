import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { storeNotificationService } from '@/services/storeNotificationService';
import { debugError } from '@/utils/errorHandler';

const NotificationDebugPage = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleQuickTest = async () => {
    setTesting(true);
    setResults([]);
    
    addResult('🚀 بدء اختبار سريع للإشعارات...');
    
    try {
      // Test 1: Simple notification
      addResult('📝 اختبار إشعار بسيط...');
      
      const result1 = await storeNotificationService.sendNotification({
        storeId: 'test-store-debug',
        title: 'اختبار سريع',
        message: 'هذا إشعار تجريبي للتأكد من عمل النظام',
        type: 'general',
        priority: 'low'
      });
      
      addResult(result1 ? '✅ نجح الإشعار البسيط' : '❌ فشل الإشعار البسيط');
      
      // Test 2: Order notification
      addResult('📦 اختبار إشعار طلب...');
      
      const result2 = await storeNotificationService.notifyNewOrder(
        'test-store-debug',
        'TEST-' + Date.now(),
        'عميل تجريبي',
        'order-' + Date.now()
      );
      
      addResult(result2 ? '✅ نجح إشعار الطلب' : '❌ فشل إشعار الطلب');
      
      // Test 3: System notification
      addResult('⚙️ اختبار إشعار نظام...');
      
      const result3 = await storeNotificationService.sendSystemNotification(
        'test-store-debug',
        'إشعار نظام تجريبي',
        'هذا إشعار من النظام للاختبار'
      );
      
      addResult(result3 ? '✅ نجح الإشعار النظام' : '❌ فشل إشعار النظام');
      
      addResult('🏁 انتهى الاختبار السريع');
      
    } catch (error) {
      addResult(`❌ خطأ أثناء الاختبار: ${error}`);
      console.error('Test error:', error);

      // Debug the exact error structure
      debugError(error, 'Notification test error');

    } finally {
      setTesting(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">تشخيص سريع للإشعارات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={handleQuickTest}
                disabled={testing}
                size="lg"
              >
                {testing ? 'جاري الاختبار...' : '🚀 اختبار سريع'}
              </Button>
              
              <Button 
                onClick={clearResults}
                variant="outline"
                disabled={testing}
              >
                مسح النتائج
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>سيقوم هذا الاختبار بإرسال عدة إشعارات تجريبية وعرض النتائج.</p>
              <p>راجع Developer Console لمزيد من التفاصيل.</p>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📊 نتائج الاختبار</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>📝 تعليمات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. افتح Developer Tools (F12)</p>
            <p>2. انتقل إلى Console tab</p>
            <p>3. اضغط على "اختبار سريع"</p>
            <p>4. راقب الرسائل في Console للحصول على تفاصيل الأخطاء</p>
            <p>5. إذا ظهرت أخطاء "[object Object]"، فقد تم إصلاحها الآن</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationDebugPage;
