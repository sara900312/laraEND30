import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TransferOrderButtonProps {
  orderId: string;
  orderItems: any[]; // items array from order
  storeName: string; // the main store name
  onTransferComplete?: () => void;
  disabled?: boolean;
}

export const TransferOrderButton: React.FC<TransferOrderButtonProps> = ({
  orderId,
  orderItems,
  storeName,
  onTransferComplete,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTransferOrder = async () => {
    try {
      setIsLoading(true);

      // ال��حث عن المتجر في قاعدة البيانات
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('name', storeName)
        .single();

      if (storeError || !storeData) {
        throw new Error(`لم ��تم العثور على المتجر "${storeName}" في قاعدة البيانات`);
      }

      // تحديث الطلب لتعيينه للمتجر
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'assigned',
          assigned_store_id: storeData.id,
          assigned_store_name: storeData.name,
          main_store_name: storeName,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        throw new Error(`فشل في تحديث الطلب: ${updateError.message}`);
      }

      // تحديث أسماء المتاجر في المنتجات الفردية (order_items) إذا وجدت
      const { error: updateItemsError } = await supabase
        .from('order_items')
        .update({
          main_store_name: storeName,
          main_store: storeName,
          store_name: storeName
        })
        .eq('order_id', orderId);

      // لا نتوقف عند خطأ تحديث المنتجات الفردية لأنها ليست مطلوبة دائماً
      if (updateItemsError) {
        console.warn('تحذير: لم يتم تحديث أسماء المتاجر في المنتجات الفردية:', updateItemsError.message);
      }

      // تحديث الـ items array في الطلب نفسه إذا وجد
      if (orderItems && orderItems.length > 0) {
        const updatedItems = orderItems.map(item => ({
          ...item,
          main_store_name: storeName,
          main_store: storeName,
          store_name: storeName
        }));

        // تحديث الطلب مرة أخرى لتعديل الـ items array
        const { error: updateItemsArrayError } = await supabase
          .from('orders')
          .update({
            items: updatedItems
          })
          .eq('id', orderId);

        if (updateItemsArrayError) {
          console.warn('تحذير: لم يتم تحديث مصفوفة المنتجات في الطلب:', updateItemsArrayError.message);
        }
      }

      toast({
        title: "تم تحويل الطلب بنجاح",
        description: `تم تعيين الطلب لمتجر "${storeName}" وتحويل حالته إلى "معين"`,
      });

      setIsOpen(false);
      onTransferComplete?.();

    } catch (error) {
      console.error('❌ خطأ في تحويل الطلب:', error);

      let errorMessage = "حدث خطأ غير متوقع";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "خطأ في تحويل الطلب",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
        className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
      >
        <ArrowRight className="w-4 h-4" />
        تحويل إلى المتجر
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-green-600" />
              تحويل الطلب إلى المت��ر
            </DialogTitle>
            <DialogDescription className="text-right">
              سيتم تعيين هذا الطلب مباشرة لمتجر "{storeName}" وتحويل حالته إلى "معين".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <Store className="w-4 h-4" />
                تفاصيل التحويل:
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white rounded p-2">
                  <span className="font-medium text-green-700">المتجر المستهدف:</span>
                  <span className="text-sm text-gray-600">{storeName}</span>
                </div>
                <div className="flex justify-between items-center bg-white rounded p-2">
                  <span className="font-medium text-green-700">عدد المنتجات:</span>
                  <span className="text-sm text-gray-600">{orderItems?.length || 0} منتج</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>ملاحظة:</strong> بعد التحويل، سيظهر الطلب في تبويب "معينة" وسيكون جاهزاً للمعالجة من قبل المتجر المحدد.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleTransferOrder}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  جاري التحويل...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 ml-2" />
                  تأكيد التحويل
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
