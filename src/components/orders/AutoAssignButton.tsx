/**
 * Auto Assign Button Component
 * زر لتحويل الطلب تلقائياً إلى المتجر المناسب
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Store, AlertCircle } from 'lucide-react';
import { ArabicText } from '@/components/ui/arabic-text';

interface AutoAssignButtonProps {
  order: any;
  stores: any[];
  onAutoAssign: (order: any) => void;
  isAssigning: boolean;
  disabled?: boolean;
}

export const AutoAssignButton: React.FC<AutoAssignButtonProps> = ({
  order,
  stores,
  onAutoAssign,
  isAssigning,
  disabled = false
}) => {
  // البحث عن المتجر المطابق
  const matchingStore = stores.find(store => 
    store.name.toLowerCase().trim() === order.main_store_name?.toLowerCase().trim()
  );

  // إذا لم يتم العثور على متجر مطابق
  if (!matchingStore) {
    return (
      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
        <AlertCircle className="w-4 h-4 text-yellow-600" />
        <span className="text-xs text-yellow-700">
          <ArabicText>لا يوجد متجر مطابق لـ "{order.main_store_name}"</ArabicText>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
      {/* عرض معلومات التحويل */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-green-800">
            <ArabicText>التحويل المقترح:</ArabicText>
          </span>
        </div>

        <div className="flex items-center justify-between p-2 bg-white border border-green-200 rounded">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              <ArabicText>من:</ArabicText>
            </span>
            <Badge variant="outline" className="text-xs">
              {order.main_store_name}
            </Badge>
          </div>
          <span className="text-green-600">→</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              <ArabicText>إلى:</ArabicText>
            </span>
            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
              {matchingStore.name}
            </Badge>
          </div>
        </div>
      </div>

      {/* زر التحويل التلقائي */}
      <Button
        onClick={() => onAutoAssign(order)}
        disabled={disabled || isAssigning}
        className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
        size="sm"
      >
        {isAssigning ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            <ArabicText>جاري التحويل...</ArabicText>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <ArabicText>تحويل تلقائي للمتجر</ArabicText>
          </>
        )}
      </Button>

      <p className="text-xs text-green-600 text-center">
        <ArabicText>سيتم تحويل الطلب تلقائياً بناءً على اسم المتجر الرئيسي</ArabicText>
      </p>
    </div>
  );
};

export default AutoAssignButton;
