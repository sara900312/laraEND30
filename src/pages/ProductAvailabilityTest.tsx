import React from 'react';
import ProductAvailabilityList from '@/components/ProductAvailabilityList';

const ProductAvailabilityTest = () => {
  // بيانات تجريبية من API
  const apiProducts = [
    { "id": "1", "product_name": "منتج 1", "availability_status": "available" as const },
    { "id": "2", "product_name": "منتج 2", "availability_status": "unavailable" as const }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8" dir="rtl">
          اختبار مكون قائمة المنتجات
        </h1>
        
        {/* الم��ون مع البيانات التجريبية */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" dir="rtl">
            مع البيانات المرسلة من API:
          </h2>
          <ProductAvailabilityList initialProducts={apiProducts} />
        </div>

        {/* المكون مع البيانات الافتراضية */}
        <div>
          <h2 className="text-xl font-semibold mb-4" dir="rtl">
            مع البيانات الافتراضية:
          </h2>
          <ProductAvailabilityList />
        </div>
      </div>
    </div>
  );
};

export default ProductAvailabilityTest;
