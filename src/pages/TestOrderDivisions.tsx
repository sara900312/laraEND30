import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArabicText } from '@/components/ui/arabic-text';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { createAllTestDivisions, sampleTestData } from '@/utils/createTestDivisions';
import { OrderDivisionPanelUpdated } from '@/components/admin/OrderDivisionPanelUpdated';
import {
  Package,
  RefreshCw,
  ArrowLeft,
  TestTube,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export const TestOrderDivisions: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const handleCreateTestData = async () => {
    try {
      setCreating(true);
      
      toast({
        title: "إنشاء بيانات تجريبية",
        description: "جاري إنشاء تقسيمات الطلبات التجريبية...",
      });
      
      const results = await createAllTestDivisions();
      setTestResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      toast({
        title: "تم إنشاء البيانات التجريبية",
        description: `تم إنشاء ${successCount} من أصل ${totalCount} مجموعة تقسيمات بنجاح`,
        variant: successCount === totalCount ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('❌ خطأ في إنشاء البيانات ا��تجريبية:', error);
      toast({
        title: "خطأ في إنشاء البيانات",
        description: "فشل في إنشاء البيانات التجريبية",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/admin-aa-smn-justme9003')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <ArabicText>العودة للوحة الإدارة</ArabicText>
          </Button>
          
          <h1 className="text-2xl font-bold">
            <ArabicText>اختبار نظام تقسيمات الطلبات</ArabicText>
          </h1>
        </div>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            <ArabicText>إنشاء بيانات تجريبية</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">
              <ArabicText>البيانات التجريبية المتاحة:</ArabicText>
            </h4>
            <div className="space-y-2">
              {sampleTestData.map((data, index) => (
                <div key={index} className="text-sm text-blue-700">
                  <span className="font-medium">
                    {data.originalOrderCode} - {data.customerName}
                  </span>
                  <span className="text-blue-600">
                    {' '}({data.divisions.length} متجر)
                  </span>
                  <div className="text-xs text-blue-600 mt-1">
                    {data.divisions.map(div => (
                      <span key={div.storeName} className="inline-block ml-2">
                        {div.storeName}: {div.status}
                        {div.storeResponseStatus && ` (${div.storeResponseStatus})`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Button
            onClick={handleCreateTestData}
            disabled={creating}
            className="w-full"
          >
            {creating ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                <ArabicText>جاري الإنشاء...</ArabicText>
              </>
            ) : (
              <>
                <Package className="w-4 h-4 ml-2" />
                <ArabicText>إنشاء البيانات التجريبية</ArabicText>
              </>
            )}
          </Button>
          
          {testResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">
                <ArabicText>نتائج الإنشاء:</ArabicText>
              </h4>
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border flex items-center gap-2 ${
                    result.success 
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {result.originalOrderCode}
                  </span>
                  {result.success ? (
                    <span>
                      - تم إنشاء {result.totalDivisions} تقسيم بنجاح
                    </span>
                  ) : (
                    <span>
                      - فشل: {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Divisions Display */}
      <OrderDivisionPanelUpdated />

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <ArabicText>تعليمات الاختبار</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">
                <ArabicText>كيفية اختبار النظام:</ArabicText>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-yellow-700">
                <li>
                  <ArabicText>اضغط على "إنشاء البيانات التجريبية" لإنشاء تقسيمات تجريبية</ArabicText>
                </li>
                <li>
                  <ArabicText>راجع قسم "الطلبات المقسمة حسب المتاجر" أدناه</ArabicText>
                </li>
                <li>
                  <ArabicText>اختبر الحالات المختلفة: مكتملة، غير مكتملة، مُسلمة، مختلطة</ArabicText>
                </li>
                <li>
                  <ArabicText>تحقق من العدادات في الإحصائيات السريعة</ArabicText>
                </li>
                <li>
                  <ArabicText>اضغط على "عرض" لكل مجموعة لرؤية تفاصيل التقسيمات</ArabicText>
                </li>
              </ol>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">
                <ArabicText>الحالات المتوقعة:</ArabicText>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-green-700">
                <li>
                  <strong>مكتملة:</strong> <ArabicText>جميع المتاجر وافقت (available/accepted)</ArabicText>
                </li>
                <li>
                  <strong>غير مكتملة:</strong> <ArabicText>يوجد متاجر لم ترد بعد (pending/assigned)</ArabicText>
                </li>
                <li>
                  <strong>مُسلمة:</strong> <ArabicText>جميع التقسيمات مُسلمة (delivered)</ArabicText>
                </li>
                <li>
                  <strong>مختلطة:</strong> <ArabicText>يوجد موافقة ورفض معاً</ArabicText>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestOrderDivisions;
