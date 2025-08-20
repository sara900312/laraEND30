import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArabicText } from '@/components/ui/arabic-text';
import { OrderItems } from '@/components/orders/OrderItems';
import { OrderCard } from '@/components/orders/OrderCard';
import { formatPrice } from '@/utils/currency';
import { formatCurrency } from '@/utils/currencyUtils';
import { Order } from '@/types/order';

const sampleOrder: Order = {
  id: '1',
  order_code: 'ORD-001',
  customer_name: 'أحمد محمد',
  customer_phone: '+964771234567',
  customer_address: 'شارع الحبيبية، بغداد',
  customer_notes: 'يرجى التوصيل بعد الساعة 6 مساءً',
  order_status: 'pending',
  main_store_name: 'مطعم البيت العراقي',
  items: [
    {
      name: 'كباب عراقي',
      quantity: 2,
      price: 15000
    },
    {
      name: 'أرز عنبر',
      quantity: 1,
      price: 8000
    }
  ],
  total_amount: 38000,
  created_at: new Date().toISOString()
};

export const ArabicTextTest: React.FC = () => {
  const priceFormatted = formatPrice(sampleOrder.total_amount);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>
            <ArabicText>اختبار عرض النصوص العربية والعملات</ArabicText>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">
              <ArabicText>اختبار النصوص الأساسية:</ArabicText>
            </h3>
            <div className="grid gap-2 text-sm">
              <div>
                <ArabicText>الاسم: {sampleOrder.customer_name}</ArabicText>
              </div>
              <div>
                <ArabicText>العنوان: {sampleOrder.customer_address}</ArabicText>
              </div>
              <div>
                <ArabicText>ملاحظات: {sampleOrder.customer_notes}</ArabicText>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">
              <ArabicText>اختبار تحويل العملات:</ArabicText>
            </h3>
            <div className="space-y-1 text-sm">
              <div>
                <ArabicText>المبلغ: {formatCurrency(sampleOrder.total_amount)}</ArabicText>
              </div>
              <div>
                <ArabicText>المبلغ محوّل من ريال: {formatPrice(sampleOrder.total_amount)}</ArabicText>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">
              <ArabicText>اختبار حالات الطلب:</ArabicText>
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-yellow-100 text-yellow-800">
                <ArabicText>في الانتظار</ArabicText>
              </Badge>
              <Badge className="bg-blue-100 text-blue-800">
                <ArabicText>معين</ArabicText>
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                <ArabicText>مسلم</ArabicText>
              </Badge>
              <Badge className="bg-red-100 text-red-800">
                <ArabicText>مرتجع</ArabicText>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-medium mb-4">
          <ArabicText>اختبار مكون عناصر الطلب:</ArabicText>
        </h3>
        <OrderItems items={sampleOrder.items} showPriceInBothCurrencies={true} />
      </div>

      <div>
        <h3 className="font-medium mb-4">
          <ArabicText>اختبار بطاقة الطلب الكاملة:</ArabicText>
        </h3>
        <OrderCard 
          order={sampleOrder}
          compact={false}
          showAssignButton={true}
        />
      </div>
    </div>
  );
};
