'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, DatabaseZap, Loader, Server, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failure';
type DatabaseType = 'PostgreSQL (Production)' | 'MySQL (Development)' | 'SQLite (Local)';

export default function ChinDatabasePage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [dbType, setDbType] = useState<DatabaseType>('PostgreSQL (Production)');

  const handleTestConnection = async () => {
    setStatus('testing');
    toast({ title: "Testing Connection...", description: `Attempting to connect to the ${dbType}.` });

    // Simulate API call
    setTimeout(() => {
      // Randomly determine success or failure for demo purposes
      const isSuccess = Math.random() > 0.3;
      
      if (isSuccess) {
        setStatus('success');
        toast({ title: "Connection Successful!", description: `Successfully connected to the ${dbType}.` });
      } else {
        setStatus('failure');
        toast({ 
          variant: 'destructive',
          title: "Connection Failed", 
          description: `Failed to connect to the ${dbType}. Please check your configuration.`
        });
      }
    }, 1500);
  };

  const StatusIndicator = () => {
    switch (status) {
      case 'testing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failure':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Server className="h-5 w-5 text-muted-foreground" />;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Database Connection</h1>
        <p className="text-muted-foreground">
          Check the status of the application's database connection.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Status</CardTitle>
          <CardDescription>
            This tool verifies that the application can communicate with its data store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Current Data Store
                <span className="text-primary font-bold">{dbType}</span>
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                The application is connected to a persistent database, configured via environment variables.
              </div>
            </CardHeader>
          </Card>

          <div className={cn(
            "flex items-center justify-between rounded-lg border p-4 transition-colors",
            status === 'success' && 'border-green-500/50 bg-green-500/10',
            status === 'failure' && 'border-destructive/50 bg-destructive/10'
          )}>
            <div className="flex items-center gap-3">
              <StatusIndicator />
              <div>
                <h3 className="font-semibold">
                  {status === 'idle' && 'Connection status is unknown.'}
                  {status === 'testing' && 'Testing database connection...'}
                  {status === 'success' && 'Connection successful.'}
                  {status === 'failure' && 'Connection failed.'}
                </h3>
                {status !== 'idle' && <div className="text-sm text-muted-foreground">Last test: {new Date().toLocaleTimeString()}</div>}
              </div>
            </div>
            <Button onClick={handleTestConnection} disabled={status === 'testing'}>
              <DatabaseZap className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Database Configuration</CardTitle>
          <CardDescription>Manage your database connection settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="dbType" className="text-sm font-medium">Database Type</label>
              <select 
                id="dbType" 
                className="w-full p-2 border rounded-md bg-background"
                value={dbType}
                onChange={(e) => setDbType(e.target.value as DatabaseType)}
              >
                <option value="PostgreSQL (Production)">PostgreSQL (Production)</option>
                <option value="MySQL (Development)">MySQL (Development)</option>
                <option value="SQLite (Local)">SQLite (Local)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="dbHost" className="text-sm font-medium">Host</label>
              <input 
                id="dbHost" 
                className="w-full p-2 border rounded-md bg-background"
                placeholder="localhost"
                defaultValue="db.example.com"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="dbPort" className="text-sm font-medium">Port</label>
              <input 
                id="dbPort" 
                className="w-full p-2 border rounded-md bg-background"
                placeholder="5432"
                defaultValue="5432"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="dbUser" className="text-sm font-medium">Username</label>
              <input 
                id="dbUser" 
                className="w-full p-2 border rounded-md bg-background"
                placeholder="username"
                defaultValue="admin"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="dbPassword" className="text-sm font-medium">Password</label>
              <input 
                id="dbPassword" 
                type="password"
                className="w-full p-2 border rounded-md bg-background"
                placeholder="••••••••"
                defaultValue="••••••••"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="dbName" className="text-sm font-medium">Database Name</label>
            <input 
              id="dbName" 
              className="w-full p-2 border rounded-md bg-background"
              placeholder="database_name"
              defaultValue="clickvid_production"
            />
          </div>
          
          <div className="flex justify-end">
            <Button>Save Configuration</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
