import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DatabaseSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const checkTablesExist = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔍 Checking database tables...');
      
      // Check if settings table exists
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .limit(1);

      // Check if orders table exists
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .limit(1);

      // Check if stores table exists
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .limit(1);

      const results = {
        settings: {
          exists: !settingsError,
          error: settingsError?.message,
          data: settingsData
        },
        orders: {
          exists: !ordersError,
          error: ordersError?.message,
          hasData: ordersData && ordersData.length > 0
        },
        stores: {
          exists: !storesError,
          error: storesError?.message,
          hasData: storesData && storesData.length > 0
        }
      };

      setResult(results);
      console.log('📊 Database check results:', results);

      toast({
        title: "تم فحص قاعدة البيانات",
        description: "تحقق من النتائج أدناه",
      });

    } catch (error) {
      console.error('❌ Database check failed:', error);
      setResult({
        error: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: "خطأ في فحص قاعدة البيانات",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSettingsTable = async () => {
    setIsLoading(true);

    try {
      console.log('🔧 Creating settings table...');
      
      // Insert a default settings row
      const { data, error } = await supabase
        .from('settings')
        .upsert({
          id: 1,
          auto_assign_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Error creating settings:', error);
        throw error;
      }

      console.log('✅ Settings created successfully:', data);
      
      toast({
        title: "تم إنشاء جدول الإعدادات",
        description: "تم إنشاء جدول الإعدادات بنجاح",
      });

      // Refresh the check
      await checkTablesExist();

    } catch (error) {
      console.error('❌ Settings creation failed:', error);
      
      toast({
        title: "فشل في إنشاء جدول الإعدادات",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testEdgeFunction = async () => {
    setIsLoading(true);

    try {
      console.log('🔍 Testing Edge Function...');
      
      const response = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true })
      });

      const data = await response.json();
      
      console.log('📦 Edge Function response:', {
        status: response.status,
        statusText: response.statusText,
        data
      });

      toast({
        title: response.ok ? "Edge Function يعمل" : "Edge Function به مشكلة",
        description: `Status: ${response.status} - ${data.message || data.error || response.statusText}`,
        variant: response.ok ? "default" : "destructive",
      });

    } catch (error) {
      console.error('❌ Edge Function test failed:', error);
      
      toast({
        title: "فشل في اختبار Edge Function",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>إعداد قاعدة البيانات والخدمات</CardTitle>
            <p className="text-sm text-muted-foreground">
              فحص وإصلاح الجداول والخدمات المطلوبة
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={checkTablesExist}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "جاري الفحص..." : "فحص الجداول"}
              </Button>

              <Button 
                onClick={createSettingsTable}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "جاري الإنشاء..." : "إنشاء جدول الإعدادات"}
              </Button>

              <Button 
                onClick={testEdgeFunction}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "جاري الاختبار..." : "اختبار Edge Function"}
              </Button>
            </div>

            {result && !result.error && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">نتائج فحص الجداول:</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">جدول الإعدادات (settings)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={result.settings.exists ? "default" : "destructive"}>
                        {result.settings.exists ? "موجود" : "غير موجود"}
                      </Badge>
                      {result.settings.error && (
                        <p className="text-xs text-red-600 mt-2">{result.settings.error}</p>
                      )}
                      {result.settings.data && (
                        <p className="text-xs text-green-600 mt-2">
                          السجلات: {result.settings.data.length}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">جدول الطلبات (orders)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={result.orders.exists ? "default" : "destructive"}>
                        {result.orders.exists ? "موجود" : "غير موجود"}
                      </Badge>
                      {result.orders.error && (
                        <p className="text-xs text-red-600 mt-2">{result.orders.error}</p>
                      )}
                      {result.orders.hasData && (
                        <p className="text-xs text-green-600 mt-2">يحتوي على بيانات</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">جدول المتاجر (stores)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={result.stores.exists ? "default" : "destructive"}>
                        {result.stores.exists ? "موجود" : "غير موجود"}
                      </Badge>
                      {result.stores.error && (
                        <p className="text-xs text-red-600 mt-2">{result.stores.error}</p>
                      )}
                      {result.stores.hasData && (
                        <p className="text-xs text-green-600 mt-2">يحتوي على بيانات</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {result && result.error && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-800">خطأ في الفحص</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-red-50 p-4 rounded-lg text-sm text-red-700 overflow-auto">
                    {result.error}
                  </pre>
                </CardContent>
              </Card>
            )}

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">تعليمات:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• فحص الجداول: يتحقق من وجود الجداول المطلوبة</li>
                <li>• إنشاء جدول الإعدادات: ينشئ جدول الإعدادات إذا لم يكن موجوداً</li>
                <li>• اختبار Edge Function: يتحقق من عمل خدمة التعيين التلقائي</li>
                <li>• راقب وحدة التحكم (F12) للمزيد من التفاصيل</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseSetup;
