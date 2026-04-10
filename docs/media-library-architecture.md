# Media Library Architecture (Phase 1)

## Source of Truth

The Media Library UI is database-driven.

- Visible items come from the `MediaAsset` table only.
- Bucket contents are not listed directly from Wasabi/Bunny.
- A file in storage without a matching `MediaAsset` row will not appear in the UI.

## Upload Contract

For image/video/audio uploads:

- Upload to storage succeeds first.
- API then creates a `MediaAsset` row for the authenticated user.
- If DB record creation fails, the API attempts a best-effort storage rollback delete.

Current implementation:

- [storage upload route](../src/app/api/storage/upload/route.ts)
- [media actions query](../src/lib/media-actions.ts)
- [media library page](../src/app/(app)/dashboard/media/library/page.tsx)

## Error Handling

- DB fetch failures in media loading are surfaced as explicit errors in the UI.
- Users see a retry action instead of a silent empty-state fallback.

## Observability

Structured logs are emitted for:

- Storage upload failures.
- Media record creation success/failure.
- Media library DB fetch count and failure.
