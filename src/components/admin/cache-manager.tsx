'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, Server, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CacheStatus {
  status: string;
  cacheItems: string[];
  stats: { size: number; maxSize: number };
  memoryUsage: { heapTotal: number; heapUsed: number; external: number; rss: number };
}

export function CacheManager() {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; clearedItems: string[] } | null>(null);
  const { toast } = useToast();

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cache');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch cache status:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    if (!confirm('Are you sure you want to clear all caches? This will force fresh data to be loaded.')) {
      return;
    }

    setClearing(true);
    setLastResult(null);
    
    try {
      const response = await fetch('/api/admin/cache', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        setLastResult(result);
        toast({
          title: result.success ? 'Cache Cleared!' : 'Cache Clear Partial',
          description: result.message,
        });
        // Refresh status after clearing
        fetchStatus();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear cache. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClearing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Cache Management
        </CardTitle>
        <CardDescription>
          Monitor and clear application caches to resolve stale data issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Button 
            variant="outline" 
            onClick={fetchStatus} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Status
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={clearCache} 
            disabled={clearing}
            className="w-full"
          >
            {clearing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Clear All Caches
          </Button>
        </div>

        {/* Status Display */}
        {status && (
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cache Status</span>
              <span className="flex items-center gap-2 text-sm">
                {status.status === 'active' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Active
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    {status.status}
                  </>
                )}
              </span>
            </div>
            
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">In-Memory Cache Entries</span>
                <span>{status.stats.size} / {status.stats.maxSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heap Used</span>
                <span>{formatBytes(status.memoryUsage.heapUsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heap Total</span>
                <span>{formatBytes(status.memoryUsage.heapTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RSS Memory</span>
                <span>{formatBytes(status.memoryUsage.rss)}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Cache Types: {status.cacheItems.join(', ')}
            </div>
          </div>
        )}

        {/* Last Result */}
        {lastResult && (
          <div className={`rounded-lg border p-4 ${lastResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {lastResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <span className={`text-sm font-medium ${lastResult.success ? 'text-green-800' : 'text-yellow-800'}`}>
                {lastResult.message}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {lastResult.clearedItems.length} items cleared
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
