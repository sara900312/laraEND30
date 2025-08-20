import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, Database, Table, Wrench, Play, Package } from 'lucide-react';
import { fixDatabase, testStoreResponseInsert } from '@/utils/databaseFix';
import { testTempSystem, checkTempSystemStatus } from '@/services/temporaryStoreResponseService';
import { createCompleteTestOrder, getAvailableStores } from '@/utils/sampleDataCreator';

interface TableInfo {
  name: string;
  exists: boolean;
  error?: string;
  count?: number;
  sampleData?: any[];
}

const DatabaseDiagnostic = () => {
  const [tableInfo, setTableInfo] = useState<TableInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const tables = [
    'orders',
    'stores',
    'order_items'
  ];

  const checkTables = async () => {
    setIsLoading(true);
    const results: TableInfo[] = [];

    for (const tableName of tables) {
      try {
        console.log(`🔍 فحص جدول: ${tableName}`);
        
        // محاولة الحصول على عدد الصفوف
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error(`❌ خطأ في جدول ${tableName}:`, countError);
          results.push({
            name: tableName,
            exists: false,
            error: countError.message,
          });
          continue;
        }

        // محاولة الحصول على عينة من البيانات
        const { data: sampleData, error: dataError } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);

        results.push({
          name: tableName,
          exists: true,
          count: count || 0,
          sampleData: sampleData || [],
          error: dataError?.message,
        });

        console.log(`✅ جدول ${tableName}: ${count} صف`);

      } catch (error) {
        console.error(`❌ خطأ عام في جدول ${tableName}:`, error);
        results.push({
          name: tableName,
          exists: false,
          error: error instanceof Error ? error.message : 'خطأ غير معروف',
        });
      }
    }

    setTableInfo(results);
    setIsLoading(false);
  };

  const testStoreResponse = async () => {
    const result = await testStoreResponseInsert();

    if (result.success) {
      toast({
        title: 'نجح الاختبار',
        description: 'تم اختبار إدخال استجابة المتجر بنجاح',
      });
    } else {
      toast({
        title: 'فشل الاختبار',
        description: result.error || 'خطأ غير معروف',
        variant: 'destructive',
      });
    }
  };

  const runDatabaseFix = async () => {
    setIsLoading(true);

    toast({
      title: 'جاري الإصلاح',
      description: 'جاري إصلاح قاعدة البيانات...',
    });

    const result = await fixDatabase();

    if (result.success) {
      toast({
        title: 'تم الإصلاح بنجاح',
        description: 'تم إصلاح قاعدة البيانات بنجاح',
      });
      // إعادة فحص الجداول
      await checkTables();
    } else {
      toast({
        title: 'فشل الإصلاح',
        description: `أخطاء: ${result.errors.join(', ')}`,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const testTemporarySystem = async () => {
    const result = await testTempSystem();

    if (result.success) {
      toast({
        title: 'النظام المؤقت يعمل',
        description: 'النظام المؤقت جاهز ويمكن استخدامه',
      });
    } else {
      toast({
        title: 'النظام المؤقت لا يعمل',
        description: result.error || 'خطأ غير معروف',
        variant: 'destructive',
      });
    }
  };

  const createTestOrder = async () => {
    setIsLoading(true);

    try {
      // الحصول على متجر متاح
      const stores = await getAvailableStores();
      const firstStore = stores[0];

      if (!firstStore) {
        toast({
          title: 'لا توجد متاجر',
          description: 'يجب إنشاء متجر أولاً لتعيين الطلب',
          variant: 'destructive',
        });
        return;
      }

      const result = await createCompleteTestOrder(firstStore.id);

      if (result.success) {
        toast({
          title: 'تم إنشاء الطلب التجريبي',
          description: `تم إنشاء طلب تجريبي وتعيينه للمتجر ${firstStore.name}`,
        });
        // إعادة فحص الجداول لعرض البيانات الجديدة
        await checkTables();
      } else {
        toast({
          title: 'فشل إنشاء الطلب',
          description: result.error || 'خطأ غير معروف',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في إنشاء الطلب',
        description: error instanceof Error ? error.message : 'خطأ غير معروف',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkTables();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
          <Database className="w-8 h-8" />
          تشخيص قاعدة البيانات
        </h1>
        <p className="text-muted-foreground">
          فحص حالة الجداول وإصلاح مشاكل استجابة المتجر
        </p>
      </div>

      <div className="grid gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="w-5 h-5" />
              حالة الجداول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  جاري فحص الجداول...
                </div>
              ) : (
                <>
                  {tableInfo.map((table) => (
                    <div key={table.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {table.exists ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <h3 className="font-medium">{table.name}</h3>
                          {table.error && (
                            <p className="text-sm text-red-600">{table.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {table.exists && (
                          <Badge variant="secondary">
                            {table.count} صف
                          </Badge>
                        )}
                        <Badge variant={table.exists ? 'default' : 'destructive'}>
                          {table.exists ? 'موجود' : 'مفقود'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                إجراءات التشخيص
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button onClick={checkTables} disabled={isLoading} className="w-full">
                  <Database className="w-4 h-4 mr-2" />
                  إعادة فحص الجداول
                </Button>
                <Button onClick={runDatabaseFix} disabled={isLoading} variant="default" className="w-full bg-green-600 hover:bg-green-700">
                  <Wrench className="w-4 h-4 mr-2" />
                  إصلاح قاعدة البيانات
                </Button>
                <Button onClick={testStoreResponse} variant="outline" className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  اختبار إد��ال استجابة متجر
                </Button>
                <Button onClick={testTemporarySystem} variant="secondary" className="w-full">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  اختبار النظام المؤقت
                </Button>
                <Button onClick={createTestOrder} disabled={isLoading} variant="outline" className="w-full bg-purple-50 hover:bg-purple-100">
                  <Package className="w-4 h-4 mr-2" />
                  إنشاء طلب تجريبي
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>معلومات قاعدة البيانات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>الجداول الأساسية:</strong> orders, stores, order_items</p>
                <p><strong>جدول orders:</strong> يحتوي على جميع بيانات الطلبات واستجابات المتاجر</p>
                <p><strong>جدول stores:</strong> بيانات المتاجر المسجلة</p>
                <p><strong>جدول order_items:</strong> تفاصيل منتجات كل طلب</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* عرض بيانات العينة */}
      {tableInfo.length > 0 && (
        <div className="grid gap-4">
          {tableInfo
            .filter(table => table.exists && table.sampleData && table.sampleData.length > 0)
            .map(table => (
              <Card key={table.name}>
                <CardHeader>
                  <CardTitle>بيانات عينة من {table.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(table.sampleData, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
};

export default DatabaseDiagnostic;
