# Architecture decisions

One line per ADR. Read this index first, then open only the ADRs that touch your change. Accepted ADRs are never rewritten — a new one supersedes them. Template: [`_template.md`](_template.md).

| #                                         | Decision                               | Status   | In one sentence                                                                                                                            |
| ----------------------------------------- | -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [0001](0001-betterauth.md)                | BetterAuth for authentication          | Accepted | Auth is BetterAuth at `/api/auth/*`, used as a black box; the user always comes from the session, never the request.                       |
| [0002](0002-live-poll-counts-over-sse.md) | Live poll counts over SSE              | Accepted | Vote counts are pushed over Server-Sent Events from an in-process RxJS Subject (single instance only).                                     |
| [0003](0003-e2e-tests-with-playwright.md) | E2E tests with Playwright              | Accepted | Playwright E2E tests run against the running dev app and seeded users; not in CI yet.                                                      |
| [0004](0004-delete-is-a-tombstone.md)     | Delete leaves a content-free tombstone | Accepted | Deleting a quack wipes its content but keeps the row so replies stay attached; every read excludes tombstones except the feed placeholder. |
| [0005](0005-likes.md)                     | Likes are rows, counted on read        | Accepted | A `QuackLike` row per (quack, user) with that pair as primary key; counts and `likedByMe` are read with the quack.                         |
