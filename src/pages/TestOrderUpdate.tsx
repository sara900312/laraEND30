import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TestOrderUpdate = () => {
  const [orderId, setOrderId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testUpdateToReturned = async () => {
    if (!orderId.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال معرف الطلب",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 اختبار تحديث الطلب:', {
        orderId,
        returnReason,
        timestamp: new Date().toISOString()
      });

      // أولاً، دعنا نجلب الطلب للتأكد من وجوده
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('❌ خطأ في جلب الطلب:', fetchError);
        throw fetchError;
      }

      console.log('✅ تم العثور على الطلب:', orderData);

      // الآن دعنا نحدث الطلب
      const updateData = {
        order_status: 'returned',
        status: 'returned',
        updated_at: new Date().toISOString(),
        order_details: returnReason ? `Return reason: ${returnReason}` : orderData.order_details
      };

      console.log('📤 بيانات التحديث:', updateData);

      const { data: updateResult, error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select();

      if (updateError) {
        console.error('❌ خطأ في التحديث:', {
          error: updateError,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        throw updateError;
      }

      console.log('✅ تم التحديث بنجاح:', updateResult);

      toast({
        title: "نجح التحديث",
        description: "تم تحديث الطلب إلى حالة مرتجعة بنجاح"
      });

    } catch (error: any) {
      console.error('❌ خطأ عام:', {
        error,
        message: error?.message || error,
        stack: error?.stack
      });

      toast({
        title: "خطأ في التحديث",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      console.log('🔍 جلب جميع الطلبات...');
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(5);

      if (error) {
        console.error('❌ خطأ في جلب الطلبات:', error);
        throw error;
      }

      console.log('📋 الطلبات الموجودة:', data);
      
      toast({
        title: "تم جلب الطلبات",
        description: `تم العثور على ${data.length} طلبات`
      });

    } catch (error: any) {
      console.error('❌ خطأ في جلب الطلبات:', error);
      toast({
        title: "خطأ",
        description: error?.message || "حدث خطأ في جلب الطلبات",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>اختبار تحديث الطلبات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <Button onClick={fetchAllOrders} variant="outline" className="w-full">
              عرض جميع الطلبات في الكونسول
            </Button>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                معرف الطلب (ID)
              </label>
              <Input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="أدخل معرف الطلب"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                سبب الإرجاع (اختياري)
              </label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="أدخل سبب إرجاع الطلب"
                rows={3}
              />
            </div>

            <Button 
              onClick={testUpdateToReturned}
              disabled={loading}
              className="w-full"
            >
              {loading ? "جاري التحديث..." : "تحديث الطلب إلى مرتجع"}
            </Button>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">تعليمات:</h3>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. اضغط على "عرض جميع الطلبات" أولاً</li>
                <li>2. افتح وحدة التحكم (F12) لرؤية بيانات الطلبات</li>
                <li>3. انسخ معرف طلب موجود</li>
                <li>4. أدخل المعرف في الحقل أعلاه</li>
                <li>5. اضغط على "تحديث الطلب إلى مرتجع"</li>
                <li>6. راقب الأخطاء في الكونسول</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestOrderUpdate;
