import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { setupAdminNotificationsTable, testAdminNotificationsTable } from '@/utils/setupAdminNotifications';

export default function AdminNotificationsSetup() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const result = await setupAdminNotificationsTable();
      setSetupResult(result);
      
      if (result.success) {
        toast({
          title: '✅ تم الإعداد بنجاح',
          description: 'تم إنشاء جدول admin_notifications في قاعدة البيانات',
        });
      } else {
        toast({
          title: '❌ فشل في الإعداد',
          description: 'حدث خطأ أثناء إنشاء الجدول',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast({
        title: '❌ خطأ في الإعداد',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    try {
      const result = await testAdminNotificationsTable();
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: '✅ اختبار ناجح',
          description: 'جدول admin_notifications يعمل بشكل صحيح',
        });
      } else {
        toast({
          title: '❌ فشل الاختبار',
          description: 'لا يمكن الوصول للجدول',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: '❌ خطأ في الاختبار',
        description: 'حدث خطأ أثناء الاختبار',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعداد جدول إشعارات المدير</CardTitle>
          <CardDescription>
            إعداد قاعدة البيانات لحفظ إشعارات المدير
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleSetup}
              disabled={isLoading}
            >
              إنشاء الجدول
            </Button>
            
            <Button 
              onClick={handleTest}
              disabled={isLoading}
              variant="outline"
            >
              اختبار الجدول
            </Button>
          </div>

          {setupResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">نتيجة الإعداد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={setupResult.success ? "default" : "destructive"}>
                      {setupResult.success ? "نجح" : "فشل"}
                    </Badge>
                  </div>
                  {setupResult.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                      <pre>{JSON.stringify(setupResult.error, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">نتيجة الاختبار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={testResult.success ? "default" : "destructive"}>
                      {testResult.success ? "نجح" : "فشل"}
                    </Badge>
                  </div>
                  {testResult.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                      <pre>{JSON.stringify(testResult.error, null, 2)}</pre>
                    </div>
                  )}
                  {testResult.data && (
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
                      الجدول متاح ويعمل بشكل صحيح
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
