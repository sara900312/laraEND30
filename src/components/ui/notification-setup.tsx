import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { notificationService } from '@/services/notificationService';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

interface NotificationSetupProps {
  userId: string;
  userType: 'admin' | 'store' | 'customer';
  className?: string;
}

export function NotificationSetup({ userId, userType, className }: NotificationSetupProps) {
  const { language } = useLanguage();
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    checkNotificationSupport();
    checkPermissionStatus();
  }, []);

  const checkNotificationSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
  };

  const checkPermissionStatus = async () => {
    try {
      const currentPermission = await notificationService.checkNotificationPermission();
      setPermission(currentPermission);
      setIsEnabled(currentPermission === 'granted');
    } catch (error) {
      console.error('Failed to check permission:', error);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!isSupported) {
      toast({
        title: language === 'ar' ? 'غير مدعوم' : 'Not Supported',
        description: language === 'ar' 
          ? 'الإشعارات غير مدعومة في هذا المتصفح'
          : 'Notifications are not supported in this browser',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (enabled) {
        // Enable notifications
        const success = await notificationService.subscribeToPushNotifications(userId, userType);
        
        if (success) {
          setIsEnabled(true);
          const newPermission = await notificationService.checkNotificationPermission();
          setPermission(newPermission);
          
          toast({
            title: language === 'ar' ? 'تم تفعيل الإشعارات' : 'Notifications Enabled',
            description: language === 'ar' 
              ? 'سيتم إرسال الإشعارات إليك عند وجود تحديثات جديدة'
              : 'You will receive notifications when there are new updates'
          });
        } else {
          toast({
            title: language === 'ar' ? 'فشل في التفعيل' : 'Failed to Enable',
            description: language === 'ar' 
              ? 'لم يتم تفعيل الإشعارات. تأكد من السماح بالإشعارات في المتصفح'
              : 'Failed to enable notifications. Please allow notifications in your browser',
            variant: 'destructive'
          });
        }
      } else {
        // Disable notifications
        const success = await notificationService.unsubscribeFromPushNotifications(userId);
        
        if (success) {
          setIsEnabled(false);
          
          toast({
            title: language === 'ar' ? 'تم إلغاء ا��إشعارات' : 'Notifications Disabled',
            description: language === 'ar' 
              ? 'لن تتلقى إشعارات بعد الآن'
              : 'You will no longer receive notifications'
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'حدث خطأ أثناء تحديث إعدادات الإشعارات'
          : 'An error occurred while updating notification settings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return (
          <Badge variant="default" className="bg-green-500">
            <Bell className="w-3 h-3 mr-1" />
            {language === 'ar' ? 'مفعل' : 'Enabled'}
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive">
            <BellOff className="w-3 h-3 mr-1" />
            {language === 'ar' ? 'محظور' : 'Blocked'}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Settings className="w-3 h-3 mr-1" />
            {language === 'ar' ? 'غير محدد' : 'Default'}
          </Badge>
        );
    }
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            {language === 'ar' ? 'الإشعارات غير مدعومة' : 'Notifications Not Supported'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'هذا المتصفح لا يدعم الإشعارات'
              : 'This browser does not support push notifications'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
          </div>
          {getPermissionBadge()}
        </CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? 'تفعيل الإشعارات لتلقي التحديثات المهمة'
            : 'Enable notifications to receive important updates'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {language === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications'}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'تلقي إشعارات عند وجود طلبات أو تحديثات جديدة'
                : 'Receive notifications for new orders and updates'}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
          />
        </div>
        
        {permission === 'denied' && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {language === 'ar' 
                ? 'تم حظر الإشعارات. يرجى تفعيلها من إعدادات المتصفح'
                : 'Notifications are blocked. Please enable them in your browser settings'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                // This will prompt the user to check their browser settings
                window.open('https://support.google.com/chrome/answer/3220216?hl=en', '_blank');
              }}
            >
              {language === 'ar' ? 'كيفية التفعيل' : 'How to Enable'}
            </Button>
          </div>
        )}
        
        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            {language === 'ar' ? 'جاري التحديث...' : 'Updating...'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
