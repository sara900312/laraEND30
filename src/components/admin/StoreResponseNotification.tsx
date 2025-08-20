import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface StoreResponse {
  id: string;
  order_code: string;
  store_response_status: string;
  assigned_store_name: string;
  store_response_at: string;
}

export function StoreResponseNotification() {
  const { t } = useLanguage();
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // استمع للتحديثات على جدول orders
    const subscription = supabase
      .channel('store_responses')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'store_response_status=not.is.null'
        },
        (payload) => {
          const newOrder = payload.new as StoreResponse;
          
          // تجنب إرسال إشعارات مكررة
          if (lastNotifiedId === newOrder.id) return;
          
          // التحقق من أن الرد جديد (خلال آخر دقيقة)
          const responseTime = new Date(newOrder.store_response_at).getTime();
          const oneMinuteAgo = Date.now() - (60 * 1000);
          
          if (responseTime > oneMinuteAgo) {
            const isAvailable = newOrder.store_response_status === 'available' || 
                               newOrder.store_response_status === 'accepted';
            
            toast({
              title: isAvailable ? "رد إيجابي من المتجر ✅" : "رد سلبي من المتجر ❌",
              description: (
                <div className="space-y-1">
                  <div className="font-medium">طلب: {newOrder.order_code}</div>
                  <div>المتجر: {newOrder.assigned_store_name}</div>
                  <div className={isAvailable ? "text-green-600" : "text-red-600"}>
                    الحالة: {isAvailable ? t('available') : t('unavailable')}
                  </div>
                </div>
              ),
              duration: 5000,
            });
            
            setLastNotifiedId(newOrder.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [lastNotifiedId, toast]);

  return null; // هذا المكون لا يعرض شيء، فقط يرسل إشعارات
}

export default StoreResponseNotification;
