import { supabase } from "@/integrations/supabase/client";

/**
 * معرفات الطلبات المزيفة/التجريبية التي يجب حذفها
 */
const FAKE_ORDER_IDS = [
  "order_001",
  "order_002", 
  "order_003"
];

/**
 * أكواد الطلبات المزيفة/التجريبية
 */
const FAKE_ORDER_CODES = [
  "ORD-2024-001",
  "ORD-2024-002",
  "ORD-2024-003"
];

/**
 * حذف جميع الطلبات المزيفة من قاعدة البيانات
 */
export const deleteFakeOrders = async () => {
  try {
    console.log("🗑️ بدء عملية حذف الطلبات المزيفة...");

    // حذف الطلبات باستخدام معرفات الطلبات
    const { data: deletedByIds, error: deleteByIdsError } = await supabase
      .from('orders')
      .delete()
      .in('id', FAKE_ORDER_IDS);

    if (deleteByIdsError) {
      console.error("❌ خطأ في حذف الطلبات بالمعرفات:", deleteByIdsError);
    } else {
      console.log("✅ تم حذف الطلبات بالمعرفات:", deletedByIds);
    }

    // حذف الطلبات باستخدام أكواد الطلبات
    const { data: deletedByCodes, error: deleteByCodesError } = await supabase
      .from('orders')
      .delete()
      .in('order_code', FAKE_ORDER_CODES);

    if (deleteByCodesError) {
      console.error("❌ خطأ في حذف الطلبات بالأكواد:", deleteByCodesError);
    } else {
      console.log("✅ تم حذف الطلبات بالأكواد:", deletedByCodes);
    }

    // حذف الطلبات التي تحتوي على أسماء عملاء تجريبية معروفة
    const FAKE_CUSTOMER_NAMES = [
      "أحمد محمد علي",
      "فاطمة عبد الرحمن", 
      "علي حسين محمد"
    ];

    const { data: deletedByNames, error: deleteByNamesError } = await supabase
      .from('orders')
      .delete()
      .in('customer_name', FAKE_CUSTOMER_NAMES);

    if (deleteByNamesError) {
      console.error("❌ خطأ في حذف الطلبات بأسماء العملاء:", deleteByNamesError);
    } else {
      console.log("✅ تم حذف الطلبات بأسماء العملاء:", deletedByNames);
    }

    // حذف الطلبات التي تحتوي على أرقام هواتف تجريبية
    const FAKE_PHONE_NUMBERS = [
      "+964 770 123 4567",
      "+964 771 987 6543",
      "+964 772 555 7890"
    ];

    const { data: deletedByPhones, error: deleteByPhonesError } = await supabase
      .from('orders')
      .delete()
      .in('customer_phone', FAKE_PHONE_NUMBERS);

    if (deleteByPhonesError) {
      console.error("❌ خطأ في حذف الطلبات بأرقام الهواتف:", deleteByPhonesError);
    } else {
      console.log("✅ تم حذف الطلبات بأرقام الهواتف:", deletedByPhones);
    }

    // التحقق من العناصر ذات الصلة في جدول order_items إذا كان موجوداً
    try {
      const { data: deletedOrderItems, error: deleteOrderItemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', FAKE_ORDER_IDS);

      if (deleteOrderItemsError && deleteOrderItemsError.code !== 'PGRST116') {
        console.error("❌ خطأ في حذف عناصر الطلبات:", deleteOrderItemsError);
      } else if (!deleteOrderItemsError) {
        console.log("✅ تم حذف عناصر الطلبات:", deletedOrderItems);
      }
    } catch (error) {
      console.log("⚠️ جدول order_items غير موجود أو لا يمكن الوصول إليه");
    }

    console.log("✅ اكتملت عملية حذف الطلبات المزيفة بنجاح");
    
    return {
      success: true,
      message: "تم حذف جميع الطلبات المزيفة بنجاح"
    };

  } catch (error) {
    console.error("❌ خطأ عام في حذف الطلبات المزيفة:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطأ غير معروف"
    };
  }
};

/**
 * التحقق من وجود طلبات مزيفة في قاعدة البيانات
 */
export const checkForFakeOrders = async () => {
  try {
    console.log("🔍 التحقق من وجود طلبات مزيفة...");

    const { data: fakeOrders, error } = await supabase
      .from('orders')
      .select('id, order_code, customer_name, customer_phone')
      .or(`id.in.(${FAKE_ORDER_IDS.join(',')}),order_code.in.(${FAKE_ORDER_CODES.join(',')}),customer_name.in.("أحمد محمد علي","فاطمة عبد الرحمن","علي حسين محمد")`);

    if (error) {
      console.error("❌ خطأ في البحث عن الطلبات المزيفة:", error);
      return { found: false, count: 0, orders: [] };
    }

    console.log(`🔍 تم العثور على ${fakeOrders?.length || 0} طلب مزيف`);
    
    return {
      found: (fakeOrders?.length || 0) > 0,
      count: fakeOrders?.length || 0,
      orders: fakeOrders || []
    };

  } catch (error) {
    console.error("❌ خطأ في التحقق من الطلبات المزيفة:", error);
    return { found: false, count: 0, orders: [] };
  }
};
