# 0002: Live poll counts over Server-Sent Events

**Status:** Accepted
**Date:** 2026-10-13

## Context

The [quack poll](../user-stories/quack-poll.md) story requires vote counts to update for everyone who has the poll on screen within a few seconds, without reloading. Until now the app has only had request/response endpoints. The data only flows server → browser; votes themselves go through the normal REST API.

## Decision

- Push count changes over **Server-Sent Events**: `GET /api/quacks/poll-events`, using NestJS's built-in `@Sse()` on the backend and the browser's native `EventSource` on the frontend. No new dependency.
- The stream carries only counts (`{ quackId, options: [{ id, votes }] }`), never who voted — "my vote" is per user and comes from the REST responses.
- Events are fanned out with an in-process RxJS `Subject` in `QuacksService`. Count reads for events are serialised in-process, so a later event never carries older counts than an earlier one.
- When the stream drops, `EventSource` reconnects on its own; on reconnect the frontend refetches the feed to catch up on anything it missed.

## Consequences

- Works because production runs a single backend container (one Coolify service). **Running more than one instance breaks live updates** — each instance only sees its own votes. The fix then is Postgres `LISTEN/NOTIFY` (still no new dependency) feeding the same `Subject`.
- Each open tab holds one HTTP connection. Fine at course scale; revisit for real traffic.
- If a proxy closes idle connections, the client silently reconnects and refetches, so counts stay correct.
- WebSockets were not chosen: no client → server messages are needed, and they would add a dependency (`@nestjs/websockets` + adapter).
