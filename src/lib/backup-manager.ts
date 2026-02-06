import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Create a database backup
 */
export async function createDatabaseBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Check if DATABASE_URL is configured
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return {
        success: false,
        error: 'DATABASE_URL not configured'
      };
    }

    // Extract database name from URL
    const dbNameMatch = dbUrl.match(/\/([^?]+)(\?|$)/);
    const dbName = dbNameMatch ? dbNameMatch[1] : 'unknown';
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate timestamp for backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${dbName}-${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFileName);

    // For PostgreSQL, use pg_dump
    if (dbUrl.includes('postgres')) {
      const pgDumpCmd = `pg_dump "${dbUrl}" > "${backupPath}"`;
      execSync(pgDumpCmd, { stdio: 'inherit' });
    } else {
      // For other databases, we might need different approaches
      return {
        success: false,
        error: 'Unsupported database type for backup'
      };
    }

    // Verify backup was created
    if (fs.existsSync(backupPath)) {
      console.log(`✅ Database backup created: ${backupPath}`);
      return {
        success: true,
        path: backupPath
      };
    } else {
      return {
        success: false,
        error: 'Backup file was not created'
      };
    }
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Clean old backups (keep only last 7 days)
 */
export async function cleanupOldBackups(): Promise<void> {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days ago

    const files = fs.readdirSync(backupDir);
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Removed old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Backup cleanup failed:', error);
  }
}

/**
 * Get backup status
 */
export function getBackupStatus(): { 
  backupDir: string; 
  lastBackup?: string; 
  backupCount: number 
} {
  const backupDir = path.join(process.cwd(), 'backups');
  let lastBackup: string | undefined;
  let backupCount = 0;

  try {
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      backupCount = files.length;
      
      if (files.length > 0) {
        // Sort by modification time descending
        const sortedFiles = files
          .map(file => ({
            name: file,
            mtime: fs.statSync(path.join(backupDir, file)).mtime
          }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        
        lastBackup = sortedFiles[0].name;
      }
    }
  } catch (error) {
    console.error('❌ Failed to get backup status:', error);
  }

  return {
    backupDir,
    lastBackup,
    backupCount
  };
}
