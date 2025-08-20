import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { testErrorHandling, testSupabaseErrorHandling } from '@/utils/testErrorHandling';
import { storeNotificationService } from '@/services/storeNotificationService';

export default function ErrorHandlingTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testStoreNotificationError = async () => {
    addResult('Testing store notification with invalid data...');
    
    try {
      // Try to send notification with invalid store ID to trigger an error
      const result = await storeNotificationService.sendNotification({
        storeId: 'invalid-store-id-that-does-not-exist',
        title: 'Test Error Notification',
        message: 'This should trigger an error',
        type: 'general'
      });
      
      addResult(`Notification result: ${result}`);
    } catch (error) {
      addResult(`Caught error: ${error}`);
    }
  };

  const runErrorHandlingTests = () => {
    addResult('Running error handling tests...');
    testErrorHandling();
    testSupabaseErrorHandling();
    addResult('Check console for test results');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Handling Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={runErrorHandlingTests}>
              Run Error Handling Tests
            </Button>
            <Button onClick={testStoreNotificationError} variant="outline">
              Test Store Notification Error
            </Button>
            <Button onClick={clearResults} variant="secondary">
              Clear Results
            </Button>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono bg-white p-2 rounded">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ul className="text-sm space-y-1">
              <li>1. Click "Run Error Handling Tests" to test error message extraction</li>
              <li>2. Click "Test Store Notification Error" to trigger a real Supabase error</li>
              <li>3. Check both the results above and the browser console</li>
              <li>4. Look for any "[object Object]" messages that should now be fixed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
