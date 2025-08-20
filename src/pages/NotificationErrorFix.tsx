import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { quickCheckNotificationsTable, quickCreateNotificationsTable } from '@/utils/quickNotificationCheck';
import { storeNotificationService } from '@/services/storeNotificationService';

export default function NotificationErrorFix() {
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    exists: boolean;
    error: string | null;
    needsMigration: boolean;
    fixed: boolean;
  }>({
    exists: false,
    error: null,
    needsMigration: true,
    fixed: false
  });

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const checkTable = async () => {
    setChecking(true);
    addLog('🔍 Checking notifications table status...');
    
    try {
      const result = await quickCheckNotificationsTable();
      setStatus({
        exists: result.exists,
        error: result.error,
        needsMigration: result.needsMigration,
        fixed: !result.needsMigration
      });

      if (result.exists && !result.needsMigration) {
        addLog('✅ Notifications table exists and is working correctly');
      } else if (result.exists && result.needsMigration) {
        addLog('⚠️ Notifications table exists but has issues');
      } else {
        addLog('❌ Notifications table does not exist');
      }

      if (result.error) {
        addLog(`Error: ${result.error}`);
      }

    } catch (error) {
      addLog(`❌ Error checking table: ${error}`);
    } finally {
      setChecking(false);
    }
  };

  const fixTable = async () => {
    setFixing(true);
    addLog('🔧 Creating notifications table...');
    
    try {
      const result = await quickCreateNotificationsTable();
      
      if (result.success) {
        addLog('✅ Notifications table created successfully!');
        setStatus(prev => ({ ...prev, exists: true, needsMigration: false, fixed: true }));
        
        // Re-check to confirm
        setTimeout(checkTable, 1000);
      } else {
        addLog(`❌ Failed to create table: ${result.error}`);
      }

    } catch (error) {
      addLog(`❌ Exception fixing table: ${error}`);
    } finally {
      setFixing(false);
    }
  };

  const testNotification = async () => {
    setTesting(true);
    addLog('🧪 Testing store notification...');
    
    try {
      const result = await storeNotificationService.sendNotification({
        storeId: 'test-store-fix',
        title: 'Test Notification After Fix',
        message: 'This is a test notification to verify the fix worked correctly.',
        type: 'general'
      });

      if (result) {
        addLog('✅ Store notification sent successfully!');
        addLog('🎉 The notification error has been fixed!');
      } else {
        addLog('❌ Store notification failed');
      }

    } catch (error) {
      addLog(`❌ Exception testing notification: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  // Auto-check on load
  useEffect(() => {
    checkTable();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Error Fix - Emergency Repair</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Error:</strong> "Could not find the 'prompt' column of 'notifications' in the schema cache"
              <br />
              <strong>Cause:</strong> The notifications table is missing from your database.
              <br />
              <strong>Solution:</strong> Create the table immediately using the fix button below.
            </AlertDescription>
          </Alert>

          {/* Status Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Table Exists:</span>
                  <Badge variant={status.exists ? "default" : "destructive"}>
                    {status.exists ? "YES" : "NO"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Needs Fix:</span>
                  <Badge variant={status.needsMigration ? "destructive" : "default"}>
                    {status.needsMigration ? "YES" : "NO"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={status.fixed ? "default" : "secondary"}>
                    {status.fixed ? "FIXED" : "NEEDS REPAIR"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={checkTable} 
              disabled={checking}
              variant="outline"
            >
              {checking ? '🔍 Checking...' : '🔍 Check Status'}
            </Button>

            <Button 
              onClick={fixTable} 
              disabled={fixing || !status.needsMigration}
              variant="default"
            >
              {fixing ? '🔧 Fixing...' : '🔧 Fix Now'}
            </Button>

            <Button 
              onClick={testNotification} 
              disabled={testing || status.needsMigration}
              variant="secondary"
            >
              {testing ? '🧪 Testing...' : '🧪 Test Fix'}
            </Button>
          </div>

          {/* Error Display */}
          {status.error && (
            <Alert>
              <AlertDescription>
                <strong>Current Error:</strong> {status.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {status.fixed && (
            <Alert>
              <AlertDescription>
                <strong>✅ Success!</strong> The notifications table has been created. 
                The "[object Object]" and "prompt column" errors should now be resolved.
              </AlertDescription>
            </Alert>
          )}

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Repair Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">Waiting for actions...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Fix Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>The page auto-checks the table status on load</li>
                <li>If the table is missing, click <strong>"Fix Now"</strong> to create it</li>
                <li>After fixing, click <strong>"Test Fix"</strong> to verify it works</li>
                <li>Monitor the repair log for detailed information</li>
                <li>Once fixed, the notification errors should stop appearing</li>
              </ol>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
