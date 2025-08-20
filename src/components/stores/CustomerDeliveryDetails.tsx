import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Phone, MapPin, User, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { OrderItems } from '@/components/orders/OrderItems';
import { useToast } from '@/hooks/use-toast';
import { ArabicText } from '@/components/ui/arabic-text';
import { safeFormatDate } from '@/utils/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Order {
  id: string;
  order_code?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_notes?: string;
  total_amount?: number;
  subtotal?: number;
  created_at: string;
  order_status?: string;
  store_response_status?: string;
  order_items?: any[];
}

interface CustomerDeliveryDetailsProps {
  order: Order;
  productName: string;
  onDeliveryComplete?: (orderId: string) => void;
  storeName?: string;
}

export function CustomerDeliveryDetails({
  order,
  productName,
  onDeliveryComplete,
  storeName
}: CustomerDeliveryDetailsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleDeliveryComplete = () => {
    toast({
      title: "تم التسليم ✅",
      description: "تم تأكيد تسليم الطلب بنجاح للعميل",
    });

    if (onDeliveryComplete) {
      onDeliveryComplete(order.id);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-blue-800">
                  {productName} - جاهز للتسليم
                </h3>
                <p className="text-sm text-blue-600">{t('store.dialog.customer.delivery')}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              🚚 جاهز للتسليم
            </Badge>
          </div>

          {/* Customer Details */}
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('customer.details')}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {/* Only show customer name if it has meaningful content */}
                {(() => {
                  const name = order.customer_name?.trim();
                  const orderRef = order.order_code || order.id.slice(0, 8);
                  const isGeneratedName = !name || name === '' || name === `${t('customer')} ${orderRef}` || name.startsWith('Customer ') || name.startsWith('عميل ');

                  if (!isGeneratedName) {
                    return (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-500 mt-1" />
                        <div>
                          <span className="font-semibold text-gray-700">{t('name.label')}</span>
                          <p className="text-gray-900 font-medium">
                            <ArabicText>{name}</ArabicText>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Only show phone if it has meaningful content */}
                {order.customer_phone && order.customer_phone.trim() !== '' && order.customer_phone !== "غير محدد" && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-500 mt-1" />
                    <div>
                      <span className="font-semibold text-gray-700">{t('phone.label')}</span>
                      <p className="text-gray-900 font-mono text-lg">
                        {order.customer_phone}
                      </p>
                    </div>
                  </div>
                )}

                {/* Only show address if it has meaningful content */}
                {order.customer_address && order.customer_address.trim() !== '' && order.customer_address !== "غير محدد" && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                    <div>
                      <span className="font-semibold text-gray-700">{t('address.label')}</span>
                      <p className="text-gray-900">{order.customer_address}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <span className="font-semibold text-gray-700">{t('order.date.label')}</span>
                    <p className="text-gray-900">
                      {safeFormatDate(order.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <span className="font-semibold text-gray-700">{t('total.amount.label')}</span>
                    <p className="text-blue-600 font-bold text-lg">
                      {order.subtotal ? formatCurrency(order.subtotal) :
                       order.total_amount ? formatCurrency(order.total_amount) : "غير محدد"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <span className="font-semibold text-gray-700">رقم الطلب:</span>
                    <p className="text-gray-900 font-mono">
                      #{order.order_code || order.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Notes */}
            {order.customer_notes && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-yellow-700">📝 {t('customer.notes')}:</span>
                  <span className="text-yellow-900">{order.customer_notes}</span>
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('products.required')}
            </h4>
            {(() => {
              if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
                return <OrderItems items={order.order_items} compact={false} />;
              }

              const orderRef = order.order_code || order.id.slice(0, 8);
              const defaultItem = {
                id: `default-${order.id}`,
                product_name: productName,
                quantity: 1,
                price: order.total_amount || order.subtotal || 0,
                discounted_price: order.total_amount || order.subtotal || 0,
                main_store_name: storeName
              };

              return <OrderItems items={[defaultItem]} compact={false} />;
            })()}
          </div>

          {/* Delivery Action */}
          <div className="flex justify-center">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeliveryComplete}
              disabled={order.order_status === 'customer_rejected' || order.store_response_status === 'customer_rejected'}
            >
              ✅ تم التسليم
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-center text-xs text-blue-600 bg-blue-100 p-3 rounded-lg">
            <p className="font-medium">تعليمات التسليم:</p>
            <p>تأكد من هوية العميل قبل ال��سليم • احصل على توقيع الاستلام • اضغط "تم التسليم" بعد التأكد</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerDeliveryDetails;
