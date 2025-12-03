import os from 'os';
import fs from 'fs';

/**
 * Get system resource usage
 */
export function getSystemResources(): {
  cpu: {
    load: number;
    cores: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  uptime: number;
} {
  // CPU Load
  const load = os.loadavg()[0]; // 1-minute load average
  const cores = os.cpus().length;

  // Memory Usage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

  // Disk Usage (root partition)
  let diskTotal = 0;
  let diskFree = 0;
  let diskUsed = 0;
  let diskPercentage = 0;

  try {
    const diskStats = fs.statfsSync('/');
    diskTotal = diskStats.blocks * diskStats.bsize;
    diskFree = diskStats.bavail * diskStats.bsize;
    diskUsed = diskTotal - diskFree;
    diskPercentage = Math.round((diskUsed / diskTotal) * 100);
  } catch (error) {
    console.warn('Could not get disk usage:', error);
  }

  // Uptime
  const uptime = os.uptime();

  return {
    cpu: {
      load,
      cores
    },
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      percentage: memoryPercentage
    },
    disk: {
      total: diskTotal,
      free: diskFree,
      used: diskUsed,
      percentage: diskPercentage
    },
    uptime
  };
}

/**
 * Get Node.js process metrics
 */
export function getNodeProcessMetrics(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
} {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers
  };
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get comprehensive resource status
 */
export function getResourceStatus(): {
  system: ReturnType<typeof getSystemResources>;
  process: ReturnType<typeof getNodeProcessMetrics>;
  formatted: {
    memory: string;
    disk: string;
    cpuLoad: string;
  };
} {
  const system = getSystemResources();
  const process = getNodeProcessMetrics();
  
  return {
    system,
    process,
    formatted: {
      memory: formatBytes(system.memory.used) + '/' + formatBytes(system.memory.total),
      disk: formatBytes(system.disk.used) + '/' + formatBytes(system.disk.total),
      cpuLoad: system.cpu.load.toFixed(2) + ' (of ' + system.cpu.cores + ' cores)'
    }
  };
}
