import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArabicText } from '@/components/ui/arabic-text';
import { useToast } from '@/hooks/use-toast';

interface DeleteOrderButtonProps {
  orderId: string;
  orderStatus?: string;
  onDeleteComplete?: (orderId: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const DeleteOrderButton: React.FC<DeleteOrderButtonProps> = ({
  orderId,
  orderStatus,
  onDeleteComplete,
  disabled = false,
  size = 'default',
  variant = 'destructive'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // إظهار الزر فقط للطلبات المعلقة
  const shouldShowButton = () => {
    return orderStatus === 'pending';
  };

  if (!shouldShowButton()) {
    return null;
  }

  const handleDeleteOrder = async () => {
    try {
      setIsLoading(true);

      console.log('🗑️ بدء عملية حذف الطلب من الواجهة الأمامية:', orderId);

      // إشعار الصفحة الأم بالحذف فوراً
      if (onDeleteComplete) {
        onDeleteComplete(orderId);
      }

      console.log('✅ تم حذف الطلب من الواجهة الأمامية بنجاح');

      toast({
        title: "تم حذف الطلب",
        description: "تم حذف الطلب من قائمة الطلبات المعروضة.",
        variant: "default",
      });

      setOpen(false);

    } catch (error) {
      console.error('❌ خطأ في حذف الطلب:', error);

      toast({
        title: "خطأ في حذف الطلب",
        description: "حدث خطأ أثناء محاولة حذف الطلب. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isLoading}
          className="flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <ArabicText>حذف الطلب</ArabicText>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <ArabicText>حذف الطلب المعلق</ArabicText>
          </DialogTitle>
          <DialogDescription>
            <ArabicText>
              هل أنت متأكد من حذف هذا الطلب المعلق؟ سيتم إزالته من قائمة الطلبات المعروضة فقط (الحذف من الواجهة الأمامية فقط).
            </ArabicText>
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 my-4">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600 text-sm">⚠️</div>
            <div className="text-sm text-yellow-700">
              <ArabicText>
                ملاحظة: هذا الحذف من الواجهة الأمامية فقط ولن يؤثر على البيانات في قاعدة البيانات.
              </ArabicText>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            <ArabicText>إلغاء</ArabicText>
          </Button>
          <Button 
            onClick={handleDeleteOrder}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? (
              <ArabicText>جاري الحذف...</ArabicText>
            ) : (
              <ArabicText>تأكيد الحذف</ArabicText>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
