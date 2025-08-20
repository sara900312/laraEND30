import React from 'react';
import { OrderItem } from '@/types/order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArabicText } from '@/components/ui/arabic-text';
import { formatPrice, calculateFinalPrice } from '@/utils/currency';
import { calculateOrderTotal, calculateItemTotal } from '@/utils/orderCalculations';
import { Package, ShoppingCart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrderItemsProps {
  items?: OrderItem[] | Array<{
    name?: string;
    quantity?: number;
    merged_quantity?: number;
    price?: number;
    total_price?: number;
    discounted_price?: number;
    main_store?: string;
    main_store_name?: string;
    product_id?: number;
  }>;
  showPriceInBothCurrencies?: boolean;
  compact?: boolean;
  hidePrices?: boolean; // إخفاء الأسعار في واجهة المتاجر
  assignedStoreName?: string; // اسم المتجر المعين للطلب
}

export const OrderItems: React.FC<OrderItemsProps> = ({
  items,
  showPriceInBothCurrencies = true,
  compact = false,
  hidePrices = false,
  assignedStoreName
}) => {
  const { t } = useLanguage();
  if (!items || items.length === 0) {
    return null;
  }

  // تشخيص البيا��ات في OrderItems
  console.log('📦 OrderItems - معالجة البيانات:', {
    items_count: items?.length || 0,
    items_summary: items?.map((item, index) => ({
      index: index,
      id: item.id,
      product_name: item.product_name,
      name: item.name
    }))
  });

  // Handle both OrderItem[] and the legacy format
  const normalizedItems = items.map((item, index) => {
    let productName = 'منتج غير محدد'; // قيمة افتراضية

    // تحسين استخراج اسم المنتج مع أولوية للـ product_name
    if ('product_name' in item && item.product_name &&
        typeof item.product_name === 'string' &&
        item.product_name.trim() !== '' &&
        item.product_name !== 'منتج غير محدد') {
      productName = item.product_name;
    } else if ('name' in item && item.name &&
               typeof item.name === 'string' &&
               item.name.trim() !== '' &&
               item.name !== 'منتج غير محدد') {
      productName = item.name;
    } else if ('products' in item && item.products && item.products.name &&
               typeof item.products.name === 'string' &&
               item.products.name.trim() !== '' &&
               item.products.name !== 'منتج غير محدد') {
      // استخدام اسم المنتج من جدول products المرتبط
      productName = item.products.name;
    } else {
      // في حالة عدم توفر أي اسم، استخدم رقم بسيط
      productName = `منتج ${index + 1}`;
    }

    console.log('🔍 OrderItems - Processing item:', {
      index,
      original_product_name: item.product_name,
      original_name: item.name,
      final_product_name: productName
    });

    // Handle merged products - use merged_quantity if available, otherwise use quantity
    const displayQuantity = item.merged_quantity || item.quantity || 1;
    const itemPrice = item.total_price || item.price || 205000;

    return {
      id: 'id' in item ? item.id : `item-${Math.random()}`,
      product_name: productName,
      quantity: displayQuantity,
      price: itemPrice,
      total_price: item.total_price,
      product_id: item.product_id,
      discounted_price: item.discounted_price || 0,
      is_merged: !!item.merged_quantity  // Indicate if this is a merged product
    };
  });

  // حساب المجموع مع تطبيق ال��صم
  const total = normalizedItems.reduce((sum, item) => {
    // For merged items, use total_price directly if available
    if (item.total_price && item.is_merged) {
      return sum + item.total_price;
    }

    const originalPrice = item.price || 0;
    const discountedPrice = item.discounted_price || 0;
    const priceInfo = discountedPrice > 0 && discountedPrice < originalPrice
      ? {
          finalPrice: discountedPrice,
          hasDiscount: true,
          discountAmount: originalPrice - discountedPrice,
          savings: originalPrice - discountedPrice
        }
      : {
          finalPrice: originalPrice,
          hasDiscount: false,
          discountAmount: 0,
          savings: 0
        };
    return sum + (priceInfo.finalPrice * item.quantity);
  }, 0);

  const totalFormatted = formatPrice(total);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShoppingCart className="w-4 h-4" />
          <ArabicText>المنتجات ({normalizedItems.length})</ArabicText>
        </div>
        {normalizedItems.map((item, index) => (
          <div key={item.id || index} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              {/* Price on the far left - hide if hidePrices is true */}
              {!hidePrices && (
                <div className="text-left order-last ml-4">
                  {(() => {
                    const originalPrice = item.price || 0;
                    const discountedPrice = item.discounted_price || 0;
                    const priceInfo = discountedPrice > 0 && discountedPrice < originalPrice
                      ? {
                          finalPrice: discountedPrice,
                          hasDiscount: true,
                          discountAmount: originalPrice - discountedPrice,
                          savings: originalPrice - discountedPrice
                        }
                      : {
                          finalPrice: originalPrice,
                          hasDiscount: false,
                          discountAmount: 0,
                          savings: 0
                        };

                    return priceInfo.hasDiscount ? (
                      <div className="space-y-1">
                        <div className="font-bold text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                          <span className="font-mono text-base">
                            د.ع {priceInfo.finalPrice.toLocaleString('ar-EG')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 line-through text-center">
                          د.ع {originalPrice.toLocaleString('ar-EG')}
                        </div>
                      </div>
                    ) : (
                      <div className="font-bold text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                        <span className="font-mono text-base">
                          د.ع {originalPrice.toLocaleString('ar-EG')}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Product info on the right */}
              <div className="flex-1 text-right">
                {/* Product name at the top right */}
                <ArabicText className="font-bold text-blue-800 text-lg mb-2">{item.product_name}</ArabicText>

                {/* Quantity below product name */}
                <div className="mb-1">
                  <span className="text-sm text-gray-700">الكمية: </span>
                  <span className="font-semibold text-blue-800">{item.quantity}</span>
                </div>

                {/* Store name below quantity */}
                <div className="flex items-center justify-end gap-1 text-sm text-purple-600">
                  <span>
                    {(() => {
                      // استخدام اسم المتجر المعين للطلب أولاً، ثم اسم المتجر من العنصر، ثم قيمة افتراضية
                      const storeName = assignedStoreName
                        || (item as any).main_store_name
                        || (item as any).main_store
                        || 'متجر غير محدد';
                      return `${storeName} المتجر`;
                    })()}
                  </span>
                  <Package className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
        {!hidePrices && (
          <div className="border-t pt-2">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-mono text-primary font-bold text-lg">
                  {totalFormatted}
                </span>
                <span className="font-bold text-lg text-green-800">
                  <ArabicText>{t('order.total.without.delivery')}</ArabicText>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          <ArabicText>{t('product.details')} ({normalizedItems.length})</ArabicText>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {normalizedItems.map((item, index) => (
          <div key={item.id || index} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-bold text-lg text-blue-800 mb-3">
                  <ArabicText>{item.product_name}</ArabicText>
                </h4>
                <div className="flex gap-3 flex-wrap">
                  <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0 rounded text-xs border dark:border-blue-700 w-fit h-5 flex items-center font-medium">
                    {t('quantity.label')} {item.quantity}
                    {item.is_merged && (
                      <span className="mr-1 text-orange-600" title="منتجات مدمجة">*</span>
                    )}
                  </div>
                  {item.is_merged && (
                    <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs border border-orange-200">
                      مدمج من منتجات متعددة
                    </div>
                  )}
                  {!hidePrices && (() => {
                    const originalPrice = item.price || 0;
                    const discountedPrice = item.discounted_price || 0;
                    const priceInfo = discountedPrice > 0 && discountedPrice < originalPrice
                      ? {
                          finalPrice: discountedPrice,
                          hasDiscount: true,
                          discountAmount: originalPrice - discountedPrice,
                          savings: originalPrice - discountedPrice
                        }
                      : {
                          finalPrice: originalPrice,
                          hasDiscount: false,
                          discountAmount: 0,
                          savings: 0
                        };

                    return priceInfo.hasDiscount ? (
                      <div className="space-y-1">
                        <div className="bg-red-50 px-3 py-1 rounded border border-red-200">
                          <span className="font-mono text-red-700 font-semibold">
                            {priceInfo.finalPrice.toLocaleString('ar-EG')} د.ع
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 line-through">
                          السعر الأصلي: {originalPrice.toLocaleString('ar-EG')} د.ع
                        </div>
                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          وفرت: {priceInfo.savings.toLocaleString('ar-EG')} د.ع
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-50 px-3 py-1 rounded border border-green-200">
                        <span className="font-mono text-green-700 font-semibold">
                          {originalPrice.toLocaleString('ar-EG')} د.ع
                        </span>
                      </div>
                    );
                  })()}

                </div>
                {!hidePrices && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-semibold">المجموع: </span>
                    <span className="font-mono text-green-700">
                      {(() => {
                        const originalPrice = item.price || 0;
                        const discountedPrice = item.discounted_price || 0;
                        const priceInfo = discountedPrice > 0 && discountedPrice < originalPrice
                          ? {
                              finalPrice: discountedPrice,
                              hasDiscount: true,
                              discountAmount: originalPrice - discountedPrice,
                              savings: originalPrice - discountedPrice
                            }
                          : {
                              finalPrice: originalPrice,
                              hasDiscount: false,
                              discountAmount: 0,
                              savings: 0
                            };
                        return formatPrice(priceInfo.finalPrice * item.quantity);
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {!hidePrices && (
          <div className="border-t pt-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-lg text-green-800">
                    <ArabicText>{t('product.total')}:</ArabicText>
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-700 font-mono">
                    {totalFormatted}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
