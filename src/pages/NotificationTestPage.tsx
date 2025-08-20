import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storeNotificationService } from '@/services/storeNotificationService';
import { runNotificationDiagnostics, testSimpleNotification } from '@/utils/notificationDbChecker';
import { handleSupabaseError } from '@/utils/errorHandler';

const NotificationTestPage = () => {
  const [testStoreId, setTestStoreId] = useState('test-store-123');
  const [testing, setTesting] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleTestNotification = async () => {
    setTesting(true);
    setLastResult(null);
    
    try {
      console.log('🧪 Testing store notification with storeId:', testStoreId);
      
      const result = await storeNotificationService.sendNotification({
        storeId: testStoreId,
        title: 'إشعار تجريبي',
        message: `هذا إشعار تجريبي تم إرساله في ${new Date().toLocaleTimeString('ar')}`,
        type: 'general',
        priority: 'low'
      });
      
      setLastResult({
        success: result,
        message: result ? 'تم إرسال الإشعار بنجاح' : 'فشل في إرسال الإشعار',
        timestamp: new Date().toISOString()
      });
      
      console.log('🧪 Test result:', result);
      
    } catch (error) {
      console.error('🧪 Test failed with exception:', error);
      
      setLastResult({
        success: false,
        message: 'حدث خطأ أثناء الاختبار',
        error: handleSupabaseError(error, 'test notification').error,
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestSimple = async () => {
    setTesting(true);
    setLastResult(null);
    
    try {
      console.log('🧪 Testing simple notification insertion...');
      
      const result = await testSimpleNotification(testStoreId);
      
      setLastResult({
        success: result.success,
        message: result.success ? 'تم إدراج الإشعار بنجاح' : 'فشل في إدراج الإشعار',
        error: result.error || null,
        data: result.data || null,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      setLastResult({
        success: false,
        message: 'حدث خطأ أثناء الاختبار البسيط',
        error: String(error),
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setTesting(true);
    setDiagnostics(null);
    
    try {
      console.log('🩺 Running comprehensive diagnostics...');
      
      const result = await runNotificationDiagnostics(testStoreId);
      setDiagnostics(result);
      
    } catch (error) {
      setDiagnostics({
        error: 'فشل في تشغيل التشخيصات',
        details: String(error),
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">اختبار نظام الإشعارات</CardTitle>
            <CardDescription>
              صفحة لاختبار وتشخيص مشاكل نظام الإشعارات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeId">معرف المتجر للاختبار</Label>
              <Input
                id="storeId"
                value={testStoreId}
                onChange={(e) => setTestStoreId(e.target.value)}
                placeholder="أدخل معرف المتجر"
              />
            </div>
            
            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={handleTestNotification}
                disabled={testing || !testStoreId}
              >
                {testing ? 'جاري الاختبار...' : 'اختبار إرسال إشعار'}
              </Button>
              
              <Button 
                onClick={handleTestSimple}
                disabled={testing || !testStoreId}
                variant="outline"
              >
                {testing ? 'جاري الاختبار...' : 'اختبار بسيط'}
              </Button>
              
              <Button 
                onClick={handleRunDiagnostics}
                disabled={testing}
                variant="secondary"
              >
                {testing ? 'جاري التشخيص...' : 'تشغيل التشخيصات'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {lastResult && (
          <Card>
            <CardHeader>
              <CardTitle className={lastResult.success ? 'text-green-600' : 'text-red-600'}>
                {lastResult.success ? '✅ نجح الاختبار' : '❌ فشل الاختبار'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>الرسالة:</strong> {lastResult.message}</p>
                <p><strong>الوقت:</strong> {new Date(lastResult.timestamp).toLocaleString('ar')}</p>
                {lastResult.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800"><strong>تفاصيل الخطأ:</strong></p>
                    <pre className="text-sm text-red-600 mt-1 whitespace-pre-wrap">
                      {typeof lastResult.error === 'string' ? lastResult.error : JSON.stringify(lastResult.error, null, 2)}
                    </pre>
                  </div>
                )}
                {lastResult.data && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800"><strong>البيانات المُرجعة:</strong></p>
                    <pre className="text-sm text-green-600 mt-1 whitespace-pre-wrap">
                      {JSON.stringify(lastResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {diagnostics && (
          <Card>
            <CardHeader>
              <CardTitle>📊 نتائج التشخيص</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnostics.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800">{diagnostics.error}</p>
                    {diagnostics.details && (
                      <pre className="text-sm text-red-600 mt-2 whitespace-pre-wrap">
                        {diagnostics.details}
                      </pre>
                    )}
                  </div>
                ) : (
                  <pre className="text-sm bg-gray-100 p-4 rounded whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(diagnostics, null, 2)}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>💡 نصائح لحل المشاكل</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• تأكد من وجود جدول notifications في قاعدة البيانات</li>
              <li>• تحقق من صلاحيات الوصول لجدول notifications</li>
              <li>• راجع إعدادات Supabase والمفاتيح</li>
              <li>• تأكد من صحة هيكل البيانات المُرسلة</li>
              <li>• افتح Developer Tools للاطلاع على الأخطاء في Console</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationTestPage;
