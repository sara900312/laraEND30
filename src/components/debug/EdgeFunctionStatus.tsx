/**
 * Edge Function Status Component
 * مكون لاختبار حالة Edge Functions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, RefreshCw, Wifi } from 'lucide-react';
import { ArabicText } from '@/components/ui/arabic-text';

interface EdgeFunctionStatusProps {
  autoCheck?: boolean;
  collapsible?: boolean;
  showAsFilter?: boolean;
  onStatusUpdate?: (statuses: Record<string, any>) => void;
}

export const EdgeFunctionStatus: React.FC<EdgeFunctionStatusProps> = ({
  autoCheck = true,
  collapsible = false,
  showAsFilter = false,
  onStatusUpdate
}) => {
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const EDGE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_BASE || 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';

  const functions = [
    { name: 'auto-assign-orders', label: 'التعيين التلقائي' },
    { name: 'get-order', label: 'جلب الطلب' }
  ];

  const checkFunction = async (functionName: string) => {
    try {
      // إضافة timeout للطلب
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثوانِ timeout

      const response = await fetch(`${EDGE_FUNCTIONS_BASE}/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({ test: true }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // نتوقع رد فعل حتى لو كان خطأ، المهم أن Function موجود
      return {
        available: true,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`Edge Function ${functionName} check failed:`, error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            available: false,
            error: 'انتهت مهلة الاتصال',
            timestamp: new Date().toISOString()
          };
        }
        if (error.message.includes('Failed to fetch')) {
          return {
            available: false,
            error: 'فشل في الاتصال - تحقق من اتصال الإنترنت',
            timestamp: new Date().toISOString()
          };
        }
      }

      return {
        available: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
        timestamp: new Date().toISOString()
      };
    }
  };

  const checkAllFunctions = async () => {
    // تحقق من توفر EDGE_FUNCTIONS_BASE قبل المحاولة
    if (!EDGE_FUNCTIONS_BASE || EDGE_FUNCTIONS_BASE.includes('undefined')) {
      console.warn('Edge Functions base URL not configured properly');
      setStatuses({});
      return;
    }

    setIsChecking(true);
    const newStatuses: Record<string, any> = {};

    try {
      // فحص كل function مع معالجة الأخطاء بشكل منفصل
      await Promise.allSettled(
        functions.map(async (func) => {
          console.log(`🔍 Checking ${func.name}...`);
          try {
            newStatuses[func.name] = await checkFunction(func.name);
          } catch (error) {
            console.error(`Failed to check ${func.name}:`, error);
            newStatuses[func.name] = {
              available: false,
              error: 'فشل في الفحص',
              timestamp: new Date().toISOString()
            };
          }
        })
      );

      setStatuses(newStatuses);
      console.log('📊 Edge Functions status check completed:', newStatuses);

      // Notify parent component if callback provided
      if (onStatusUpdate) {
        onStatusUpdate(newStatuses);
      }
    } catch (error) {
      console.error('Failed to check Edge Functions:', error);
      setStatuses({});
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (autoCheck && EDGE_FUNCTIONS_BASE && !EDGE_FUNCTIONS_BASE.includes('undefined')) {
      // تأخير طفيف لتجنب المشاكل في التحميل
      const timer = setTimeout(() => {
        checkAllFunctions();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoCheck]);

  const getStatusIcon = (status: any) => {
    if (!status) return <Clock className="w-4 h-4 text-gray-400" />;
    if (status.available) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusBadge = (status: any) => {
    if (!status) return <Badge variant="secondary">غير مفحوص</Badge>;
    if (status.available) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          متاح ({status.status})
        </Badge>
      );
    }
    return <Badge variant="destructive">غير متاح</Badge>;
  };

  const getOverallStatus = () => {
    const statusValues = Object.values(statuses);
    if (statusValues.length === 0) return 'غير مفحوص';

    const availableCount = statusValues.filter((s: any) => s?.available).length;
    const totalCount = statusValues.length;

    if (availableCount === totalCount) return 'كل الخدمات متاحة';
    if (availableCount === 0) return 'كل الخدمات غير متاحة';
    return `${availableCount}/${totalCount} خدمات متاحة`;
  };

  const getOverallStatusColor = () => {
    const statusValues = Object.values(statuses);
    if (statusValues.length === 0) return 'bg-gray-100 text-gray-800';

    const availableCount = statusValues.filter((s: any) => s?.available).length;
    const totalCount = statusValues.length;

    if (availableCount === totalCount) return 'bg-green-100 text-green-800';
    if (availableCount === 0) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (showAsFilter) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          <ArabicText>حالة Edge Functions</ArabicText>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getOverallStatusColor()}>
            {getOverallStatus()}
          </Badge>
          {isExpanded ? '▼' : '▶'}
        </div>
      </Button>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-2 ${collapsible ? 'cursor-pointer' : ''}`}
            onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
          >
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Wifi className="w-5 h-5" />
              <ArabicText>حالة Edge Functions</ArabicText>
            </CardTitle>
            {collapsible && (
              <span className="text-purple-600">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(statuses).length > 0 && (
              <Badge className={getOverallStatusColor()}>
                {getOverallStatus()}
              </Badge>
            )}
            <Button
              onClick={checkAllFunctions}
              disabled={isChecking}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isChecking ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                  <ArabicText>فحص...</ArabicText>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <ArabicText>فحص</ArabicText>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-3">
          {(!EDGE_FUNCTIONS_BASE || EDGE_FUNCTIONS_BASE.includes('undefined')) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-sm text-yellow-700">
                ⚠️ لم يتم تكوين Edge Functions URL بشكل صحيح
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                تحقق من متغير VITE_SUPABASE_EDGE_FUNCTIONS_BASE
              </p>
            </div>
          )}

          {functions.map((func) => {
            const status = statuses[func.name];
            return (
              <div key={func.name} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div>
                    <p className="font-medium text-sm">{func.label}</p>
                    <p className="text-xs text-gray-600">{func.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(status)}
                  {status && status.timestamp && (
                    <span className="text-xs text-gray-500">
                      {new Date(status.timestamp).toLocaleTimeString('ar-IQ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {Object.keys(statuses).length > 0 && (
            <div className="text-center text-xs text-gray-600">
              آخر فحص: {new Date().toLocaleString('ar-IQ')}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default EdgeFunctionStatus;
