# AI Routing Refactor TODO

- [x] Audit existing AI call paths and provider clients.
- [x] Add provider registry as single source of truth (priorities, models, capabilities).
- [x] Add capability-based provider selection with compatibility checks.
- [x] Split provider selection from execution in `api-service-manager`.
- [x] Keep Gemini primary for text, Imagen primary for image, Veo primary for video.
- [x] Enforce fallback chains only across supported providers.
- [x] Refactor direct `ai.generate` flow calls to capability router where needed.
- [x] Add startup validation for configured-but-unsupported providers.
- [x] Add structured fallback logging with reason codes.
- [x] Add contract tests for registry/router consistency.
- [x] Add documentation generation script from registry data.
- [x] Run targeted sanity checks and summarize deployment notes.
