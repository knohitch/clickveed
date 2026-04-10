# Repository and Deployment Strategy (Phase 6)

## Short Answer

- Push the full project from this single repository.
- Do not split `backend`, `provider`, and `pota` into separate repos unless you are intentionally building independent products with separate release lifecycles.
- Deploy as one application codebase, with separate runtime services for stateful dependencies and background workers.

## Recommended Production Shape

- `app` service:
  - Runs `next start` for web/API traffic.
- `worker` service:
  - Runs `npm run worker` for BullMQ background jobs.
- `db` service:
  - PostgreSQL (managed service preferred).
- `redis` service:
  - Redis (managed service preferred).
- external object storage + CDN:
  - Wasabi + Bunny.

This keeps one source of truth for code while still isolating runtime responsibilities.

## When to Split Into Multiple Repositories

Only split if at least one of these is true:

- Different teams own different services with independent release cadence.
- Strict compliance/security boundaries require separate access controls.
- You need separate SLAs and scaling policies per service beyond app/worker separation.

If none of these apply, a single repo is the safer and faster operational model.

## Deployment Guidance

1. Build and release from one repo.
2. Roll out app and worker from the same commit SHA.
3. Keep database and redis managed separately from web containers.
4. Run preflight checks before each production deploy (`npm run deploy:preflight`).
