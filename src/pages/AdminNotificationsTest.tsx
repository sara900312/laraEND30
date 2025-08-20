import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { adminNotificationService } from '@/services/adminNotificationService';
import { supabase } from '@/integrations/supabase/client';
import { AdminNotificationBell } from '@/components/ui/admin-notification-bell';

export default function AdminNotificationsTest() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);

  const loadNotifications = async () => {
    // Load from database
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading from database:', error);
      } else {
        setDbNotifications(data || []);
      }
    } catch (error) {
      console.error('Exception loading from database:', error);
    }

    // Load from local service
    setLocalNotifications(adminNotificationService.getNotifications());
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const createTestNotification = async () => {
    setIsLoading(true);
    try {
      await adminNotificationService.addTestNotification();
      
      toast({
        title: '✅ تم إنشاء الإشعار',
        description: 'تم إنشاء إشعار تجريبي وحفظه في قاعدة البيانات',
      });

      // Reload notifications after a short delay
      setTimeout(() => {
        loadNotifications();
      }, 1000);

    } catch (error) {
      console.error('Error creating test notification:', error);
      toast({
        title: '❌ خطأ في إنشاء الإشعار',
        description: 'حدث خطأ أثناء إنشاء الإشعار التجريبي',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('count(*)')
        .limit(1);

      if (error) {
        toast({
          title: '❌ فشل الاتصال',
          description: `خطأ في الاتصال بقاعدة البيانات: ${error.message}`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: '✅ نجح الاتصال',
          description: 'تم الاتصال بجدول admin_notifications بنجاح',
        });
      }
    } catch (error) {
      toast({
        title: '❌ خطأ في الاتصال',
        description: 'حدث خطأ أثناء اختبار الاتصال',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">اختبار إشعارات المدير</h1>
        <AdminNotificationBell />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>اختبار النظام</CardTitle>
            <CardDescription>
              اختبر إنشاء إشعارات جديدة وحفظها في قاعدة البيانات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createTestNotification}
              disabled={isLoading}
              className="w-full"
            >
              إنشاء إشعار تجريبي
            </Button>
            
            <Button 
              onClick={testDatabaseConnection}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              اختبار الاتصال بقاعدة البيانات
            </Button>

            <Button 
              onClick={loadNotifications}
              disabled={isLoading}
              variant="secondary"
              className="w-full"
            >
              تحديث البيانات
            </Button>

            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                إشعارات م��لية: {localNotifications.length}
              </div>
              <div className="text-sm text-muted-foreground">
                إشعارات قاعدة البيانات: {dbNotifications.length}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الإشعارات المحلية</CardTitle>
            <CardDescription>
              الإشعارات المحفوظة في localStorage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {localNotifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  لا توجد إشعارات محلية
                </div>
              ) : (
                localNotifications.map((notif, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{notif.title}</div>
                      <Badge variant={notif.isRead ? "secondary" : "default"}>
                        {notif.isRead ? "مقروء" : "جديد"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {notif.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(notif.timestamp).toLocaleString('ar-SA')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إشعارات قاعدة البيانات</CardTitle>
          <CardDescription>
            الإشعارات المحفوظة في جدول admin_notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {dbNotifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                لا توجد إشعارات في قاعدة البيانات
              </div>
            ) : (
              dbNotifications.map((notif, index) => (
                <div key={notif.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{notif.title}</div>
                    <Badge variant={notif.is_read ? "secondary" : "default"}>
                      {notif.is_read ? "مقروء" : "جديد"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {notif.message}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {notif.id} | النوع: {notif.type}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleString('ar-SA')}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
