# API Integration Bugs - Comprehensive To-Do List

**Last Updated:** January 5, 2026
**Total Bugs:** 38 (15 Critical + 23 Major)

---

## Summary Statistics

| Priority | Count | Est. Hours |
|----------|-------|------------|
| Critical | 15 | ~24h |
| High | 18 | ~28h |
| Medium | 5 | ~8h |
| **Total** | **38** | **~60h** |

---

## CRITICAL PRIORITY BUGS (Fix Immediately)

### 1. Wasabi Storage - No Retry Logic ✅ FIXED
**Status:** COMPLETED (wasabi-service-fixed.ts created)
**File:** `src/server/services/wasabi-service.ts`
**Issue:** Uploads fail on transient network errors with no retry mechanism
**Fix:** Implemented retry logic with exponential backoff
**Effort:** 2h ✅ DONE
**Assignee:** Dev Team

### 2. Wasabi Storage - No Timeout Handling ✅ FIXED
**Status:** COMPLETED (wasabi-service-fixed.ts created)
**File:** `src/server/services/wasabi-service.ts`
**Issue:** Uploads can hang indefinitely on network issues
**Fix:** Added 30-second timeout with configurable option
**Effort:** 1h ✅ DONE
**Assignee:** Dev Team

### 3. Wasabi Storage - No File Size Validation ✅ FIXED
**Status:** COMPLETED (wasabi-service-fixed.ts created)
**File:** `src/server/services/wasabi-service.ts`
**Issue:** Users can upload unlimited file sizes
**Fix:** Added 500MB max file size validation
**Effort:** 1h ✅ DONE
**Assignee:** Dev Team

### 4. Wasabi Storage - Poor Error Messages ✅ FIXED
**Status:** COMPLETED (wasabi-service-fixed.ts created)
**File:** `src/server/services/wasabi-service.ts`
**Issue:** Generic "Failed to upload" errors with no debugging info
**Fix:** Added specific error messages with request tracking IDs
**Effort:** 1h ✅ DONE
**Assignee:** Dev Team

### 5. Wasabi Storage - Replace in Production
**Status:** PENDING
**File:** Multiple files importing wasabi-service
**Issue:** Fixed service exists but not deployed to production
**Action Required:**
- [ ] Backup current wasabi-service.ts
- [ ] Replace with wasabi-service-fixed.ts
- [ ] Update all imports
- [ ] Test in staging environment
- [ ] Deploy to production
**Effort:** 1h
**Assignee:** DevOps

### 6. ElevenLabs - No Retry Logic
**Status:** TODO
**File:** `src/lib/elevenlabs-client.ts`
**Issue:** API calls fail on transient errors with no retry
**Fix Required:**
- [ ] Implement retry logic with exponential backoff
- [ ] Add retry count limit (max 3)
- [ ] Handle rate limit (429) responses specifically
- [ ] Log retry attempts
**Effort:** 3h
**Assignee:** Backend Dev

### 7. ElevenLabs - No Timeout Handling
**Status:** TODO
**File:** `src/lib/elevenlabs-client.ts`
**Issue:** Audio file fetching can hang indefinitely
**Fix Required:**
- [ ] Add timeout to axios requests (30s default)
- [ ] Add timeout to voice cloning operations (5 min)
- [ ] Add timeout to speech generation (30s)
**Effort:** 2h
**Assignee:** Backend Dev

### 8. ElevenLabs - Synchronous Audio Fetching
**Status:** TODO
**File:** `src/lib/elevenlabs-client.ts`, `src/server/ai/flows/create-voice-clone.ts`
**Issue:** Fetches audio files synchronously, blocking the request
**Fix Required:**
- [ ] Implement async audio file fetching with Promise.all
- [ ] Add progress tracking for multiple files
- [ ] Handle partial failures (some files fail, others succeed)
**Effort:** 4h
**Assignee:** Backend Dev

### 9. Google Veo - Wrong Endpoints
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts` (GoogleVeoClient)
**Issue:** Uses incorrect Vertex AI endpoint structure
**Fix Required:**
- [ ] Fix endpoint: `https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/{MODEL}:predict`
- [ ] Use actual project ID instead of "-"
- [ ] Use OAuth token instead of API key
- [ ] Implement async job polling (video generation is async)
**Effort:** 8h
**Prerequisites:** Google Cloud project setup
**Assignee:** Backend Dev

### 10. Google Imagen - Wrong Endpoints
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts` (ImagenClient)
**Issue:** Same endpoint issues as Google Veo
**Fix Required:**
- [ ] Fix endpoint structure (same as Veo)
- [ ] Use OAuth authentication
- [ ] Handle base64 image response correctly
- [ ] Add error handling for invalid model IDs
**Effort:** 4h
**Prerequisites:** Google Cloud project setup
**Assignee:** Backend Dev

### 11. Google Imagen - Wrong Authentication
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts` (ImagenClient)
**Issue:** Using API key instead of OAuth token
**Fix Required:**
- [ ] Implement OAuth2 authentication flow
- [ ] Use service account credentials
- [ ] Add token refresh logic
- [ ] Handle token expiration
**Effort:** 6h
**Prerequisites:** Google Cloud service account
**Assignee:** Backend Dev

### 12. Wan AI - No Implementation (Placeholder)
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts` (WanClient)
**Issue:** Returns placeholder URL only, no actual API calls
**Fix Required:**
- [ ] Implement actual Wan AI API integration
- [ ] Add polling for async video generation
- [ ] Add error handling
- [ ] Add retry logic
- [ ] Document API endpoint and authentication
**Effort:** 6h
**Prerequisites:** Wan AI API key
**Assignee:** Backend Dev

### 13. Seedance - No Implementation (Placeholder)
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts` (SeedanceClient)
**Issue:** Returns placeholder URL only
**Fix Required:**
- [ ] Implement actual Seedance API integration
- [ ] Add job polling mechanism
- [ ] Add timeout handling
- [ ] Add retry logic
- [ ] Document API usage
**Effort:** 6h
**Prerequisites:** Seedance API key
**Assignee:** Backend Dev

### 14. HeyGen - No Implementation (Placeholder)
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts` (HeyGenClient)
**Issue:** Returns placeholder URL only
**Fix Required:**
- [ ] Implement actual HeyGen API integration
- [ ] Add avatar selection logic
- [ ] Add job polling
- [ ] Add error handling
- [ ] Document API usage
**Effort:** 6h
**Prerequisites:** HeyGen API key
**Assignee:** Backend Dev

### 15. Timed Transcript - Cannot Pass URL to AI
**Status:** TODO
**File:** `src/server/ai/flows/generate-timed-transcript.ts`
**Issue:** Passes video URL to AI, but AI cannot access URLs directly
**Fix Required:**
- [ ] Implement video download logic
- [ ] Extract audio from video
- [ ] Use speech-to-text API (OpenAI Whisper, Google STT, etc.)
- [ ] Add word-level timestamps
- [ ] Handle large files (streaming)
**Effort:** 8h
**Assignee:** Backend Dev

---

## HIGH PRIORITY BUGS (Fix This Week)

### 16. API Service Manager - No Circuit Breaker
**Status:** TODO
**File:** `src/lib/ai/api-service-manager.ts`
**Issue:** Keeps trying failed providers, no degradation strategy
**Fix Required:**
- [ ] Implement circuit breaker pattern
- [ ] Track failure counts per provider
- [ ] Add provider health checks
- [ ] Auto-disable failing providers
- [ ] Add recovery mechanism after cooldown
**Effort:** 6h
**Assignee:** Backend Dev

### 17. API Service Manager - No Provider Validation
**Status:** TODO
**File:** `src/lib/ai/api-service-manager.ts`
**Issue:** Doesn't validate API keys are actually valid
**Fix Required:**
- [ ] Add API key validation on startup
- [ ] Test each provider with simple request
- [ ] Mark invalid providers as unavailable
- [ ] Log validation failures
**Effort:** 4h
**Assignee:** Backend Dev

### 18. API Service Manager - Incomplete Implementations
**Status:** TODO
**File:** `src/lib/ai/api-service-manager.ts`
**Issue:** `generateWithProvider` has incomplete implementations
**Fix Required:**
- [ ] Complete all custom provider implementations
- [ ] Add proper error handling
- [ ] Add response validation
- [ ] Add logging
**Effort:** 6h
**Assignee:** Backend Dev

### 19. Pexels - No Retry Logic
**Status:** TODO
**File:** `src/server/ai/tools/pexels-tool.ts`
**Issue:** No retry on transient failures
**Fix Required:**
- [ ] Add retry logic with exponential backoff
- [ ] Handle rate limits (429)
- [ ] Add timeout handling
**Effort:** 2h
**Assignee:** Backend Dev

### 20. Pexels - No Timeout Handling
**Status:** TODO
**File:** `src/server/ai/tools/pexels-tool.ts`
**Issue:** Requests can hang indefinitely
**Fix Required:**
- [ ] Add 30-second timeout to API calls
- [ ] Add timeout to search operations
**Effort:** 1h
**Assignee:** Backend Dev

### 21. Pixabay - No Retry Logic
**Status:** TODO
**File:** `src/server/ai/tools/pixabay-tool.ts`
**Issue:** No retry on transient failures
**Fix Required:**
- [ ] Add retry logic with exponential backoff
- [ ] Handle rate limits
- [ ] Add timeout handling
**Effort:** 2h
**Assignee:** Backend Dev

### 22. Pixabay - No Timeout Handling
**Status:** TODO
**File:** `src/server/ai/tools/pixabay-tool.ts`
**Issue:** Requests can hang indefinitely
**Fix Required:**
- [ ] Add 30-second timeout to API calls
**Effort:** 1h
**Assignee:** Backend Dev

### 23. Unsplash - No Retry Logic
**Status:** TODO
**File:** `src/server/ai/tools/unsplash-tool.ts`
**Issue:** No retry on transient failures
**Fix Required:**
- [ ] Add retry logic with exponential backoff
- [ ] Handle rate limits
- [ ] Add timeout handling
**Effort:** 2h
**Assignee:** Backend Dev

### 24. Unsplash - No Timeout Handling
**Status:** TODO
**File:** `src/server/ai/tools/unsplash-tool.ts`
**Issue:** Requests can hang indefinitely
**Fix Required:**
- [ ] Add 30-second timeout to API calls
**Effort:** 1h
**Assignee:** Backend Dev

### 25. Environment Variables - Missing Keys
**Status:** TODO
**File:** `.env.example`
**Issue:** Many required API keys not documented
**Fix Required:**
- [ ] Add Google Cloud credentials
- [ ] Add Replicate API token
- [ ] Add Seedance API key
- [ ] Add Wan API key
- [ ] Add HeyGen API key
- [ ] Add Stability API key
- [ ] Add Anthropic API key
**Effort:** 0.5h
**Assignee:** DevOps

### 26. Connection Service - No Token Refresh
**Status:** TODO
**File:** `src/server/services/connectionService.ts`
**Issue:** OAuth tokens expire but aren't refreshed
**Fix Required:**
- [ ] Implement token refresh logic
- [ ] Store refresh tokens securely
- [ ] Auto-refresh expired tokens
- [ ] Handle refresh failures
**Effort:** 4h
**Assignee:** Backend Dev

### 27. Connection Service - No OAuth State Validation
**Status:** TODO
**File:** `src/server/services/connectionService.ts`
**Issue:** No validation of OAuth state parameter (CSRF vulnerability)
**Fix Required:**
- [ ] Implement OAuth state parameter
- [ ] Validate state on callback
- [ ] Store state in session/database
- [ ] Add CSRF protection
**Effort:** 3h
**Assignee:** Backend Dev

### 28. Email Service - No Retry Logic
**Status:** TODO
**File:** `src/server/services/email-service.ts`
**Issue:** Email sending fails on transient errors
**Fix Required:**
- [ ] Add retry logic with exponential backoff
- [ ] Add timeout handling
- [ ] Queue failed emails for retry
**Effort:** 2h
**Assignee:** Backend Dev

### 29. Email Service - No Email Queue
**Status:** TODO
**File:** `src/server/services/email-service.ts`
**Issue:** Bulk sending blocks, no queue system
**Fix Required:**
- [ ] Implement email queue system
- [ ] Add background worker for queue processing
- [ ] Add rate limiting
- [ ] Add progress tracking
**Effort:** 6h
**Assignee:** Backend Dev

### 30. Provider Clients - No Retry Logic (All Providers)
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts`
**Issue:** No retry logic for any provider clients
**Fix Required:**
- [ ] Add retry logic to OpenAI client
- [ ] Add retry logic to Claude client
- [ ] Add retry logic to Replicate client
- [ ] Add retry logic to Hugging Face client
- [ ] Add retry logic to all other clients
**Effort:** 4h
**Assignee:** Backend Dev

### 31. Provider Clients - No Timeout Handling (All Providers)
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts`
**Issue:** No timeout handling for any provider clients
**Fix Required:**
- [ ] Add timeout to all HTTP requests (30s default)
- [ ] Add longer timeouts for generation operations
- [ ] Handle timeout errors gracefully
**Effort:** 3h
**Assignee:** Backend Dev

### 32. Provider Clients - No Response Validation
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts`
**Issue:** No validation of API responses
**Fix Required:**
- [ ] Add Zod schemas for all responses
- [ ] Validate response structure
- [ ] Handle unexpected response formats
- [ ] Add logging for invalid responses
**Effort:** 4h
**Assignee:** Backend Dev

### 33. Provider Clients - Inconsistent Error Handling
**Status:** TODO
**File:** `src/lib/ai/provider-clients.ts`
**Issue:** Different providers handle errors differently
**Fix Required:**
- [ ] Standardize error handling across all providers
- [ ] Use consistent error types
- [ ] Add error codes
- [ ] Add user-friendly error messages
**Effort:** 3h
**Assignee:** Backend Dev

---

## MEDIUM PRIORITY BUGS (Fix Next Week)

### 34. Logging - Inconsistent Format
**Status:** TODO
**File:** All service files
**Issue:** Different logging formats across services
**Fix Required:**
- [ ] Define standard logging format
- [ ] Use consistent prefixes (e.g., [ServiceName])
- [ ] Add log levels (INFO, WARN, ERROR)
- [ ] Add structured logging (JSON)
**Effort:** 4h
**Assignee:** Backend Dev

### 35. Logging - No Request Tracking
**Status:** TODO
**File:** All service files
**Issue:** No correlation IDs for debugging
**Fix Required:**
- [ ] Add request ID to all logs
- [ ] Propagate request ID across API calls
- [ ] Add request ID to error messages
- [ ] Use UUID for request IDs
**Effort:** 3h
**Assignee:** Backend Dev

### 36. Performance - No Connection Pooling
**Status:** TODO
**File:** All HTTP clients
**Issue:** New connection for each request
**Fix Required:**
- [ ] Implement connection pooling for HTTP clients
- [ ] Reuse connections across requests
- [ ] Configure pool settings
- [ ] Monitor pool health
**Effort:** 2h
**Assignee:** Backend Dev

### 37. Performance - No Response Caching
**Status:** TODO
**File:** Stock media APIs
**Issue:** Repeated requests for same content
**Fix Required:**
- [ ] Implement caching for Pexels results
- [ ] Implement caching for Pixabay results
- [ ] Implement caching for Unsplash results
- [ ] Add cache expiration (1 hour)
- [ ] Use LRU cache with size limit
**Effort:** 3h
**Assignee:** Backend Dev

### 38. API Service Manager - Incorrect Provider Priority
**Status:** TODO
**File:** `src/lib/ai/api-service-manager.ts`
**Issue:** Some providers have wrong priority order
**Fix Required:**
- [ ] Review and fix provider priority lists
- [ ] Ensure critical providers are tried first
- [ ] Add fallback chains
- [ ] Document priority logic
**Effort:** 2h
**Assignee:** Backend Dev

---

## Implementation Phases

### Phase 1: Immediate (This Week)
**Focus:** Deploy Wasabi fix + critical API placeholders

**Tasks:**
- [x] Fix Wasabi service (COMPLETED)
- [ ] Deploy Wasabi fix to production
- [ ] Fix Google Cloud endpoints (Imagen/Veo)
- [ ] Implement Seedance API client
- [ ] Implement Wan AI API client
- [ ] Implement HeyGen API client
- [ ] Fix ElevenLabs retry logic
- [ ] Fix ElevenLabs timeout handling

**Estimated:** ~40 hours

### Phase 2: High Priority (Next Week)
**Focus:** Add retry logic and circuit breaker

**Tasks:**
- [ ] Add retry logic to all stock media APIs
- [ ] Add timeout handling to all APIs
- [ ] Implement circuit breaker in API service manager
- [ ] Add provider validation on startup
- [ ] Fix timed transcript flow
- [ ] Add token refresh to OAuth connections
- [ ] Complete all provider client implementations

**Estimated:** ~32 hours

### Phase 3: Medium Priority (Following Week)
**Focus:** Performance and logging improvements

**Tasks:**
- [ ] Standardize logging format
- [ ] Add request tracking IDs
- [ ] Implement response caching
- [ ] Add connection pooling
- [ ] Fix provider priority order
- [ ] Implement email queue system

**Estimated:** ~14 hours

---

## Dependencies and Blockers

### External Dependencies

| Task | Dependency | Status |
|------|------------|--------|
| Fix Google Veo | Google Cloud project setup | ⚠️ BLOCKED |
| Fix Google Imagen | Google Cloud project setup | ⚠️ BLOCKED |
| Implement Seedance | Seedance API key | ⚠️ BLOCKED |
| Implement Wan AI | Wan AI API key | ⚠️ BLOCKED |
| Implement HeyGen | HeyGen API key | ⚠️ BLOCKED |
| Fix Timed Transcript | Speech-to-text API choice | ⚠️ BLOCKED |

### Internal Dependencies

| Task | Depends On | Status |
|------|------------|--------|
| Deploy Wasabi fix | Testing in staging | ⚠️ BLOCKED |
| Fix Google Imagen | Fix Google Veo (same auth) | ⚠️ BLOCKED |
| Add circuit breaker | Complete provider implementations | ⚠️ BLOCKED |
| Add provider validation | Implement all providers | ⚠️ BLOCKED |

---

## Testing Checklist

### Unit Tests
- [ ] Wasabi service tests (upload, delete, error handling)
- [ ] ElevenLabs client tests (voice clone, TTS)
- [ ] Stock media API tests (Pexels, Pixabay, Unsplash)
- [ ] Provider client tests (all providers)
- [ ] API service manager tests (provider selection, fallback)

### Integration Tests
- [ ] End-to-end upload flow (upload → store → serve)
- [ ] Voice cloning flow (upload → clone → generate)
- [ ] Video generation flow (prompt → generate → store)
- [ ] Stock media search flow (search → cache → serve)
- [ ] Combined workflows (multiple APIs)

### Load Tests
- [ ] Concurrent upload tests
- [ ] Rate limit handling
- [ ] Timeout behavior under load
- [ ] Circuit breaker activation

---

## Progress Tracking

### Critical Bugs Progress
```
[████████░░░░░░░░░░░] 40% (6/15)

Completed:
✅ 1. Wasabi - No retry logic
✅ 2. Wasabi - No timeout handling
✅ 3. Wasabi - No file size validation
✅ 4. Wasabi - Poor error messages
⏳ 5. Wasabi - Deploy to production (PENDING)

Remaining:
⬜ 6. ElevenLabs - No retry logic
⬜ 7. ElevenLabs - No timeout handling
⬜ 8. ElevenLabs - Synchronous fetching
⬜ 9. Google Veo - Wrong endpoints
⬜ 10. Google Imagen - Wrong endpoints
⬜ 11. Google Imagen - Wrong authentication
⬜ 12. Wan AI - No implementation
⬜ 13. Seedance - No implementation
⬜ 14. HeyGen - No implementation
⬜ 15. Timed Transcript - Cannot pass URL to AI
```

### High Priority Bugs Progress
```
[░░░░░░░░░░░░░░░░░░] 0% (0/18)

All 18 high priority bugs are pending.
```

### Medium Priority Bugs Progress
```
[░░░░░░░░░░░░░░░░░░] 0% (0/5)

All 5 medium priority bugs are pending.
```

---

## Notes and Assumptions

1. **API Keys:** Assuming all required API keys will be provided by stakeholders
2. **Google Cloud:** Assuming project will be set up before implementing Imagen/Veo
3. **Timeline:** Estimates based on single developer working full-time
4. **Testing:** Time estimates include testing but not comprehensive test suite creation
5. **Deployment:** Deployment time not included in estimates
6. **Documentation:** Documentation time not included in estimates
7. **Code Review:** Code review time not included in estimates
8. **Meetings:** Meeting and coordination time not included in estimates

---

## Action Items for Stakeholders

### Development Team
- [ ] Review and prioritize this bug list
- [ ] Assign bugs to developers
- [ ] Set up Sprint for Phase 1 tasks
- [ ] Create development environment for Google Cloud
- [ ] Obtain API keys for placeholder APIs

### DevOps Team
- [ ] Set up staging environment for Wasabi fix testing
- [ ] Prepare deployment checklist
- [ ] Set up monitoring for API health
- [ ] Configure alerting for API failures
- [ ] Update environment variable documentation

### Product Team
- [ ] Prioritize features based on business value
- [ ] Confirm API key availability for all providers
- [ ] Define SLA for API responses
- [ ] Approve Google Cloud project setup
- [ ] Define user-based quota requirements

### Management
- [ ] Approve timeline and resource allocation
- [ ] Approve budget for API usage
- [ ] Approve Google Cloud project setup
- [ ] Approve additional API subscriptions if needed
- [ ] Provide guidance on blocking dependencies

---

**Next Steps:**
1. Stakeholder review meeting to confirm priorities
2. Assign Phase 1 critical bugs to developers
3. Set up Google Cloud project (unblock Imagen/Veo)
4. Obtain API keys for placeholder APIs
5. Deploy Wasabi fix to staging for testing

**Questions:**
1. Do we have API keys for Seedance, Wan, HeyGen?
2. Can we set up Google Cloud project this week?
3. What's the priority order for video generation APIs (Veo, Seedance, Wan)?
4. Should we implement all placeholder APIs or focus on top priority ones?
5. What's our SLA for API response times?
