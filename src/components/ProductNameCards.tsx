import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface ProductNameCardsProps {
  products: Array<{
    name: string;
    quantity?: number;
    price?: number;
  }>;
  className?: string;
}

export const ProductNameCards: React.FC<ProductNameCardsProps> = ({ 
  products, 
  className = "" 
}) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">أسماء المنتجات:</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {products.map((product, index) => (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-blue-800 leading-tight">
                  {product.name}
                </h4>
                <div className="flex items-center justify-between">
                  {product.quantity && (
                    <Badge variant="secondary" className="text-xs">
                      الكمية: {product.quantity}
                    </Badge>
                  )}
                  {product.price && (
                    <span className="text-sm font-bold text-green-600">
                      {new Intl.NumberFormat('ar-IQ', {
                        style: 'decimal',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(product.price)} د.ع
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductNameCards;
