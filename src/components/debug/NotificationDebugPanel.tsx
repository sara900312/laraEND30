import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  runNotificationDiagnostics, 
  testSimpleNotification,
  checkNotificationTable,
  testNotificationPermissions
} from '@/utils/notificationDbChecker';
import { 
  storeNotificationService,
  sendTestNotification 
} from '@/services/storeNotificationService';
import { 
  Bug, 
  Database, 
  Shield, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Copy
} from 'lucide-react';

export const NotificationDebugPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testStoreId, setTestStoreId] = useState('test-store-12345');
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runFullDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('🩺 Starting full notification diagnostics...');
      const results = await runNotificationDiagnostics(testStoreId);
      setDiagnostics(results);
      
      toast({
        title: "تم إجراء التشخيص",
        description: "تحقق من وحدة التحكم للحصول على التفاصيل الكاملة",
      });
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      toast({
        title: "فشل التشخيص",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testTableStructure = async () => {
    setLoading(true);
    try {
      const result = await checkNotificationTable();
      setTestResults(prev => [...prev, {
        test: 'Table Structure',
        timestamp: new Date().toISOString(),
        result,
        success: result.success
      }]);
      
      toast({
        title: result.success ? "الجدول سليم" : "مشكلة في الجدول",
        description: result.success ? "جدول الإشعارات موجود وسليم" : result.error,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "خطأ في اختبار الجدول",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testPermissions = async () => {
    setLoading(true);
    try {
      const results = await testNotificationPermissions();
      setTestResults(prev => [...prev, {
        test: 'Permissions',
        timestamp: new Date().toISOString(),
        result: results,
        success: results.every(r => r.success)
      }]);
      
      const failedTests = results.filter(r => !r.success);
      toast({
        title: failedTests.length === 0 ? "الصلاحيات سليمة" : "مشاكل في الصلاحيات",
        description: failedTests.length === 0 ? "جميع الصلاحيات تعمل بشكل صحيح" : `فشل في ${failedTests.length} عملية`,
        variant: failedTests.length === 0 ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "خطأ في اختبار الصلاحيات",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testSimpleInsert = async () => {
    if (!testStoreId) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال معرف المتجر",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await testSimpleNotification(testStoreId);
      setTestResults(prev => [...prev, {
        test: 'Simple Insert',
        timestamp: new Date().toISOString(),
        result,
        success: result.success
      }]);
      
      toast({
        title: result.success ? "تم الإدراج بنجاح" : "فشل الإدراج",
        description: result.success ? "تم إنشاء إشعار تجريبي بنجاح" : result.error,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "خطأ في اختبار الإدراج",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testServiceMethod = async () => {
    if (!testStoreId) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال معرف المتجر",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const success = await sendTestNotification(testStoreId);
      setTestResults(prev => [...prev, {
        test: 'Service Method',
        timestamp: new Date().toISOString(),
        result: { success },
        success
      }]);
      
      toast({
        title: success ? "تم إرسال الإشعار" : "فشل في الإرسال",
        description: success ? "تم إرسال إشعار عبر الخدمة بنجاح" : "فشل في إرسال الإشعار عبر الخدمة",
        variant: success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "خطأ في اختبار الخدمة",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyDiagnostics = () => {
    if (diagnostics) {
      navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      toast({
        title: "تم النسخ",
        description: "تم نسخ نتائج التشخيص إلى الحافظة",
      });
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setDiagnostics(null);
    toast({
      title: "تم المسح",
      description: "تم مسح جميع النتائج",
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            لوحة تشخيص الإشعارات
          </CardTitle>
          <CardDescription>
            أدوات لتشخيص وإصلاح مشاكل نظام الإشعارات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-store-id">معرف المتجر للاختبار</Label>
            <Input
              id="test-store-id"
              value={testStoreId}
              onChange={(e) => setTestStoreId(e.target.value)}
              placeholder="معرف المتجر (UUID)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={runFullDiagnostics}
              disabled={loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              تشخيص شامل
            </Button>

            <Button
              onClick={testTableStructure}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <Database className="w-4 h-4" />
              اختبار الجدول
            </Button>

            <Button
              onClick={testPermissions}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              اختبار الصلاحيات
            </Button>

            <Button
              onClick={testSimpleInsert}
              disabled={loading || !testStoreId}
              variant="outline"
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              اختبار الإدراج
            </Button>

            <Button
              onClick={testServiceMethod}
              disabled={loading || !testStoreId}
              variant="outline"
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              اختبار الخدمة
            </Button>

            <Button
              onClick={clearResults}
              variant="destructive"
              className="gap-2"
            >
              مسح النتائج
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>نتائج الاختبارات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? 'نجح' : 'فشل'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(result.timestamp).toLocaleString('ar')}
                  </div>
                  {!result.success && result.result?.error && (
                    <div className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded">
                      {result.result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostics Results */}
      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              نتائج التشخيص الشامل
              <Button onClick={copyDiagnostics} size="sm" variant="outline" className="gap-2">
                <Copy className="w-4 h-4" />
                نسخ
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Table Check */}
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  فحص الجدول
                </h4>
                <Badge variant={diagnostics.tableCheck.success ? "default" : "destructive"}>
                  {diagnostics.tableCheck.success ? 'سليم' : 'مشكلة'}
                </Badge>
                {diagnostics.tableCheck.recordCount !== undefined && (
                  <p className="text-sm text-muted-foreground mt-1">
                    عدد السجلات: {diagnostics.tableCheck.recordCount}
                  </p>
                )}
              </div>

              {/* Permission Tests */}
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  اختبارات الصلاحيات
                </h4>
                <div className="space-y-1">
                  {diagnostics.permissionTests.map((test: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{test.description}</span>
                      <Badge variant={test.success ? "default" : "destructive"} className="text-xs">
                        {test.success ? '✓' : '✗'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simple Test */}
              {diagnostics.simpleTest && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    اختبار الإدراج البسيط
                  </h4>
                  <Badge variant={diagnostics.simpleTest.success ? "default" : "destructive"}>
                    {diagnostics.simpleTest.success ? 'نجح' : 'فشل'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Raw JSON (collapsed) */}
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">عرض JSON الكامل</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
