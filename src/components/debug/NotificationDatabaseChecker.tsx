import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

interface TableStatus {
  name: string;
  exists: boolean;
  error?: string;
  recordCount?: number;
}

export function NotificationDatabaseChecker() {
  const { language } = useLanguage();
  const [isChecking, setIsChecking] = useState(false);
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([]);
  const [isCreatingData, setIsCreatingData] = useState(false);

  const tables = [
    'notifications',
    'notification_subscriptions',
    'notification_templates'
  ];

  useEffect(() => {
    checkTables();
  }, []);

  const checkTables = async () => {
    setIsChecking(true);
    const statuses: TableStatus[] = [];

    for (const tableName of tables) {
      try {
        console.log(`🔍 Checking table: ${tableName}`);
        
        // Try to query the table
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(`❌ Error checking ${tableName}:`, error);
          statuses.push({
            name: tableName,
            exists: false,
            error: error.message
          });
        } else {
          console.log(`✅ Table ${tableName} exists with ${count} records`);
          statuses.push({
            name: tableName,
            exists: true,
            recordCount: count || 0
          });
        }
      } catch (err) {
        console.error(`❌ Exception checking ${tableName}:`, err);
        statuses.push({
          name: tableName,
          exists: false,
          error: err?.message || 'Unknown error'
        });
      }
    }

    setTableStatuses(statuses);
    setIsChecking(false);
  };

  const createSampleData = async () => {
    setIsCreatingData(true);
    
    try {
      // Create sample notifications
      const sampleNotifications = [
        {
          recipient_type: 'admin',
          recipient_id: 'admin-user',
          title: 'طلب جديد',
          message: 'طلب جديد من العميل أحمد محمد',
          order_id: 'order-123',
          read: false,
          sent: true
        },
        {
          recipient_type: 'admin',
          recipient_id: 'admin-user',
          title: 'تأكيد طلب',
          message: 'تم تأكيد طلب رقم ORD-002',
          order_id: 'order-124',
          read: true,
          sent: true
        },
        {
          recipient_type: 'admin',
          recipient_id: 'admin-user',
          title: 'رفض طلب',
          message: 'تم رفض طلب رقم ORD-003',
          order_id: 'order-125',
          read: false,
          sent: true
        }
      ];

      const { data, error } = await supabase
        .from('notifications')
        .insert(sampleNotifications);

      if (error) {
        throw error;
      }

      toast({
        title: language === 'ar' ? 'تم إنشاء البيانات' : 'Data Created',
        description: language === 'ar' 
          ? 'تم إنشاء بيانات تجريبية بنجاح'
          : 'Sample data created successfully'
      });

      // Refresh table statuses
      await checkTables();

    } catch (error) {
      console.error('Failed to create sample data:', error);
      toast({
        title: language === 'ar' ? 'فشل في الإنشاء' : 'Creation Failed',
        description: language === 'ar' 
          ? 'فشل في إنشاء البيانات التجريبية'
          : 'Failed to create sample data',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingData(false);
    }
  };

  const getStatusIcon = (status: TableStatus) => {
    if (status.exists) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TableStatus) => {
    if (status.exists) {
      return (
        <Badge variant="default" className="bg-green-500">
          {language === 'ar' ? 'موجود' : 'Exists'} ({status.recordCount})
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          {language === 'ar' ? 'مفقود' : 'Missing'}
        </Badge>
      );
    }
  };

  const allTablesExist = tableStatuses.every(t => t.exists);
  const hasData = tableStatuses.some(t => (t.recordCount || 0) > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          {language === 'ar' ? 'حالة قاعد�� البيانات' : 'Database Status'}
        </CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? 'تحقق من وجود جداول الإشعارات وحالتها'
            : 'Check notification tables existence and status'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">
            {language === 'ar' ? 'جداول قاعدة البيانات' : 'Database Tables'}
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={checkTables}
            disabled={isChecking}
          >
            {isChecking 
              ? (language === 'ar' ? 'جاري الفحص...' : 'Checking...')
              : (language === 'ar' ? 'إعادة فحص' : 'Recheck')
            }
          </Button>
        </div>

        <div className="space-y-2">
          {tableStatuses.map((status) => (
            <div key={status.name} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <span className="font-mono text-sm">{status.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(status)}
              </div>
            </div>
          ))}
        </div>

        {!allTablesExist && (
          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-600">
                {language === 'ar' ? 'جداول مفقودة' : 'Missing Tables'}
              </span>
            </div>
            <p className="text-sm text-red-600 mb-3">
              {language === 'ar' 
                ? 'يجب تطبيق migration قاعدة البيانات أولاً. قم بتشغيل الملف:'
                : 'Database migration must be applied first. Run the file:'}
            </p>
            <code className="text-xs bg-red-100 dark:bg-red-900 p-2 rounded block">
              supabase/migrations/20241205_create_notifications_tables.sql
            </code>
          </div>
        )}

        {allTablesExist && !hasData && (
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-600">
                  {language === 'ar' ? 'لا توجد بيانات' : 'No Data'}
                </span>
              </div>
              <p className="text-sm text-yellow-600">
                {language === 'ar' 
                  ? 'الجداول موجودة لكن لا توجد بيانات للاختبار'
                  : 'Tables exist but no data available for testing'}
              </p>
            </div>
            
            <Button
              onClick={createSampleData}
              disabled={isCreatingData}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              {isCreatingData 
                ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                : (language === 'ar' ? 'إنشاء بيانات تجريبية' : 'Create Sample Data')
              }
            </Button>
          </div>
        )}

        {allTablesExist && hasData && (
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-600">
                {language === 'ar' ? 'النظام جاهز' : 'System Ready'}
              </span>
            </div>
            <p className="text-sm text-green-600">
              {language === 'ar' 
                ? 'نظام الإشعارات جاهز للاستخدام'
                : 'Notification system is ready to use'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
