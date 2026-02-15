import { createHash } from 'crypto';

// CRITICAL: Explicitly set runtime to Node.js to prevent Edge Runtime analysis
// This fixes build errors from crypto not supported in Edge Runtime
export const runtime = 'nodejs';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
  action?: string;
  event?: string;
  operation?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  hash?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    // Create a hash for sensitive data masking
    if (context) {
      const maskedContext = this.maskSensitiveData(context);
      entry.context = maskedContext;
      entry.hash = this.createHash(JSON.stringify(maskedContext));
    }

    return entry;
  }

  private maskSensitiveData(context: LogContext): LogContext {
    const masked = { ...context };
    
    // Mask sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    
    const maskValue = (obj: any, path: string = ''): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const maskedObj = Array.isArray(obj) ? [...obj] : { ...obj };
      
      for (const key in maskedObj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          maskedObj[key] = '***MASKED***';
        } else if (typeof maskedObj[key] === 'object' && maskedObj[key] !== null) {
          maskedObj[key] = maskValue(maskedObj[key], currentPath);
        }
      }
      
      return maskedObj;
    };

    return maskValue(masked) as LogContext;
  }

  private createHash(data: string): string {
    return createHash('sha256').update(data).digest('hex').substring(0, 8);
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = entry.level === LogLevel.ERROR ? 'error' :
                       entry.level === LogLevel.WARN ? 'warn' :
                       entry.level === LogLevel.DEBUG ? 'debug' : 'log';
      
      console[logMethod](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context || '');
    }

    // In production, you would send to external logging service
    // this.sendToLoggingService(entry);
  }

  error(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context);
    this.addLog(entry);
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.addLog(entry);
  }

  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.addLog(entry);
  }

  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.addLog(entry);
  }

  // API request logging
  logApiRequest(method: string, url: string, context?: Partial<LogContext>): void {
    this.info(`API Request: ${method} ${url}`, {
      method,
      url,
      ...context
    });
  }

  logApiResponse(method: string, url: string, statusCode: number, duration: number, context?: Partial<LogContext>): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `API Response: ${method} ${url} - ${statusCode} (${duration}ms)`;
    
    this.addLog(this.createLogEntry(level, message, {
      method,
      url,
      statusCode,
      duration,
      ...context
    }));
  }

  // User action logging
  logUserAction(action: string, userId: string, context?: Partial<LogContext>): void {
    this.info(`User Action: ${action}`, {
      userId,
      action,
      ...context
    });
  }

  // Security event logging
  logSecurityEvent(event: string, context?: Partial<LogContext>): void {
    this.warn(`Security Event: ${event}`, {
      event,
      ...context
    });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, context?: Partial<LogContext>): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;
    
    this.addLog(this.createLogEntry(level, message, {
      operation,
      duration,
      ...context
    }));
  }

  // Business event logging
  logBusinessEvent(event: string, userId: string, context?: Partial<LogContext>): void {
    this.info(`Business Event: ${event}`, {
      userId,
      event,
      ...context
    });
  }

  // Get logs with filtering
  getLogs(filter?: {
    level?: LogLevel;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter?.userId) {
      filteredLogs = filteredLogs.filter(log => log.context?.userId === filter.userId);
    }

    if (filter?.startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= filter.startDate!);
    }

    if (filter?.endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= filter.endDate!);
    }

    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(-filter.limit);
    }

    return filteredLogs;
  }

  // Export logs for analysis
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'userId', 'sessionId', 'method', 'url', 'statusCode'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.timestamp,
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          log.context?.userId || '',
          log.context?.sessionId || '',
          log.context?.method || '',
          log.context?.url || '',
          log.context?.statusCode || ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }

    return JSON.stringify(this.logs, null, 2);
  }

  // Get log statistics
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    recentErrors: LogEntry[];
    topEndpoints: Array<{ url: string; count: number }>;
  } {
    const byLevel = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.DEBUG]: 0
    };

    const endpointCounts = new Map<string, number>();

    this.logs.forEach(log => {
      byLevel[log.level]++;
      
      if (log.context?.url) {
        endpointCounts.set(log.context.url, (endpointCounts.get(log.context.url) || 0) + 1);
      }
    });

    const recentErrors = this.logs
      .filter(log => log.level === LogLevel.ERROR)
      .slice(-10);

    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: this.logs.length,
      byLevel,
      recentErrors,
      topEndpoints
    };
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
