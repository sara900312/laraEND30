/**
 * React Hook للتعامل مع Edge Functions
 * Universal Edge Functions Hook
 * 
 * 🚀 الميزات:
 * - إدارة الحالة التلقائية (loading, error, data)
 * - Toast notifications
 * - TypeScript support
 * - معالجة الأخطاء المحسنة
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  edgeFunctionsService, 
  EdgeFunctionOptions, 
  EdgeFunctionResponse,
  GetOrderResponse,
  AutoAssignOrdersResponse,
  InventoryResponse
} from '@/services/universalEdgeFunctionsService';

// ===== TYPES =====

interface LoadingStates {
  getOrder: boolean;
  autoAssign: boolean;
  inventory: boolean;
  assignOrder: boolean;
  connectivity: boolean;
  custom: boolean;
}

interface HookState {
  loading: LoadingStates;
  orderDetails: GetOrderResponse | null;
  autoAssignResults: AutoAssignOrdersResponse | null;
  inventoryData: InventoryResponse | null;
  connectivityStatus: boolean | null;
  customResults: EdgeFunctionResponse | null;
}

interface UseUniversalEdgeFunctionsReturn extends HookState {
  // الوظائف الأساسية
  getOrder: (orderId: string, storeId?: string, adminMode?: boolean) => Promise<GetOrderResponse>;
  autoAssignOrders: (orderId?: string, returnReason?: string) => Promise<AutoAssignOrdersResponse>;
  getInventory: () => Promise<InventoryResponse>;
  assignOrder: (orderId: string, storeId: string) => Promise<EdgeFunctionResponse>;
  testConnectivity: () => Promise<boolean>;
  callCustomFunction: <T = any>(functionName: string, body?: any, options?: EdgeFunctionOptions) => Promise<EdgeFunctionResponse<T>>;
  
  // وظائف مساعدة
  clearResults: () => void;
  clearErrors: () => void;
}

// ===== HOOK =====

export const useUniversalEdgeFunctions = (): UseUniversalEdgeFunctionsReturn => {
  const { toast } = useToast();

  // ===== STATE =====
  
  const [loading, setLoading] = useState<LoadingStates>({
    getOrder: false,
    autoAssign: false,
    inventory: false,
    assignOrder: false,
    connectivity: false,
    custom: false,
  });

  const [orderDetails, setOrderDetails] = useState<GetOrderResponse | null>(null);
  const [autoAssignResults, setAutoAssignResults] = useState<AutoAssignOrdersResponse | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryResponse | null>(null);
  const [connectivityStatus, setConnectivityStatus] = useState<boolean | null>(null);
  const [customResults, setCustomResults] = useState<EdgeFunctionResponse | null>(null);

  // ===== HELPER FUNCTIONS =====

  const updateLoading = (key: keyof LoadingStates, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    toast({
      title: type === 'success' ? 'نجح' : 'خطأ',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    });
  };

  const handleError = (error: any, context: string): never => {
    let errorMessage = "خطأ غير معروف";

    // معالجة محسنة لاستخراج رسالة الخطأ
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = error.message || error.error || error.toString() || "خطأ غير محدد";
    } else {
      errorMessage = String(error);
    }

    console.error(`❌ ${context}:`, {
      errorMessage,
      errorType: typeof error,
      originalError: error,
      context
    });

    let userFriendlyMessage = errorMessage;

    // تحسين رسائل الخطأ للمستخدم
    if (errorMessage.includes('timeout') || errorMessage.includes('انتهت مهلة')) {
      userFriendlyMessage = 'انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
      userFriendlyMessage = 'خطأ في الشبكة - يرجى التحقق من الاتصال';
    } else if (errorMessage.includes('500')) {
      userFriendlyMessage = 'خطأ في الخادم - يرجى المحاولة لاحقاً';
    } else if (errorMessage.includes('404')) {
      userFriendlyMessage = 'المورد المطلوب غير موجود';
    } else if (errorMessage.includes('403') || errorMessage.includes('401')) {
      userFriendlyMessage = 'غير مصرح لك بالوصول لهذا المورد';
    } else if (errorMessage === '[object Object]' || errorMessage.includes('object Object')) {
      userFriendlyMessage = 'حدث خطأ غير متوقع - يرجى المحاولة مرة أخرى';
    }

    showToast('error', userFriendlyMessage);
    throw new Error(errorMessage);
  };

  // ===== MAIN FUNCTIONS =====

  /**
   * 📋 جلب تفاصيل الطلب
   */
  const getOrder = useCallback(async (
    orderId: string, 
    storeId?: string, 
    adminMode?: boolean
  ): Promise<GetOrderResponse> => {
    updateLoading('getOrder', true);
    
    try {
      console.log('🔍 Fetching order details:', { orderId, storeId, adminMode });
      
      const result = await edgeFunctionsService.getOrder(orderId, storeId, adminMode);
      
      setOrderDetails(result);
      
      if (result.success) {
        console.log('✅ Order details fetched successfully');
        if (result.message) {
          showToast('success', result.message);
        }
      } else {
        throw new Error(result.error || 'فشل في جلب تفاصيل الطلب');
      }
      
      return result;
    } catch (error) {
      setOrderDetails(null);
      handleError(error, 'جلب تفاصيل الطلب');
    } finally {
      updateLoading('getOrder', false);
    }
  }, [toast]);

  /**
   * 🤖 التعيين التلقائي للطلبات
   */
  const autoAssignOrders = useCallback(async (
    orderId?: string, 
    returnReason?: string
  ): Promise<AutoAssignOrdersResponse> => {
    updateLoading('autoAssign', true);
    
    try {
      console.log('🤖 Starting auto-assign:', { orderId, returnReason });
      
      const result = await edgeFunctionsService.autoAssignOrders(orderId, returnReason);
      
      setAutoAssignResults(result);
      
      if (result.success) {
        const message = orderId 
          ? `تم معالجة الطلب ${orderId} بنجاح`
          : `تم تعيين ${result.assigned_count} طلب بنجاح`;
        
        showToast('success', message);
        console.log('✅ Auto-assign completed:', result);
      } else {
        throw new Error(result.error || 'فشل في التعيين التلقائي');
      }
      
      return result;
    } catch (error) {
      setAutoAssignResults(null);
      handleError(error, 'التعيين التلقائي للطلبات');
    } finally {
      updateLoading('autoAssign', false);
    }
  }, [toast]);

  /**
   * 📦 جلب حالة المخزون
   */
  const getInventory = useCallback(async (): Promise<InventoryResponse> => {
    updateLoading('inventory', true);
    
    try {
      console.log('📦 Fetching inventory data...');
      
      const result = await edgeFunctionsService.getInventory();
      
      setInventoryData(result);
      
      if (result.success) {
        console.log('✅ Inventory data fetched successfully');
        if (result.message) {
          showToast('success', result.message);
        }
      } else {
        throw new Error(result.error || 'فشل في جلب بيانات المخزون');
      }
      
      return result;
    } catch (error) {
      setInventoryData(null);
      handleError(error, 'جلب بيانات المخزون');
    } finally {
      updateLoading('inventory', false);
    }
  }, [toast]);

  /**
   * 🏪 تعيين طلب لمتجر
   */
  const assignOrder = useCallback(async (
    orderId: string, 
    storeId: string
  ): Promise<EdgeFunctionResponse> => {
    updateLoading('assignOrder', true);
    
    try {
      console.log('🏪 Assigning order to store:', { orderId, storeId });
      
      const result = await edgeFunctionsService.assignOrder(orderId, storeId);
      
      if (result.success) {
        showToast('success', `تم تعيين الطلب ${orderId} للمتجر بنجاح`);
        console.log('✅ Order assigned successfully');
      } else {
        throw new Error(result.error || 'فشل في تعيين الطلب');
      }
      
      return result;
    } catch (error) {
      handleError(error, 'تعيين الطلب للمتجر');
    } finally {
      updateLoading('assignOrder', false);
    }
  }, [toast]);

  /**
   * 🔍 اختبار الاتصال
   */
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    updateLoading('connectivity', true);
    
    try {
      console.log('🔍 Testing Edge Functions connectivity...');
      
      const isConnected = await edgeFunctionsService.testConnectivity();
      
      setConnectivityStatus(isConnected);
      
      if (isConnected) {
        showToast('success', 'Edge Functions متاحة ومتصلة');
        console.log('✅ Edge Functions connectivity confirmed');
      } else {
        showToast('error', 'Edge Functions غير متاحة حالياً');
        console.log('❌ Edge Functions not accessible');
      }
      
      return isConnected;
    } catch (error) {
      setConnectivityStatus(false);
      console.warn('⚠️ Connectivity test failed:', error);
      showToast('error', 'فشل في اختبار الاتصال');
      return false;
    } finally {
      updateLoading('connectivity', false);
    }
  }, [toast]);

  /**
   * 🔧 استدعاء دالة مخصصة
   */
  const callCustomFunction = useCallback(async <T = any>(
    functionName: string,
    body: any = {},
    options: EdgeFunctionOptions = {}
  ): Promise<EdgeFunctionResponse<T>> => {
    updateLoading('custom', true);
    
    try {
      console.log(`🔧 Calling custom function: ${functionName}`, { body, options });
      
      const result = await edgeFunctionsService.callEdgeFunction<T>(functionName, body, options);
      
      setCustomResults(result);
      
      if (result.success) {
        showToast('success', `تم تنفيذ ${functionName} بنجاح`);
        console.log(`✅ Custom function ${functionName} executed successfully`);
      } else if (result.error) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      setCustomResults(null);
      handleError(error, `تنفيذ الدالة المخصصة ${functionName}`);
    } finally {
      updateLoading('custom', false);
    }
  }, [toast]);

  // ===== UTILITY FUNCTIONS =====

  const clearResults = useCallback(() => {
    setOrderDetails(null);
    setAutoAssignResults(null);
    setInventoryData(null);
    setCustomResults(null);
    setConnectivityStatus(null);
  }, []);

  const clearErrors = useCallback(() => {
    // يمكن إضافة معالجة إضافية للأخطاء هنا
    console.log('🧹 Clearing errors');
  }, []);

  // ===== RETURN =====

  return {
    // State
    loading,
    orderDetails,
    autoAssignResults,
    inventoryData,
    connectivityStatus,
    customResults,
    
    // Functions
    getOrder,
    autoAssignOrders,
    getInventory,
    assignOrder,
    testConnectivity,
    callCustomFunction,
    
    // Utilities
    clearResults,
    clearErrors,
  };
};

// ===== USAGE EXAMPLES =====

/*
🔥 أمثلة الاستخدام / Usage Examples:

import { useUniversalEdgeFunctions } from '@/hooks/useUniversalEdgeFunctions';

function MyComponent() {
  const {
    loading,
    orderDetails,
    autoAssignResults,
    getOrder,
    autoAssignOrders,
    testConnectivity
  } = useUniversalEdgeFunctions();

  // 1️⃣ جلب تفاصيل طلب
  const handleGetOrder = async () => {
    try {
      const order = await getOrder('order-123', undefined, true);
      console.log('تفاصيل الطلب:', order);
    } catch (error) {
      // تم معالجة الخطأ تلقائياً بواسطة الـ hook
    }
  };

  // 2️⃣ التعيين التلقائي
  const handleAutoAssign = async () => {
    try {
      const results = await autoAssignOrders();
      console.log('نتائج التعيين:', results);
    } catch (error) {
      // تم معالجة الخطأ تلقائياً
    }
  };

  // 3️⃣ اختبار الاتصال
  const handleTestConnectivity = async () => {
    const isConnected = await testConnectivity();
    console.log('حالة الاتصال:', isConnected);
  };

  return (
    <div>
      <button 
        onClick={handleGetOrder} 
        disabled={loading.getOrder}
      >
        {loading.getOrder ? 'جاري التحميل...' : 'جلب الطلب'}
      </button>
      
      <button 
        onClick={handleAutoAssign} 
        disabled={loading.autoAssign}
      >
        {loading.autoAssign ? 'جاري المعالجة...' : 'تعيين تلقائي'}
      </button>
      
      {orderDetails && (
        <div>
          <h3>تفاصيل الطلب:</h3>
          <pre>{JSON.stringify(orderDetails, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
*/

export default useUniversalEdgeFunctions;
