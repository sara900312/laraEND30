import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReturnReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orderCode?: string;
}

export function ReturnReasonDialog({
  isOpen,
  onClose,
  onConfirm,
  orderCode,
}: ReturnReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>سبب إرجاع الطلب</DialogTitle>
          <DialogDescription>
            {orderCode ? `الطلب: ${orderCode}` : "يرجى كتابة سبب إرجاع هذا الطلب"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="return-reason">سبب الإرجاع *</Label>
            <Textarea
              id="return-reason"
              placeholder="مثال: العميل غير موجود، عنوان خاطئ، تلف في المنتج..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] text-right"
              dir="rtl"
              disabled={isSubmitting}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/500 حرف
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? "جاري الإرجاع..." : "تأكيد الإرجاع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
