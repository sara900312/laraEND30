import { supabase } from '@/integrations/supabase/client';

interface TestDivisionData {
  originalOrderCode: string;
  customerName: string;
  customerPhone: string;
  divisions: {
    storeName: string;
    items: any[];
    totalAmount: number;
    status: 'pending' | 'assigned' | 'preparing' | 'ready' | 'delivered' | 'returned' | 'rejected';
    storeResponseStatus?: 'available' | 'unavailable' | 'accepted' | 'rejected' | 'pending';
    rejectionReason?: string;
  }[];
}

export const createTestOrderDivisions = async (testData: TestDivisionData) => {
  try {
    console.log('🧪 إنشاء تقسيمات تجريبية للطلب:', testData.originalOrderCode);
    
    const results = [];
    
    for (const division of testData.divisions) {
      // إنشاء طلب تقسيم لكل متجر
      const orderData = {
        customer_name: testData.customerName,
        customer_phone: testData.customerPhone,
        customer_address: 'عنوان تجريبي',
        customer_notes: 'طلب تجريبي لاختبار التقسيمات',
        order_status: division.status,
        main_store_name: division.storeName,
        items: division.items,
        total_amount: division.totalAmount,
        order_details: `تم تقسيمه من الطلب الأصلي ${testData.originalOrderCode}`,
        store_response_status: division.storeResponseStatus || null,
        rejection_reason: division.rejectionReason || null,
        store_response_at: division.storeResponseStatus ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      };

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) {
        console.error(`❌ فشل في إنشاء تقسيم للمتجر ${division.storeName}:`, error);
        results.push({ storeName: division.storeName, success: false, error: error.message });
      } else {
        console.log(`✅ تم إنشاء تقسيم للمتجر ${division.storeName}:`, newOrder.id);
        
        // إنشاء order_items منفصلة
        const orderItemsToInsert = division.items.map(item => ({
          order_id: newOrder.id,
          product_name: item.name || item.product_name,
          quantity: item.quantity || 1,
          price: item.price || 0,
          discounted_price: item.discounted_price || item.price || 0,
          main_store_name: division.storeName
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) {
          console.warn(`⚠️ فشل في إنشاء order_items للمتجر ${division.storeName}:`, itemsError);
        }
        
        results.push({ 
          storeName: division.storeName, 
          success: true, 
          orderId: newOrder.id,
          status: division.status,
          storeResponseStatus: division.storeResponseStatus
        });
      }
    }
    
    return {
      success: true,
      originalOrderCode: testData.originalOrderCode,
      totalDivisions: testData.divisions.length,
      results
    };
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء التقسيمات التجريبية:', error);
    throw error;
  }
};

// بيانات تجريبية جا��زة
export const sampleTestData: TestDivisionData[] = [
  {
    originalOrderCode: 'TEST-001',
    customerName: 'أحمد محمد',
    customerPhone: '07801234567',
    divisions: [
      {
        storeName: 'متجر الإلكترونيات الحديثة',
        items: [
          { name: 'هاتف ذكي', quantity: 1, price: 500000, discounted_price: 450000 },
          { name: 'سماعات بلوتوث', quantity: 2, price: 75000, discounted_price: 70000 }
        ],
        totalAmount: 590000,
        status: 'delivered',
        storeResponseStatus: 'available'
      },
      {
        storeName: 'متجر الأجهزة المنزلية',
        items: [
          { name: 'مكواة كهربائية', quantity: 1, price: 120000, discounted_price: 110000 }
        ],
        totalAmount: 110000,
        status: 'assigned',
        storeResponseStatus: 'pending'
      },
      {
        storeName: 'متجر الملابس العصرية',
        items: [
          { name: 'قميص رجالي', quantity: 3, price: 50000, discounted_price: 45000 }
        ],
        totalAmount: 135000,
        status: 'rejected',
        storeResponseStatus: 'unavailable',
        rejectionReason: 'المقاس المطلوب غير متوفر'
      }
    ]
  },
  {
    originalOrderCode: 'TEST-002',
    customerName: 'فاطمة علي',
    customerPhone: '07701234567',
    divisions: [
      {
        storeName: 'متجر مستحضرات التجميل',
        items: [
          { name: 'كريم مرطب', quantity: 2, price: 80000, discounted_price: 75000 },
          { name: 'أحمر شفاه', quantity: 1, price: 45000, discounted_price: 40000 }
        ],
        totalAmount: 190000,
        status: 'delivered',
        storeResponseStatus: 'available'
      },
      {
        storeName: 'متجر الإكسسوارات النسائية',
        items: [
          { name: 'حقيبة يد', quantity: 1, price: 200000, discounted_price: 180000 }
        ],
        totalAmount: 180000,
        status: 'delivered',
        storeResponseStatus: 'available'
      }
    ]
  }
];

// دالة لإنشاء جميع البيانات التجريبية
export const createAllTestDivisions = async () => {
  const results = [];
  
  for (const testData of sampleTestData) {
    try {
      const result = await createTestOrderDivisions(testData);
      results.push(result);
    } catch (error) {
      console.error(`❌ فشل في إنشاء التقسيمات لـ ${testData.originalOrderCode}:`, error);
      results.push({
        success: false,
        originalOrderCode: testData.originalOrderCode,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  }
  
  return results;
};

export default createTestOrderDivisions;
