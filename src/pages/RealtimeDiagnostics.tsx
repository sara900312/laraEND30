import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { realtimeDebugger } from '@/utils/realtimeDebugger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function RealtimeDiagnostics() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [connections, setConnections] = useState<any>({});
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);
  const [testProgress, setTestProgress] = useState(0);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTestProgress(0);
    
    try {
      // تشغيل تشخيص شامل
      const results = await realtimeDebugger.runDiagnostics();
      setDiagnostics(results);
      setTestProgress(100);
      
      if (results.realtimeConnection) {
        toast({
          title: "✅ التشخيص مكتمل",
          description: "جميع الاتصالات تعمل بشكل صحيح",
        });
      } else {
        toast({
          title: "⚠️ مشاكل في الاتصال",
          description: "هناك مشاكل تحتاج إصلاح",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast({
        title: "❌ خطأ في التشخيص",
        description: "حدث خطأ أثناء تشخيص النظام",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testLiveConnection = () => {
    console.log('🧪 Testing live Realtime connection...');
    
    const testChannel = supabase
      .channel('diagnostic-test-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📡 Test event received:', payload);
          
          const eventData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            event: payload.eventType,
            table: 'orders',
            data: payload.new || payload.old,
            payload: payload
          };
          
          setRealtimeEvents(prev => [eventData, ...prev.slice(0, 9)]); // Keep last 10
          
          toast({
            title: "📡 حدث مباشر!",
            description: `تم استقبال ${payload.eventType} في جدول orders`,
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Test channel status:', status);
        
        setConnections(prev => ({
          ...prev,
          liveTest: {
            status,
            timestamp: new Date().toISOString()
          }
        }));
        
        if (status === 'SUBSCRIBED') {
          toast({
            title: "✅ الاختبار المباشر نجح",
            description: "الاتصال يعمل بشكل صحيح",
          });
        } else if (status === 'CHANNEL_ERROR') {
          toast({
            title: "❌ فشل الاختبار المباشر",
            description: "هناك مشكلة في الاتصال",
            variant: "destructive"
          });
        }
      });

    // إزالة القناة بعد 30 ثانية
    setTimeout(() => {
      supabase.removeChannel(testChannel);
      setConnections(prev => ({
        ...prev,
        liveTest: {
          ...prev.liveTest,
          status: 'disconnected'
        }
      }));
    }, 30000);
  };

  const createTestOrder = async () => {
    try {
      console.log('🆕 Creating test order for Realtime...');
      
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          customer_name: 'عميل تشخيص Realtime',
          customer_phone: '07700000000',
          customer_address: 'عنوان تجريبي',
          customer_city: 'بغداد',
          total_amount: 1000,
          order_details: 'طلب تجريبي لاختبار Realtime - ' + new Date().toISOString(),
          order_code: `RT-TEST-${Date.now()}`,
          order_status: 'pending',
          main_store_name: 'متجر تجريبي'
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "✅ تم إنشاء طلب تجريبي",
        description: `الطلب ${data.order_code} - راقب الأحداث المباشرة`,
      });

      return data;

    } catch (error) {
      console.error('Error creating test order:', error);
      toast({
        title: "❌ خطأ في إنشاء الطلب",
        description: error instanceof Error ? error.message : 'خطأ غير معروف',
        variant: 'destructive'
      });
    }
  };

  const updateTestOrder = async () => {
    // البحث عن آخر طلب تجريبي
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .like('order_code', 'RT-TEST-%')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!orders || orders.length === 0) {
      toast({
        title: "⚠️ لا يوجد طلب للتحديث",
        description: "أنشئ طلب تجريبي أولاً",
        variant: "destructive"
      });
      return;
    }

    const testOrder = orders[0];
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: testOrder.order_status === 'pending' ? 'assigned' : 'pending',
          store_response_status: testOrder.store_response_status === 'available' ? 'unavailable' : 'available',
          updated_at: new Date().toISOString()
        })
        .eq('id', testOrder.id);

      if (error) {
        throw error;
      }

      toast({
        title: "✅ تم تحديث الطلب",
        description: `الطلب ${testOrder.order_code} - راقب التحديثات المباشرة`,
      });

    } catch (error) {
      console.error('Error updating test order:', error);
      toast({
        title: "❌ خطأ في التحديث",
        description: error instanceof Error ? error.message : 'خطأ غير معروف',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    // تحديث دوري لحالة الاتصالات
    const interval = setInterval(() => {
      const status = realtimeDebugger.getConnectionsStatus();
      setConnections(prev => ({ ...prev, ...status }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: boolean | string) => {
    if (status === true || status === 'SUBSCRIBED') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (status === false || status === 'CHANNEL_ERROR') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: boolean | string) => {
    if (status === true || status === 'SUBSCRIBED') {
      return 'bg-green-100 text-green-800';
    } else if (status === false || status === 'CHANNEL_ERROR') {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">تشخيص Realtime</h1>
        <Button onClick={runDiagnostics} disabled={isRunning}>
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              جاري التشخيص...
            </>
          ) : (
            'تشغيل التشخيص'
          )}
        </Button>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>جاري تشخيص النظام...</span>
                <span>{testProgress}%</span>
              </div>
              <Progress value={testProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">الحالة</TabsTrigger>
          <TabsTrigger value="test">اختبار مباشر</TabsTrigger>
          <TabsTrigger value="events">الأحداث ({realtimeEvents.length})</TabsTrigger>
          <TabsTrigger value="recommendations">التوصيات</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          {diagnostics && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.databaseConnection)}
                    اتصال قاعدة البيانات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getStatusColor(diagnostics.databaseConnection)}>
                    {diagnostics.databaseConnection ? 'متصل' : 'غير متصل'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.realtimeConnection)}
                    اتصال Realtime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getStatusColor(diagnostics.realtimeConnection)}>
                    {diagnostics.realtimeConnection ? 'يعمل' : 'لا يعمل'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.ordersTableAccess)}
                    جدول الطلبات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getStatusColor(diagnostics.ordersTableAccess)}>
                    {diagnostics.ordersTableAccess ? 'متاح' : 'غير متاح'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.storeResponsesTableAccess)}
                    جدول ردود المتاجر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getStatusColor(diagnostics.storeResponsesTableAccess)}>
                    {diagnostics.storeResponsesTableAccess ? 'متاح' : 'غير متاح'}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {Object.keys(connections).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>الاتصالات النشطة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(connections).map(([name, conn]: [string, any]) => (
                    <div key={name} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{name}</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(conn.status)}
                        <Badge className={getStatusColor(conn.status)}>
                          {conn.status}
                        </Badge>
                        {conn.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(conn.timestamp).toLocaleTimeString('ar-SA')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Button onClick={testLiveConnection} className="w-full">
              اختبار الاتصال المباشر
            </Button>
            
            <Button onClick={createTestOrder} className="w-full">
              إنشاء طلب تجريبي
            </Button>
            
            <Button onClick={updateTestOrder} className="w-full">
              تحديث آخر طلب تجريبي
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>تعليمات الاختبار</AlertTitle>
            <AlertDescription>
              1. اضغط "اختبار الاتصال المباشر" لفحص اتصال Realtime
              <br />
              2. أنشئ طلب تجريبي وراقب ظهوره في قسم الأحداث
              <br />
              3. حدث الطلب التجريبي وراقب التحديثات المباشرة
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>الأحداث المباشرة</CardTitle>
              <CardDescription>
                الأحداث المستقبلة من Realtime في الوقت الفعلي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {realtimeEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    لا توجد أحداث حتى الآن...
                    <br />
                    جرب إنشاء أو تحديث طلب لرؤية الأحداث
                  </div>
                ) : (
                  <div className="space-y-3">
                    {realtimeEvents.map((event) => (
                      <div key={event.id} className="border rounded-lg p-3 bg-muted/50">
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          {diagnostics && diagnostics.recommendations.length > 0 && (
            <div className="space-y-4">
              {diagnostics.recommendations.map((rec: string, index: number) => (
                <Alert key={index}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>توصية {index + 1}</AlertTitle>
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
