# Production Hardening Todo

This file is the source of truth for the production-readiness fixes identified during the codebase audit.

Current overall status: Complete

All tracked hardening items in this document have been completed and verified in code.

## P0 Security And Prod Blockers

Section status: Complete

- [x] Fix Google OAuth user provisioning so provider sign-ins create or map to a real Prisma `User` record before the rest of the app uses `session.user.id`.
- [x] Lock down or remove all public debug, diagnostics, health-detail, and test endpoints in production.
- [x] Protect storage download and delete so users can only access their own files.
- [x] Fix `video-from-url` auth so it validates a real session instead of accepting any `Bearer` string.
- [x] Remove the `temp-token` fallback from the `video-from-url` client flow.
- [x] Add SSRF protection to `video-from-url`: block localhost, private IPs, link-local addresses, metadata endpoints, internal hostnames, and non-HTTP(S) schemes.
- [x] Add real shared rate limiting to `video-from-url` using Redis or an equivalent backend.
- [x] Enforce feature access and AI credit usage on `video-from-url`.
- [x] Add ownership checks to notification update endpoints so one user cannot mutate another user's notifications.

## P1 Deployment And Release Reliability

Section status: Complete

- [x] Stop app startup if `prisma migrate deploy` fails.
- [x] Re-enable production build gates so lint and typecheck failures block deploys.
- [x] Fix the lint stack version mismatch between Next.js, ESLint, and `eslint-config-next`.
- [x] Fix the `typecheck` memory issue so CI and local validation can run reliably.
- [x] Make monitoring and test routes explicitly dynamic when they depend on runtime state.
- [x] Remove or isolate build-time code paths that trigger Prisma or runtime env access during static generation.
- [x] Review API routes for accidental static generation or caching where runtime behavior is expected.

## P1 Auth, Access, And Data Integrity

Section status: Complete

- [x] Audit every server action and API route to ensure they use real server-side auth checks, not UI-only gating.
- [x] Verify all feature-locked pages also enforce access on the server.
- [x] Ensure all user-scoped DB reads and writes use the authenticated app user ID, not provider IDs.
- [x] Review all routes that accept IDs, keys, or URLs from the client and add ownership validation where needed.

## P1 AI And Workflow Hardening

Section status: Complete

- [x] Add feature-access enforcement to `creativeAssistantChatAction`.
- [x] Add quota or AI-credit enforcement to `creativeAssistantChatAction`.
- [x] Add feature-access enforcement to `supportChatAction`.
- [x] Add quota or AI-credit enforcement to `supportChatAction`.
- [x] Add shared cross-instance rate limiting to chat and other expensive AI endpoints.
- [x] Replace or redesign in-memory AI provider circuit-breaker and health state so multi-instance production behavior is predictable.
- [x] Turn persona-avatar video generation into a real queued job with DB-backed status.
- [x] Return a job ID for persona-avatar generation and let the UI poll or subscribe for status.
- [x] Add retry and failure handling for persona-avatar jobs instead of only logging errors.
- [x] Validate voice-clone sample URLs before fetching them server-side.
- [x] Restrict voice-clone sample fetching to approved storage domains or owned uploaded assets.
- [x] Add SSRF protection to voice-clone sample fetching.
- [x] Fix voice-over generation so selected voices and speakers are actually passed to the TTS provider.
- [x] Fix pipeline voice-over generation so the submitted `voice` value is actually used.
- [x] Review expensive AI flows and standardize credit charging across chat, voice, persona, stock media, and pipeline actions.
- [x] Add explicit request timeouts and abort handling around remote fetch-heavy AI flows.
- [x] Revisit synchronous remote media validation in voice-over generation so requests do not hang on slow provider assets.

## P1 Workflow Generator Fixes

Section status: Complete

- [x] Upgrade workflow generation validation from "JSON parses" to "valid n8n or Make.com workflow schema".
- [x] Add platform-specific schema validation before returning workflow success.
- [x] Return actionable validation errors when generated workflow JSON is structurally invalid.
- [x] Add import smoke tests or sample fixtures for generated n8n and Make.com workflows.

## P2 Database And Performance

Section status: Complete

- [x] Add missing indexes for Prisma relation fields flagged by validation.
- [x] Review hot query paths for missing indexes, especially foreign-key columns.
- [x] Recheck `relationMode = "prisma"` tradeoffs and ensure app-level referential integrity is strong enough.
- [x] Add DB health and performance checks for large tables and user-scoped asset queries.

## P2 Cleanup And Safety Nets

Section status: Complete

- [x] Remove or protect dead, diagnostic, dev-only, or misleading routes and files in production.
- [x] Add integration tests for auth-critical flows: login, OAuth, storage, notifications.
- [x] Add end-to-end tests for AI workflows: persona avatar, voice clone, voice over, video-from-url, and video pipeline.
- [x] Add CI checks for lint, typecheck, build, Prisma validation, and migration safety.
- [x] Add production logging and alerting around failed AI jobs, failed provider calls, migration failures, and unauthorized access attempts.
- [x] Add audit logging for admin or debug routes and sensitive file operations.
- [x] Review all public-facing API routes for auth, rate limit, ownership, and caching behavior.

## Recommended Fix Order

1. Security blockers: debug routes, storage auth, `video-from-url`, notifications.
2. Auth and data consistency: Google OAuth user sync.
3. Deploy safety: migrations, lint, typecheck, build gates.
4. AI durability and spend control: persona queue, chat quotas, voice-clone URL validation, voice selection fixes.
5. Database, observability, and test hardening.

Final status: All checklist items completed.
