import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Check, X } from 'lucide-react';

// نوع البيانات للمنتج
interface Product {
  id: string;
  product_name: string;
  availability_status: 'available' | 'unavailable';
}

// الواجهة للمكون
interface ProductAvailabilityListProps {
  initialProducts?: Product[];
}

export function ProductAvailabilityList({ initialProducts = [] }: ProductAvailabilityListProps) {
  // البيانات التجريبي�� الافتراضية
  const defaultProducts: Product[] = [
    { id: "1", product_name: "Intel Core i5-14400F Desktop Processor", availability_status: "available" },
    { id: "2", product_name: "Samsung Galaxy S24", availability_status: "unavailable" },
    { id: "3", product_name: "Dell Laptop XPS 13", availability_status: "available" },
    { id: "4", product_name: "iPhone 15 Pro", availability_status: "unavailable" },
    { id: "5", product_name: "Sony WH-1000XM5 Headphones", availability_status: "available" }
  ];

  // استخدام البيانات المرسلة أو البيانات التجريبية
  const [products, setProducts] = useState<Product[]>(
    initialProducts.length > 0 ? initialProducts : defaultProducts
  );

  // دالة تغيير حالة التوفر
  const toggleAvailability = (productId: string) => {
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === productId
          ? {
              ...product,
              availability_status: product.availability_status === 'available' ? 'unavailable' : 'available'
            }
          : product
      )
    );
  };

  // دالة الحصول على معلومات الحالة للعرض
  const getStatusInfo = (status: string) => {
    if (status === 'available') {
      return {
        label: 'متوفر',
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800',
        icon: Check,
        buttonText: 'تغيير إلى غير متوفر',
        buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
      };
    } else {
      return {
        label: 'غير متوفر',
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800',
        icon: X,
        buttonText: 'تغيير إلى متوفر',
        buttonClass: 'bg-green-600 hover:bg-green-700 text-white'
      };
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Package className="w-6 h-6" />
          قائمة المنتجات وحالة التوفر
        </CardTitle>
        <p className="text-muted-foreground">
          يمكنك تغيير حالة توفر كل منتج بالضغط على الزر المقابل
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product) => {
            const statusInfo = getStatusInfo(product.availability_status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                {/* معلومات المنتج */}
                <div className="flex items-center gap-3 flex-1">
                  <Package className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.product_name}</h3>
                    <p className="text-sm text-muted-foreground">رقم المنتج: {product.id}</p>
                  </div>
                </div>

                {/* حالة التوفر */}
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={statusInfo.variant}
                    className={`${statusInfo.className} flex items-center gap-1 px-3 py-1`}
                  >
                    <StatusIcon className="w-4 h-4" />
                    {statusInfo.label}
                  </Badge>

                  {/* زر تغيير الحالة */}
                  <Button
                    onClick={() => toggleAvailability(product.id)}
                    size="sm"
                    className={statusInfo.buttonClass}
                  >
                    {statusInfo.buttonText}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* إحصائيات سريعة */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{products.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {products.filter(p => p.availability_status === 'available').length}
              </p>
              <p className="text-sm text-muted-foreground">منتجات متوفرة</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {products.filter(p => p.availability_status === 'unavailable').length}
              </p>
              <p className="text-sm text-muted-foreground">منتجات غير متوفرة</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProductAvailabilityList;
