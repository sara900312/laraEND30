import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { updateOrderStoreResponse } from '@/services/orderStatusService';
import { useLanguage } from '@/contexts/LanguageContext';
import DivisionCompletionStatus from '@/components/orders/DivisionCompletionStatus';

interface Order {
  id: string;
  order_code?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  total_amount: number;
  store_response_status?: string;
  assigned_store_id?: string;
  order_items?: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

interface StoreOrderResponseProps {
  order: Order;
}

export default function StoreOrderResponse({ order }: StoreOrderResponseProps) {
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleAccept = async () => {
    setLoading(true);
    setError('');
    
    try {
      // التحقق من وجود معرف المتجر أولاً
      if (!order.assigned_store_id) {
        throw new Error('معرف المتجر المعين غير موجود');
      }

      console.log('🔄 Updating order store response:', {
        orderId: order.id,
        storeId: order.assigned_store_id,
        status: 'accepted'
      });

      // استخدام خدمة تحديث حالة الطلب للتأكد من التحديث الصحيح
      const result = await updateOrderStoreResponse({
        orderId: order.id,
        storeId: order.assigned_store_id,
        status: 'accepted',
        rejectionReason: undefined
      });

      if (!result.success) {
        setError('فشل في تسجيل الموافقة');
        toast({
          title: "خطأ",
          description: result.error || "فشل في تسجيل الموافقة",
          variant: "destructive",
        });
      } else {
        setSuccess('✅ تم تسجيل موافقة المتجر بنجاح - الطلب متوفر الآن');
        toast({
          title: "تم التأكيد",
          description: "✅ تم تسجيل موافقة المتجر بنجاح - سيظهر في لوحة المدير كـ متوفر",
        });
      }
    } catch (err) {
      setError('فشل في تسجيل الموافقة');
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الموافقة",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('يرجى إدخال سبب الرفض');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // التحقق من وجود معرف المتجر أولاً
      if (!order.assigned_store_id) {
        throw new Error('معرف المتجر المعين غير موجود');
      }

      console.log('🔄 Updating order store response (reject):', {
        orderId: order.id,
        storeId: order.assigned_store_id,
        status: 'rejected',
        rejectionReason
      });

      // استخدام خدمة تحديث حالة الطلب للتأكد من التحديث الصحيح
      const result = await updateOrderStoreResponse({
        orderId: order.id,
        storeId: order.assigned_store_id,
        status: 'rejected',
        rejectionReason: rejectionReason
      });

      if (!result.success) {
        setError('فشل في تسجيل الرفض');
        toast({
          title: "خطأ",
          description: result.error || "فشل في تسجيل الرفض",
          variant: "destructive",
        });
      } else {
        setSuccess('❌ تم رفض الطلب وتسجيل السبب - سيتم إعادة تعيينه لمتجر آخر');
        toast({
          title: "تم الرفض",
          description: "❌ تم رفض الطلب وتسجيل السبب - سيظهر في لوحة المدير",
          variant: "destructive",
        });
        setShowRejectionForm(false);
        setRejectionReason('');
      }
    } catch (err) {
      setError('فشل في تسجيل الرفض');
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الرفض",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleRejectClick = () => {
    setShowRejectionForm(true);
    setError('');
    setSuccess('');
  };

  const getProductName = () => {
    if (order.order_items && order.order_items.length > 0) {
      return order.order_items.map(item => item.product_name).join(', ');
    }
    return `منتج الطلب ${order.order_code || order.id.slice(0, 8)}`;
  };

  // التحقق من كون الطلب مقسماً
  const isDividedOrder = (order: any) => {
    const orderDetails = order.order_details || '';
    return orderDetails.includes('تم تقسيمه من الطلب الأصلي');
  };

  // استخراج معرف الطلب الأصلي
  const getOriginalOrderId = (order: any) => {
    const orderDetails = order.order_details || '';
    const match = orderDetails.match(/تم تقسيمه من الطلب الأصلي (\S+)/);
    return match ? match[1] : null;
  };

  return (
    <div className="max-w-xl mx-auto mt-6 p-4 bg-white rounded-2xl shadow space-y-4 text-right" dir="rtl">
      <h2 className="text-xl font-bold mb-2">تفاصيل الطلب</h2>
      
      <div className="space-y-2">
        <p><strong>رقم الطلب:</strong> {order.order_code || order.id.slice(0, 8)}</p>
        <p><strong>الاسم:</strong> {order.customer_name}</p>
        <p><strong>الهاتف:</strong> {order.customer_phone}</p>
        <p><strong>المنتج:</strong> {getProductName()}</p>
        <p><strong>المبلغ:</strong> {formatCurrency(order.total_amount)}</p>
        <p><strong>الحالة الحالية:</strong> {
          order.store_response_status === 'accepted' ? 'تم القبول' :
          order.store_response_status === 'available' ? 'تم القبول - متوفر' :
          order.store_response_status === 'rejected' ? 'تم الرفض' :
          order.store_response_status === 'unavailable' ? 'تم الرفض - غير متوفر' :
          'لم يتم الرد'
        }</p>

        {/* Debug info for troubleshooting */}
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-gray-500">
            <strong>Debug:</strong> assigned_store_id: {order.assigned_store_id || 'null'}
          </p>
        )}
      </div>

      {!order.store_response_status && (
        <>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              onClick={handleAccept}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl"
            >
              ✅ {t('available')}
            </Button>
            <Button
              onClick={handleRejectClick}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl"
            >
              ❌ {t('unavailable')}
            </Button>
          </div>

          {showRejectionForm && (
            <div className="border-t pt-4 mt-4">
              <div>
                <Label className="block text-sm mt-2 font-medium text-gray-700">
                  سبب الرفض (مطلوب):
                </Label>
                <Textarea
                  className="w-full border rounded-xl mt-1 p-2"
                  rows={3}
                  placeholder="مثلاً: المنتج غير متوفر حالياً"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 justify-end mt-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectionForm(false);
                    setRejectionReason('');
                    setError('');
                  }}
                  disabled={loading}
                  className="py-2 px-4 rounded-xl"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={loading || !rejectionReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl"
                >
                  {loading ? 'جاري الرفض...' : 'تأكيد الرفض'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <div className="text-red-600 font-bold bg-red-50 p-3 rounded-lg">{error}</div>}
      {success && <div className="text-green-600 font-bold bg-green-50 p-3 rounded-lg">{success}</div>}

      {/* عرض حالة الاكتمال للطلبات المقسمة فقط */}
      {isDividedOrder(order) && getOriginalOrderId(order) && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">حالة اكتمال الطلب ا��مقسم:</h3>
          <DivisionCompletionStatus
            originalOrderId={getOriginalOrderId(order)!}
            autoRefresh={true}
            showDetails={false}
          />
          <p className="text-xs text-gray-500 mt-2">
            يتم تحديث هذه الحالة تلقائياً عند استجابة جميع المتاجر المعينة للطلب المقسم
          </p>
        </div>
      )}
    </div>
  );
}
