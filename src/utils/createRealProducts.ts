import { supabase } from '@/integrations/supabase/client';

export interface ProductData {
  name: string;
  name_en: string;
  price: number;
  main_store_name: string;
  description?: string;
}

// منتجات عراقية حقيقية
export const iraqiProducts: ProductData[] = [
  {
    name: "تلفزيون سامسونغ 55 بوصة QLED",
    name_en: "Samsung 55 QLED TV",
    price: 1200000, // 1,200,000 د.ع
    main_store_name: "hawranj",
    description: "تلفزيون ذكي بدقة 4K مع تقنية QLED"
  },
  {
    name: "جهاز كمبيوتر محمول HP",
    name_en: "HP Laptop",
    price: 850000, // 850,000 د.ع
    main_store_name: "hawranj",
    description: "لابتوب HP بمعالج Intel i5 وذاكرة 8GB"
  },
  {
    name: "هاتف أيفون 14",
    name_en: "iPhone 14",
    price: 1500000, // 1,500,000 د.ع
    main_store_name: "hawranj",
    description: "أحدث هاتف من أبل بكاميرا متطورة"
  },
  {
    name: "مكيف هواء LG 1.5 طن",
    name_en: "LG Air Conditioner 1.5 Ton",
    price: 750000, // 750,000 د.ع
    main_store_name: "hawranj",
    description: "مكيف هواء موفر للطاقة"
  },
  {
    name: "ثلاجة سامسونغ 18 قدم",
    name_en: "Samsung Refrigerator 18 ft",
    price: 950000, // 950,000 د.ع
    main_store_name: "hawranj",
    description: "ثلاجة بابين مع فريزر سفلي"
  },
  {
    name: "غسالة LG أوتوماتيك 9 كيلو",
    name_en: "LG Washing Machine 9kg",
    price: 650000, // 650,000 د.ع
    main_store_name: "hawranj",
    description: "غسالة أوتوماتيكية بسعة 9 كيلو"
  },
  {
    name: "طباخ غاز 4 عيون ستانلس",
    name_en: "4 Burner Gas Stove Stainless",
    price: 280000, // 280,000 د.ع
    main_store_name: "hawranj",
    description: "طباخ غاز من الستانلس ستيل"
  },
  {
    name: "سماعة JBL بلوتوث",
    name_en: "JBL Bluetooth Speaker",
    price: 120000, // 120,000 د.ع
    main_store_name: "hawranj",
    description: "سماعة لاسلكية عالية الجودة"
  }
];

export async function createRealProducts(): Promise<{ success: boolean; error?: string; created?: number }> {
  try {
    console.log('🏪 بدء إنشاء المنتجات الحقيقية...');

    // إدراج المنتجات في قاعدة البيانات
    const { data, error } = await supabase
      .from('products')
      .upsert(iraqiProducts, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('❌ خطأ في إنشاء المنتجات:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ تم إنشاء المنتجات بنجاح:', data?.length || 0);
    return { success: true, created: data?.length || 0 };

  } catch (error) {
    console.error('❌ خطأ عام في إنشاء المنتجات:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

export async function updateOrdersWithRealProducts(): Promise<{ success: boolean; error?: string; updated?: number }> {
  try {
    console.log('🔄 بدء تحديث الطلبات بأسماء منتجات حقيقية...');

    // الحصول على جميع الطلبات
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, items, order_code')
      .limit(50);

    if (ordersError) {
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      return { success: true, updated: 0 };
    }

    let updatedCount = 0;

    for (const order of orders) {
      try {
        let updated = false;

        // اختيار منتج عشوائي
        const randomProduct = iraqiProducts[Math.floor(Math.random() * iraqiProducts.length)];

        let newItems = order.items;

        // تحديث حقل items إذا كان موجود
        if (order.items && Array.isArray(order.items)) {
          newItems = order.items.map((item: any) => ({
            ...item,
            name: randomProduct.name,
            price: randomProduct.price,
            product_id: Math.floor(Math.random() * 1000) + 1
          }));
          updated = true;
        } else {
          // إنشاء items جديد إذا لم يكن موجود
          newItems = [{
            name: randomProduct.name,
            price: randomProduct.price,
            quantity: 1,
            product_id: Math.floor(Math.random() * 1000) + 1
          }];
          updated = true;
        }

        if (updated) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              items: newItems,
              total_amount: randomProduct.price,
              subtotal: randomProduct.price
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ خطأ في تحديث الطلب ${order.order_code}:`, updateError);
          } else {
            updatedCount++;
            console.log(`✅ تم تحديث الطلب ${order.order_code} بالمنتج: ${randomProduct.name}`);
          }
        }

      } catch (error) {
        console.error(`❌ خطأ في معالجة الطلب ${order.id}:`, error);
      }
    }

    console.log(`✅ تم تحديث ${updatedCount} طلب بأسماء منتجات حقيقية`);
    return { success: true, updated: updatedCount };

  } catch (error) {
    console.error('❌ خطأ عام في تحديث الطلبات:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

export async function updateOrderItemsWithRealProducts(): Promise<{ success: boolean; error?: string; updated?: number }> {
  try {
    console.log('🔄 بدء تحديث order_items بأسماء منتجات حقيقية...');

    // الحصول على جميع order_items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_name, price, order_id')
      .limit(100);

    if (itemsError) {
      console.log('⚠️ جدول order_items غير موجود أو فارغ:', itemsError.message);
      return { success: true, updated: 0 };
    }

    if (!orderItems || orderItems.length === 0) {
      return { success: true, updated: 0 };
    }

    let updatedCount = 0;

    for (const item of orderItems) {
      try {
        // اختيار منتج عشوائي
        const randomProduct = iraqiProducts[Math.floor(Math.random() * iraqiProducts.length)];

        const { error: updateError } = await supabase
          .from('order_items')
          .update({ 
            product_name: randomProduct.name,
            price: randomProduct.price
          })
          .eq('id', item.id);

        if (updateError) {
          console.error(`❌ خطأ في تحديث order_item ${item.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ تم تحديث order_item ${item.id} بالمنتج: ${randomProduct.name}`);
        }

      } catch (error) {
        console.error(`❌ خطأ في معالجة order_item ${item.id}:`, error);
      }
    }

    console.log(`✅ تم تحديث ${updatedCount} order_item بأسماء منتجات حقيقية`);
    return { success: true, updated: updatedCount };

  } catch (error) {
    console.error('❌ خطأ عام في تحديث order_items:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

export async function setupRealProductSystem(): Promise<{ success: boolean; error?: string; results?: any }> {
  console.log('🚀 بدء إعداد نظام المنتجات الحقيقية...');

  const results = {
    products: await createRealProducts(),
    orders: await updateOrdersWithRealProducts(),
    orderItems: await updateOrderItemsWithRealProducts()
  };

  const allSuccess = results.products.success && results.orders.success && results.orderItems.success;

  if (allSuccess) {
    console.log('🎉 تم إعداد نظام المنتجات الحقيقية بنجاح!');
    return { success: true, results };
  } else {
    console.log('⚠️ تم إعداد النظام مع بعض المشاكل');
    return { success: false, results };
  }
}
