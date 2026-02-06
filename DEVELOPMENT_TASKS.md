# Development Tasks

This document categorizes the tasks from the comprehensive TODO list into code issues that need to be implemented and testing issues that can be verified after deployment.

## Code Implementation Tasks

### 1. Email Notification Implementation
- [ ] Implement user invitation email with password setup link in `src/server/actions/user-actions.ts`

### 2. AI Service Provider Health Check
- [x] Add logic to ping all configured AI service providers in `src/app/api/cron/autorotation-health-check/route.ts`
- [x] Implement iteration through `llmProviderPriority`, `imageProviderPriority`, etc.

### 3. Video From URL Generator Fixes
- [x] Fix the pending status functionality in `src/components/video-from-url-generator.tsx`
- [x] Re-enable form ref and useFormStatus functionality
- [x] Remove manual `pending = false` override

### 4. AI API Integration Testing
- [ ] Test Google VEO integration with valid API key
- [ ] Test Imagen integration with valid API key
- [ ] Verify fallback mechanisms work correctly
- [ ] Validate admin configuration UI for new API keys

### 5. General Code Cleanup
- [x] Review all components with pending status functionality for proper implementation
- [ ] Ensure all TODO comments in the codebase are addressed

## Post-Deployment Testing Tasks

### 1. Email Notification Testing

#### Support Ticket Notifications
- [ ] Create a support ticket and verify user receives confirmation
- [ ] Reply to a support ticket as an agent and verify user receives notification with reply content
- [ ] Change ticket status and verify user receives notification

#### User Notifications
- [ ] Sign up as a new user and verify user receives confirmation email
- [ ] Sign up as a new user and verify admin receives notification

#### Subscription Notifications
- [ ] Complete a subscription checkout and verify user and admin receive notifications
- [ ] Trigger a subscription renewal and verify user and admin receive notifications
- [ ] Cancel a subscription and verify user and admin receive notifications
- [ ] Test subscription renewal reminder cron job

### 2. AI Service Integration Testing
- [ ] Verify Google VEO integration works correctly in production environment
- [ ] Verify Imagen integration works correctly in production environment
- [ ] Test fallback mechanisms under various failure conditions

### 3. Video Generation Functionality
- [ ] Test Video From URL Generator functionality after fixing pending status implementation

### 4. AI Service Provider Health Check
- [ ] Verify the health check cron job runs correctly and reports status of all providers
