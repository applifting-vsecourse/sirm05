# 0001: Authentication via BetterAuth, treated as a black box

**Status:** Accepted
**Date:** 2026-10-13 (inherited from the Quacker starter template)

## Context

Every feature needs to know who the user is, but sign-up, login, sessions, email verification and password reset are a lot of security-sensitive code that is not what this product is about.

## Decision

Use BetterAuth, mounted at `/api/auth/*` (docs at `/api/auth/reference`). We use it — we don't build or modify it. Features read the current user from the session; endpoints never accept the author/user id from the request body.

## Consequences

- Login, sign-up and password reset work out of the box; we spend time on features instead.
- Auth tables in the Prisma schema are owned by BetterAuth — change them only via `pnpm backend auth:generate`, not by hand.
- `BACKEND_URL` / `FRONTEND_URL` must match the real origins, otherwise BetterAuth rejects the browser (see root README, Deployment).
- Anything BetterAuth doesn't support needs a new ADR before we work around it.
