import React from 'react';
import StoreOrderResponse from '@/components/stores/StoreOrderResponse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StoreOrderResponseDemo = () => {
  // Sample order data for demonstration
  const sampleOrders = [
    {
      id: '1',
      order_code: 'ORD-001',
      customer_name: 'أحمد محمد علي',
      customer_phone: '+964 750 123 4567',
      customer_address: 'شارع الرشيد، الكرادة، بغداد',
      total_amount: 150000,
      store_response_status: null,
      order_items: [
        {
          product_name: 'تلفزيون سامسونغ 55 بوصة QLED',
          quantity: 1,
          price: 150000
        }
      ]
    },
    {
      id: '2',
      order_code: 'ORD-002',
      customer_name: 'فاطمة حسن',
      customer_phone: '+964 770 987 6543',
      customer_address: 'حي الجامعة، الأعظمية، بغداد',
      total_amount: 85000,
      store_response_status: 'accepted',
      order_items: [
        {
          product_name: 'جهاز كمبيوتر محمول HP',
          quantity: 1,
          price: 85000
        }
      ]
    },
    {
      id: '3',
      order_code: 'ORD-003',
      customer_name: 'عمر الحسني',
      customer_phone: '+964 780 555 1234',
      customer_address: 'شارع النهر، الكرخ، بغداد',
      total_amount: 120000,
      store_response_status: 'rejected',
      order_items: [
        {
          product_name: 'مكيف هواء LG 1.5 طن',
          quantity: 1,
          price: 120000
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-blue-800">
              عرض توضيحي لمكون استجابة المتجر
            </CardTitle>
            <p className="text-center text-gray-600">
              مثال على كيفية عمل نظام الموافقة والرفض للطلبات في المتجر
            </p>
          </CardHeader>
        </Card>

        <div className="space-y-8">
          {sampleOrders.map((order, index) => (
            <Card key={order.id} className="shadow-lg border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-700">
                  طلب رقم {index + 1} - 
                  {order.store_response_status === null && ' (جديد - يحتاج استجابة)'}
                  {order.store_response_status === 'accepted' && ' (تم القبول)'}
                  {order.store_response_status === 'rejected' && ' (تم الرفض)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StoreOrderResponse order={order} />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-4">��رح الوظائف:</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✅ متوفر:</span>
                <span>يحدث store_response_status إلى "accepted" ويحفظ الوقت في store_response_at</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">❌ غير متوفر:</span>
                <span>يظهر حقل سبب الرفض، ويحدث الجدول بـ store_response_status = "rejected" وrejection_reason</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">📝 سبب الرفض:</span>
                <span>مطلوب عند اختيار "غير متوفر" - يتم حفظه في قاعدة البيانات</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreOrderResponseDemo;
