import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArabicText } from '@/components/ui/arabic-text';
import { calculateDivisionCompletionStatus } from '@/services/divisionCompletionService';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, TestTube } from 'lucide-react';

export default function ErrorFixTestPage() {
  const [originalOrderId, setOriginalOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  // اختبار الخطأ الذي تم إصلاحه
  const testErrorHandling = async () => {
    if (!originalOrderId.trim()) {
      toast({
        title: "خطأ في الإدخال",
        description: "يرجى إدخال معرف الطلب الأصلي",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 اختبار معالجة الأخطاء المحسنة...');
      
      // محاولة جلب حالة اكتمال طلب غير موجود
      const completionStatus = await calculateDivisionCompletionStatus(originalOrderId);
      
      setTestResults({
        type: 'success',
        data: completionStatus,
        message: 'تم الاختبار بنجاح - لا توجد أخطاء'
      });

      toast({
        title: "نجح الاختبار ✅",
        description: `تم جلب البيانات بنجاح للطلب: ${originalOrderId}`,
      });

    } catch (error) {
      // هنا يجب أن نرى الأخطاء المحسنة في console
      console.log('🔍 اختبار معالجة الخطأ - هذا متوقع إذا كان الطلب غير موجود');
      
      setTestResults({
        type: 'error',
        data: error,
        message: error instanceof Error ? error.message : String(error)
      });

      toast({
        title: "تم اختبار معالجة الأخطاء",
        description: "تحقق من console للتأكد من تحسن عرض الأخطاء",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // اختبار طلب وهمي غير موجود
  const testNonExistentOrder = async () => {
    setOriginalOrderId('FAKE_ORDER_' + Math.random().toString(36).substr(2, 9));
    setTimeout(() => testErrorHandling(), 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <TestTube className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">
          <ArabicText>اختبار إصلاح الأخطاء</ArabicText>
        </h1>
      </div>

      {/* معلومات الاختبار */}
      <Card>
        <CardHeader>
          <CardTitle>
            <ArabicText>إصلاح الأخطاء المطبق</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-800 mb-2">الإصلاحات المطبقة:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• إصلاح عرض "[object Object]" في رسائل الأخطاء</li>
                  <li>• إضافة تفاصيل شاملة للأخطاء (message, code, details, hint)</li>
                  <li>• معالجة محسنة لأخطاء Supabase</li>
                  <li>• utility functions للتعامل مع الأخطاء</li>
                  <li>• تحسين أخطاء البحث عن الطلب الأصلي</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قسم الاختبار */}
      <Card>
        <CardHeader>
          <CardTitle>
            <ArabicText>اختبار معالجة الأخطاء</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="originalOrderId">
              <ArabicText>معر�� الطلب الأصلي للاختبار</ArabicText>
            </Label>
            <Input
              id="originalOrderId"
              value={originalOrderId}
              onChange={(e) => setOriginalOrderId(e.target.value)}
              placeholder="مثال: ORD_123 أو معرف وهمي"
              className="text-right"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={testErrorHandling}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              <ArabicText>اختبار معالجة الأخطاء</ArabicText>
            </Button>

            <Button
              onClick={testNonExistentOrder}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              <ArabicText>اختبار طلب غير موجود</ArabicText>
            </Button>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">كيفية الاختبار:</p>
                <p>1. أدخل معرف طلب (موجود أو غير موجود)</p>
                <p>2. اضغط على "اختبار معالجة الأخطاء"</p>
                <p>3. افتح Developer Console لرؤية الأخطاء المحسنة</p>
                <p>4. أو اضغط "اختبار طلب غير موجود" لاختبار تلقائي</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* عرض نتائج الاختبار */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>
              <ArabicText>نتائج الاختبار</ArabicText>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg ${
              testResults.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-2 mb-3">
                {testResults.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <h4 className={`font-semibold ${
                    testResults.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResults.type === 'success' ? 'نجح الاختبار' : 'تم اختبار معالجة الأخطاء'}
                  </h4>
                  <p className={`text-sm ${
                    testResults.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResults.message}
                  </p>
                </div>
              </div>
              
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">
                  عرض التفاصيل التقنية
                </summary>
                <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-48" dir="ltr">
                  {JSON.stringify(testResults.data, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>
            <ArabicText>التحسينات المطبقة</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold">
              <ArabicText>قبل الإصلاح:</ArabicText>
            </h4>
            <code className="block bg-red-50 p-2 rounded text-red-800 mt-1">
              ❌ خطأ في البحث عن الطلب الأصلي: [object Object]
            </code>
          </div>

          <div>
            <h4 className="font-semibold">
              <ArabicText>بعد الإصلاح:</ArabicText>
            </h4>
            <code className="block bg-green-50 p-2 rounded text-green-800 mt-1 text-xs">
              ❌ البحث عن الطلب الأصلي: {'{'}
              <br />&nbsp;&nbsp;message: "No rows found",
              <br />&nbsp;&nbsp;code: "PGRST116",
              <br />&nbsp;&nbsp;originalOrderId: "ORD_123",
              <br />&nbsp;&nbsp;timestamp: "2024-01-01T12:00:00Z"
              <br />{'}'}
            </code>
          </div>

          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-green-800">
              <ArabicText>
                ✅ الآن ستظهر تفاصيل الأخطاء بوضوح في console للمطورين، مما يساعد في تتبع المشاكل وحلها بسرعة!
              </ArabicText>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
