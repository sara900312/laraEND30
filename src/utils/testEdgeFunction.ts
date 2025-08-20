// اختبار حالة Edge Function للتأكد من وجوده
export const testEdgeFunction = async (functionName: string) => {
  const baseUrl = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1';
  const url = `${baseUrl}/${functionName}`;
  
  try {
    console.log(`🔍 اختبار Edge Function: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrempvdmhsbGplYXF6b3l0cGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDY2MjIsImV4cCI6MjA2NDYyMjYyMn0.mx8PnQJaMochaPbjYUmwzlVNIULM05LUDBIM7OFFjZ8`,
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log(`📊 نتيجة الاختبار: ${response.status} ${response.statusText}`);
    
    if (response.status === 404) {
      return { exists: false, error: 'Edge Function غير موجود' };
    }
    
    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }
    
    return {
      exists: true,
      status: response.status,
      result: result
    };
    
  } catch (error) {
    console.error(`❌ خطأ في اختبار Edge Function:`, error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
};

// اختبار Edge Functions المتاحة
export const testAvailableEdgeFunctions = async () => {
  const functions = ['auto-assign-orders', 'get-order', 'split-order-by-stores'];
  const results = [];
  
  for (const func of functions) {
    const result = await testEdgeFunction(func);
    results.push({ function: func, ...result });
    
    // انتظار قصير بين الطلبات
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
};
