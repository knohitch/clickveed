# 🔐 OAuth and Placeholder URL Bugs - Detailed Fix List

**Focus:** Bugs requiring OAuth implementation and placeholder API fixes
**Total Bugs:** 5
**Est. Time:** ~20 hours (4 hours per OAuth bug + 2 hours per placeholder bug)

---

## 🔴 OAUTH IMPLEMENTATION BUGS (2 bugs - 8 hours)

### Bug 1: Google Veo - Wrong Authentication
**File:** `src/lib/ai/provider-clients.ts` (GoogleVeoClient)
**Current Issue:**
```typescript
// ❌ WRONG: Uses API key directly
const response = await axios.post(
  `${this.baseUrl}/v1/projects/-/locations/us-central1/publishers/google/models/${model}:predict`,
  {
    headers: {
      'Authorization': `Bearer ${this.apiKey}`, // ❌ This is wrong
    }
  }
);
```

**Why This Is Wrong:**
- Google Cloud Vertex AI doesn't use API keys
- Requires OAuth2 token from service account
- Using API key will fail with 401 Unauthorized

**What's Needed (4 hours):**
1. Install OAuth library
2. Create service account
3. Add credentials to environment
4. Implement token fetching
5. Add token refresh logic
6. Update all Google Cloud clients

---

### Bug 2: Google Imagen - Wrong Authentication
**File:** `src/lib/ai/provider-clients.ts` (ImagenClient)
**Current Issue:** Same as Google Veo - uses API key instead of OAuth

**What's Needed (4 hours):**
Same as Google Veo (can share implementation)

---

## 🔴 PLACEHOLDER URL BUGS (3 bugs - 6 hours)

### Bug 3: Wan AI - Returns 'placeholder-video-url'
**File:** `src/lib/ai/provider-clients.ts` (WanClient)
**Current Issue:**
```typescript
export async function generateVideo(prompt: string): Promise<VideoGenerationResponse> {
  try {
    // ❌ WRONG: Returns placeholder
    return {
      videoUrl: 'placeholder-video-url', // This is not real!
      model: 'wan-video',
      provider: 'wan'
    };
  } catch (error) {
    console.error('Wan video generation error:', error);
    throw error;
  }
}
```

**Why This Is Wrong:**
- Users think video generation works, but it's fake
- No actual API call made
- Wastes user's time
- No video generated

**What's Needed (2 hours):**
1. Get Wan AI API documentation
2. Find correct endpoints:
   - Start generation endpoint
   - Status check endpoint
   - Response format
3. Implement actual API calls
4. Add job polling (async video generation)
5. Add error handling
6. Test with real API key

---

### Bug 4: Seedance - Returns 'placeholder-video-url'
**File:** `src/lib/ai/provider-clients.ts` (SeedanceClient)
**Current Issue:** Same as Wan AI

**What's Needed (2 hours):**
1. Get Seedance API documentation
2. Implement actual API calls
3. Add job polling
4. Add error handling
5. Test with real API key

---

### Bug 5: HeyGen - Returns 'placeholder-video-url'
**File:** `src/lib/ai/provider-clients.ts` (HeyGenClient)
**Current Issue:** Same as Wan AI, but with avatar selection

**What's Needed (2 hours):**
1. Get HeyGen API documentation
2. Implement actual API calls
3. Add avatar selection logic
4. Add job polling
5. Add error handling
6. Test with real API key

---

## 🔧 OAUTH IMPLEMENTATION GUIDE

### Step 1: Install OAuth Library (10 minutes)
```bash
npm install google-auth-library
```

### Step 2: Create Google Cloud Service Account (15 minutes)

**In Google Cloud Console:**
1. Go to IAM & Admin > Service Accounts
2. Click "Create Service Account"
3. Name it: `clickveed-vertex-ai`
4. Grant roles: `Vertex AI User` and `Storage Object Viewer`
5. Click "Create"
6. Click "Manage Keys"
7. Create JSON key
8. Download and save as `google-service-account.json`

### Step 3: Add to Environment (5 minutes)
```bash
# Add to .env
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"
GOOGLE_APPLICATION_CREDENTIALS="path/to/google-service-account.json"
```

### Step 4: Implement OAuth Helper (1 hour)

Create new file: `src/lib/google-oauth-helper.ts`

```typescript
'use server';

import { GoogleAuth } from 'google-auth-library';

let cachedToken: { accessToken: string, expiresAt: number } | null = null;

/**
 * Get OAuth access token for Google Cloud
 * Auto-refreshes when expired
 */
export async function getGoogleAccessToken(): Promise<string> {
  // Check if we have a cached token
  const now = Date.now();
  const tokenExpiry = 5 * 60 * 1000; // 5 minutes
  
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.accessToken;
  }
  
  try {
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    const client = await auth.getClient();
    const accessToken = client.credentials.access_token;
    const expiryDate = client.credentials.expiry_date;
    
    // Cache the token
    cachedToken = {
      accessToken,
      expiresAt: expiryDate ? expiryDate.getTime() : now + tokenExpiry
    };
    
    console.log('[GoogleAuth] Token refreshed, expires at:', expiryDate);
    return accessToken;
  } catch (error) {
    console.error('[GoogleAuth] Error getting access token:', error);
    throw new Error('Failed to get Google Cloud access token. Please check your service account credentials.');
  }
}

/**
 * Clear cached token (call when credentials change)
 */
export function clearGoogleTokenCache(): void {
  cachedToken = null;
  console.log('[GoogleAuth] Token cache cleared');
}
```

### Step 5: Update Google Cloud Clients (1.5 hours)

**Update GoogleVeoClient in `src/lib/ai/provider-clients.ts`:**

```typescript
import { getGoogleAccessToken } from '@/lib/google-oauth-helper';

export class GoogleVeoClient {
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateVideo(prompt: string): Promise<VideoGenerationResponse> {
    const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    const accessToken = await getGoogleAccessToken(); // ✅ USE OAUTH TOKEN
    
    try {
      // Step 1: Start generation
      const startResponse = await axios.post(
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-2.0-generate-001:predictLongRunning`,
        {
          instances: [{ prompt }],
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`, // ✅ OAUTH TOKEN
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      }
      );
      
      const jobId = startResponse.response.name;
      
      // Step 2: Poll for completion
      return await this.pollForCompletion(jobId, PROJECT_ID, LOCATION, accessToken);
      
    } catch (error) {
      console.error('[GoogleVeo] Video generation error:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Google Cloud authentication failed. Please check your service account credentials.');
      }
      
      throw error;
    }
  }
  
  private async pollForCompletion(
    jobId: string,
    projectId: string,
    location: string,
    accessToken: string
  ): Promise<VideoGenerationResponse> {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2s interval
      
      try {
        const statusResponse = await axios.get(
          `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/batches/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (statusResponse.response.done) {
          const prediction = statusResponse.response.predictions?.[0];
          if (prediction?.done) {
            return {
              videoUrl: prediction.predictions?.[0]?.videoUri || 'No URL returned',
              model: 'google-veo',
              provider: 'google'
            };
          }
        }
        
        if (statusResponse.response.error) {
          throw new Error(`Google Veo error: ${JSON.stringify(statusResponse.response.error)}`);
        }
      } catch (error) {
        console.error(`[GoogleVeo] Polling error (attempt ${attempts}):`, error);
      }
      
      attempts++;
    }
    
    throw new Error('Video generation timed out after 2 minutes');
  }
}
```

**Update ImagenClient similarly:**
- Replace API key with OAuth token
- Fix endpoint structure
- Add polling loop

---

## 🎬 PLACEHOLDER API IMPLEMENTATION GUIDE

### Pattern for All Placeholder APIs (2 hours each)

**Template for Video Generation with Job Polling:**

```typescript
export class GenericVideoGenerationClient {
  protected apiKey: string;
  protected baseUrl: string;
  protected providerName: string;
  
  constructor(apiKey: string, baseUrl: string, providerName: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.providerName = providerName;
  }
  
  async generateVideo(prompt: string): Promise<VideoGenerationResponse> {
    try {
      // Step 1: Start generation
      const startResponse = await this.startGeneration(prompt);
      const jobId = startResponse.data.jobId;
      
      // Step 2: Poll for completion
      return await this.pollForCompletion(jobId);
      
    } catch (error) {
      console.error(`[${this.providerName}] Video generation error:`, error);
      throw new Error(
        `Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  protected async startGeneration(prompt: string): Promise<any> {
    return await axios.post(
      `${this.baseUrl}/v1/video/generate`,
      { prompt },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 30000
      }
    );
  }
  
  protected async pollForCompletion(jobId: string): Promise<VideoGenerationResponse> {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2s interval
      
      const statusResponse = await this.checkStatus(jobId);
      
      if (statusResponse.data.status === 'completed') {
        return {
          videoUrl: statusResponse.data.videoUrl,
          model: 'video',
          provider: this.providerName
        };
      }
      
      if (statusResponse.data.status === 'failed') {
        throw new Error(`Video generation failed: ${statusResponse.data.error}`);
      }
      
      attempts++;
    }
    
    throw new Error('Video generation timed out after 2 minutes');
  }
  
  protected async checkStatus(jobId: string): Promise<any> {
    return await axios.get(
      `${this.baseUrl}/v1/jobs/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      }
    );
  }
}
```

### Wan AI Implementation (2 hours)

```typescript
// Replace WanClient in src/lib/ai/provider-clients.ts

export class WanClient extends GenericVideoGenerationClient {
  constructor(apiKey: string) {
    super(
      apiKey,
      'https://api.wan.ai',
      'wan'
    );
  }
  
  protected async startGeneration(prompt: string): Promise<any> {
    // Adjust endpoint based on Wan API docs
    return await axios.post(
      `${this.baseUrl}/v1/video/generate`,
      { prompt },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 30000
      }
    );
  }
  
  protected async checkStatus(jobId: string): Promise<any> {
    return await axios.get(
      `${this.baseUrl}/v1/jobs/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      }
    );
  }
}
```

### Seedance Implementation (2 hours)

```typescript
// Replace SeedanceClient in src/lib/ai/provider-clients.ts

export class SeedanceClient extends GenericVideoGenerationClient {
  constructor(apiKey: string) {
    super(
      apiKey,
      'https://api.seedance.ai',
      'seedance'
    );
  }
  
  // Same pattern as Wan AI, adjust endpoints based on API docs
}
```

### HeyGen Implementation (2 hours)

```typescript
// Replace HeyGenClient in src/lib/ai/provider-clients.ts

export class HeyGenClient extends GenericVideoGenerationClient {
  constructor(apiKey: string) {
    super(
      apiKey,
      'https://api.heygen.com',
      'heygen'
    );
  }
  
  protected async startGeneration(prompt: string): Promise<any> {
    // HeyGen may require avatar selection
    return await axios.post(
      `${this.baseUrl}/v1/video/generate`,
      { 
        text: prompt,
        avatar_id: 'default' // Or make configurable
      },
      {
        headers: {
          'X-API-Key': this.apiKey // HeyGen uses different header name
        },
        timeout: 30000
      }
    );
  }
  
  protected async checkStatus(jobId: string): Promise<any> {
    return await axios.get(
      `${this.baseUrl}/v1/jobs/${jobId}`,
      {
        headers: {
          'X-API-Key': this.apiKey
        },
        timeout: 5000
      }
    );
  }
}
```

---

## 📋 TODO LIST

### OAuth Implementation Tasks (8 hours)
- [ ] Install google-auth-library
- [ ] Create Google Cloud service account
- [ ] Download service account JSON
- [ ] Add credentials to environment
- [ ] Create `src/lib/google-oauth-helper.ts`
- [ ] Implement token fetching logic
- [ ] Implement token refresh logic
- [ ] Update GoogleVeoClient to use OAuth
- [ ] Update ImagenClient to use OAuth
- [ ] Fix endpoint structure for both clients
- [ ] Test OAuth implementation

### Placeholder API Tasks (6 hours)

**Wan AI:**
- [ ] Get Wan AI API documentation
- [ ] Implement WanClient with actual API
- [ ] Add job polling
- [ ] Test with real API key

**Seedance:**
- [ ] Get Seedance API documentation
- [ ] Implement SeedanceClient with actual API
- [ ] Add job polling
- [ ] Test with real API key

**HeyGen:**
- [ ] Get HeyGen API documentation
- [ ] Implement HeyGenClient with actual API
- [ ] Add avatar selection
- [ ] Add job polling
- [ ] Test with real API key

---

## 🧪 TESTING CHECKLIST

### OAuth Testing (30 minutes)
- [ ] Test token fetching with valid credentials
- [ ] Test token refresh after expiry
- [ ] Test Google Veo generation with OAuth
- [ ] Test Google Imagen generation with OAuth
- [ ] Verify 401 errors are handled correctly

### Placeholder API Testing (30 minutes per API)
- [ ] Test Wan AI generation with real API key
- [ ] Test Seedance generation with real API key
- [ ] Test HeyGen generation with real API key
- [ ] Verify job polling works correctly
- [ ] Verify timeout handling works
- [ ] Verify error messages are user-friendly

---

## 📊 SUMMARY

| Bug Type | Count | Est. Time |
|----------|-------|-----------|
| OAuth Required | 2 | 8 hours |
| Placeholder URLs | 3 | 6 hours |
| **Total** | **5** | **14 hours** |

### Dependencies:
- [ ] Google Cloud service account (for OAuth bugs)
- [ ] Wan AI API key (for Wan bug)
- [ ] Seedance API key (for Seedance bug)
- [ ] HeyGen API key (for HeyGen bug)

---

## 🎯 NEXT STEPS

### Phase 1: OAuth Implementation (8 hours)
1. Install google-auth-library (10 min)
2. Create Google Cloud service account (15 min)
3. Download credentials (5 min)
4. Add to environment (5 min)
5. Create OAuth helper (1 hour)
6. Update GoogleVeoClient (1.5 hours)
7. Update ImagenClient (1.5 hours)
8. Test OAuth implementation (30 min)

### Phase 2: Placeholder APIs (6 hours)
1. Get API documentation (1 hour total)
2. Implement Wan AI (2 hours)
3. Implement Seedance (2 hours)
4. Implement HeyGen (2 hours)
5. Test all implementations (30 min each)

### Phase 3: Integration Testing (1 hour)
1. Test all video generation APIs
2. Verify error handling
3. Verify user-facing messages
4. Performance testing

**Total Time:** ~15 hours

---

## ✅ SUCCESS CRITERIA

### OAuth Implementation is Complete When:
- [ ] Google Cloud service account created
- [ ] OAuth token fetching works
- [ ] Token refresh works automatically
- [ ] Google Veo generates videos successfully
- [ ] Google Imagen generates images successfully
- [ ] No 401 errors with valid credentials
- [ ] Tokens cached and refreshed properly

### Placeholder APIs are Complete When:
- [ ] Wan AI generates real videos
- [ ] Seedance generates real videos
- [ ] HeyGen generates real videos
- [ ] All APIs use job polling
- [ ] All APIs have timeout handling
- [ ] All APIs have retry logic
- [ ] All APIs have error handling

---

## ⚠️ NOTES

### About OAuth vs API Keys:
- **OAuth (Google Cloud):** More complex, but required for Vertex AI
- **API Keys (Wan, Seedance, HeyGen):** Simpler, just add to env

### About Job Polling:
- Most video generation APIs are asynchronous
- Need to poll status endpoint every 2 seconds
- Timeout after 2 minutes (60 attempts)
- Handle 'completed', 'failed', and 'processing' states

### About Testing:
- Always test with real API keys
- Never assume API structure without documentation
- Check response formats in API docs
- Test error cases (invalid key, bad request, etc.)

---

**Total Time Estimate:** ~15 hours for all 5 bugs
