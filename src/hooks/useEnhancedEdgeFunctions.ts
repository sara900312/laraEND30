/**
 * Enhanced Edge Functions Hook with better state management and error handling
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import EdgeFunctionsService, { 
  OrderDetailResponse, 
  AssignOrderResponse, 
  AutoAssignResponse 
} from '@/services/edgeFunctionsService';

interface LoadingStates {
  getOrder: boolean;
  assignOrder: boolean;
  autoAssignOrders: boolean;
}

interface Errors {
  getOrder: string | null;
  assignOrder: string | null;
  autoAssignOrders: string | null;
}

interface ErrorContext {
  operation: string;
  orderId?: string;
  storeId?: string;
  timestamp: string;
}

export const useEnhancedEdgeFunctions = () => {
  const [loading, setLoading] = useState<LoadingStates>({
    getOrder: false,
    assignOrder: false,
    autoAssignOrders: false,
  });

  const [errors, setErrors] = useState<Errors>({
    getOrder: null,
    assignOrder: null,
    autoAssignOrders: null,
  });

  const [orderDetails, setOrderDetails] = useState<OrderDetailResponse | null>(null);
  const [autoAssignResults, setAutoAssignResults] = useState<AutoAssignResponse | null>(null);
  const [errorContext, setErrorContext] = useState<ErrorContext | null>(null);

  const { toast } = useToast();

  // Clear specific error
  const clearError = useCallback((operation: keyof Errors) => {
    setErrors(prev => ({ ...prev, [operation]: null }));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({
      getOrder: null,
      assignOrder: null,
      autoAssignOrders: null,
    });
  }, []);

  /**
   * Get order details with enhanced error handling
   */
  const getOrderDetails = useCallback(async (orderId: string, storeId?: string): Promise<OrderDetailResponse | null> => {
    setLoading(prev => ({ ...prev, getOrder: true }));
    clearError('getOrder');

    try {
      const response = await EdgeFunctionsService.getOrderDetails(orderId, storeId);
      setOrderDetails(response);
      
      if (response.message) {
        toast({
          title: "تم جلب تفاصيل الطلب",
          description: response.message,
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب تفاصيل الطلب';
      const context: ErrorContext = {
        operation: 'get-order',
        orderId,
        timestamp: new Date().toISOString()
      };

      setErrors(prev => ({ ...prev, getOrder: errorMessage }));
      setErrorContext(context);

      // Enhanced error message based on error type
      let enhancedMessage = errorMessage;
      if (errorMessage.includes('404')) {
        enhancedMessage = `الطلب رقم ${orderId.slice(0, 8)} غير موجود في النظام`;
      } else if (errorMessage.includes('500')) {
        enhancedMessage = 'خطأ في الخادم - يرجى التحقق من إعدادات Edge Functions';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        enhancedMessage = 'خطأ في الاتصال - تحقق من الشبكة وحاول مرة أخرى';
      }

      toast({
        title: "خطأ في جلب تفاصيل الطلب",
        description: enhancedMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setLoading(prev => ({ ...prev, getOrder: false }));
    }
  }, [toast, clearError]);

  /**
   * Assign order to store with progress tracking
   */
  const assignOrder = useCallback(async (
    orderId: string, 
    storeId: string,
    options?: { 
      showSuccessToast?: boolean;
      onSuccess?: (response: AssignOrderResponse) => void;
    }
  ): Promise<boolean> => {
    setLoading(prev => ({ ...prev, assignOrder: true }));
    clearError('assignOrder');

    try {
      const response = await EdgeFunctionsService.assignOrder(orderId, storeId);
      
      if (options?.showSuccessToast !== false) {
        toast({
          title: "تم تعيين الطلب بنجاح",
          description: response.message || `تم تعيين الطلب إلى ${response.store_name || 'المتجر المحدد'}`,
        });
      }

      options?.onSuccess?.(response);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تعيين الطلب';
      const context: ErrorContext = {
        operation: 'auto-assign-orders (manual mode)',
        orderId,
        storeId,
        timestamp: new Date().toISOString()
      };

      setErrors(prev => ({ ...prev, assignOrder: errorMessage }));
      setErrorContext(context);

      // Enhanced error message based on error type
      let enhancedMessage = errorMessage;
      if (errorMessage.includes('already assigned')) {
        enhancedMessage = 'هذا الطلب مُعيَّن مسبقاً لمتجر آخر';
      } else if (errorMessage.includes('not found')) {
        enhancedMessage = 'لم يتم العثور على الطلب أو المتجر المحدد';
      } else if (errorMessage.includes('environment')) {
        enhancedMessage = 'خطأ في إعدادات النظام - يرجى التواصل مع المطور';
      }

      toast({
        title: "خطأ في تعيين الطلب",
        description: enhancedMessage,
        variant: "destructive",
      });

      return false;
    } finally {
      setLoading(prev => ({ ...prev, assignOrder: false }));
    }
  }, [toast, clearError]);

  /**
   * Auto-assign all pending orders with detailed progress
   */
  const autoAssignOrders = useCallback(async (options?: {
    onProgress?: (results: AutoAssignResponse) => void;
    showDetailedResults?: boolean;
  }): Promise<AutoAssignResponse | null> => {
    setLoading(prev => ({ ...prev, autoAssignOrders: true }));
    clearError('autoAssignOrders');

    try {
      const response = await EdgeFunctionsService.autoAssignOrders();
      setAutoAssignResults(response);
      
      options?.onProgress?.(response);

      // Create detailed success message
      let description = `تم تعيين ${response.assigned_count} طلب بنجاح`;
      
      if (response.unmatched_count > 0) {
        description += `\n${response.unmatched_count} طلب لم يتم العثور على متجر مطابق`;
      }
      
      if (response.error_count > 0) {
        description += `\n${response.error_count} طلب حدث بهم خطأ`;
      }

      // Show detailed results if requested
      if (options?.showDetailedResults && response.results) {
        const successfulAssignments = response.results.filter(r => r.status === 'assigned');
        const unmatchedOrders = response.results.filter(r => r.status === 'unmatched');
        const errorOrders = response.results.filter(r => r.status === 'error');

        if (successfulAssignments.length > 0) {
          console.log('✅ نجح تعيين الطلبات:', successfulAssignments);
        }
        
        if (unmatchedOrders.length > 0) {
          console.log('⚠️ طلبات لم يتم العثور على متجر مطابق:', unmatchedOrders);
        }
        
        if (errorOrders.length > 0) {
          console.log('❌ طلبات حدث بها خطأ:', errorOrders);
        }
      }

      toast({
        title: "تم التعيين التلقائي",
        description: response.message || description,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في التعيين التلقائي';
      setErrors(prev => ({ ...prev, autoAssignOrders: errorMessage }));
      
      toast({
        title: "خطأ في التعيين التلقائي",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setLoading(prev => ({ ...prev, autoAssignOrders: false }));
    }
  }, [toast, clearError]);

  /**
   * Check Edge Functions connectivity
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await EdgeFunctionsService.checkConnectivity();
      
      if (!isConnected) {
        toast({
          title: "تحذير",
          description: "لا يمكن الوصول إلى Edge Functions - قد تكون بعض الميزات غير متاحة",
          variant: "destructive",
        });
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ Connectivity check failed:', error);
      return false;
    }
  }, [toast]);

  return {
    // Loading states
    loading,
    isLoading: Object.values(loading).some(Boolean),
    
    // Specific loading states
    isGettingOrder: loading.getOrder,
    isAssigningOrder: loading.assignOrder,
    isAutoAssigning: loading.autoAssignOrders,

    // Error states
    errors,
    hasErrors: Object.values(errors).some(Boolean),

    // Data
    orderDetails,
    autoAssignResults,

    // Actions
    getOrderDetails,
    assignOrder,
    autoAssignOrders,
    checkConnectivity,

    // Utilities
    clearError,
    clearAllErrors,
    clearOrderDetails: () => setOrderDetails(null),
    clearAutoAssignResults: () => setAutoAssignResults(null),
    setAutoAssignResults, // إضافة setAutoAssignResults للاستخدام المباشر

    // Error context for debugging
    errorContext,
    clearErrorContext: () => setErrorContext(null),
  };
};

export default useEnhancedEdgeFunctions;
