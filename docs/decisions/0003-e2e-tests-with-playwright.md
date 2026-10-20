# 0003: End-to-end tests with Playwright

**Status:** Accepted
**Date:** 2026-10-20

## Context

The [quack moderation](../user-stories/quack-moderation.md) story needs proof that permissions hold across real users: an admin deletes someone else's quack, a regular user gets 403. Unit tests mock the repository and the session, so they can't show that BetterAuth's session, the API and the UI agree. The test must fail when the server-side check is removed.

## Decision

- **Playwright** (`@playwright/test`, Chromium only) in `apps/frontend/e2e/`, run with `pnpm frontend test:e2e`.
- Tests run against the **already running** dev servers (`pnpm dev`) and the **seeded users**; no `webServer` in the config, no test database.
- Each user gets their own browser context. Permission checks also call the API directly from that context, so a hidden button can't hide a missing server check.
- Not part of `check-all` or CI yet: CI has no running app or database.

## Consequences

- One new dev dependency, and a one-off `npx playwright install chromium` per machine.
- Tests write to the dev database; they use unique texts and delete what they create, but a failed run can leave a quack behind.
- Running them needs `pnpm dev` up. Adding the dependency (any `pnpm add` in the frontend) wipes Vite's dep cache under a running dev server — restart it afterwards.
- Wiring E2E into CI (services for Postgres, seed, both servers) is a later decision.
