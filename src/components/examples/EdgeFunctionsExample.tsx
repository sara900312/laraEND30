/**
 * مثال شامل لاستخدام Edge Functions
 * Comprehensive Edge Functions Example Component
 * 
 * 🔥 يوضح جميع الاستخدامات الممكنة
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUniversalEdgeFunctions } from '@/hooks/useUniversalEdgeFunctions';
import { 
  Loader2, 
  Package, 
  Bot, 
  Search, 
  Wifi, 
  Settings, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export const EdgeFunctionsExample: React.FC = () => {
  const {
    loading,
    orderDetails,
    autoAssignResults,
    inventoryData,
    connectivityStatus,
    customResults,
    getOrder,
    autoAssignOrders,
    getInventory,
    assignOrder,
    testConnectivity,
    callCustomFunction,
    clearResults
  } = useUniversalEdgeFunctions();

  // ===== LOCAL STATE =====
  const [orderId, setOrderId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [customFunction, setCustomFunction] = useState('');
  const [customBody, setCustomBody] = useState('{}');
  const [adminMode, setAdminMode] = useState(false);

  // ===== HANDLERS =====

  const handleGetOrder = async () => {
    if (!orderId.trim()) {
      alert('يرجى إدخال معرف الطلب');
      return;
    }
    
    await getOrder(
      orderId.trim(), 
      storeId.trim() || undefined, 
      adminMode
    );
  };

  const handleAutoAssignAll = async () => {
    await autoAssignOrders();
  };

  const handleAutoAssignSingle = async () => {
    if (!orderId.trim()) {
      alert('يرجى إدخال معرف الطلب');
      return;
    }
    
    await autoAssignOrders(
      orderId.trim(), 
      returnReason.trim() || undefined
    );
  };

  const handleAssignOrder = async () => {
    if (!orderId.trim() || !storeId.trim()) {
      alert('يرجى إدخال معرف الطلب ومعرف المتجر');
      return;
    }
    
    await assignOrder(orderId.trim(), storeId.trim());
  };

  const handleCustomFunction = async () => {
    if (!customFunction.trim()) {
      alert('يرجى إدخال اسم الدالة');
      return;
    }
    
    let body;
    try {
      body = JSON.parse(customBody);
    } catch {
      alert('يرجى إدخال JSON صحيح');
      return;
    }
    
    await callCustomFunction(customFunction.trim(), body, {
      storeId: storeId.trim() || undefined,
      adminMode
    });
  };

  // ===== RENDER HELPERS =====

  const renderConnectivityStatus = () => {
    if (connectivityStatus === null) return null;
    
    return (
      <Alert className={connectivityStatus ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <div className="flex items-center gap-2">
          {connectivityStatus ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={connectivityStatus ? 'text-green-800' : 'text-red-800'}>
            {connectivityStatus 
              ? '✅ Edge Functions متاحة ومتصلة' 
              : '❌ Edge Functions غير متاحة حالياً'
            }
          </AlertDescription>
        </div>
      </Alert>
    );
  };

  const renderLoadingButton = (
    isLoading: boolean, 
    onClick: () => void, 
    children: React.ReactNode,
    disabled?: boolean
  ) => (
    <Button 
      onClick={onClick} 
      disabled={isLoading || disabled}
      className="w-full"
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🚀 Edge Functions Service</h1>
        <p className="text-muted-foreground">
          مثال شامل لاستخدام خدمة Edge Functions المطورة
        </p>
      </div>

      {/* ===== CONNECTIVITY TEST ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            اختبار الاتصال
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderLoadingButton(
            loading.connectivity,
            testConnectivity,
            <>
              <Wifi className="mr-2 h-4 w-4" />
              اختبار الاتصال مع Edge Functions
            </>
          )}
          {renderConnectivityStatus()}
        </CardContent>
      </Card>

      {/* ===== INPUT SECTION ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            الإعدادات والمدخلات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">معرف الطلب</label>
              <Input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">معرف المتجر (اختياري)</label>
              <Input
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="e.g., store-123"
                dir="ltr"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">سبب الإرجاع (للطلبات المرتجعة)</label>
              <Input
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="العميل غير راضي عن المنتج"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="adminMode"
                checked={adminMode}
                onChange={(e) => setAdminMode(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="adminMode" className="text-sm font-medium">
                وضع الأدمن (Admin Mode)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== GET ORDER ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            📋 جلب تفاصيل الطلب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderLoadingButton(
            loading.getOrder,
            handleGetOrder,
            <>
              <Search className="mr-2 h-4 w-4" />
              جلب تفاصيل الطلب
            </>
          )}
          
          {orderDetails && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">نتائج الطلب:</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>النجاح:</strong> {orderDetails.success ? '✅' : '❌'}</div>
                  {orderDetails.order && (
                    <>
                      <div><strong>كود الطلب:</strong> {orderDetails.order.order_code}</div>
                      <div><strong>حالة الطلب:</strong> {orderDetails.order.order_status}</div>
                      <div><strong>اسم العميل:</strong> {orderDetails.order.customer_name || 'مخفي'}</div>
                      <div><strong>المبلغ:</strong> {orderDetails.order.total_amount}</div>
                      <div><strong>المتجر الأصلي:</strong> {orderDetails.order.main_store_name}</div>
                      <div><strong>المتجر المعين:</strong> {orderDetails.order.assigned_store_name || 'غير معين'}</div>
                    </>
                  )}
                  {orderDetails.customer_data_hidden && (
                    <div className="md:col-span-2">
                      <Badge variant="secondary">بيانات العميل مخفية (وضع المتجر)</Badge>
                    </div>
                  )}
                </div>
                {orderDetails.order_items && orderDetails.order_items.length > 0 && (
                  <div className="mt-4">
                    <strong>المنتجات ({orderDetails.order_items.length}):</strong>
                    <div className="mt-2 space-y-2">
                      {orderDetails.order_items.map((item, index) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          <div>📦 {item.product_name || item.product?.name || 'منتج غير محدد'}</div>
                          <div className="text-xs text-gray-600">
                            الكمية: {item.quantity} | السعر: {item.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {orderDetails.message && (
                  <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded">
                    <strong>رسالة:</strong> {orderDetails.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== AUTO ASSIGN ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            🤖 التعيين التلقائي للطلبات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderLoadingButton(
              loading.autoAssign,
              handleAutoAssignAll,
              <>
                <Bot className="mr-2 h-4 w-4" />
                تعيين جميع الطلبات المعلقة
              </>
            )}
            
            {renderLoadingButton(
              loading.autoAssign,
              handleAutoAssignSingle,
              <>
                <Package className="mr-2 h-4 w-4" />
                تعيين طلب واحد محدد
              </>,
              !orderId.trim()
            )}
          </div>
          
          {autoAssignResults && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">نتائج التعيين التلقائي:</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-green-100 p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">{autoAssignResults.assigned_count}</div>
                    <div className="text-sm text-green-800">تم التعيين</div>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded">
                    <div className="text-2xl font-bold text-yellow-600">{autoAssignResults.unmatched_count}</div>
                    <div className="text-sm text-yellow-800">غير مطابق</div>
                  </div>
                  <div className="bg-red-100 p-3 rounded">
                    <div className="text-2xl font-bold text-red-600">{autoAssignResults.error_count}</div>
                    <div className="text-sm text-red-800">أخطاء</div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded">
                    <div className="text-2xl font-bold text-blue-600">{autoAssignResults.notified_count || 0}</div>
                    <div className="text-sm text-blue-800">تم الإشعار</div>
                  </div>
                </div>
                
                {autoAssignResults.results && autoAssignResults.results.length > 0 && (
                  <div className="mt-4">
                    <strong>تفاصيل النتائج:</strong>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {autoAssignResults.results.map((result, index) => (
                        <div key={index} className="bg-white p-2 rounded border text-sm">
                          <div className="flex justify-between items-center">
                            <span>📋 {result.order_id}</span>
                            <Badge 
                              variant={
                                result.status === 'assigned' ? 'default' :
                                result.status === 'returned' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {result.status}
                            </Badge>
                          </div>
                          {result.store_name && <div>🏪 {result.store_name}</div>}
                          {result.return_reason && <div>🔄 {result.return_reason}</div>}
                          {result.error_message && <div className="text-red-600">❌ {result.error_message}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== OTHER FUNCTIONS ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            🔧 وظائف إضافية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderLoadingButton(
              loading.inventory,
              getInventory,
              <>
                <Package className="mr-2 h-4 w-4" />
                جلب بيانات المخزون
              </>
            )}
            
            {renderLoadingButton(
              loading.assignOrder,
              handleAssignOrder,
              <>
                <Settings className="mr-2 h-4 w-4" />
                تعيين طلب لمتجر محدد
              </>,
              !orderId.trim() || !storeId.trim()
            )}
          </div>
          
          {inventoryData && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">بيانات المخزون:</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(inventoryData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== CUSTOM FUNCTION ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            🔧 استدعاء دالة مخصصة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم الدالة</label>
              <Input
                value={customFunction}
                onChange={(e) => setCustomFunction(e.target.value)}
                placeholder="e.g., inventory, get-order"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">البيانات (JSON)</label>
              <Input
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder='{"key": "value"}'
                dir="ltr"
              />
            </div>
          </div>
          
          {renderLoadingButton(
            loading.custom,
            handleCustomFunction,
            <>
              <Settings className="mr-2 h-4 w-4" />
              تنفيذ الدالة المخصصة
            </>,
            !customFunction.trim()
          )}
          
          {customResults && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">نتائج الدالة المخصصة:</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(customResults, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== CLEAR RESULTS ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            إدارة النتائج
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={clearResults} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            مسح جميع النتائج
          </Button>
        </CardContent>
      </Card>

      {/* ===== DOCUMENTATION ===== */}
      <Card>
        <CardHeader>
          <CardTitle>📚 الدوكيومنتيشن والأمثلة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <strong>🔥 الاستخدام البرمجي:</strong>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">{`
// استيراد الخدمة
import { useUniversalEdgeFunctions } from '@/hooks/useUniversalEdgeFunctions';

// في المكون
const { getOrder, autoAssignOrders } = useUniversalEdgeFunctions();

// جلب تفاصيل طلب (وضع الأدمن)
const order = await getOrder('order-123', undefined, true);

// جلب تفاصيل طلب (وضع المتجر)
const storeOrder = await getOrder('order-123', 'store-456');

// تعيين تلقائي لجميع الطلبات
const results = await autoAssignOrders();

// تعيين طلب واحد مع سبب إرجاع
const singleResult = await autoAssignOrders('order-123', 'العميل غير راضي');
              `}</pre>
            </div>
            
            <Separator />
            
            <div>
              <strong>🌐 URLs المستخدمة:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• <code>GET /get-order</code> - جلب تفاصيل الطلب</li>
                <li>• <code>POST /auto-assign-orders</code> - التعيين التلقائي</li>
                <li>• <code>GET /inventory</code> - بيانات المخزون</li>
                <li>• <code>POST /assign-order</code> - تعيين طلب لمتجر</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EdgeFunctionsExample;
