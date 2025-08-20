import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { enhancedNotificationService } from '@/services/enhancedNotificationService';
import { OrderEventData } from '@/types/enhanced-notification';
import { Bell, Send, Package, Store, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NotificationSystemDemo = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  
  // Form state
  const [orderData, setOrderData] = useState<Partial<OrderEventData>>({
    order_id: 'demo-' + Date.now(),
    order_code: 'ORDER-' + Date.now().toString().slice(-6),
    customer_id: 'customer-1',
    customer_name: 'أحمد محمد',
    store_id: 'store-1',
    store_name: 'متجر الأطعمة السريعة',
    shipping_type: 'fast',
    order_status: 'pending',
    product_count: 3,
    total_amount: 150,
    estimated_delivery: 'خلال 30 دقيقة'
  });

  const handleInputChange = (field: string, value: any) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
  };

  const testNotification = async (scenario: string) => {
    if (!orderData.order_id || !orderData.order_code) {
      toast({
        title: "خطأ",
        description: "يرجى ملء البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let result = false;
      const fullOrderData = orderData as OrderEventData;

      switch (scenario) {
        case 'fast_order_created':
          await enhancedNotificationService.processFastOrderCreation(fullOrderData);
          result = true;
          break;
        
        case 'fast_order_assigned':
          await enhancedNotificationService.notifyFastOrderAssigned(fullOrderData);
          result = true;
          break;
        
        case 'fast_order_confirmed':
          await enhancedNotificationService.notifyFastOrderConfirmed(fullOrderData);
          result = true;
          break;
        
        case 'fast_order_shipped':
          await enhancedNotificationService.notifyFastOrderShipped(fullOrderData);
          result = true;
          break;
        
        case 'fast_order_delivered':
          await enhancedNotificationService.notifyFastOrderDelivered(fullOrderData);
          result = true;
          break;
        
        case 'fast_order_rejected':
          const rejectedData = { 
            ...fullOrderData, 
            rejection_reason: 'المنتج غير متوفر حالياً' 
          };
          await enhancedNotificationService.notifyFastOrderRejected(rejectedData);
          result = true;
          break;
        
        case 'unified_order_created':
          await enhancedNotificationService.processUnifiedOrderCreation(
            fullOrderData, 
            ['store-1', 'store-2', 'store-3']
          );
          result = true;
          break;
        
        case 'unified_order_split':
          await enhancedNotificationService.notifyUnifiedOrderSplit(
            fullOrderData, 
            ['store-1', 'store-2', 'store-3']
          );
          result = true;
          break;
        
        case 'unified_order_confirmed':
          await enhancedNotificationService.notifyUnifiedOrderAllConfirmed(fullOrderData);
          result = true;
          break;
        
        case 'system_error':
          await enhancedNotificationService.notifySystemError(fullOrderData, 'خطأ في الاتصال بقاعدة البيانات');
          result = true;
          break;
        
        default:
          throw new Error('سيناريو غير معروف');
      }

      const newResult = {
        scenario,
        success: result,
        timestamp: new Date().toLocaleTimeString('ar'),
        orderCode: orderData.order_code
      };

      setResults(prev => [newResult, ...prev].slice(0, 10));

      toast({
        title: result ? "تم بنجاح" : "فشل",
        description: result ? `تم إرسال إشعارات ${scenario}` : `فشل في إرسال إشعارات ${scenario}`,
        variant: result ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Error testing notification:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء اختبار الإشعار",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scenarios = [
    {
      id: 'fast_order_created',
      title: 'إنشاء طلب سريع',
      description: 'إرسال إشعارات إنشاء طلب سريع للعميل والإدارة',
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      id: 'fast_order_assigned',
      title: 'تعيين طلب سريع',
      description: 'إشعار المتجر بطلب سريع جديد',
      icon: Store,
      color: 'bg-purple-500'
    },
    {
      id: 'fast_order_confirmed',
      title: 'تأكيد طلب سريع',
      description: 'إشعار العميل بتأكيد الطلب',
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      id: 'fast_order_shipped',
      title: 'شحن طلب سريع',
      description: 'إشعار العميل أن الطلب في الطريق',
      icon: Package,
      color: 'bg-orange-500'
    },
    {
      id: 'fast_order_delivered',
      title: 'تسليم طلب سريع',
      description: 'إشعار العميل بوصول الطلب',
      icon: CheckCircle,
      color: 'bg-green-600'
    },
    {
      id: 'fast_order_rejected',
      title: 'رفض طلب سريع',
      description: 'إشعار العميل والإدارة برفض الطلب',
      icon: AlertCircle,
      color: 'bg-red-500'
    },
    {
      id: 'unified_order_created',
      title: 'إنشاء طلب موحد',
      description: 'إنشاء طلب موحد وتوزيعه على المتاجر',
      icon: Package,
      color: 'bg-indigo-500'
    },
    {
      id: 'unified_order_split',
      title: 'تقسيم طلب موحد',
      description: 'إشعار جميع المتاجر المشاركة',
      icon: Package,
      color: 'bg-cyan-500'
    },
    {
      id: 'unified_order_confirmed',
      title: 'تأكيد طلب موحد',
      description: 'إشعار العميل بتأكيد جميع أجزاء الطلب',
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      id: 'system_error',
      title: 'خطأ في النظام',
      description: 'إشعار الإدارة بخطأ في النظام',
      icon: AlertCircle,
      color: 'bg-red-600'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bell className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">نظام الإشعارات المطور</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            اختبار شامل لجميع أنواع الإشعارات للطلبات السريعة والموحدة
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  إعدادات الاختبار
                </CardTitle>
                <CardDescription>
                  تعديل بيانات الطلب للاختبار
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="order_code">رقم الطلب</Label>
                  <Input
                    id="order_code"
                    value={orderData.order_code || ''}
                    onChange={(e) => handleInputChange('order_code', e.target.value)}
                    placeholder="ORDER-123456"
                  />
                </div>

                <div>
                  <Label htmlFor="customer_name">اسم العميل</Label>
                  <Input
                    id="customer_name"
                    value={orderData.customer_name || ''}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    placeholder="أحمد محمد"
                  />
                </div>

                <div>
                  <Label htmlFor="store_name">اسم المتجر</Label>
                  <Input
                    id="store_name"
                    value={orderData.store_name || ''}
                    onChange={(e) => handleInputChange('store_name', e.target.value)}
                    placeholder="متجر الأطعمة السريعة"
                  />
                </div>

                <div>
                  <Label htmlFor="shipping_type">نوع الشحن</Label>
                  <Select value={orderData.shipping_type} onValueChange={(value) => handleInputChange('shipping_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">سريع</SelectItem>
                      <SelectItem value="unified">موحد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="total_amount">المبلغ الإجمالي</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    value={orderData.total_amount || ''}
                    onChange={(e) => handleInputChange('total_amount', parseInt(e.target.value))}
                    placeholder="150"
                  />
                </div>

                <div>
                  <Label htmlFor="product_count">عدد المنتجات</Label>
                  <Input
                    id="product_count"
                    type="number"
                    value={orderData.product_count || ''}
                    onChange={(e) => handleInputChange('product_count', parseInt(e.target.value))}
                    placeholder="3"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>نتائج الاختبار</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          result.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-medium text-sm">
                              {scenarios.find(s => s.id === result.scenario)?.title}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {result.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          الطلب: {result.orderCode}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Scenarios Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((scenario) => (
                <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${scenario.color}`}>
                        <scenario.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{scenario.title}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {scenario.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => testNotification(scenario.id)}
                      disabled={loading}
                      className="w-full"
                      size="sm"
                    >
                      <Send className="w-4 h-4 ml-2" />
                      {loading ? 'جاري الإرسال...' : 'اختبار الإشعار'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>مميزات نظام الإشعارات المطور</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Package className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">الطلبات السريعة</h3>
                <p className="text-sm text-muted-foreground">
                  إشعارات فورية للطلبات السريعة مع أولوية عالية
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Package className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">الطلبات الموحدة</h3>
                <p className="text-sm text-muted-foreground">
                  تقسيم وتوزيع الإشعارات على المتاجر المتعددة
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Bell className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">إشعارات ذكية</h3>
                <p className="text-sm text-muted-foreground">
                  قوالب متقدمة بالعربية مع بيانات ديناميكية
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <CheckCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">تتبع الحالة</h3>
                <p className="text-sm text-muted-foreground">
                  إشعارات تلقائية لجميع تغييرات حالة الطلب
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSystemDemo;
