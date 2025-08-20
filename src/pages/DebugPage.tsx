import React from "react";
import DebugOrderData from "@/components/DebugOrderData";

const DebugPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            صفحة فحص البيانات
          </h1>
          <p className="text-gray-600">
            فحص جلب الطلبات وعلاقتها مع المتاجر وتحديث البيانات
          </p>
        </div>

        <DebugOrderData />
      </div>
    </div>
  );
};

export default DebugPage;
