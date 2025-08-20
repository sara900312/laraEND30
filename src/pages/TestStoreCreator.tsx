import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store, Plus } from 'lucide-react';
import { extractStoreError, extractErrorMessage } from '@/utils/errorMessageExtractor';

const TestStoreCreator = () => {
  const [storeName, setStoreName] = useState('متجر التجربة');
  const [password, setPassword] = useState('123456');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createTestStore = async () => {
    setIsCreating(true);
    
    try {
      const { data, error } = await supabase
        .from('stores')
        .insert([
          {
            name: storeName,
            password: password
          }
        ])
        .select();

      if (error) {
        console.error('Error creating store:', error);
        console.log('Raw error object:', JSON.stringify(error, null, 2));

        const errorMessage = extractStoreError(error);
        console.log('Extracted error message:', errorMessage);

        toast({
          title: "خطأ في إنشاء المتجر",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0) {
        toast({
          title: "تم إنشاء المتجر بنجاح",
          description: `متجر "${storeName}" تم إنشاؤه بكلمة مرور: ${password}`,
        });
        
        // Create localStorage entry for immediate access
        localStorage.setItem('storeAuth', JSON.stringify({
          id: data[0].id,
          name: data[0].name
        }));
        
        toast({
          title: "تم تسجيل الدخول تلقائياً",
          description: "يمكنك الآن الذهاب إلى /store-dashboard",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      console.log('Raw error object in catch:', JSON.stringify(error, null, 2));

      const errorMessage = extractErrorMessage(error, "حدث خطأ غير متوقع");
      console.log('Extracted error message in catch:', errorMessage);

      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const testLoginRedirect = () => {
    // Set test credentials in localStorage
    localStorage.setItem('storeAuth', JSON.stringify({
      id: 'test-store-id',
      name: 'متجر التجربة'
    }));
    
    toast({
      title: "تم تعيين بيانات تجريبية",
      description: "يمكنك الآن تجربة /store-dashboard",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Plus className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">إنشاء متجر تجريبي</CardTitle>
            <CardDescription>
              لاختبار النظام وحل مشكلة التوجيه
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="storeName">اسم المتجر</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="text-right"
              />
            </div>
            
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-right"
              />
            </div>
            
            <Button
              onClick={createTestStore}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                'جاري الإنشاء...'
              ) : (
                'إنشاء متجر تجريبي'
              )}
            </Button>

            <div className="border-t pt-4">
              <Button
                onClick={testLoginRedirect}
                variant="outline"
                className="w-full"
              >
                تعيين بيانات تجريبية سريعة
              </Button>
            </div>

            <div className="text-center space-y-2 text-sm text-gray-600">
              <p>🔗 الروابط المفيدة:</p>
              <div className="space-y-1">
                <a href="/store-login-space9003" className="block text-blue-600 hover:underline">
                  صفحة تسجيل الدخول
                </a>
                <a href="/store-dashboard" className="block text-blue-600 hover:underline">
                  لوحة تحكم المتجر
                </a>
                <a href="/admin-aa-smn-justme9003" className="block text-blue-600 hover:underline">
                  لوحة تحكم الإدارة
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestStoreCreator;
