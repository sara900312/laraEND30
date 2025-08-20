import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DebugOrderData: React.FC = () => {
  const [ordersRPC, setOrdersRPC] = useState<any[]>([]);
  const [ordersSQL, setOrdersSQL] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Test 1: جلب الطلبات باستخدام RPC function
  const fetchOrdersRPC = async () => {
    try {
      console.log("🔍 Testing RPC: get_orders_with_products");
      const { data, error } = await supabase.rpc("get_orders_with_products");

      if (error) {
        console.error("❌ RPC Error:", error);
        throw error;
      }

      console.log("✅ RPC Success:", {
        count: data?.length || 0,
        sample: data?.[0],
      });

      setOrdersRPC(data || []);
      return data;
    } catch (error) {
      console.error("❌ RPC Failed:", error);
      toast({
        title: "خطأ في RPC",
        description: error.message || "فشل في استدعاء الدالة",
        variant: "destructive",
      });
      return null;
    }
  };

  // Test 2: جلب الطلبات باستخدام SQL مباشر
  const fetchOrdersSQL = async () => {
    try {
      console.log("🔍 Testing Direct SQL with JOIN");
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          customer_name,
          customer_phone,
          assigned_store_id,
          order_status,
          status,
          created_at,
          store:stores(
            id,
            name
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ SQL Error:", error);
        throw error;
      }

      console.log("✅ SQL Success:", {
        count: data?.length || 0,
        sample: data?.[0],
      });

      setOrdersSQL(data || []);
      return data;
    } catch (error) {
      console.error("❌ SQL Failed:", error);
      toast({
        title: "خطأ في SQL",
        description: error.message || "فشل في استعلام قاعدة البيانات",
        variant: "destructive",
      });
      return null;
    }
  };

  // Test 3: جلب المتاجر
  const fetchStores = async () => {
    try {
      console.log("🔍 Testing Stores fetch");
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (error) {
        console.error("❌ Stores Error:", error);
        throw error;
      }

      console.log("✅ Stores Success:", {
        count: data?.length || 0,
        stores: data,
      });

      setStores(data || []);
      return data;
    } catch (error) {
      console.error("❌ Stores Failed:", error);
      toast({
        title: "خطأ في المتاجر",
        description: error.message || "فشل في جلب المتاجر",
        variant: "destructive",
      });
      return null;
    }
  };

  // Test 4: تحديث طلب واحد
  const testOrderUpdate = async () => {
    if (ordersRPC.length === 0) {
      toast({
        title: "لا توجد طلبات",
        description: "اجلب الطلبات أولاً",
        variant: "destructive",
      });
      return;
    }

    const firstOrder = ordersRPC[0];
    const firstStore = stores[0];

    if (!firstStore) {
      toast({
        title: "لا توجد متاجر",
        description: "اجلب المتاجر أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("🔍 Testing Order Update:", {
        orderId: firstOrder.order_id,
        storeId: firstStore.id,
      });

      const { data, error } = await supabase
        .from("orders")
        .update({
          assigned_store_id: firstStore.id,
          order_status: "assigned",
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", firstOrder.order_id)
        .select();

      if (error) {
        console.error("❌ Update Error:", error);
        throw error;
      }

      console.log("✅ Update Success:", data);

      toast({
        title: "تم التحديث",
        description: `تم تعيين الطلب ${firstOrder.order_id.slice(0, 8)} للمتجر ${firstStore.name}`,
      });

      // إعادة جلب البيانات
      setTimeout(async () => {
        await fetchOrdersRPC();
        await fetchOrdersSQL();
      }, 1000);
    } catch (error) {
      console.error("❌ Update Failed:", error);
      toast({
        title: "خطأ في التحديث",
        description: error.message || "فشل في تحديث الطلب",
        variant: "destructive",
      });
    }
  };

  // تشغيل جميع الاختبارات
  const runAllTests = async () => {
    setLoading(true);
    try {
      await fetchStores();
      await fetchOrdersRPC();
      await fetchOrdersSQL();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex gap-4 flex-wrap">
        <Button onClick={fetchOrdersRPC} disabled={loading}>
          اختبار RPC Function
        </Button>
        <Button onClick={fetchOrdersSQL} disabled={loading}>
          اختبار SQL Direct
        </Button>
        <Button onClick={fetchStores} disabled={loading}>
          اختبار المتاجر
        </Button>
        <Button
          onClick={testOrderUpdate}
          disabled={loading}
          variant="destructive"
        >
          اختبار تحديث طلب
        </Button>
        <Button onClick={runAllTests} disabled={loading} variant="outline">
          تشغيل جميع الاختبارات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* نتائج RPC */}
        <Card>
          <CardHeader>
            <CardTitle>نتائج RPC Function ({ordersRPC.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ordersRPC.slice(0, 3).map((order, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                  <p>
                    <strong>ID:</strong> {order.order_id?.slice(0, 8)}
                  </p>
                  <p>
                    <strong>اسم العميل:</strong> {order.customer_name}
                  </p>
                  <p>
                    <strong>المتجر المعين:</strong>{" "}
                    {order.assigned_store_id || "غير معين"}
                  </p>
                  <p>
                    <strong>اسم المتجر:</strong>{" "}
                    {order.store_name || "غير محدد"}
                  </p>
                  <p>
                    <strong>الحالة:</strong> {order.order_status || "غير محددة"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* نتائج SQL */}
        <Card>
          <CardHeader>
            <CardTitle>نتائج SQL Direct ({ordersSQL.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ordersSQL.slice(0, 3).map((order, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                  <p>
                    <strong>ID:</strong> {order.id?.slice(0, 8)}
                  </p>
                  <p>
                    <strong>اسم العميل:</strong> {order.customer_name}
                  </p>
                  <p>
                    <strong>المتجر المعين:</strong>{" "}
                    {order.assigned_store_id || "غير معين"}
                  </p>
                  <p>
                    <strong>متجر JOIN:</strong>{" "}
                    {order.store?.name || "غير محدد"}
                  </p>
                  <p>
                    <strong>الحالة:</strong> {order.order_status || "غير محددة"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* المتاجر */}
        <Card>
          <CardHeader>
            <CardTitle>المتاجر المتاحة ({stores.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stores.map((store, index) => (
                <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                  <p>
                    <strong>ID:</strong> {store.id}
                  </p>
                  <p>
                    <strong>الاسم:</strong> {store.name}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ملخص */}
        <Card>
          <CardHeader>
            <CardTitle>ملخص الفحص</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>✅ عدد الطلبات (RPC): {ordersRPC.length}</p>
              <p>✅ عدد الطلبات (SQL): {ordersSQL.length}</p>
              <p>✅ عدد المتاجر: {stores.length}</p>
              <p>
                📊 الطلبات المعينة:{" "}
                {ordersRPC.filter((o) => o.assigned_store_id).length}
              </p>
              <p>
                📊 الطلبات غير المعينة:{" "}
                {ordersRPC.filter((o) => !o.assigned_store_id).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تفاصيل إضافية للديبوج */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل Console</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            افتح أدوات المطور (F12) وتحقق من تبويب Console لرؤية تفاصيل أكثر حول
            البيانات والاستعلامات.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugOrderData;
