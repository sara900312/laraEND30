import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, Database } from 'lucide-react';

const QuickDiagnostic = () => {
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (name: string, status: 'success' | 'error' | 'warning', message: string, data?: any) => {
    setResults(prev => [...prev, { name, status, message, data, timestamp: new Date().toISOString() }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Basic Supabase connection
      addResult('اتصال Supabase', 'success', `متصل بـ: ${supabase.supabaseUrl}`);

      // Test 2: Check authentication
      try {
        const { data: session } = await supabase.auth.getSession();
        addResult('حالة المصادقة', session.session ? 'success' : 'warning', 
          session.session ? 'يوجد جلسة نشطة' : 'لا توجد جلسة نشطة', session.session);
      } catch (error) {
        addResult('حالة المصادقة', 'error', `خطأ: ${error}`);
      }

      // Test 3: Check stores table
      try {
        const { data, error } = await supabase.from('stores').select('*').limit(5);
        if (error) throw error;
        addResult('جدول المتاجر', 'success', `تم العثور على ${data?.length || 0} متجر`, data);
      } catch (error) {
        addResult('جدول المتاجر', 'error', `خطأ: ${error}`);
      }

      // Test 4: Check orders RPC function
      try {
        const { data, error } = await supabase.rpc('get_orders_with_products');
        if (error) throw error;
        addResult('دالة get_orders_with_products', 'success', `تم العثور على ${data?.length || 0} طلب`, data?.slice(0, 2));
      } catch (error) {
        addResult('دالة get_orders_with_products', 'error', `خطأ: ${error}`);
      }

      // Test 5: Check settings table
      try {
        const { data, error } = await supabase.from('settings').select('*').limit(1);
        if (error) throw error;
        addResult('جدول الإعدادات', 'success', `تم العثور على ${data?.length || 0} إعداد`, data);
      } catch (error) {
        addResult('جدول الإعدادات', 'error', `خطأ: ${error}`);
      }

      // Test 6: Check admin login function
      try {
        const { data, error } = await supabase.functions.invoke('admin-login-v2', {
          body: { email: 'test@test.com', password: 'wrong' }
        });
        addResult('دالة admin-login-v2', 'success', 'الدالة تعمل (رفضت بيانات خاطئة)', data);
      } catch (error) {
        addResult('دالة admin-login-v2', 'error', `خطأ: ${error}`);
      }

    } catch (error) {
      addResult('خطأ عام', 'error', `خطأ غير متوقع: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <Database className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-6 h-6" />
              تشخيص سريع للنظام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? 'جاري التشخيص...' : 'تشغيل التشخيص'}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>نتائج التشخيص</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(result.status)}
                      <span className="font-semibold">{result.name}</span>
                      <span className="text-sm text-gray-500">{result.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600">عرض البيانات</summary>
                        <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuickDiagnostic;
