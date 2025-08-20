import React, { useState } from 'react';

// نوع البيانات للمنتج
interface Product {
  id: string;
  product_name: string;
  availability_status: 'available' | 'unavailable';
}

interface SimpleProductListProps {
  initialProducts?: Product[];
}

export function SimpleProductList({ initialProducts = [] }: SimpleProductListProps) {
  // البيانات التجريبية الافتراضية
  const defaultProducts: Product[] = [
    { id: "1", product_name: "منتج 1", availability_status: "available" },
    { id: "2", product_name: "منتج 2", availability_status: "unavailable" }
  ];

  // حالة المنتجات
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
      <h2>قائمة المنتجات</h2>
      
      {products.map((product) => (
        <div
          key={product.id}
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            margin: '10px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f9f9f9'
          }}
        >
          {/* اسم المنتج والحالة */}
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>{product.product_name}</h3>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: product.availability_status === 'available' ? '#d4edda' : '#f8d7da',
                color: product.availability_status === 'available' ? '#155724' : '#721c24'
              }}
            >
              {product.availability_status === 'available' ? '✅ متوفر' : '❌ غير متوفر'}
            </span>
          </div>

          {/* زر تغيير الحالة */}
          <button
            onClick={() => toggleAvailability(product.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: product.availability_status === 'available' ? '#dc3545' : '#28a745',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {product.availability_status === 'available' ? 'جعله غير متوفر' : 'جعله متوفر'}
          </button>
        </div>
      ))}

      {/* إحصائيات سريعة */}
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
        <h4>إحصائيات:</h4>
        <p>إجمالي المنتجات: {products.length}</p>
        <p>متوفر: {products.filter(p => p.availability_status === 'available').length}</p>
        <p>غير متوفر: {products.filter(p => p.availability_status === 'unavailable').length}</p>
      </div>
    </div>
  );
}

export default SimpleProductList;
