import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, X, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface RejectionReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orderCode?: string;
  productName?: string;
  isProcessing?: boolean;
}

export const RejectionReasonDialog: React.FC<RejectionReasonDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderCode,
  productName,
  isProcessing = false
}) => {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const { t, dir } = useLanguage();

  // أسباب رفض شائعة
  const commonReasons = [
    { key: 'rejection.reason.out.of.stock', label: t('rejection.reason.out.of.stock') },
    { key: 'rejection.reason.damaged', label: t('rejection.reason.damaged') },
    { key: 'rejection.reason.price.incorrect', label: t('rejection.reason.price.incorrect') },
    { key: 'rejection.reason.info.inaccurate', label: t('rejection.reason.info.inaccurate') },
    { key: 'rejection.reason.supply.issue', label: t('rejection.reason.supply.issue') },
    { key: 'rejection.reason.discontinued', label: t('rejection.reason.discontinued') },
    { key: 'rejection.reason.insufficient.quantity', label: t('rejection.reason.insufficient.quantity') },
    { key: 'rejection.reason.other', label: t('rejection.reason.other') }
  ];

  const handleReasonSelect = (selectedReason: string) => {
    setSelectedReason(selectedReason);
    if (selectedReason !== t('rejection.reason.other')) {
      setReason(selectedReason);
    } else {
      setReason('');
    }
  };

  const handleConfirm = async () => {
    const finalReason = reason.trim();
    if (finalReason) {
      try {
        await onConfirm(finalReason);
        // إعادة تعيين القيم
        setReason('');
        setSelectedReason('');
      } catch (error) {
        console.error('Error in rejection confirmation:', error);
      }
    }
  };

  const handleClose = () => {
    setReason('');
    setSelectedReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            {t('reject.order')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* معلومات الطلب */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="font-semibold text-red-800 mb-2">{t('order.details')}:</h4>
            <div className="text-sm text-red-700 space-y-1">
              <div><span className="font-medium">{t('order.number')}:</span> #{orderCode}</div>
              {productName && (
                <div><span className="font-medium">{t('product')}:</span> {productName}</div>
              )}
            </div>
          </div>

          {/* الأسباب الشائعة */}
          <div>
            <Label className="text-base font-semibold">{t('choose.rejection.reason')}:</Label>
            <div className="mt-2 space-y-2">
              {commonReasons.map((commonReason, index) => (
                <label
                  key={index}
                  className="flex items-center space-x-2 space-x-reverse cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="rejection_reason"
                    value={commonReason.label}
                    checked={selectedReason === commonReason.label}
                    onChange={(e) => handleReasonSelect(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">{commonReason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* مربع النص للسبب المخصص */}
          {(selectedReason === t('rejection.reason.other') || selectedReason === '') && (
            <div>
              <Label htmlFor="custom_reason">
                {selectedReason === t('rejection.reason.other') ? t('explain.reason') + ':' : t('write.custom.reason') + ':'}
              </Label>
              <Textarea
                id="custom_reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('write.rejection.reason.placeholder')}
                className="mt-1 min-h-[80px]"
                disabled={isProcessing}
              />
            </div>
          )}

          {/* رسالة تحذيرية */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                {t('rejection.warning')}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isProcessing ? t('rejecting') : t('confirm.rejection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectionReasonDialog;
