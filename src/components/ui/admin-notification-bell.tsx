import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Eye, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { adminNotificationService } from '@/services/adminNotificationService';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AdminNotificationBellProps {
  className?: string;
}

export function AdminNotificationBell({ className }: AdminNotificationBellProps) {
  const [notifications, setNotifications] = useState(adminNotificationService.getNotifications());
  const [unreadCount, setUnreadCount] = useState(adminNotificationService.getUnreadCount());
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // بدء الاستماع للإشعارات
    adminNotificationService.startListening();

    // إضافة callback للتحديث عند الإشعارات الجديدة
    const handleNotificationUpdate = () => {
      setNotifications([...adminNotificationService.getNotifications()]);
      setUnreadCount(adminNotificationService.getUnreadCount());
    };

    adminNotificationService.onNotification(handleNotificationUpdate);

    // تحديث دوري كل 30 ثانية
    const interval = setInterval(() => {
      setNotifications([...adminNotificationService.getNotifications()]);
      setUnreadCount(adminNotificationService.getUnreadCount());
    }, 30000);

    return () => {
      clearInterval(interval);
      adminNotificationService.removeNotificationCallback(handleNotificationUpdate);
    };
  }, []);

  const handleMarkAsRead = (notificationId: string) => {
    adminNotificationService.markAsRead(notificationId);
    setNotifications([...adminNotificationService.getNotifications()]);
    setUnreadCount(adminNotificationService.getUnreadCount());
  };

  const handleMarkAllAsRead = () => {
    adminNotificationService.markAllAsRead();
    setNotifications([...adminNotificationService.getNotifications()]);
    setUnreadCount(0);
  };

  const handleDeleteNotification = (notificationId: string) => {
    adminNotificationService.deleteNotification(notificationId);
    setNotifications([...adminNotificationService.getNotifications()]);
    setUnreadCount(adminNotificationService.getUnreadCount());
  };

  const handleClearAll = () => {
    adminNotificationService.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleTestNotification = () => {
    adminNotificationService.addTestNotification();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return '🆕';
      case 'pending_order':
        return '⏳';
      case 'store_response':
        return '🏪';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_order':
        return 'text-green-600';
      case 'pending_order':
        return 'text-yellow-600';
      case 'store_response':
        return 'text-blue-600';
      case 'system':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" side="bottom">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">إشعارات المدير</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  تحديد الكل كمقروء
                </Button>
              )}
            </div>
          </div>
          
          {showSettings && (
            <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
              <div className="text-sm text-muted-foreground">
                حالة النظام: {adminNotificationService.getStatus().isListening ? '🟢 يعمل' : '🔴 متوقف'}
              </div>
              <div className="text-sm text-muted-foreground">
                إذن الإشعارات: {adminNotificationService.getStatus().notificationPermission === 'granted' ? '✅ مفعل' : '❌ غير مفعل'}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  className="text-xs"
                >
                  اختبار إشعار
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  مسح الكل
                </Button>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد إشعارات</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                className="mt-2"
              >
                إضافة إشعار تجريبي
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`text-lg ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium leading-tight ${
                          !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                      
                      {notification.url && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            window.location.href = notification.url!;
                            handleMarkAsRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="h-auto p-0 mt-2 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          عرض التفاصيل
                        </Button>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                          locale: ar
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <div className="text-xs text-center text-muted-foreground">
              {notifications.length} إشعار • {unreadCount} غير مقروء
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default AdminNotificationBell;
