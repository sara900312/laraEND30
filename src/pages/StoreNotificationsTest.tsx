import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationDebugPanel } from '@/components/debug/NotificationDebugPanel';
import { 
  storeNotificationService, 
  sendTestNotification 
} from '@/services/storeNotificationService';
import { 
  sendTestBroadcast, 
  getGlobalNotificationStats 
} from '@/utils/orderNotificationTrigger';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Send, 
  Store, 
  BarChart3, 
  RefreshCw, 
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

const StoreNotificationsTest = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [notificationStats, setNotificationStats] = useState<any>(null);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  
  // Form states
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'order_assigned' | 'order_reminder' | 'system' | 'general'>('general');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Load stores
  useEffect(() => {
    loadStores();
    loadNotificationStats();
    loadRecentNotifications();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .order('name');

      if (!error && data) {
        setStores(data);
        if (data.length > 0 && !selectedStore) {
          setSelectedStore(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadNotificationStats = async () => {
    try {
      const stats = await getGlobalNotificationStats();
      setNotificationStats(stats);
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const loadRecentNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          message,
          prompt,
          created_at,
          read,
          recipient_id,
          stores!notifications_recipient_id_fkey(name)
        `)
        .eq('recipient_type', 'store')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentNotifications(data);
      }
    } catch (error) {
      console.error('Error loading recent notifications:', error);
    }
  };

  const handleSendTestNotification = async () => {
    if (!selectedStore) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار متجر",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const success = await sendTestNotification(selectedStore);
      
      toast({
        title: success ? "تم بنجاح" : "فشل",
        description: success ? "تم إرسال الإشعار التجريبي" : "فشل في إرسال الإشعار",
        variant: success ? "default" : "destructive",
      });

      if (success) {
        await loadNotificationStats();
        await loadRecentNotifications();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الإرسال",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustomNotification = async () => {
    if (!selectedStore || !customTitle || !customMessage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const success = await storeNotificationService.sendNotification({
        storeId: selectedStore,
        title: customTitle,
        message: customMessage,
        type: notificationType,
        priority: 'medium'
      });

      toast({
        title: success ? "تم بنجاح" : "فشل",
        description: success ? "تم إرسال الإشعار المخصص" : "فشل في إرسال الإشعار",
        variant: success ? "default" : "destructive",
      });

      if (success) {
        setCustomTitle('');
        setCustomMessage('');
        await loadNotificationStats();
        await loadRecentNotifications();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الإرسال",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء العنوان والرسالة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const sentCount = await sendTestBroadcast();
      
      toast({
        title: "تم الإرسال",
        description: `تم إرسال الرسالة الجماعية إلى ${sentCount} متجر`,
      });

      setBroadcastTitle('');
      setBroadcastMessage('');
      await loadNotificationStats();
      await loadRecentNotifications();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الإرسال الجماعي",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return '📦';
      case 'order_reminder':
        return '⏰';
      case 'system':
        return '🚨';
      default:
        return '📢';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'order_reminder':
        return 'bg-orange-100 text-orange-800';
      case 'system':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bell className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">اختبار إشعارات المتاجر</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            إرسال واختبار الإشعارات للمتاجر
          </p>
        </div>

        {/* Stats Cards */}
        {notificationStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Store className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{notificationStats.totalStores}</p>
                    <p className="text-muted-foreground">متجر مسجل</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <MessageSquare className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{notificationStats.totalNotifications}</p>
                    <p className="text-muted-foreground">إجمالي الإشعارات</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{notificationStats.unreadNotifications}</p>
                    <p className="text-muted-foreground">غير مقروءة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      loadNotificationStats();
                      loadRecentNotifications();
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    تحديث
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="individual">إشعار فردي</TabsTrigger>
            <TabsTrigger value="broadcast">رسالة جماعية</TabsTrigger>
            <TabsTrigger value="recent">الإشعارات الأخيرة</TabsTrigger>
          </TabsList>

          {/* Individual Notifications */}
          <TabsContent value="individual" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Test */}
              <Card>
                <CardHeader>
                  <CardTitle>إشعار تجريبي سريع</CardTitle>
                  <CardDescription>
                    إرسال إشعار تجريبي بسيط لمتجر محدد
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="store-select">اختر المتجر</Label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر متجر" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleSendTestNotification}
                    disabled={loading || !selectedStore}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 ml-2" />
                    {loading ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي'}
                  </Button>
                </CardContent>
              </Card>

              {/* Custom Notification */}
              <Card>
                <CardHeader>
                  <CardTitle>إشعار مخصص</CardTitle>
                  <CardDescription>
                    إنشاء وإرسال إشعار مخصص
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="notification-type">نوع الإشعار</Label>
                    <Select value={notificationType} onValueChange={(value: any) => setNotificationType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">عام</SelectItem>
                        <SelectItem value="order_assigned">طلب جديد</SelectItem>
                        <SelectItem value="order_reminder">تذكير</SelectItem>
                        <SelectItem value="system">نظام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="custom-title">العنوان</Label>
                    <Input
                      id="custom-title"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="عنوان الإشعار"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-message">الرسالة</Label>
                    <Textarea
                      id="custom-message"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="نص الرسالة"
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={handleSendCustomNotification}
                    disabled={loading || !selectedStore || !customTitle || !customMessage}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 ml-2" />
                    {loading ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Broadcast Messages */}
          <TabsContent value="broadcast" className="space-y-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  رسالة جماعية
                </CardTitle>
                <CardDescription>
                  إرسال رسالة لجميع المتاجر مرة واحدة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="broadcast-title">عنوان الرسالة</Label>
                  <Input
                    id="broadcast-title"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="عنوان الرسالة الجماعية"
                  />
                </div>
                <div>
                  <Label htmlFor="broadcast-message">نص الرسالة</Label>
                  <Textarea
                    id="broadcast-message"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="نص الرسالة التي ستصل لجميع المتاجر"
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleSendBroadcast}
                  disabled={loading || !broadcastTitle || !broadcastMessage}
                  className="w-full"
                  variant="secondary"
                >
                  <Users className="w-4 h-4 ml-2" />
                  {loading ? 'جاري الإرسال...' : `إرسال لجميع المتاجر (${stores.length})`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Notifications */}
          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الإشعارات الأخيرة</CardTitle>
                <CardDescription>
                  آخر 10 إشعارات تم إرسالها للمتاجر
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>لا توجد إشعارات</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border rounded-lg ${
                          !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-lg">
                              {getTypeIcon(notification.recipient_type || 'general')}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">
                                  {notification.title || 'إشعار'}
                                </h4>
                                <Badge className={getTypeColor(notification.recipient_type || 'general')}>
                                  {notification.recipient_type || 'general'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  المتجر: {notification.stores?.name || 'غير محدد'}
                                </span>
                                <span>
                                  {new Date(notification.created_at).toLocaleString('ar')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {notification.read ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StoreNotificationsTest;
