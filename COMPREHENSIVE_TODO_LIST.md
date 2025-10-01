# Comprehensive TODO List

This document consolidates all pending tasks and TODO items identified in the codebase.

## 1. Email Notification Testing

### Support Ticket Notifications
- [ ] Create a support ticket and verify user receives confirmation
- [ ] Reply to a support ticket as an agent and verify user receives notification
- [ ] Change ticket status and verify user receives notification

### User Notifications
- [ ] Sign up as a new user and verify user receives confirmation email
- [ ] Sign up as a new user and verify admin receives notification

### Subscription Notifications
- [ ] Complete a subscription checkout and verify user and admin receive notifications
- [ ] Trigger a subscription renewal and verify user and admin receive notifications
- [ ] Cancel a subscription and verify user and admin receive notifications
- [ ] Test subscription renewal reminder cron job

## 2. AI Service Provider Health Check
- [ ] Add logic to ping all configured AI service providers in `src/app/api/cron/autorotation-health-check/route.ts`
- [ ] Iterate through `llmProviderPriority`, `imageProviderPriority`, etc.

## 3. User Invitation Email
- [ ] Send an email invitation with a link to set the password when creating pending admin users in `src/server/actions/user-actions.ts`

## 4. Video From URL Generator Fixes
- [ ] Fix the pending status functionality in `src/components/video-from-url-generator.tsx`
- [ ] Re-enable form ref and useFormStatus functionality
- [ ] Remove manual `pending = false` override

## 5. AI API Integration Testing
- [ ] Test Google VEO integration with valid API key
- [ ] Test Imagen integration with valid API key
- [ ] Verify fallback mechanisms work correctly
- [ ] Validate admin configuration UI for new API keys

## 6. General Code Cleanup
- [ ] Review all components with pending status functionality for proper implementation
- [ ] Ensure all TODO comments in the codebase are addressed
