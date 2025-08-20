import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArabicText } from '@/components/ui/arabic-text';
import DivisionCompletionStatus from '@/components/orders/DivisionCompletionStatus';
import { 
  calculateDivisionCompletionStatus, 
  getDivisionsWithCompletionStatus,
  updateOriginalOrderBasedOnDivisions 
} from '@/services/divisionCompletionService';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, TestTube, Eye } from 'lucide-react';

export default function DivisionCompletionTestPage() {
  const [originalOrderId, setOriginalOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  // اختبار حساب حالة الاكتمال
  const testCalculateCompletionStatus = async () => {
    if (!originalOrderId.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال معرف الطلب الأصلي",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 اختبار حساب حالة الاكتمال للطلب:', originalOrderId);
      
      const completionStatus = await calculateDivisionCompletionStatus(originalOrderId);
      setTestResults({
        type: 'completion_status',
        data: completionStatus
      });

      toast({
        title: "نجح الاختبار",
        description: `تم حساب حالة الاكتمال: ${completionStatus.statusLabel}`,
      });

    } catch (error) {
      console.error('❌ خطأ في اختبار حساب حالة الاكتمال:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        originalOrderId
      });
      toast({
        title: "فشل الاختبار",
        description: error instanceof Error ? error.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // اختبار جلب التقسيمات مع حالة الاكتمال
  const testGetDivisionsWithStatus = async () => {
    if (!originalOrderId.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال معرف الطلب الأصلي",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 اختبار جلب التقسيمات مع حالة الاكتمال للطلب:', originalOrderId);
      
      const result = await getDivisionsWithCompletionStatus(originalOrderId);
      setTestResults({
        type: 'divisions_with_status',
        data: result
      });

      toast({
        title: "نجح الاختبار",
        description: `تم جلب ${result.divisions.length} تقسيمات مع حالة الاكتمال`,
      });

    } catch (error) {
      console.error('❌ خطأ في اختبار جلب التقسيمات:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        originalOrderId
      });
      toast({
        title: "فشل الاختبار",
        description: error instanceof Error ? error.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // اختبار تحديث الطلب الأصلي
  const testUpdateOriginalOrder = async () => {
    if (!originalOrderId.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال معرف الطلب الأصلي",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 اختبار تحديث الطلب الأصلي بناءً على التقسيمات:', originalOrderId);
      
      const result = await updateOriginalOrderBasedOnDivisions(originalOrderId);
      setTestResults({
        type: 'update_original',
        data: result
      });

      if (result.success) {
        toast({
          title: "نجح الاختبار",
          description: "تم تحديث حالة الطلب الأصلي بنجاح",
        });
      } else {
        toast({
          title: "فشل الاختبار",
          description: result.error || "فشل في تحديث الطلب الأصلي",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('❌ خطأ في اختبار تحديث الطلب الأصلي:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        originalOrderId
      });
      toast({
        title: "فشل الاختبار",
        description: error instanceof Error ? error.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <TestTube className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">
          <ArabicText>اختبار ميزة حالة الاكتمال للطلبات المقسمة</ArabicText>
        </h1>
      </div>

      {/* قسم الإدخال */}
      <Card>
        <CardHeader>
          <CardTitle>
            <ArabicText>معلومات الاختبار</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="originalOrderId">
              <ArabicText>معرف الطلب الأصلي (المقسم)</ArabicText>
            </Label>
            <Input
              id="originalOrderId"
              value={originalOrderId}
              onChange={(e) => setOriginalOrderId(e.target.value)}
              placeholder="مثال: ORD_123 أو معرف الطلب الأصلي"
              className="text-right"
            />
            <p className="text-xs text-gray-500 mt-1">
              أدخل معرف الطلب الأصلي الذي تم تقسيمه إلى عدة متاجر
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={testCalculateCompletionStatus}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <ArabicText>اختبار حساب حالة الاكتمال</ArabicText>
            </Button>

            <Button
              onClick={testGetDivisionsWithStatus}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <ArabicText>جلب التقسيمات مع الحالة</ArabicText>
            </Button>

            <Button
              onClick={testUpdateOriginalOrder}
              disabled={loading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <ArabicText>تحديث الطلب الأصلي</ArabicText>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* قسم العرض المباشر للمكون */}
      {originalOrderId.trim() && (
        <Card>
          <CardHeader>
            <CardTitle>
              <ArabicText>عرض مباشر لمكون حالة الاكتمال</ArabicText>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">
                <ArabicText>العرض المبسط:</ArabicText>
              </h3>
              <DivisionCompletionStatus 
                originalOrderId={originalOrderId}
                autoRefresh={true}
                showDetails={false}
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">
                <ArabicText>العرض التفصيلي:</ArabicText>
              </h3>
              <DivisionCompletionStatus 
                originalOrderId={originalOrderId}
                autoRefresh={true}
                showDetails={true}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* عرض نتائج الاختبار */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>
              <ArabicText>نتائج الاختبار</ArabicText>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96 text-left" dir="ltr">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>
            <ArabicText>كيفية الاختبار</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold">
              <ArabicText>خطوات الاختبار:</ArabicText>
            </h4>
            <ul className="list-disc mr-6 space-y-1">
              <li><ArabicText>1. أدخل معرف طلب تم تقسيمه مسبقاً</ArabicText></li>
              <li><ArabicText>2. اضغط على "اختبار حساب حالة الاكتمال" لرؤية الحسابات</ArabicText></li>
              <li><ArabicText>3. شاهد العرض المباشر للمكون أدناه</ArabicText></li>
              <li><ArabicText>4. اختبر تحديث الطلب الأصلي (اختياري)</ArabicText></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">
              <ArabicText>الحالات المتوقعة:</ArabicText>
            </h4>
            <ul className="list-disc mr-6 space-y-1">
              <li><ArabicText>• مكتملة: جميع المتاجر وافقت على طلباتها</ArabicText></li>
              <li><ArabicText>• غير مكتملة: لا تزال بعض المتاجر لم ترد أو جميع المتاجر رفضت</ArabicText></li>
              <li><ArabicText>• مكتملة جزئياً: بعض المتاجر وافق وبعض رفض</ArabicText></li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              <ArabicText>
                💡 نصيحة: يمكنك استخدام هذه الصفحة لاختبار الميزة الجديدة مع طلبات حقيقية مقسمة في النظام
              </ArabicText>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
