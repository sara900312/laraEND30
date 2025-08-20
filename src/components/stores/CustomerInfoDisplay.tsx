import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Phone, MapPin, User, Calendar, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { ArabicText } from '@/components/ui/arabic-text';
import { safeFormatDate } from '@/utils/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProductNameWithPriority } from '@/utils/productNameFixer';

interface Order {
  id: string;
  order_code?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_notes?: string;
  total_amount?: number;
  subtotal?: number;
  created_at: string;
  order_status?: string;
  store_response_status?: string;
  order_items?: any[];
  items?: any[];
  order_details?: string;
  store_response_at?: string;
}

interface CustomerInfoDisplayProps {
  order: Order;
  storeName?: string;
}

export function CustomerInfoDisplay({ order, storeName }: CustomerInfoDisplayProps) {
  const { t } = useLanguage();

  const getStatusInfo = () => {
    if (order.order_status === 'delivered') {
      return {
        label: 'مسلمة',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (order.order_status === 'returned') {
      return {
        label: 'مسترجعة',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    return {
      label: order.order_status || 'غير محدد',
      icon: Package,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Get return reason if available
  const getReturnReason = () => {
    if (order.order_status === 'returned' && order.order_details) {
      const match = order.order_details.match(/Return reason: (.+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const returnReason = getReturnReason();

  return (
    <Card className={`${statusInfo.borderColor} ${statusInfo.bgColor}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className={`p-2 ${statusInfo.bgColor} rounded-lg`}>
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${statusInfo.color}`}>
              طلب #{order.order_code || order.id.slice(0, 8)}
            </h3>
            <p className={`text-sm ${statusInfo.color}`}>تفاصيل العميل</p>
          </div>
          <Badge variant="secondary" className={`${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('customer.info')}
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
              {((order.customer_address && order.customer_address.trim() !== '' && order.customer_address !== "غير محدد") ||
                (order.customer_city && order.customer_city.trim() !== '')) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <span className="font-semibold text-gray-700">{t('address.label')}</span>
                    <p className="text-gray-900">
                      {order.customer_address && order.customer_address !== "غير محدد" ? order.customer_address : ""}
                    </p>
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
              
              {order.store_response_at && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <span className="font-semibold text-gray-700">
                      {order.order_status === 'delivered' ? t('delivery.date.label') : t('return.date.label')}
                    </span>
                    <p className="text-gray-900">
                      {safeFormatDate(order.store_response_at)}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-gray-500 mt-1" />
                <div>
                  <span className="font-semibold text-gray-700">{t('total.amount.label')}</span>
                  <p className={`font-bold text-lg ${statusInfo.color}`}>
                    {order.subtotal ? formatCurrency(order.subtotal) :
                     order.total_amount ? formatCurrency(order.total_amount) : "غير محدد"}
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

          {/* Return Reason */}
          {returnReason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-red-700">🔄 {t('return.reason')}:</span>
                <span className="text-red-900">{returnReason}</span>
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" />
            {t('products')}
          </h4>
          {(() => {
            // استخدام نفس منطق معالجة المنتجات من StoreDashboard
            let itemsToShow = [];

            // أولاً: order_items
            if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
              itemsToShow = order.order_items.map((item, index) => ({
                id: item.id || `order-item-${index}`,
                product_name: getProductNameWithPriority(item),
                name: getProductNameWithPriority(item),
                quantity: item.quantity || 1,
                price: item.price || 0,
                discounted_price: item.discounted_price || 0,
                product_id: item.product_id
              }));
            }
            // ثانياً: items كبديل
            else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
              itemsToShow = order.items.map((item, index) => ({
                id: item.product_id || `item-${index}`,
                product_name: getProductNameWithPriority(item),
                name: getProductNameWithPriority(item),
                quantity: item.quantity || 1,
                price: item.price || 0,
                discounted_price: 0,
                product_id: item.product_id
              }));
            }
            // ثالثاً: منتج افتراضي
            else {
              const orderRef = order.order_code || order.id.slice(0, 8);
              itemsToShow = [{
                id: `default-${order.id}`,
                product_name: `منتج طلب ${orderRef}`,
                name: `منتج طلب ${orderRef}`,
                quantity: 1,
                price: order.total_amount || order.subtotal || 0,
                discounted_price: order.total_amount || order.subtotal || 0
              }];
            }

            // عرض المنتجات بنفس طريقة StoreDashboard
            return (
              <div className="space-y-3">
                {itemsToShow.map((item, index) => (
                  <div key={item.id || index} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      {/* Product info on the right */}
                      <div className="flex-1 text-right">
                        {/* Product name at the top right */}
                        <ArabicText className="font-bold text-blue-800 text-lg mb-2">{item.product_name}</ArabicText>

                        {/* Quantity below product name */}
                        <div className="mb-1">
                          <span className="text-sm text-gray-700">{t('quantity.label')} </span>
                          <span className="font-semibold text-blue-800">{item.quantity}</span>
                        </div>

                        {/* Store name below quantity */}
                        <div className="flex items-center justify-end gap-1 text-sm text-purple-600">
                          <span>{item.main_store_name || storeName || 'المتجر'}</span>
                          <Package className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerInfoDisplay;
