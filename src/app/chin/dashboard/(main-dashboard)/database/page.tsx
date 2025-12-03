

'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, DatabaseZap, Loader, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { testDbConnection } from "@/server/actions/admin-actions";

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failure';
type DatabaseType = 'PostgreSQL (Production)';

export default function DatabasePage() {
    const { toast } = useToast();
    const [status, setStatus] = useState<ConnectionStatus>('idle');
    const [dbType] = useState<DatabaseType>('PostgreSQL (Production)');

    const handleTestConnection = async () => {
        setStatus('testing');
        toast({ title: "Testing Connection...", description: `Attempting to connect to the ${dbType}.` });

        try {
            const result = await testDbConnection();
            if (result.success) {
                setStatus('success');
                toast({ title: "Connection Successful!", description: result.message });
            } else {
                setStatus('failure');
                toast({ 
                    variant: 'destructive',
                    title: "Connection Failed", 
                    description: result.message 
                });
            }
        } catch (error: any) {
             setStatus('failure');
             toast({ 
                variant: 'destructive',
                title: "Connection Failed", 
                description: error.message || "An unexpected error occurred."
            });
        }
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
                    Check the status of the application's database connection via Prisma Accelerate.
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
                                The application is connected to a persistent PostgreSQL database, configured via the DATABASE_URL environment variable and Prisma Accelerate.
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
        </div>
    );
}
