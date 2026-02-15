# 🐛 REMAINING API BUGS TO FIX

**Total Remaining:** 28 bugs (11 Critical + 17 High/Medium)
**Time Est:** ~25 hours for all remaining

---

## 🔴 CRITICAL BUGS (11 remaining) - Fix These First

### ElevenLabs - 2 Bugs Left

**Bug 6: No Timeout on Speech Generation** (2h)
**File:** `src/lib/elevenlabs-client.ts`
**Issue:** `generateSpeech()` has no timeout handling, can hang
**Fix:** Add timeout to axios.post call (30 seconds)

```typescript
// In generateSpeech function, add timeout parameter:
const response = await axios.post(
  `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
  {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  },
  {
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    responseType: 'arraybuffer',
    timeout: 30000, // ⬅️ ADD THIS
  }
);
```

---

**Bug 8: Synchronous Audio Fetching** (4h)
**File:** `src/lib/elevenlabs-client.ts`
**Issue:** Audio files are fetched one by one in a loop, blocking

**Fix:** Already partially fixed with `Promise.all`, but ensure it's working

---

### Google Cloud APIs - 4 Bugs Left

**Bug 9: Google Veo - Wrong Endpoints** (8h)
**File:** `src/lib/ai/provider-clients.ts` (GoogleVeoClient)

**Issues:**
1. Wrong endpoint structure (uses "-" instead of project ID)
2. Uses API key instead of OAuth token
3. No job polling (video generation is async)

**Fix Required:**
```typescript
// Change from:
const baseUrl = 'https://us-central1-aiplatform.googleapis.com';
await axios.post(
  `${baseUrl}/v1/projects/-/locations/us-central1/publishers/google/models/${model}:predict`,
  // ❌ Wrong: uses "-", uses API key
);

// To:
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID; // ⬅️ GET FROM ENV
const baseUrl = 'https://us-central1-aiplatform.googleapis.com';

// Step 1: Start generation
const startResponse = await axios.post(
  `${baseUrl}/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${model}:predictLongRunning`,
  {
    instances: [{ prompt }],
  },
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }, // ⬅️ USE OAUTH
  }
);

const jobId = startResponse.response.name;

// Step 2: Poll for completion (⬅️ ADD POLLING LOOP)
let result;
for (let i = 0; i < 60; i++) { // 2 minutes max
  await new Promise(r => setTimeout(r, 2000)); // 2s interval
  
  const statusResponse = await axios.get(
    `${baseUrl}/v1/projects/${PROJECT_ID}/locations/us-central1/batches/${jobId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  if (statusResponse.response.done) {
    result = statusResponse.response;
    break;
  }
}
```

---

**Bug 10: Google Imagen - Wrong Endpoints** (4h)
**File:** `src/lib/ai/provider-clients.ts` (ImagenClient)

**Issues:** Same as Google Veo

**Fix:** Same as Google Veo above, but for image generation

---

**Bug 11: Google Imagen - Wrong Authentication** (6h)
**File:** `src/lib/ai/provider-clients.ts` (ImagenClient)

**Issue:** Using API key directly instead of OAuth2 token

**Fix Required:**
1. Implement OAuth2 authentication flow
2. Use service account credentials
3. Add token refresh logic
4. Handle token expiration

```typescript
// Add this helper function:
import { GoogleAuth } from 'google-auth-library';

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  
  const client = await auth.getClient();
  const accessToken = client.credentials.access_token;
  
  return accessToken;
}
```

---

### Placeholder Video Generation APIs - 4 Bugs Left

**Bug 12: Wan AI - No Implementation** (6h)
**File:** `src/lib/ai/provider-clients.ts` (WanClient)

**Issue:** Returns `'placeholder-video-url'` instead of real API call

**Fix Required:**
```typescript
// Replace placeholder implementation with actual API:
async generateVideo(prompt: string, style: string = 'default'): Promise<VideoGenerationResponse> {
  try {
    // Step 1: Start generation
    const response = await axios.post(
      `${this.baseUrl}/v1/video/generate`,
      { prompt, style },
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      }
    );
    
    const jobId = response.data.jobId;
    
    // Step 2: Poll for completion (⬅️ ADD THIS)
    let result;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(
        `${this.baseUrl}/v1/jobs/${jobId}`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );
      
      if (statusResponse.data.status === 'completed') {
        result = statusResponse.data;
        break;
      }
      
      if (statusResponse.data.status === 'failed') {
        throw new Error(`Video generation failed: ${statusResponse.data.error}`);
      }
      
      attempts++;
    }
    
    if (!result) {
      throw new Error('Video generation timed out');
    }
    
    return {
      videoUrl: result.videoUrl,
      model: 'wan-video',
      provider: 'wan'
    };
  } catch (error) {
    console.error('Wan video generation error:', error);
    throw error;
  }
}
```

---

**Bug 13: Seedance - No Implementation** (6h)
**File:** `src/lib/ai/provider-clients.ts` (SeedanceClient)

**Issue:** Same as Wan AI - returns placeholder

**Fix:** Same pattern as Wan AI above

---

**Bug 14: HeyGen - No Implementation** (6h)
**File:** `src/lib/ai/provider-clients.ts` (HeyGenClient)

**Issue:** Same as above

**Fix:** Same pattern with job polling

---

### Timed Transcript Flow - 1 Critical Bug

**Bug 15: Cannot Pass URL to AI** (8h)
**File:** `src/server/ai/flows/generate-timed-transcript.ts`

**Issue:** Passes video URL to AI, but AI cannot access URLs directly

**Fix Required:**
```typescript
// Replace current implementation:
const prompt = `Analyze this video: ${input.videoUrl}`;

// With:
import axios from 'axios';
import FormData from 'form-data';

async function extractAudioFromVideo(videoUrl: string): Promise<Buffer> {
  // ⬅️ ADD THIS HELPER FUNCTION
  const response = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 60000, // 60 seconds
  });
  return response.data;
}

async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  // ⬅️ USE SPEECH-TO-TEXT API (OpenAI Whisper or Google STT)
  const formData = new FormData();
  formData.append('file', audioBuffer, 'audio.mp3');
  formData.append('model', 'whisper-1');
  
  const response = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      timeout: 60000
    }
  );
  
  return response.data.text;
}

// In the flow:
const audioBuffer = await extractAudioFromVideo(input.videoUrl);
const transcript = await transcribeAudio(audioBuffer);

// Then use AI to add timestamps
const prompt = `Add word-level timestamps to this transcript: ${transcript}`;

const { output } = await ai.generate({
  prompt,
  output: { schema: GenerateTimedTranscriptOutputSchema }
});
```

---

## 🟡 HIGH PRIORITY BUGS (18 remaining) - Fix These Next Week

### API Service Manager - 3 Bugs

**Bug 16: No Circuit Breaker** (6h)
**File:** `src/lib/ai/api-service-manager.ts`

**Fix:** Add circuit breaker pattern
```typescript
// Add this class:
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private threshold = 5; // Max failures before opening
  private timeout = 60000; // 1 minute cooldown

  shouldAttempt(provider: string): boolean {
    const failures = this.failures.get(provider) || 0;
    const lastFailure = this.lastFailureTime.get(provider) || 0;
    
    if (failures >= this.threshold) {
      const timeSinceFailure = Date.now() - lastFailure;
      if (timeSinceFailure < this.timeout) {
        return false; // Circuit is open
      } else {
        // Reset after timeout
        this.failures.set(provider, 0);
      }
    }
    
    return true;
  }

  recordFailure(provider: string): void {
    const failures = (this.failures.get(provider) || 0) + 1;
    this.failures.set(provider, failures);
    this.lastFailureTime.set(provider, Date.now());
    console.warn(`[CircuitBreaker] Provider ${provider} has ${failures} failures`);
  }

  recordSuccess(provider: string): void {
    this.failures.delete(provider);
    this.lastFailureTime.delete(provider);
  }
}

// Use in getAvailableProvider:
const circuitBreaker = new CircuitBreaker();
if (!circuitBreaker.shouldAttempt(providerInfo.provider)) {
  console.log(`[CircuitBreaker] Skipping ${providerInfo.provider}, circuit open`);
  // Try next provider
}
```

---

**Bug 17: No Provider Validation** (4h)
**File:** `src/lib/ai/api-service-manager.ts`

**Fix:** Add validation on startup
```typescript
// Add this function:
async function validateProvider(apiKey: string, endpoint: string, name: string): Promise<boolean> {
  try {
    await axios.get(endpoint, {
      timeout: 5000,
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
    });
    return true;
  } catch (error) {
    console.error(`[ProviderValidation] ${name} validation failed:`, error.message);
    return false;
  }
}

// Call in getAvailableProvider:
if (!(await validateProvider(apiKey, testEndpoint, providerInfo.provider))) {
  console.warn(`[ProviderManager] ${providerInfo.provider} is invalid, skipping`);
  continue; // Try next provider
}
```

---

**Bug 18: Incomplete Implementations** (6h)
**File:** `src/lib/ai/api-service-manager.ts`

**Fix:** Complete all custom provider implementations with proper error handling

---

### Stock Media APIs - 6 Bugs

**Bugs 19-24: Pixabay and Unsplash** (8h total)
**Files:** `src/server/ai/tools/pixabay-tool.ts`, `src/server/ai/tools/unsplash-tool.ts`

**Fix:** Same pattern as Pexels - add retry logic and timeout handling

---

### Other High Priority Bugs - 9 Bugs

**Bugs 25-33:** Email, OAuth, Provider clients (15h total)

**See `API_INTEGRATION_BUGS_TODO.md` for details**

---

## 🟢 MEDIUM PRIORITY BUGS (5 remaining) - Fix Later

**Bugs 34-38:** Logging, performance optimizations (8h total)

**See `API_INTEGRATION_BUGS_TODO.md` for details**

---

## 📋 QUICK FIX SUMMARY

### Immediate (Today - 3 hours)
```bash
# Fix 1: Add timeout to ElevenLabs speech generation (15 min)
# File: src/lib/elevenlabs-client.ts

# Fix 2: Fix Google Cloud endpoints (Imagen/Veo) (2 hours)
# File: src/lib/ai/provider-clients.ts

# Fix 3: Fix timed transcript flow (1 hour)
# File: src/server/ai/flows/generate-timed-transcript.ts
```

### This Week (10 hours)
```bash
# Fix 4: Implement Wan, Seedance, HeyGen APIs (4 hours)
# Fix 5: Add circuit breaker (2 hours)
# Fix 6: Add provider validation (1 hour)
# Fix 7: Fix Pixabay/Unsplash retry logic (2 hours)
# Fix 8: Complete provider implementations (1 hour)
```

### Next Week (12 hours)
```bash
# Fix 9: OAuth token refresh
# Fix 10: Email queue system
# Fix 11: Structured logging
# Fix 12: Response caching
```

---

## 🚨 COMMON PITFALLS TO AVOID

1. **Don't use placeholder URLs** - Always implement actual API calls
2. **Don't forget job polling** - Video/image generation is async
3. **Don't use API keys directly** - Use OAuth tokens where required
4. **Don't skip timeouts** - All HTTP calls need timeouts
5. **Don't skip retries** - Transient failures need retries
6. **Don't skip error handling** - All API calls need try/catch

---

## 📊 PROGRESS TRACKING

```
[████████░░░░░░░░░░░░] 26% (10/38)

Fixed:
✅ 1. Wasabi - No retry logic
✅ 2. Wasabi - No timeout handling
✅ 3. Wasabi - No file size validation
✅ 4. Wasabi - Poor error messages
✅ 5. ElevenLabs - No retry logic
✅ 6. ElevenLabs - No timeout (voice clone)
✅ 7. ElevenLabs - Synchronous fetching (partial)
✅ 8. ElevenLabs - No retry logic (audio fetching)
✅ 9. Video Actions - Handle Wasabi return type

Critical Remaining:
⬜ 10. ElevenLabs - No timeout (speech generation)
⬜ 11. Google Veo - Wrong endpoints
⬜ 12. Google Imagen - Wrong endpoints
⬜ 13. Google Imagen - Wrong authentication
⬜ 14. Wan AI - No implementation
⬜ 15. Seedance - No implementation
⬜ 16. HeyGen - No implementation
⬜ 17. Timed Transcript - Cannot pass URL to AI

High Priority: 0/18 fixed
Medium Priority: 0/5 fixed
```

---

## 🎯 NEXT ACTIONS

### Right Now (Next 30 minutes)
1. Fix ElevenLabs speech generation timeout (add 1 line)
2. Update `.env.example` with Google Cloud variables

### Today (3 hours)
3. Fix Google Cloud endpoints (Imagen/Veo)
4. Fix timed transcript flow
5. Test all fixes

### This Week (10 hours)
6. Implement Wan, Seedance, HeyGen APIs
7. Add circuit breaker pattern
8. Add provider validation
9. Fix Pixabay/Unsplash retry logic

---

**Total bugs:** 28 remaining  
**Critical bugs:** 11 remaining  
**Est. time:** ~25 hours for all remaining

Focus on the critical bugs first - they're the ones that will prevent launch!
