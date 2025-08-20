import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  runNotificationsMigration, 
  checkNotificationsTableExists, 
  testNotificationsTable 
} from '@/utils/runNotificationsMigration';
import { storeNotificationService } from '@/services/storeNotificationService';

export default function DatabaseMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<{
    running: boolean;
    completed: boolean;
    success: boolean;
    message: string;
    details?: any;
  }>({
    running: false,
    completed: false,
    success: false,
    message: ''
  });

  const [tableStatus, setTableStatus] = useState<{
    checking: boolean;
    exists: boolean;
    canInsert: boolean;
    error?: any;
  }>({
    checking: false,
    exists: false,
    canInsert: false
  });

  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkTableStatus = async () => {
    setTableStatus(prev => ({ ...prev, checking: true }));
    
    try {
      const result = await testNotificationsTable();
      setTableStatus({
        checking: false,
        exists: result.exists,
        canInsert: result.canInsert,
        error: result.error
      });
      
      addTestResult(`Table check: exists=${result.exists}, canInsert=${result.canInsert}`);
    } catch (error) {
      setTableStatus({
        checking: false,
        exists: false,
        canInsert: false,
        error
      });
      addTestResult(`Table check failed: ${error}`);
    }
  };

  const runMigration = async () => {
    setMigrationStatus({
      running: true,
      completed: false,
      success: false,
      message: 'Starting migration...'
    });

    try {
      const result = await runNotificationsMigration();
      
      setMigrationStatus({
        running: false,
        completed: true,
        success: result.success,
        message: result.message,
        details: result.details
      });

      addTestResult(`Migration ${result.success ? 'succeeded' : 'failed'}: ${result.message}`);

      // Auto-check table status after migration
      if (result.success) {
        setTimeout(checkTableStatus, 1000);
      }

    } catch (error) {
      setMigrationStatus({
        running: false,
        completed: true,
        success: false,
        message: 'Migration failed with exception',
        details: error
      });
      addTestResult(`Migration exception: ${error}`);
    }
  };

  const testStoreNotification = async () => {
    addTestResult('Testing store notification service...');
    
    try {
      const result = await storeNotificationService.sendNotification({
        storeId: 'test-store-migration',
        title: 'Test Migration Notification',
        message: 'This is a test notification to verify the migration worked',
        type: 'general'
      });
      
      addTestResult(`Store notification test: ${result ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      addTestResult(`Store notification test failed: ${error}`);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Migration - Notifications System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This page helps fix the "Could not find the 'prompt' column of 'notifications' in the schema cache" error 
              by running the notifications table migration manually.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Table Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Table Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span>Notifications Table:</span>
                  <Badge variant={tableStatus.exists ? "default" : "destructive"}>
                    {tableStatus.exists ? "EXISTS" : "MISSING"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Can Insert:</span>
                  <Badge variant={tableStatus.canInsert ? "default" : "secondary"}>
                    {tableStatus.canInsert ? "YES" : "NO"}
                  </Badge>
                </div>

                <Button 
                  onClick={checkTableStatus} 
                  disabled={tableStatus.checking}
                  variant="outline" 
                  size="sm"
                >
                  {tableStatus.checking ? 'Checking...' : 'Check Status'}
                </Button>

                {tableStatus.error && (
                  <Alert>
                    <AlertDescription>
                      Error: {JSON.stringify(tableStatus.error, null, 2)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Migration Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Migration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {migrationStatus.completed && (
                  <div className="flex items-center gap-2">
                    <span>Last Migration:</span>
                    <Badge variant={migrationStatus.success ? "default" : "destructive"}>
                      {migrationStatus.success ? "SUCCESS" : "FAILED"}
                    </Badge>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  {migrationStatus.message || 'Ready to run migration'}
                </p>

                <Button 
                  onClick={runMigration} 
                  disabled={migrationStatus.running}
                  variant="default"
                >
                  {migrationStatus.running ? 'Running Migration...' : 'Run Migration'}
                </Button>

                {migrationStatus.details && (
                  <Alert>
                    <AlertDescription>
                      Details: {JSON.stringify(migrationStatus.details, null, 2)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={testStoreNotification} variant="outline">
              Test Store Notification
            </Button>
            <Button onClick={clearTestResults} variant="secondary">
              Clear Test Results
            </Button>
          </div>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-gray-500">No test results yet</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>First, click "Check Status" to see if the notifications table exists</li>
                <li>If the table is missing, click "Run Migration" to create it</li>
                <li>After migration, click "Check Status" again to verify</li>
                <li>Test the fix by clicking "Test Store Notification"</li>
                <li>Check the test results for any remaining errors</li>
              </ol>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
