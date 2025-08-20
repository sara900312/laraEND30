import React, { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { notificationService } from '@/services/notificationService';
import { NotificationData } from '@/types/notification';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface NotificationBellProps {
  userId: string;
  className?: string;
}

export function NotificationBell({ userId, className }: NotificationBellProps) {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadNotifications();
      loadUnreadCount();

      // Setup realtime subscription for new notifications
      const unsubscribe = notificationService.setupRealtimeSubscription(userId, (newNotification) => {
        console.log('🔔 New notification received in bell:', newNotification);
        
        // Add to notifications list
        setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep only latest 50
        
        // Update unread count if notification is unread
        if (!newNotification.read) {
          setUnreadCount(prev => prev + 1);
        }

        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.title || 'إشعار جديد', {
            body: newNotification.message,
            icon: '/favicon.ico'
          });
        }
      });

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [userId]);

  // Demo data for testing when database tables don't exist
  const addDemoData = () => {
    const demoNotifications: NotificationData[] = [
      {
        id: 'demo-1',
        recipient_type: 'admin',
        recipient_id: userId,
        title: 'طلب جديد',
        message: 'طلب جديد من العميل أحمد محمد',
        order_id: 'order-123',
        created_at: new Date().toISOString(),
        read: false,
        sent: true
      },
      {
        id: 'demo-2',
        recipient_type: 'admin',
        recipient_id: userId,
        title: 'تأكيد طلب',
        message: 'تم تأكيد طلب رقم ORD-002',
        order_id: 'order-124',
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        read: true,
        sent: true
      }
    ];

    setNotifications(demoNotifications);
    setUnreadCount(demoNotifications.filter(n => !n.read).length);
  };

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      console.log('🔔 Loading notifications for user:', userId);
      const data = await notificationService.getNotificationHistory(userId, 20);
      console.log('🔔 Received notifications:', data?.length || 0, 'items');

      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        console.warn('🔔 Invalid notifications data:', typeof data, data);
        setNotifications([]);
      }
    } catch (error) {
      console.error('🔔 Failed to load notifications:', {
        error,
        message: error?.message,
        userId
      });
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      console.log('🔔 Loading unread count for user:', userId);
      const count = await notificationService.getUnreadNotificationsCount(userId);
      console.log('🔔 Received unread count:', count, typeof count);

      if (typeof count === 'number') {
        setUnreadCount(count);
      } else {
        console.warn('🔔 Invalid count type:', typeof count, count);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('🔔 Failed to load unread count:', {
        error,
        message: error?.message,
        stack: error?.stack,
        userId
      });
      setUnreadCount(0);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await notificationService.markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read && notification.id) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate to the order page if order_id is available
    if (notification.order_id) {
      window.location.href = `/orders/${notification.order_id}`;
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: language === 'ar' ? ar : undefined
    });
  };

  const getNotificationTypeIcon = (type: 'admin' | 'store' | 'customer') => {
    switch (type) {
      case 'admin':
        return '👨‍💼';
      case 'store':
        return '🏪';
      case 'customer':
        return '👤';
      default:
        return '📢';
    }
  };

  const getNotificationPriorityColor = (notification: NotificationData) => {
    // Check if it's urgent based on message content
    if (notification.message.includes('عاجل') || notification.message.includes('فوراً') || notification.title.includes('عاجل')) {
      return 'bg-red-100 border-red-200';
    }
    if (notification.message.includes('تذكير') || notification.title.includes('تذكير')) {
      return 'bg-yellow-100 border-yellow-200';
    }
    if (!notification.read) {
      return 'bg-blue-50 border-blue-200';
    }
    return '';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount} {language === 'ar' ? 'جديد' : 'new'}
              </Badge>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-sm mb-3">
                {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={addDemoData}
                className="text-xs"
              >
                {language === 'ar' ? 'تحميل بيانات تجريبية' : 'Load Demo Data'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center max-w-[200px]">
                {language === 'ar'
                  ? 'قم بتطبيق migration قاعدة البيانات أولاً للاستخدام الحقيقي'
                  : 'Apply database migration first for real usage'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id || `${notification.created_at}-${notification.message}`}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'bg-muted/30' : ''
                  } ${getNotificationPriorityColor(notification)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                      <span className="text-lg">
                        {getNotificationTypeIcon(notification.recipient_type)}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium line-clamp-1">
                          {notification.title || 'إشعار'}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        {!notification.sent && (
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            {language === 'ar' ? 'في الانتظار' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {notification.created_at && formatNotificationTime(notification.created_at)}
                        </span>
                        <div className="flex gap-1">
                          {notification.order_id && (
                            <Badge variant="outline" className="text-xs">
                              {language === 'ar' ? 'طلب' : 'Order'}: {notification.order_id.substring(0, 8)}...
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notification.id) {
                            handleMarkAsRead(notification.id);
                          }
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="border-t p-2 space-y-1">
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                // Navigate to full notifications page
                setIsOpen(false);
              }}
            >
              {language === 'ar' ? 'عرض جميع الإشعارات' : 'View all notifications'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={async () => {
              try {
                const success = await notificationService.createTestNotification(userId);
                if (success) {
                  // Refresh data
                  await loadNotifications();
                  await loadUnreadCount();
                }
              } catch (error) {
                console.error('Failed to create test notification:', error);
              }
            }}
          >
            {language === 'ar' ? 'إنشاء إشعار تجريبي' : 'Create Test Notification'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setIsOpen(false);
              window.location.href = '/notification-test';
            }}
          >
            {language === 'ar' ? 'صفحة الاختبار' : 'Test Page'}
          </Button>

          {/* Request permission button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={async () => {
              const permission = await notificationService.requestNotificationPermission();
              console.log('Notification permission:', permission);
            }}
          >
            {language === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
