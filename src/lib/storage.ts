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

// Default configuration
const defaultConfig: StorageConfig = {
  wasabi: {
    endpoint: 's3.wasabisys.com',
    region: 'us-west-1',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: 'clickvid-media'
  },
  bunny: {
    cdnUrl: 'https://clickvid.b-cdn.net',
    apiKey: '',
    storageZone: 'clickvid-storage'
  }
};

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

    console.log('[Storage] Initializing with config:', {
      endpoint: this.config.wasabi.endpoint,
      region: this.config.wasabi.region,
      bucket: this.config.wasabi.bucket,
      hasAccessKey: !!this.config.wasabi.accessKeyId,
      hasSecretKey: !!this.config.wasabi.secretAccessKey,
    });

    // Initialize Wasabi S3 client if credentials are available
    if (this.config.wasabi.accessKeyId && this.config.wasabi.secretAccessKey) {
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

    return `https://${this.config.wasabi.bucket}.${this.config.wasabi.endpoint}/${key}`;
  }

  /**
   * Get CDN URL for file (Bunny.net)
   */
  getCdnUrl(key: string): string {
    return `${this.config.bunny.cdnUrl}/${key}`;
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
   * Check if storage is properly configured
   */
  isConfigured(): boolean {
    return this.initialized && !!(
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
        endpoint: process.env.WASABI_ENDPOINT || defaultConfig.wasabi.endpoint,
        region: process.env.WASABI_REGION || defaultConfig.wasabi.region,
        accessKeyId: process.env.WASABI_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY || '',
        bucket: process.env.WASABI_BUCKET || defaultConfig.wasabi.bucket,
      },
      bunny: {
        cdnUrl: process.env.BUNNY_CDN_URL || defaultConfig.bunny.cdnUrl,
        apiKey: process.env.BUNNY_API_KEY || '',
        storageZone: process.env.BUNNY_STORAGE_ZONE || defaultConfig.bunny.storageZone,
      },
    };

    await storageManager.initialize(wasabiConfig);
  }
};

// Initialize with environment variables if available (fallback)
if (typeof window === 'undefined') { // Server-side only
  const wasabiConfig = {
    wasabi: {
      endpoint: process.env.WASABI_ENDPOINT || defaultConfig.wasabi.endpoint,
      region: process.env.WASABI_REGION || defaultConfig.wasabi.region,
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY || '',
      bucket: process.env.WASABI_BUCKET || defaultConfig.wasabi.bucket,
    },
    bunny: {
      cdnUrl: process.env.BUNNY_CDN_URL || defaultConfig.bunny.cdnUrl,
      apiKey: process.env.BUNNY_API_KEY || '',
      storageZone: process.env.BUNNY_STORAGE_ZONE || defaultConfig.bunny.storageZone,
    },
  };

  storageManager.initialize(wasabiConfig);
}
