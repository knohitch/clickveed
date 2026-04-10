import AWS from 'aws-sdk';

// Wasabi S3-compatible storage configuration
export interface WasabiConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

// Bunny.net CDN configuration
export interface BunnyConfig {
  cdnUrl: string;
  apiKey?: string;
  storageZone?: string;
}

// Storage configuration
export interface StorageConfig {
  wasabi: WasabiConfig;
  bunny: BunnyConfig;
}

export interface StorageConnectionProbe {
  success: boolean;
  latencyMs: number;
  endpoint: string;
  bucket: string;
  checks: {
    headBucket: boolean;
    listObjects: boolean;
    writeDelete: boolean;
  };
  error?: string;
}

// Default configuration
const defaultConfig: StorageConfig = {
  wasabi: {
    endpoint: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: ''
  },
  bunny: {
    cdnUrl: '',
    apiKey: '',
    storageZone: ''
  }
};

function stripInvisibleChars(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function normalizeEndpointHost(endpoint: string): string {
  return stripInvisibleChars(endpoint).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function normalizeCdnUrl(cdnUrl: string): string {
  const cleaned = stripInvisibleChars(cdnUrl).replace(/\/+$/, '');
  if (!cleaned) return '';
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function getEnvValue(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function formatStorageError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

class StorageManager {
  private config: StorageConfig = defaultConfig;
  private s3Client: AWS.S3 | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize storage manager with configuration
   */
  async initialize(config?: Partial<StorageConfig>): Promise<void> {
    if (config) {
      this.config = {
        wasabi: { ...defaultConfig.wasabi, ...config.wasabi },
        bunny: { ...defaultConfig.bunny, ...config.bunny }
      };
    }

    this.config = {
      wasabi: {
        ...this.config.wasabi,
        endpoint: normalizeEndpointHost(this.config.wasabi.endpoint),
        region: stripInvisibleChars(this.config.wasabi.region),
        accessKeyId: stripInvisibleChars(this.config.wasabi.accessKeyId),
        secretAccessKey: stripInvisibleChars(this.config.wasabi.secretAccessKey),
        bucket: stripInvisibleChars(this.config.wasabi.bucket),
      },
      bunny: {
        ...this.config.bunny,
        cdnUrl: normalizeCdnUrl(this.config.bunny.cdnUrl),
        apiKey: stripInvisibleChars(this.config.bunny.apiKey || ''),
        storageZone: stripInvisibleChars(this.config.bunny.storageZone || ''),
      },
    };

    console.log('[Storage] Initializing with config:', {
      endpoint: this.config.wasabi.endpoint,
      region: this.config.wasabi.region,
      bucket: this.config.wasabi.bucket,
      hasAccessKey: !!this.config.wasabi.accessKeyId,
      hasSecretKey: !!this.config.wasabi.secretAccessKey,
    });

    // Initialize Wasabi S3 client if credentials are available
    if (
      this.config.wasabi.endpoint &&
      this.config.wasabi.region &&
      this.config.wasabi.accessKeyId &&
      this.config.wasabi.secretAccessKey &&
      this.config.wasabi.bucket
    ) {
      try {
        this.s3Client = new AWS.S3({
          endpoint: `https://${this.config.wasabi.endpoint}`,
          region: this.config.wasabi.region,
          credentials: {
            accessKeyId: this.config.wasabi.accessKeyId,
            secretAccessKey: this.config.wasabi.secretAccessKey,
          },
          s3ForcePathStyle: true, // Required for Wasabi
          signatureVersion: 'v4',
        });

        this.initialized = true;
        console.log('[Storage] S3 client initialized successfully');
      } catch (error) {
        console.error('[Storage] Failed to initialize S3 client:', error);
        this.initialized = false;
      }
    } else {
      console.warn('[Storage] Missing Wasabi credentials - storage will not work');
      this.initialized = false;
    }
  }

  /**
   * Ensure storage is initialized before performing operations.
   * Always reloads from database if not currently initialized,
   * so that credentials added after startup are picked up.
   */
  async ensureInitialized(): Promise<boolean> {
    if (this.initialized && this.s3Client) {
      return true;
    }

    // If already initializing, wait for it
    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.initialized;
    }

    // Try to initialize from database (always reload - credentials may have been added)
    console.log('[Storage] Not initialized, attempting to load credentials from database...');
    this.initializationPromise = initializeStorageFromDB();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }

    if (!this.initialized) {
      console.warn('[Storage] Still not initialized after DB reload. Check that Wasabi credentials are configured in admin settings.');
    }

    return this.initialized;
  }

  /**
   * Upload file to Wasabi storage
   */
  async uploadFile(file: File, key: string, options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{ url: string; key: string }> {
    if (!this.s3Client || !this.initialized) {
      throw new Error('Storage manager not initialized. Please configure Wasabi credentials.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadParams = {
      Bucket: this.config.wasabi.bucket,
      Key: key,
      Body: buffer,
      ContentType: options?.contentType || file.type,
      Metadata: options?.metadata || {},
      ACL: 'public-read' as const,
    };

    try {
      const result = await this.s3Client.upload(uploadParams).promise();

      return {
        url: result.Location,
        key: result.Key,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from Wasabi storage
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client || !this.initialized) {
      throw new Error('Storage manager not initialized');
    }

    const deleteParams = {
      Bucket: this.config.wasabi.bucket,
      Key: key,
    };

    try {
      await this.s3Client.deleteObject(deleteParams).promise();
    } catch (error) {
      console.error('Delete failed:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file URL from Wasabi storage
   */
  getFileUrl(key: string): string {
    if (!this.initialized) {
      throw new Error('Storage manager not initialized');
    }

    return `https://${this.config.wasabi.bucket}.${normalizeEndpointHost(this.config.wasabi.endpoint)}/${key}`;
  }

  /**
   * Get CDN URL for file (Bunny.net)
   */
  getCdnUrl(key: string): string {
    if (this.config.bunny.cdnUrl) {
      return `${normalizeCdnUrl(this.config.bunny.cdnUrl)}/${key}`;
    }
    return this.getFileUrl(key);
  }

  /**
   * Generate a time-limited signed URL for private object reads.
   */
  async getSignedReadUrl(key: string, expiresSeconds = 3600): Promise<string> {
    if (!this.s3Client || !this.initialized) {
      throw new Error('Storage manager not initialized');
    }

    const safeKey = key.replace(/^\/+/, '');
    return this.s3Client.getSignedUrlPromise('getObject', {
      Bucket: this.config.wasabi.bucket,
      Key: safeKey,
      Expires: expiresSeconds,
    });
  }

  /**
   * Upload file and return both storage and CDN URLs
   */
  async uploadAndGetUrls(file: File, key: string, options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{ storageUrl: string; cdnUrl: string; key: string }> {
    const uploadResult = await this.uploadFile(file, key, options);

    return {
      storageUrl: uploadResult.url,
      cdnUrl: this.getCdnUrl(key),
      key: uploadResult.key,
    };
  }

  /**
   * Run an active connectivity probe against Wasabi.
   * This validates credentials and bucket reachability beyond static config checks.
   */
  async probeConnection(options?: { validateWriteDelete?: boolean }): Promise<StorageConnectionProbe> {
    const start = Date.now();
    const checks = {
      headBucket: false,
      listObjects: false,
      writeDelete: false,
    };

    if (!this.s3Client || !this.initialized) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        endpoint: this.config.wasabi.endpoint || 'NOT_SET',
        bucket: this.config.wasabi.bucket || 'NOT_SET',
        checks,
        error: 'Storage manager not initialized',
      };
    }

    try {
      await this.s3Client.headBucket({
        Bucket: this.config.wasabi.bucket,
      }).promise();
      checks.headBucket = true;

      await this.s3Client.listObjectsV2({
        Bucket: this.config.wasabi.bucket,
        MaxKeys: 1,
      }).promise();
      checks.listObjects = true;

      if (options?.validateWriteDelete) {
        const probeKey = `healthchecks/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`;
        const body = Buffer.from('storage-probe');

        await this.s3Client.putObject({
          Bucket: this.config.wasabi.bucket,
          Key: probeKey,
          Body: body,
          ContentType: 'text/plain',
          ACL: 'private',
        }).promise();

        await this.s3Client.deleteObject({
          Bucket: this.config.wasabi.bucket,
          Key: probeKey,
        }).promise();

        checks.writeDelete = true;
      }

      return {
        success: true,
        latencyMs: Date.now() - start,
        endpoint: this.config.wasabi.endpoint,
        bucket: this.config.wasabi.bucket,
        checks,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        endpoint: this.config.wasabi.endpoint || 'NOT_SET',
        bucket: this.config.wasabi.bucket || 'NOT_SET',
        checks,
        error: formatStorageError(error),
      };
    }
  }

  /**
   * Check if storage is properly configured
   */
  isConfigured(): boolean {
    return this.initialized && !!(
      this.config.wasabi.endpoint &&
      this.config.wasabi.region &&
      this.config.wasabi.accessKeyId &&
      this.config.wasabi.secretAccessKey &&
      this.config.wasabi.bucket
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<StorageConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    // Reinitialize if Wasabi config changed
    if (newConfig.wasabi) {
      this.initialized = false;
      this.s3Client = null;
      await this.initialize();
      console.log('[Storage] Config updated and reinitialized, status:', this.initialized);
    }
  }
}

// Export singleton instance
export const storageManager = new StorageManager();

// Helper functions for common operations
export const uploadMediaFile = async (file: File, userId: string): Promise<{ storageUrl: string; cdnUrl: string; key: string }> => {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'bin';
  const key = `media/${userId}/${timestamp}.${extension}`;

  return await storageManager.uploadAndGetUrls(file, key, {
    contentType: file.type,
    metadata: {
      originalName: file.name,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    },
  });
};

export const deleteMediaFile = async (key: string): Promise<void> => {
  return await storageManager.deleteFile(key);
};

export const getMediaUrl = (key: string, useCDN = true): string => {
  return useCDN ? storageManager.getCdnUrl(key) : storageManager.getFileUrl(key);
};

/**
 * Initialize storage with admin settings from database
 * This should be called server-side to get current settings
 */
export const initializeStorageFromDB = async (): Promise<void> => {
  try {
    // Dynamic import to avoid circular dependency
    const { getAdminSettings } = await import('@/server/actions/admin-actions');
    const settings = await getAdminSettings();
    
    const storageConfig = {
      wasabi: {
        endpoint: settings.apiKeys.wasabiEndpoint || defaultConfig.wasabi.endpoint,
        region: settings.apiKeys.wasabiRegion || defaultConfig.wasabi.region,
        accessKeyId: settings.apiKeys.wasabiAccessKey || '',
        secretAccessKey: settings.apiKeys.wasabiSecretKey || '',
        bucket: settings.apiKeys.wasabiBucket || defaultConfig.wasabi.bucket,
      },
      bunny: {
        cdnUrl: settings.apiKeys.bunnyCdnUrl || defaultConfig.bunny.cdnUrl,
        apiKey: settings.apiKeys.bunnyApiKey || '',
        storageZone: settings.apiKeys.bunnyStorageZone || defaultConfig.bunny.storageZone,
      },
    };

    await storageManager.initialize(storageConfig);
  } catch (error) {
    console.warn('Failed to initialize storage from database, falling back to env vars:', error);
    
    // Fallback to environment variables
    const wasabiConfig = {
      wasabi: {
        endpoint: getEnvValue('WASABI_ENDPOINT') || defaultConfig.wasabi.endpoint,
        region: getEnvValue('WASABI_REGION') || defaultConfig.wasabi.region,
        accessKeyId: getEnvValue('WASABI_ACCESS_KEY_ID', 'WASABI_ACCESS_KEY') || '',
        secretAccessKey: getEnvValue('WASABI_SECRET_ACCESS_KEY', 'WASABI_SECRET_KEY') || '',
        bucket: getEnvValue('WASABI_BUCKET') || defaultConfig.wasabi.bucket,
      },
      bunny: {
        cdnUrl: getEnvValue('BUNNY_CDN_URL') || defaultConfig.bunny.cdnUrl,
        apiKey: getEnvValue('BUNNY_API_KEY') || '',
        storageZone: getEnvValue('BUNNY_STORAGE_ZONE') || defaultConfig.bunny.storageZone,
      },
    };

    await storageManager.initialize(wasabiConfig);
  }
};

// Initialize with environment variables if available (fallback)
if (typeof window === 'undefined') { // Server-side only
  const wasabiConfig = {
    wasabi: {
      endpoint: getEnvValue('WASABI_ENDPOINT') || defaultConfig.wasabi.endpoint,
      region: getEnvValue('WASABI_REGION') || defaultConfig.wasabi.region,
      accessKeyId: getEnvValue('WASABI_ACCESS_KEY_ID', 'WASABI_ACCESS_KEY') || '',
      secretAccessKey: getEnvValue('WASABI_SECRET_ACCESS_KEY', 'WASABI_SECRET_KEY') || '',
      bucket: getEnvValue('WASABI_BUCKET') || defaultConfig.wasabi.bucket,
    },
    bunny: {
      cdnUrl: getEnvValue('BUNNY_CDN_URL') || defaultConfig.bunny.cdnUrl,
      apiKey: getEnvValue('BUNNY_API_KEY') || '',
      storageZone: getEnvValue('BUNNY_STORAGE_ZONE') || defaultConfig.bunny.storageZone,
    },
  };

  storageManager.initialize(wasabiConfig);
}
