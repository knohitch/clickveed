
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, DatabaseZap, Loader, Server, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { testDbConnection } from "@/server/actions/admin-actions";

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failure';
type DatabaseType = 'PostgreSQL (Production)';

export default function DatabasePage() {
    const { toast } = useToast();
    const [status, setStatus] = useState<ConnectionStatus>('testing');
    const [dbType] = useState<DatabaseType>('PostgreSQL (Production)');
    const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-check connection on page load
    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setStatus('testing');
        setErrorMessage(null);

        try {
            const result = await testDbConnection();
            setLastTestTime(new Date());
            
            if (result.success) {
                setStatus('success');
            } else {
                setStatus('failure');
                setErrorMessage(result.message);
            }
        } catch (error: any) {
            setStatus('failure');
            setErrorMessage(error.message || "An unexpected error occurred.");
            setLastTestTime(new Date());
        }
    };

    const handleTestConnection = async () => {
        toast({ title: "Testing Connection...", description: `Attempting to connect to the ${dbType}.` });
        
        await checkConnection();

        // Show toast based on result
        if (status === 'success') {
            toast({ title: "Connection Successful!", description: "Database is responding normally." });
        } else if (status === 'failure') {
            toast({ 
                variant: 'destructive',
                title: "Connection Failed", 
                description: errorMessage || "Unable to connect to database."
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

    const getStatusMessage = () => {
        switch (status) {
            case 'testing':
                return 'Testing database connection...';
            case 'success':
                return 'Connection successful - Database is healthy.';
            case 'failure':
                return errorMessage || 'Connection failed.';
            default:
                return 'Connection status is unknown.';
        }
    };

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
                        status === 'failure' && 'border-destructive/50 bg-destructive/10',
                        status === 'testing' && 'border-blue-500/50 bg-blue-500/10'
                    )}>
                        <div className="flex items-center gap-3">
                            <StatusIndicator />
                            <div>
                                <h3 className="font-semibold">
                                    {getStatusMessage()}
                                </h3>
                                {lastTestTime && (
                                    <div className="text-sm text-muted-foreground">
                                        Last checked: {lastTestTime.toLocaleTimeString()} on {lastTestTime.toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button onClick={handleTestConnection} disabled={status === 'testing'}>
                            {status === 'testing' ? (
                                <>
                                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Test Connection
                                </>
                            )}
                        </Button>
                    </div>

                    {status === 'failure' && errorMessage && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                            <h4 className="font-semibold text-destructive mb-2">Error Details</h4>
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                                {errorMessage}
                            </pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
