import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  calculateDivisionCompletionStatus, 
  getDivisionsWithCompletionStatus,
  DivisionCompletionStatus as CompletionStatus,
  DivisionInfo 
} from '@/services/divisionCompletionService';
import { useToast } from '@/hooks/use-toast';
import { logError, getErrorMessage } from '@/utils/errorLogger';

interface DivisionCompletionStatusProps {
  originalOrderId: string;
  autoRefresh?: boolean;
  showDetails?: boolean;
  onStatusChange?: (status: CompletionStatus) => void;
}

export default function DivisionCompletionStatus({ 
  originalOrderId, 
  autoRefresh = true,
  showDetails = false,
  onStatusChange 
}: DivisionCompletionStatusProps) {
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  const [divisions, setDivisions] = useState<DivisionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // جلب حالة الاكتمال
  const fetchCompletionStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      if (showDetails) {
        // جلب التفاصيل مع حالة الاكتمال
        const result = await getDivisionsWithCompletionStatus(originalOrderId);
        setCompletionStatus(result.completionStatus);
        setDivisions(result.divisions);
      } else {
        // جلب حالة الاكتمال فقط
        const status = await calculateDivisionCompletionStatus(originalOrderId);
        setCompletionStatus(status);
      }

    } catch (err) {
      const errorMessage = getErrorMessage(err, 'خطأ في جلب حالة الاكتمال');
      setError(errorMessage);
      logError('جلب حالة الاكتمال في المكون', err, {
        originalOrderId,
        showDetails,
        autoRefresh
      });
    } finally {
      setLoading(false);
    }
  };

  // التحديث التلقائي
  useEffect(() => {
    fetchCompletionStatus();

    if (autoRefresh) {
      const interval = setInterval(fetchCompletionStatus, 30000); // كل 30 ثانية
      return () => clearInterval(interval);
    }
  }, [originalOrderId, autoRefresh, showDetails]);

  // استدعاء callback عند تغيير الحالة
  useEffect(() => {
    if (completionStatus && onStatusChange) {
      onStatusChange(completionStatus);
    }
  }, [completionStatus, onStatusChange]);

  // دالة تحديث يدوي
  const handleRefresh = () => {
    fetchCompletionStatus();
    toast({
      title: "تم التحديث",
      description: "تم تحديث حالة الاكتمال",
    });
  };

  // الحصول على أيقونة الحالة
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'incomplete':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'partially_completed':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  // الحصول على لون الشارة
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default'; // أخضر
      case 'incomplete':
        return 'destructive'; // أحمر
      case 'partially_completed':
        return 'secondary'; // أصفر/برتقالي
      default:
        return 'outline'; // رمادي
    }
  };

  // الحصول على لون شارة حالة المتجر
  const getStoreResponseBadge = (storeResponse?: string) => {
    switch (storeResponse) {
      case 'available':
      case 'accepted':
        return <Badge variant="default" className="bg-green-100 text-green-800">متوفر</Badge>;
      case 'unavailable':
      case 'rejected':
        return <Badge variant="destructive">غير متوفر</Badge>;
      case 'pending':
        return <Badge variant="outline">في الانتظار</Badge>;
      default:
        return <Badge variant="outline">لم يرد</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600" dir="rtl">
        <RefreshCw className="h-4 w-4 animate-spin" />
        جاري تحميل حالة الاكتمال...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600" dir="rtl">
        ��طأ: {error}
      </div>
    );
  }

  if (!completionStatus) {
    return (
      <div className="text-sm text-gray-600" dir="rtl">
        لا توجد بيانات حالة الاكتمال
      </div>
    );
  }

  if (!showDetails) {
    // عرض مبسط - فقط الحالة
    return (
      <div className="flex items-center gap-2" dir="rtl">
        {getStatusIcon(completionStatus.status)}
        <Badge variant={getStatusBadgeVariant(completionStatus.status)}>
          {completionStatus.statusLabel}
        </Badge>
        <span className="text-sm text-gray-600">
          ({completionStatus.acceptedDivisions}/{completionStatus.totalDivisions})
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // عرض تفصيلي
  return (
    <Card className="w-full" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            {getStatusIcon(completionStatus.status)}
            حالة اكتمال الطلب المقسم
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* حالة الاكتمال الإجمالية */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(completionStatus.status)} className="text-sm">
              {completionStatus.statusLabel}
            </Badge>
          </div>
          <div className="text-sm font-medium">
            {completionStatus.completionPercentage}% مكتمل
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{completionStatus.totalDivisions}</div>
            <div className="text-xs text-blue-600">إجمالي المتاجر</div>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{completionStatus.acceptedDivisions}</div>
            <div className="text-xs text-green-600">وافق</div>
          </div>
          <div className="p-2 bg-red-50 rounded">
            <div className="text-lg font-bold text-red-600">{completionStatus.rejectedDivisions}</div>
            <div className="text-xs text-red-600">رفض</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-600">{completionStatus.pendingDivisions}</div>
            <div className="text-xs text-gray-600">في الانتظار</div>
          </div>
        </div>

        {/* تفاصيل التقسيمات */}
        {divisions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">تفاصيل المتاجر:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {divisions.map((division, index) => (
                <div key={division.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{division.store_name}</span>
                    {division.rejection_reason && (
                      <span className="text-xs text-red-600">
                        ({division.rejection_reason})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStoreResponseBadge(division.store_response_status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* شريط التقدم */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              completionStatus.status === 'completed' ? 'bg-green-600' :
              completionStatus.status === 'partially_completed' ? 'bg-yellow-600' :
              'bg-red-600'
            }`}
            style={{ width: `${completionStatus.completionPercentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
