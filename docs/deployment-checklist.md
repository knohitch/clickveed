# Deployment Checklist (Phase 0 to 8)

## Canonical Deployment Shape

- Deploy one application service from this single repository.
- Run PostgreSQL as a separate managed service/container.
- Run Redis as a separate managed service/container.
- Configure Wasabi/Bunny as external storage/CDN services.
- Run a separate worker process (`npm run worker`) for queue-based jobs.

## Environment Variable Canonical Names

- `WASABI_ACCESS_KEY_ID`
- `WASABI_SECRET_ACCESS_KEY`
- `GOOGLE_AI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `AUTH_SECRET`

## Phase 0 Validation

- `docker-compose.yml` contains no merge conflict markers.
- `.env.production.example` contains no merge conflict markers.
- App hosting config exposes canonical storage and AI runtime env keys.
- Secrets are mapped so existing secret names still work during migration.

## Phase 1 Validation

- Upload API persists media records for image/video/audio files.
- All client flows using `/api/storage/upload` inherit media indexing from the same route.
- Media upload rollback removes storage object if DB media record creation fails.
- Media Library displays a clear error state when DB fetch fails.
- Media Library retry action re-fetches assets without a full page reload.

## Phase 2 Validation

- Storage connection test performs active bucket checks (head/list + write/delete probe).
- Storage env fallback accepts both canonical and legacy secret key names.
- `/api/diagnostics` reports storage probe reachability and latency.
- Backfill tool is available for one-time storage-to-DB media indexing:
  - Dry run: `npm run storage:backfill-media`
  - Apply writes: `npm run storage:backfill-media -- --apply`

## Phase 3 Validation

- Media DB reads/writes use retry-wrapped Prisma operations for transient connection resets.
- Media assets served from private Wasabi hosts are returned with signed read URLs.
- Media cards render even when direct object URLs are not public.
- Upload indexing keeps rollback behavior if DB media-record creation fails.

## Phase 4 Validation

- Root layout metadata reads app name from admin settings, not only static env.
- Auth route metadata (`/login`, `/signup`, `/forgot-password`, `/reset-password`) uses the same branding source.
- Root metadata includes branded favicon when configured in admin settings.
- Branding updates trigger route/layout revalidation for metadata refresh.

## Phase 5 Validation

- `sharp` is installed as a production dependency.
- Lockfile includes `sharp` and platform artifacts.
- Diagnostics endpoint reports sharp availability/version under `imageOptimization`.
- Build path no longer fails due missing-sharp; any remaining build failures are unrelated.

## Phase 6 Validation

- Repository/deployment strategy is documented for single-repo operation.
- Docker Compose includes `app`, `worker`, `db`, and `redis` services.
- App Hosting secret mappings include `REDIS_URL` for runtime queue connectivity.
- Worker runs from the same commit as web app (`npm run worker`).
- App and worker both receive database and redis runtime configuration.

## Phase 7 Validation

- Deploy preflight command exists: `npm run deploy:preflight`.
- Preflight checks validate auth secret, public URL, sharp runtime, DB connectivity, and storage connectivity.
- Deploy preflight exits non-zero on critical failures.

## Phase 8 Validation

- Tailwind transition classes are normalized to valid utilities (`duration-150`, `ease-in-out`) in global `@apply` and component classNames.
- Production build no longer fails on invalid Tailwind utility expansion.
- Build validation command: `npm run build`.
