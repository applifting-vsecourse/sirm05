# Quacker — starter template

Full-stack teaching template: pnpm monorepo with two apps.

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client. Feature folders under `src/features/`.

The worked example is the quack feed: `Quack` model → seed → repository → service → `GET`/`POST /api/quacks` (DTO-validated, author taken from the session) → zod schema → TanStack Query → list page + post form. Copy its pattern for new features.

**Before writing or changing any UI, read [`docs/DESIGN.md`](docs/DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm frontend test:e2e` — Playwright E2E against the running app (needs `pnpm dev`)
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Conventions

Deliberately sparse — this file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### Development docs live in `docs/`

Markdown about developing this app goes in [`docs/`](docs/) — start at [`docs/README.md`](docs/README.md). Process and Definition of Done: [`docs/workflow.md`](docs/workflow.md).

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI puts `shadow-xs`/`shadow-sm` on inputs, textareas and cards. [`docs/DESIGN.md`](docs/DESIGN.md) keeps shadows for things that genuinely float — dialogs, dropdowns, toasts. Strip them.

The CLI can also emit `import { cn } from "cn"` and add an npm package named `cn` to `package.json`. Wrong: the helper is `@/lib/utils`. Fix the import, `git checkout` `package.json` and `pnpm-lock.yaml` (a `pnpm remove` reshuffles the lockfile), then `pnpm install --frozen-lockfile`.

When a component depends on one that already exists (`alert-dialog` → `button`), the CLI asks whether to overwrite it, and a non-interactive shell aborts the whole `add` at that prompt. Add such components one at a time with `echo n | pnpm dlx shadcn@latest add <name>`.

### Code shared by two features goes to `lib/` or `components/`

ESLint forbids one feature importing another. When two features need the same thing (e.g. moods: `src/lib/mood.ts` + `src/components/MoodPicker.tsx`), move it down a layer; let a route compose features when one needs another's data (`quacks.tsx` loads the profile to pass `defaultMood` to `QuackForm`).

### Vitest hooks: use braces

`beforeEach(() => mock.mockReset())` returns the mock, and Vitest runs a returned function as a cleanup hook, which calls your mock with no arguments. Write `beforeEach(() => { mock.mockReset() })`.

### Schema change while the database is down

Don't start Postgres to run `prisma migrate dev`. Write the migration offline: diff the committed schema against the new one with `prisma migrate diff --from-schema <old.prisma> --to-schema prisma/schema.prisma --script` into `prisma/migrations/<timestamp>_<name>/migration.sql`, then `prisma generate`. The next `pnpm dev` applies it.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.

### Prisma `contains` does not escape LIKE wildcards

`contains`/`startsWith`/`endsWith` go to Postgres `LIKE`/`ILIKE` as-is, so a user typing `%` or `_` matches everything. Escape user input first: `term.replace(/[\\%_]/g, '\\$&')` (see `QuackRepository.getQuacks`).

### `pnpm check-all` on Windows

The frontend `lint:check`, `format:check` and the vite-plugin-checker `lintCommand` quote globs with single quotes, which `cmd` passes through literally ("No files matching the pattern"). With `core.autocrlf=true`, Prettier also flags every file for CRLF. On Windows, run the steps directly: `npx eslint "./src/**/*.{ts,tsx,js,cjs,mjs}"`, `npx prettier --check --end-of-line auto "<glob>"`. CI (Linux) is unaffected.

The same `lintCommand` makes `vite build` exit 2 on Windows. To check the build itself, build from a temporary copy of `vite.config.ts` with the `checker(...)` plugin removed (`vite build -c <copy>`), then delete the copy.

### Permissions: the server decides, the UI only hides

A rule about one record ("the author or an admin") goes in the service, next to the lookup — not a route guard, which can't see the record. "Me" is the session's `Identity` (`id`, `role`), never a `userId` from the URL or body. The route turns the session into flags (`viewerId`, `canModerate`) for the feature; React only hides controls. Every rule gets a service test for the refused case, and an E2E test (`pnpm frontend test:e2e`) that calls the API as the refused user — it must fail when the check is removed. See `QuacksService.deleteQuack`.

### `pnpm add` breaks the running frontend

Installing a frontend package wipes `node_modules/.vite` under the running dev server: every page 504s with "Outdated Optimize Dep". Ask the user to restart the frontend dev server; don't do it yourself.

### Optimistic mutations on one entity need a `scope`

Two quick clicks on the same thing (a poll vote) fire two requests that can reach the server in either order: the UI shows the last click, the database keeps whichever landed last. Give the mutation `scope: { id: <entity> }` — `onMutate` still runs instantly, but requests run one after another. See `useVote`.
