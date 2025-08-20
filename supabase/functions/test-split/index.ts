import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { orderId } = await req.json();
    
    console.log('🔍 Test split request received:', { orderId });

    if (!orderId) {
      return new Response(JSON.stringify({
        error: 'Missing orderId'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // إرجاع استجابة تجريبية
    return new Response(JSON.stringify({
      success: true,
      message: 'Test split function working',
      orderId: orderId,
      successful_splits: 2,
      total_stores: 2,
      notifications: [
        { storeName: 'متجر الإلكترونيات', success: true },
        { storeName: 'متجر الأزياء', success: true }
      ]
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Test split error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unexpected error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
