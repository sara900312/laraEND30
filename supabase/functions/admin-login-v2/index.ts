import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

// Default admin credentials (these should be moved to Supabase secrets in production)
const DEFAULT_ADMIN_EMAIL = 'admin@laraend.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed. Use POST.'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Parse request body
    const body = await req.json();
    const { email, password } = body;

    console.log(`🔐 Admin login attempt:`, {
      email,
      hasPassword: !!password,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // First, try to get admin credentials from secrets table
    let validEmail = DEFAULT_ADMIN_EMAIL;
    let validPassword = DEFAULT_ADMIN_PASSWORD;

    try {
      // Try to get admin credentials from database
      const { data: adminEmailSecret } = await supabase
        .from('secrets')
        .select('value')
        .eq('name', 'admin_email')
        .single();

      const { data: adminPasswordSecret } = await supabase
        .from('secrets')
        .select('value')
        .eq('name', 'admin_password')
        .single();

      if (adminEmailSecret?.value) {
        validEmail = adminEmailSecret.value;
      }
      if (adminPasswordSecret?.value) {
        validPassword = adminPasswordSecret.value;
      }

      console.log(`🔑 Using credentials from database`, {
        hasCustomEmail: !!adminEmailSecret?.value,
        hasCustomPassword: !!adminPasswordSecret?.value
      });
    } catch (secretError) {
      console.log(`⚠️ Could not fetch admin credentials from database, using defaults:`, secretError.message);
    }

    // Validate credentials
    if (email.toLowerCase().trim() === validEmail.toLowerCase().trim() && 
        password === validPassword) {
      
      console.log(`✅ Admin login successful for:`, email);

      // You could also create/update a session record in the database here
      // For now, we just return success
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Login successful',
        user: {
          email: email,
          role: 'admin',
          loginTime: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      console.log(`❌ Admin login failed for:`, email);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email or password'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('❌ Admin login edge function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
