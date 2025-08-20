/**
 * 🧪 اختبار بسيط جداً لـ Edge Functions
 * للتأكد من عملها بدون تعقيدات
 */

import React, { useState } from 'react';

const SimpleEdgeTest = () => {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // اختبار manual assignment (using auto-assign-orders with manual mode)
  const testAssignOrder = async () => {
    setIsLoading(true);
    setResult('');

    try {
      // قيم تجريبية
      const orderId = 'test-order-123';
      const storeId = 'test-store-456';

      console.log('🔵 Testing auto-assign-orders (manual mode) with:', { orderId, storeId });

      const res = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId // إضافة x-store-id كما هو مطلوب
          // بدون Authorization header كما هو مقترح
        },
        body: JSON.stringify({ orderId, storeId, mode: 'manual' }),
      });

      console.log('📨 Response status:', res.status, res.statusText);
      console.log('📨 Response headers:', Object.fromEntries(res.headers.entries()));

      // Read response only once and store it
      const data = await res.json();

      if (!res.ok) {
        console.error('❌ Error response:', data);
        setResult(`❌ Error ${res.status}: ${data.error || res.statusText}`);
        return;
      }
      console.log('✅ Success response:', data);
      setResult(`✅ Success: ${JSON.stringify(data, null, 2)}`);

    } catch (error) {
      console.error('🔴 Network error:', error);
      setResult(`🔴 Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // اختبار auto-assign-orders
  const testAutoAssign = async () => {
    setIsLoading(true);
    setResult('');

    try {
      console.log('🔵 Testing auto-assign-orders');

      const res = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // بدون Authorization header كما هو مقترح
        },
        body: JSON.stringify({}),
      });

      console.log('📨 Response status:', res.status, res.statusText);

      // Read response only once and store it
      const data = await res.json();

      if (!res.ok) {
        console.error('❌ Error response:', data);
        setResult(`❌ Error ${res.status}: ${data.error || res.statusText}`);
        return;
      }

      console.log('✅ Success response:', data);
      setResult(`✅ Success: ${JSON.stringify(data, null, 2)}`);
      
    } catch (error) {
      console.error('🔴 Network error:', error);
      setResult(`🔴 Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // اختبار get-order
  const testGetOrder = async () => {
    setIsLoading(true);
    setResult('');

    try {
      const orderId = 'test-order-123';
      const storeId = 'test-store-uuid'; // UUID للمتجر

      console.log('🔵 Testing get-order with:', { orderId, storeId });

      // Use GET method with query parameters as per documentation
      const url = new URL('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order');
      url.searchParams.append('orderId', orderId);
      url.searchParams.append('adminMode', 'false'); // Store mode, not admin

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId // Required header for store requests
          // بدون Authorization header كما هو مقترح
        },
      });
      
      console.log('📨 Response status:', res.status, res.statusText);

      // Read response only once and store it
      const data = await res.json();

      if (!res.ok) {
        console.error('❌ Error response:', data);
        setResult(`❌ Error ${res.status}: ${data.error || res.statusText}`);
        return;
      }

      console.log('✅ Success response:', data);
      setResult(`✅ Success: ${JSON.stringify(data, null, 2)}`);
      
    } catch (error) {
      console.error('🔴 Network error:', error);
      setResult(`🔴 Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // اختبار الاتصال فقط (GET request)
  const testConnection = async () => {
    setIsLoading(true);
    setResult('');
    
    try {
      console.log('🔵 Testing connection to auto-assign-orders (GET)');

      const res = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders');
      
      console.log('📨 Response status:', res.status, res.statusText);
      console.log('📨 Response headers:', Object.fromEntries(res.headers.entries()));
      
      const text = await res.text();
      console.log('📨 Response text:', text);
      
      setResult(`Connection test: Status ${res.status} - ${res.statusText}\nResponse: ${text}`);
      
    } catch (error) {
      console.error('🔴 Network error:', error);
      setResult(`🔴 Connection Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 Simple Edge Functions Test</h1>
      <p>اختبار بسيط للـ Edge Functions - تحقق من Console (F12) للتفاصيل</p>
      
      <div style={{ margin: '20px 0' }}>
        <h3>URLs being tested:</h3>
        <ul>
          <li>https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders (manual mode)</li>
          <li>https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/auto-assign-orders</li>
          <li>https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/get-order</li>
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button 
          onClick={testConnection} 
          disabled={isLoading}
          style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {isLoading ? '⏳ جاري الاختبار...' : '🔗 Test Connection'}
        </button>
        
        <button 
          onClick={testAssignOrder} 
          disabled={isLoading}
          style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {isLoading ? '⏳ جاري الاختبار...' : '🎯 Test Manual Assignment'}
        </button>
        
        <button 
          onClick={testAutoAssign} 
          disabled={isLoading}
          style={{ padding: '10px', backgroundColor: '#ffc107', color: 'black', border: 'none', cursor: 'pointer' }}
        >
          {isLoading ? '⏳ جاري الاختبار...' : '⚡ Test auto-assign'}
        </button>
        
        <button 
          onClick={testGetOrder} 
          disabled={isLoading}
          style={{ padding: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {isLoading ? '⏳ جاري الاختبار...' : '📋 Test get-order'}
        </button>
      </div>
      
      {result && (
        <div style={{ 
          backgroundColor: result.includes('❌') || result.includes('🔴') ? '#f8d7da' : '#d4edda',
          padding: '15px', 
          border: '1px solid #ccc', 
          borderRadius: '5px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <strong>Result:</strong><br />
          {result}
        </div>
      )}
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>تعليمات:</strong></p>
        <ul>
          <li>افتح Console (F12) لرؤية جميع الـ logs</li>
          <li>إذا ظهر "Unexpected end of JSON input" فهذا يعني أن الدالة موجودة</li>
          <li>إذا ظهر 404 فهذا يعني أن الدالة غير موجودة</li>
          <li>إذا ظهر CORS error فهناك مشكلة في إعدادات Supabase</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleEdgeTest;
