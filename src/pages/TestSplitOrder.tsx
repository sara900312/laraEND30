import React, { useState } from 'react';
import { SplitOrderButton } from '@/components/orders/SplitOrderButton';
import { Button } from '@/components/ui/button';
import { testEdgeFunction } from '@/utils/testEdgeFunction';

// بيانات تجريبية لطلب يحتوي على منتجات من متاجر مختلفة
const mockOrder = {
  id: 'test-order-123',
  items: [
    {
      name: 'منتج أ',
      quantity: 2,
      price: 50,
      discounted_price: 45,
      main_store: 'متجر الإلكترونيات'
    },
    {
      name: 'منتج ب', 
      quantity: 1,
      price: 100,
      main_store: 'متجر الأزياء'
    },
    {
      name: 'منتج ج',
      quantity: 3, 
      price: 30,
      discounted_price: 25,
      main_store: 'متجر الإلكترونيات'
    },
    {
      name: 'منتج د',
      quantity: 1,
      price: 75,
      main_store: 'متجر الكتب'
    }
  ]
};

const TestSplitOrder = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingEdge, setIsTestingEdge] = useState(false);

  const handleTestEdgeFunction = async () => {
    setIsTestingEdge(true);
    try {
      const result = await testEdgeFunction('test-split');
      console.log('🧪 نتيجة اختبار Edge Function:', result);
      setTestResults(result);
    } catch (error) {
      console.error('❌ خطأ في اختبار Edge Function:', error);
      setTestResults({ exists: false, error: String(error) });
    } finally {
      setIsTestingEdge(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">اختبار زر تقسيم الطلبات</h1>

      {/* اختبار Edge Function */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">اختبار Edge Function</h2>

        <Button
          onClick={handleTestEdgeFunction}
          disabled={isTestingEdge}
          className="mb-4"
        >
          {isTestingEdge ? 'جاري الاختبار...' : 'اختبار Edge Function'}
        </Button>

        {testResults && (
          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">نتيجة الاختبار:</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">الطلب التجريبي</h2>
        <div className="space-y-2 mb-4">
          <p><strong>رقم الطلب:</strong> {mockOrder.id}</p>
          <p><strong>عدد المنتجات:</strong> {mockOrder.items.length}</p>
          <p><strong>المتاجر المختلفة:</strong> {new Set(mockOrder.items.map(item => item.main_store)).size}</p>
        </div>
        
        <div className="space-y-2 mb-6">
          <h3 className="font-semibold">تفاصيل المنتجات:</h3>
          {mockOrder.items.map((item, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded text-sm">
              <span className="font-medium">{item.name}</span> - 
              <span className="text-blue-600"> {item.main_store}</span> - 
              الكمية: {item.quantity} - 
              السعر: {item.price}
              {item.discounted_price && item.discounted_price !== item.price && (
                <span className="text-green-600"> (بعد الخصم: {item.discounted_price})</span>
              )}
            </div>
          ))}
        </div>

        <SplitOrderButton
          orderId={mockOrder.id}
          orderItems={mockOrder.items}
          onSplitComplete={() => {
            console.log('تم تقسيم الطلب وتعيينه للمتاجر بنجاح!');
            alert('تم تقسيم الطلب وتعيينه للمتاجر بنجاح! (هذا مجرد اختبار)');
          }}
        />
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>ملاحظة:</strong> هذا اختبار للزر فقط. سيحاول إرسال طلب إلى Edge Function أو استخدام النسخة المحلية.</p>
        <p>بعد التقسيم، سيتم حذف الطلب الأصلي وإنشاء طلبات جديدة معينة للمتاجر المناسبة.</p>
      </div>
    </div>
  );
};

export default TestSplitOrder;
