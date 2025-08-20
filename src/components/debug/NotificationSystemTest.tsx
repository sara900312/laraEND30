import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { notificationService } from '@/services/notificationService';
import { storeNotificationService } from '@/services/storeNotificationService';
import { NotificationData } from '@/types/notification';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function NotificationSystemTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState({
    recipientType: 'admin' as 'admin' | 'store' | 'customer',
    recipientId: 'test-user',
    title: 'إشعار تجريبي',
    message: 'هذا إشعار تجريبي للتأكد من عمل النظام بالشكل الصحيح',
    orderId: 'order-test-123'
  });

  const [stats, setStats] = useState<{
    total: number;
    unread: number;
    unsent?: number;
    byType: Record<string, number>;
  } | null>(null);

  const handleTestNotification = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const notificationData: NotificationData = {
        recipient_type: formData.recipientType,
        recipient_id: formData.recipientId,
        title: formData.title,
        message: formData.message,
        order_id: formData.orderId || undefined
      };

      const success = await notificationService.createNotification(notificationData);

      setResult({
        success,
        message: success 
          ? 'تم إنشاء الإشعار بنجاح ✅' 
          : 'فشل في إنشاء الإشعار ❌'
      });
    } catch (error) {
      setResult({
        success: false,
        message: `خطأ: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestStoreNotification = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const success = await storeNotificationService.sendNotification({
        storeId: formData.recipientId,
        title: formData.title,
        message: formData.message,
        type: 'general',
        orderId: formData.orderId,
        priority: 'medium'
      });

      setResult({
        success,
        message: success 
          ? 'تم إنشاء إشعار المتجر بنجاح ✅' 
          : 'فشل في إنشاء إشعار المتجر ❌'
      });
    } catch (error) {
      setResult({
        success: false,
        message: `خطأ: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStats = async () => {
    setIsLoading(true);
    try {
      if (formData.recipientType === 'store') {
        const storeStats = await storeNotificationService.getNotificationStats(formData.recipientId);
        setStats(storeStats);
      } else {
        const unreadCount = await notificationService.getUnreadNotificationsCount(formData.recipientId);
        const unsentCount = await notificationService.getUnsentNotificationsCount(formData.recipientId);
        const notifications = await notificationService.getNotificationHistory(formData.recipientId, 100);
        
        setStats({
          total: notifications.length,
          unread: unreadCount,
          unsent: unsentCount,
          byType: {
            [formData.recipientType]: notifications.length
          }
        });
      }
    } catch (error) {
      console.error('Error getting stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestDatabaseConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const connectionResult = await notificationService.testDatabaseConnection();
      
      setResult({
        success: connectionResult.success,
        message: connectionResult.success 
          ? 'الاتصال بقاعدة البيانات ناجح ✅'
          : `فشل الاتصال: ${connectionResult.error}`
      });
    } catch (error) {
      setResult({
        success: false,
        message: `خطأ في الاتصال: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔔 اختبار نظام الإشعارات</CardTitle>
          <CardDescription>
            اختبار النظام الجديد للإشعارات مع الجدول المحدث (title, message, read, sent, order_id)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipientType">نوع المستلم</Label>
              <Select
                value={formData.recipientType}
                onValueChange={(value: 'admin' | 'store' | 'customer') => 
                  setFormData(prev => ({ ...prev, recipientType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="store">متجر</SelectItem>
                  <SelectItem value="customer">عميل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="recipientId">معرف المستلم</Label>
              <Input
                id="recipientId"
                value={formData.recipientId}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientId: e.target.value }))}
                placeholder="test-user"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">عنوان الإشعار</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="عنوان الإشعار"
            />
          </div>

          <div>
            <Label htmlFor="message">نص الإشعار</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="نص الإشعار"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="orderId">معرف الطلب (اختياري)</Label>
            <Input
              id="orderId"
              value={formData.orderId}
              onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
              placeholder="order-123"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleTestNotification}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              اختبار إشعار عادي
            </Button>

            <Button
              onClick={handleTestStoreNotification}
              disabled={isLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              اختبار إشعار متجر
            </Button>

            <Button
              onClick={handleTestDatabaseConnection}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              اختبار الاتصال
            </Button>

            <Button
              onClick={handleGetStats}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              الحصول على الإحصائيات
            </Button>
          </div>

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 إحصائيات الإشعارات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-gray-600">المجموع</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.unread}</div>
                    <div className="text-sm text-gray-600">غير مقروءة</div>
                  </div>
                  {stats.unsent !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.unsent}</div>
                      <div className="text-sm text-gray-600">غير مرسلة</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.total - stats.unread}
                    </div>
                    <div className="text-sm text-gray-600">مقروءة</div>
                  </div>
                </div>
                
                {Object.keys(stats.byType).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">حسب النوع:</h4>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(stats.byType).map(([type, count]) => (
                        <Badge key={type} variant="outline">
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📋 معلومات الجدول الجديد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>الأعمدة الجديدة:</strong></div>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><code>title</code> - عنوان الإشعار (نص مطلوب)</li>
              <li><code>message</code> - نص الإشعار (نص مطلوب)</li>
              <li><code>order_id</code> - معرف الطلب (UUID اختياري)</li>
              <li><code>read</code> - حالة القراءة (boolean, افتراضي false)</li>
              <li><code>sent</code> - حالة الإرسال (boolean, افتراضي false)</li>
            </ul>
            <div className="mt-4">
              <strong>تم إزالة:</strong> <code>prompt</code> (JSONB column)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
