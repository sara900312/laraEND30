import React, { useState } from 'react';
import { X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { ArabicText } from '@/components/ui/arabic-text';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RejectOrderButtonProps {
  orderId: string;
  orderStatus?: string;
  onRejectComplete?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const RejectOrderButton: React.FC<RejectOrderButtonProps> = ({
  orderId,
  orderStatus,
  onRejectComplete,
  disabled = false,
  size = 'default',
  variant = 'destructive'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  // إظهار الزر فقط للطلبات المعلقة
  const shouldShowButton = () => {
    return orderStatus === 'pending';
  };

  if (!shouldShowButton()) {
    return null;
  }

  const handleRejectOrder = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "يرجى كتابة سبب الرفض",
        description: "يجب إدخال سبب لرفض الطلب",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      console.log('❌ بدء عملية رفض الطلب:', {
        orderId: orderId,
        orderIdType: typeof orderId,
        rejectionReason: rejectionReason
      });

      // تحديث حالة الطلب إلى مرفوض
      const { data: updateData, error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'rejected',
          customer_notes: `[مرفوض من المدير] ${rejectionReason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select();

      console.log('نتيجة تحديث الطلب:', { data: updateData, error: updateError });

      if (updateError) {
        console.error('خطأ في تحديث الطلب - التفاصيل الكاملة:', {
          error: updateError,
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      console.log('✅ تم رفض الطلب بنجاح');

      toast({
        title: "تم رفض الطلب",
        description: "تم رفض الطلب وحفظ سبب الرفض بنجاح.",
        variant: "default",
      });

      setOpen(false);
      setRejectionReason('');
      
      if (onRejectComplete) {
        onRejectComplete();
      }
    } catch (error) {
      console.error('❌ خطأ في رفض الطلب - التفاصيل الكاملة:', {
        error: error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        orderId: orderId
      });

      const errorMessage = error?.message || error?.details || 'خطأ غير معروف';

      toast({
        title: "خ��أ في رفض الطلب",
        description: `حدث خطأ: ${errorMessage}. يرجى المحاولة مرة أخرى.`,
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
          <X className="w-4 h-4" />
          <ArabicText>رفض الطلب</ArabicText>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            <ArabicText>رفض الطلب المعلق</ArabicText>
          </DialogTitle>
          <DialogDescription>
            <ArabicText>
              هل أنت متأكد من رفض هذا الطلب المعلق؟ سيتم تغيير حالة الطلب إلى "مرفوض" ولن يكون متاحاً للتعيين لأي متجر.
            </ArabicText>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              <ArabicText>سبب رفض الطلب</ArabicText>
            </label>
            <Textarea
              placeholder="يرجى كتابة سبب رفض الطلب..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="text-red-600 text-sm">⚠️</div>
              <div className="text-sm text-red-700">
                <ArabicText>
                  تنبيه: رفض الطلب سيؤدي إلى تغيير حالته إلى "مرفوض" نهائياً ولن يكون قابلاً للتعيين لأي متجر.
                </ArabicText>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setRejectionReason('');
            }}
            disabled={isLoading}
          >
            <ArabicText>إلغاء</ArabicText>
          </Button>
          <Button 
            onClick={handleRejectOrder}
            disabled={isLoading || !rejectionReason.trim()}
            variant="destructive"
          >
            {isLoading ? (
              <ArabicText>جاري الرفض...</ArabicText>
            ) : (
              <ArabicText>تأكيد الرفض</ArabicText>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
