import React, { useState } from 'react';
import { Send, Bell, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { notificationService } from '@/services/notificationService';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { NotificationData } from '@/types/notification';

export function NotificationTest() {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientType: 'customer' as 'admin' | 'store' | 'customer',
    recipientId: '',
    title: 'إشعار تجريبي',
    message: 'هذا إشعا�� تجريبي للتأكد من عمل النظام',
    orderId: '',
    orderCode: '',
    customerName: '',
    url: '/'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendTestNotification = async () => {
    if (!formData.recipientId || !formData.title || !formData.message) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يرجى ملء جميع الحقول المطلوبة'
          : 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const notificationData: NotificationData = {
        recipient_type: formData.recipientType,
        recipient_id: formData.recipientId,
        title: formData.title,
        message: formData.message,
        order_id: formData.orderId || undefined
      };

      const success = await notificationService.sendNotification(notificationData);
      
      if (success) {
        toast({
          title: language === 'ar' ? 'تم الإرسال' : 'Sent Successfully',
          description: language === 'ar' 
            ? 'تم إرسال الإشعار التجريبي بنجاح'
            : 'Test notification sent successfully'
        });
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast({
        title: language === 'ar' ? 'فشل في الإرسال' : 'Failed to Send',
        description: language === 'ar' 
          ? 'حدث خطأ أثناء إرسال الإشعار التجريبي'
          : 'An error occurred while sending the test notification',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTemplateNotification = async (templateKey: string) => {
    if (!formData.recipientId) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يرجى إدخال معرف المستلم'
          : 'Please enter recipient ID',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await notificationService.sendOrderNotification(
        templateKey,
        formData.recipientId,
        {
          order_id: formData.orderId || 'test-order-123',
          order_code: formData.orderCode || 'ORD-001',
          customer_name: formData.customerName || 'عميل تجريبي'
        }
      );
      
      if (success) {
        toast({
          title: language === 'ar' ? 'تم الإرسال' : 'Sent Successfully',
          description: language === 'ar' 
            ? `تم إرسال إشعار ${templateKey} بنجاح`
            : `Template notification ${templateKey} sent successfully`
        });
      } else {
        throw new Error('Failed to send template notification');
      }
    } catch (error) {
      console.error('Failed to send template notification:', error);
      toast({
        title: language === 'ar' ? 'فشل في الإرسال' : 'Failed to Send',
        description: language === 'ar' 
          ? 'حدث خطأ أثناء إرسال إشعار القالب'
          : 'An error occurred while sending the template notification',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            {language === 'ar' ? 'اختبار الإشعارات' : 'Notification Testing'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'اختبر إرسال الإشعارات للتأكد من عمل النظام'
              : 'Test sending notifications to verify the system is working'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientType">
                {language === 'ar' ? 'نوع المستلم' : 'Recipient Type'}
              </Label>
              <Select
                value={formData.recipientType}
                onValueChange={(value: 'admin' | 'store' | 'customer') => 
                  handleInputChange('recipientType', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    {language === 'ar' ? 'مدير' : 'Admin'}
                  </SelectItem>
                  <SelectItem value="store">
                    {language === 'ar' ? 'متجر' : 'Store'}
                  </SelectItem>
                  <SelectItem value="customer">
                    {language === 'ar' ? 'عميل' : 'Customer'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientId">
                {language === 'ar' ? 'معرف المستلم *' : 'Recipient ID *'}
              </Label>
              <Input
                id="recipientId"
                value={formData.recipientId}
                onChange={(e) => handleInputChange('recipientId', e.target.value)}
                placeholder={language === 'ar' ? 'أدخل رقم الهاتف أو البريد الإلكتروني' : 'Enter phone or email'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                {language === 'ar' ? 'عنوان الإشعار *' : 'Notification Title *'}
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={language === 'ar' ? 'أدخل عنوان الإشعار' : 'Enter notification title'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">
                {language === 'ar' ? 'رابط الإشعار' : 'Notification URL'}
              </Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder={language === 'ar' ? 'أدخل الرابط' : 'Enter URL'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderId">
                {language === 'ar' ? 'معرف الطلب' : 'Order ID'}
              </Label>
              <Input
                id="orderId"
                value={formData.orderId}
                onChange={(e) => handleInputChange('orderId', e.target.value)}
                placeholder="order-123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderCode">
                {language === 'ar' ? 'رقم الطلب' : 'Order Code'}
              </Label>
              <Input
                id="orderCode"
                value={formData.orderCode}
                onChange={(e) => handleInputChange('orderCode', e.target.value)}
                placeholder="ORD-001"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customerName">
                {language === 'ar' ? 'اسم العميل' : 'Customer Name'}
              </Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                placeholder={language === 'ar' ? 'أدخل اسم العميل' : 'Enter customer name'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">
              {language === 'ar' ? 'نص الإشعار *' : 'Notification Message *'}
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder={language === 'ar' ? 'أدخل نص الإشعار' : 'Enter notification message'}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSendTestNotification}
            disabled={isLoading}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading 
              ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...')
              : (language === 'ar' ? 'إرسال إشعار تجريبي' : 'Send Test Notification')
            }
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {language === 'ar' ? 'إشعارات القوالب' : 'Template Notifications'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'اختبر إرسال إشعارات باستخدام القوالب المحددة مسبقاً'
              : 'Test sending notifications using predefined templates'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => handleSendTemplateNotification('order_created_customer')}
              disabled={isLoading}
              className="h-auto p-3 flex flex-col items-start"
            >
              <span className="font-medium">
                {language === 'ar' ? 'إنشاء طلب - عميل' : 'Order Created - Customer'}
              </span>
              <span className="text-xs text-muted-foreground">
                order_created_customer
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSendTemplateNotification('order_assigned_store')}
              disabled={isLoading}
              className="h-auto p-3 flex flex-col items-start"
            >
              <span className="font-medium">
                {language === 'ar' ? 'تكليف طلب - متجر' : 'Order Assigned - Store'}
              </span>
              <span className="text-xs text-muted-foreground">
                order_assigned_store
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSendTemplateNotification('order_created_admin')}
              disabled={isLoading}
              className="h-auto p-3 flex flex-col items-start"
            >
              <span className="font-medium">
                {language === 'ar' ? 'طلب جديد - مدير' : 'New Order - Admin'}
              </span>
              <span className="text-xs text-muted-foreground">
                order_created_admin
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSendTemplateNotification('order_confirmed_customer')}
              disabled={isLoading}
              className="h-auto p-3 flex flex-col items-start"
            >
              <span className="font-medium">
                {language === 'ar' ? 'تأكيد طلب - عميل' : 'Order Confirmed - Customer'}
              </span>
              <span className="text-xs text-muted-foreground">
                order_confirmed_customer
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSendTemplateNotification('order_rejected_customer')}
              disabled={isLoading}
              className="h-auto p-3 flex flex-col items-start"
            >
              <span className="font-medium">
                {language === 'ar' ? 'رفض طلب - عميل' : 'Order Rejected - Customer'}
              </span>
              <span className="text-xs text-muted-foreground">
                order_rejected_customer
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSendTemplateNotification('order_completed_customer')}
              disabled={isLoading}
              className="h-auto p-3 flex flex-col items-start"
            >
              <span className="font-medium">
                {language === 'ar' ? 'اكتمال طلب - عميل' : 'Order Completed - Customer'}
              </span>
              <span className="text-xs text-muted-foreground">
                order_completed_customer
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
