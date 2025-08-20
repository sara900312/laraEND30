/**
 * Edge Function Filter Component for Admin Dashboard
 * فلتر حالة Edge Functions للوحة الإدارة
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EdgeFunctionStatus } from '@/components/debug/EdgeFunctionStatus';
import { ArabicText } from '@/components/ui/arabic-text';
import {
  ChevronDown,
  ChevronRight,
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TestTube,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EdgeFunctionFilterProps {
  className?: string;
}

export const EdgeFunctionFilter: React.FC<EdgeFunctionFilterProps> = ({ className }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const handleStatusUpdate = (newStatuses: Record<string, any>) => {
    setStatuses(newStatuses);
    setLastChecked(new Date());
  };

  const getOverallStatus = () => {
    const statusValues = Object.values(statuses);
    if (statusValues.length === 0) return { status: 'unknown', count: '0/0', icon: AlertTriangle, color: 'bg-gray-100 text-gray-800' };
    
    const availableCount = statusValues.filter((s: any) => s?.available).length;
    const totalCount = statusValues.length;
    
    if (availableCount === totalCount) {
      return { 
        status: 'all-online', 
        count: `${availableCount}/${totalCount}`, 
        icon: CheckCircle, 
        color: 'bg-green-100 text-green-800' 
      };
    }
    
    if (availableCount === 0) {
      return { 
        status: 'all-offline', 
        count: `${availableCount}/${totalCount}`, 
        icon: XCircle, 
        color: 'bg-red-100 text-red-800' 
      };
    }
    
    return { 
      status: 'partial', 
      count: `${availableCount}/${totalCount}`, 
      icon: AlertTriangle, 
      color: 'bg-yellow-100 text-yellow-800' 
    };
  };

  const overall = getOverallStatus();
  const StatusIcon = overall.icon;

  return (
    <div className={className}>
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 shadow-md hover:shadow-lg transition-shadow">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-purple-100/50 transition-colors">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-purple-800">
                      <ArabicText>حالة Edge Functions</ArabicText>
                    </h3>
                    <p className="text-sm text-purple-600">
                      <ArabicText>فلتر الخدمات السحابية</ArabicText>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-4 h-4 ${
                      overall.status === 'all-online' ? 'text-green-600' :
                      overall.status === 'all-offline' ? 'text-red-600' :
                      'text-yellow-600'
                    }`} />
                    <Badge className={overall.color}>
                      {overall.count}
                    </Badge>
                    {lastChecked && (
                      <span className="text-xs text-purple-600">
                        {lastChecked.toLocaleTimeString('ar-IQ', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                  
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-purple-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-purple-600" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="border-t border-purple-200 pt-4">
                <EdgeFunctionStatus
                  autoCheck={true}
                  collapsible={false}
                  onStatusUpdate={handleStatusUpdate}
                />
              </div>
              
              {/* إحصائيات سريعة */}
              {Object.keys(statuses).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          <ArabicText>خدمات متاحة</ArabicText>
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {Object.values(statuses).filter((s: any) => s?.available).length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          <ArabicText>خدمات غير متاحة</ArabicText>
                        </p>
                        <p className="text-lg font-bold text-red-600">
                          {Object.values(statuses).filter((s: any) => !s?.available).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* رسائل تحذيرية */}
              {overall.status === 'all-offline' && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-medium text-red-800">
                      <ArabicText>⚠️ جميع الخدمات غير متاحة - تحقق من الاتصال</ArabicText>
                    </p>
                  </div>
                </div>
              )}
              
              {overall.status === 'partial' && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">
                      <ArabicText>⚠️ بعض الخدمات غير متاحة - قد تتأثر بعض الوظائف</ArabicText>
                    </p>
                  </div>
                </div>
              )}

              {/* Test Links Section */}
              <div className="mt-4 border-t border-purple-200 pt-4">
                <h4 className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  <ArabicText>صفحات الاختبار والتطوير</ArabicText>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/test-order-divisions')}
                    className="justify-start h-auto py-2 px-3"
                  >
                    <ExternalLink className="w-3 h-3 ml-2" />
                    <div className="text-left">
                      <div className="text-xs font-medium">
                        <ArabicText>اختبار التقسيمات</ArabicText>
                      </div>
                      <div className="text-xs text-gray-500">نظام تقسيم الطلبات</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/order-division-demo')}
                    className="justify-start h-auto py-2 px-3"
                  >
                    <ExternalLink className="w-3 h-3 ml-2" />
                    <div className="text-left">
                      <div className="text-xs font-medium">
                        <ArabicText>عرض التقسيمات</ArabicText>
                      </div>
                      <div className="text-xs text-gray-500">مثال تجريبي</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/test-split-order')}
                    className="justify-start h-auto py-2 px-3"
                  >
                    <ExternalLink className="w-3 h-3 ml-2" />
                    <div className="text-left">
                      <div className="text-xs font-medium">
                        <ArabicText>تقسيم الطلبات</ArabicText>
                      </div>
                      <div className="text-xs text-gray-500">Split Orders</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/database-debug')}
                    className="justify-start h-auto py-2 px-3"
                  >
                    <ExternalLink className="w-3 h-3 ml-2" />
                    <div className="text-left">
                      <div className="text-xs font-medium">
                        <ArabicText>قاعدة البيانات</ArabicText>
                      </div>
                      <div className="text-xs text-gray-500">Database Debug</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('🧪 Testing error handling...');
                      try {
                        // Import and run the debug function
                        import('@/utils/debugErrorExtraction').then(module => {
                          module.default();
                        });
                      } catch (e) {
                        console.log('Error testing:', e);
                      }
                    }}
                    className="justify-start h-auto py-2 px-3"
                  >
                    <TestTube className="w-3 h-3 ml-2" />
                    <div className="text-left">
                      <div className="text-xs font-medium">
                        <ArabicText>اختبار الأخطاء</ArabicText>
                      </div>
                      <div className="text-xs text-gray-500">Error Testing</div>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default EdgeFunctionFilter;
