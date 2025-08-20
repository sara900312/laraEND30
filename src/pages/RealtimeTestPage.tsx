import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function RealtimeTestPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  
  // Test order data
  const [testOrderData, setTestOrderData] = useState({
    customer_name: 'عميل تجريبي',
    customer_phone: '07701234567',
    customer_address: 'عنوان تجريبي، بغداد',
    customer_city: 'بغداد',
    total_amount: 50000,
    order_details: 'طلب تجريبي لاختبار التحديثات الفورية',
    main_store_name: 'متجر تجريبي'
  });

  const [testUpdateData, setTestUpdateData] = useState({
    orderId: '',
    orderStatus: 'assigned',
    storeResponseStatus: 'available'
  });

  useEffect(() => {
    // Setup realtime connection for testing
    console.log('🧪 Setting up Realtime test subscriptions...');
    
    const testChannel = supabase
      .channel('realtime-test-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📡 Realtime event received:', payload);
          
          const eventData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            event: payload.eventType,
            table: 'orders',
            data: payload.new || payload.old,
            payload: payload
          };
          
          setRealtimeEvents(prev => [eventData, ...prev.slice(0, 19)]); // Keep last 20 events
          
          toast({
            title: `📡 حدث Realtime`,
            description: `${payload.eventType} في جدول orders`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_order_responses'
        },
        (payload) => {
          console.log('📡 Store response event received:', payload);
          
          const eventData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            event: payload.eventType,
            table: 'store_order_responses',
            data: payload.new || payload.old,
            payload: payload
          };
          
          setRealtimeEvents(prev => [eventData, ...prev.slice(0, 19)]);
          
          toast({
            title: `📡 رد المتجر`,
            description: `${payload.eventType} في جدول store_order_responses`,
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Test channel status:', status);
        setConnectionStatus(status);
        
        if (status === 'SUBSCRIBED') {
          toast({
            title: '✅ متصل بـ Realtime',
            description: 'تم الاتصال بنجاح - جاهز لاستقبال التحديثات',
          });
        }
      });

    return () => {
      console.log('🧹 Cleaning up test channel...');
      supabase.removeChannel(testChannel);
    };
  }, [toast]);

  const createTestOrder = async () => {
    setIsLoading(true);
    try {
      console.log('🆕 Creating test order:', testOrderData);
      
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          ...testOrderData,
          order_code: `TEST-${Date.now()}`,
          order_status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Test order created:', data);
      
      setTestUpdateData(prev => ({
        ...prev,
        orderId: data.id
      }));

      toast({
        title: '✅ تم إنشاء طلب تجريبي',
        description: `الطلب ${data.order_code} - راقب التحديثات في القسم السفلي`,
      });

    } catch (error) {
      console.error('❌ Error creating test order:', error);
      toast({
        title: '❌ خطأ في إنشاء الطلب',
        description: error instanceof Error ? error.message : 'خطأ غير معروف',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTestOrder = async () => {
    if (!testUpdateData.orderId) {
      toast({
        title: '⚠️ خطأ',
        description: 'يرجى إنشاء طلب تجريبي أولاً',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Updating test order:', testUpdateData);
      
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: testUpdateData.orderStatus,
          store_response_status: testUpdateData.storeResponseStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', testUpdateData.orderId);

      if (error) {
        throw error;
      }

      toast({
        title: '✅ تم تحديث الطلب',
        description: 'راقب التحديثات في الوقت الفعلي أدناه',
      });

    } catch (error) {
      console.error('❌ Error updating test order:', error);
      toast({
        title: '❌ خطأ في التحديث',
        description: error instanceof Error ? error.message : 'خطأ غير معروف',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTestOrder = async () => {
    if (!testUpdateData.orderId) {
      toast({
        title: '⚠️ خطأ',
        description: 'لا يوجد طلب للحذف',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('🗑️ Deleting test order:', testUpdateData.orderId);
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', testUpdateData.orderId);

      if (error) {
        throw error;
      }

      setTestUpdateData(prev => ({ ...prev, orderId: '' }));

      toast({
        title: '✅ تم حذف الطلب',
        description: 'راقب أحداث الحذف في القسم السفلي',
      });

    } catch (error) {
      console.error('❌ Error deleting test order:', error);
      toast({
        title: '❌ خطأ في الحذف',
        description: error instanceof Error ? error.message : 'خطأ غير معروف',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearEvents = () => {
    setRealtimeEvents([]);
    toast({
      title: '🧹 تم مسح الأحداث',
      description: 'تم مسح سجل الأحداث',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">اختبار التحديثات الفورية (Realtime)</h1>
        <Badge variant={connectionStatus === 'SUBSCRIBED' ? 'default' : 'destructive'}>
          {connectionStatus === 'SUBSCRIBED' ? '🟢 متصل' : '🔴 غير متصل'}
        </Badge>
      </div>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test">اختبار العمليات</TabsTrigger>
          <TabsTrigger value="events">سجل الأحداث ({realtimeEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>إنشاء طلب تجريبي</CardTitle>
                <CardDescription>
                  أنشئ طلب تجريبي لمراقبة التحديثات الفورية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">اسم العميل</Label>
                  <Input
                    id="customer_name"
                    value={testOrderData.customer_name}
                    onChange={(e) => setTestOrderData(prev => ({ ...prev, customer_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_phone">رقم الهاتف</Label>
                  <Input
                    id="customer_phone"
                    value={testOrderData.customer_phone}
                    onChange={(e) => setTestOrderData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_amount">المبلغ الإجمالي</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    value={testOrderData.total_amount}
                    onChange={(e) => setTestOrderData(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                  />
                </div>

                <Button 
                  onClick={createTestOrder}
                  disabled={isLoading}
                  className="w-full"
                >
                  إنشاء طلب تجريبي
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تحديث الطلب</CardTitle>
                <CardDescription>
                  حدث الطلب التجريبي لمراقبة التحديثات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="order_status">حالة الطلب</Label>
                  <select
                    id="order_status"
                    className="w-full p-2 border rounded"
                    value={testUpdateData.orderStatus}
                    onChange={(e) => setTestUpdateData(prev => ({ ...prev, orderStatus: e.target.value }))}
                  >
                    <option value="pending">معلقة</option>
                    <option value="assigned">معينة</option>
                    <option value="delivered">مسلمة</option>
                    <option value="returned">مرجعة</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_response">رد المتجر</Label>
                  <select
                    id="store_response"
                    className="w-full p-2 border rounded"
                    value={testUpdateData.storeResponseStatus}
                    onChange={(e) => setTestUpdateData(prev => ({ ...prev, storeResponseStatus: e.target.value }))}
                  >
                    <option value="">لا يوجد رد</option>
                    <option value="available">متوفر</option>
                    <option value="unavailable">غير متوفر</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={updateTestOrder}
                    disabled={isLoading || !testUpdateData.orderId}
                    className="flex-1"
                  >
                    تحديث الطلب
                  </Button>
                  
                  <Button 
                    onClick={deleteTestOrder}
                    disabled={isLoading || !testUpdateData.orderId}
                    variant="destructive"
                    className="flex-1"
                  >
                    حذف الطلب
                  </Button>
                </div>

                {testUpdateData.orderId && (
                  <div className="text-sm text-muted-foreground">
                    الطلب الحالي: {testUpdateData.orderId.slice(0, 8)}...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>سجل أحداث Realtime</CardTitle>
                  <CardDescription>
                    الأحداث المستقبلة في الوقت الفعلي من قاعدة البيانات
                  </CardDescription>
                </div>
                <Button onClick={clearEvents} variant="outline" size="sm">
                  مسح السجل
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {realtimeEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    لا توجد أحداث حتى الآن...
                    <br />
                    أنشئ أو حدث طلب لرؤية الأحداث هنا
                  </div>
                ) : (
                  <div className="space-y-4">
                    {realtimeEvents.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4 bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={
                            event.event === 'INSERT' ? 'default' :
                            event.event === 'UPDATE' ? 'secondary' :
                            event.event === 'DELETE' ? 'destructive' : 'outline'
                          }>
                            {event.event}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString('ar-SA')}
                          </span>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          <div><strong>الجدول:</strong> {event.table}</div>
                          {event.data?.customer_name && (
                            <div><strong>العميل:</strong> {event.data.customer_name}</div>
                          )}
                          {event.data?.order_code && (
                            <div><strong>كود الطلب:</strong> {event.data.order_code}</div>
                          )}
                          {event.data?.order_status && (
                            <div><strong>حالة الطلب:</strong> {event.data.order_status}</div>
                          )}
                          {event.data?.store_response_status && (
                            <div><strong>رد المتجر:</strong> {event.data.store_response_status}</div>
                          )}
                        </div>
                        
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            عرض البيانات الكاملة
                          </summary>
                          <pre className="text-xs bg-background p-2 rounded mt-2 overflow-auto">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
