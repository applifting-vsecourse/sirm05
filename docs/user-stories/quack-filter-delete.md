# User story: delete my own quacks and see only mine

**Status:** Ready
**PR:** —

**As an** author
**I want to** delete my own quacks and see only mine
**So that** I can clean up what I posted.

Today a quack is forever and my posts are mixed into everyone else's. This is the smallest version that lets authors tidy up after themselves.

## Acceptance criteria

### Deleting

1. Each of my quacks has a "More actions" menu (`⋯`, labelled for screen readers) with a Delete item. Quacks by other people have no Delete action.
2. Choosing Delete opens a confirmation dialog that shows the start of the quack's text. Cancel closes the dialog and changes nothing.
3. Confirming shows a pending state on the confirm button. When the server confirms, the dialog closes and the quack disappears from the feed, in both tabs and in search results.
4. If deleting fails, the quack stays in the feed and I see a message that it was not deleted.
5. Deleting is permanent: the quack, its poll and the poll's votes are removed from the database. There is no undo.
6. Nobody can delete someone else's quack, not even by calling the API directly: `DELETE /api/quacks/:id` on another user's quack returns 403 and deletes nothing. A quack that doesn't exist returns 404. A signed-out request returns 401.

### Filter

7. Above the feed there are two tabs: All and Mine. All is selected by default and shows the feed as today. Mine shows only my quacks, newest first.
8. The selected tab survives a page refresh and the back button, and can be shared as a link (`/quacks?mine=true`).
9. The tab and the search combine: on Mine, a search finds only my quacks that match it.
   _Example:_ Mine + `pond` shows my quacks containing "pond", not other people's.
10. When I have no quacks, Mine shows _You haven't posted any quacks yet_ and a "Write your first quack" action that moves focus to the new-quack form. When I have quacks but none match the search, the existing _No quacks match "&lt;term&gt;"_ state shows instead.
11. Posting a quack while on Mine shows it there right away.
12. Signed-out visitors can't reach the feed, same as today, and the API refuses `GET /api/quacks?mine=true` without a session (401).

## Out of scope

- Undo, a trash bin or soft delete
- Deleting several quacks at once
- Editing a quack
- Moderators or admins deleting other people's quacks
- Live removal of a deleted quack from other users' open feeds (they see it gone on their next refetch)
- Filtering by other authors (beyond search)

## Implementation plan

Copy the quack-feed pattern; one commit per step once `check-all` is green.

**Backend** (`apps/backend/src/modules/quack`)

1. `SearchQuacksDto`: optional `mine` boolean (transform `"true"` → `true`). Controller passes it to `QuacksService.getQuacks(viewer, q, mine)`; repository adds `userId: viewerId` to `where` when set.
2. Repository: `getQuackAuthorId(id)` and `deleteQuack(id)`. Poll options and votes go with it via the existing `onDelete: Cascade` — no migration.
3. Service `deleteQuack(user, id)`: missing → `NotFoundException`, other author → `ForbiddenException`, else delete.
4. Controller `@Delete(':id')`, `204 No Content`, Swagger responses 204/401/403/404.
5. Tests in `quacks.service.spec.ts`: own quack deleted; someone else's → 403 and repository delete not called; missing → 404; `mine` filters by viewer.

**Frontend** (`apps/frontend/src/features/quack`)

6. `pnpm dlx shadcn@latest add tabs alert-dialog` — strip shadows except on the dialog, fix any `cn` import (see CLAUDE.md).
7. `quacksQueryOptions(q, mine)` + `quackKeys` include `mine`; `api/deleteQuack.ts` (`ky.delete`) + `hooks/useDeleteQuack.ts` invalidating `quackKeys.all` on success, toast on error.
8. `QuackItem`: when `quack.userId === viewerId`, a ghost icon button (`aria-label="More actions"`) opening a `DropdownMenu` with Delete → `DeleteQuackDialog` (`AlertDialog`, destructive confirm, pending + disabled while deleting).
9. `QuackTabs` (All/Mine) between the form and the search; route `quacks.tsx` adds `mine: z.boolean().optional()` to the search schema and navigates with `replace`, keeping `q`. The route reads `useSession()` and passes `viewerId` down to `QuackList` → `QuackItem` (the quack feature may not import auth — see CLAUDE.md).
10. `QuackList`: Mine empty state with "Write your first quack" focusing the form textarea (form exposes a ref/id).
11. Tests: `QuackItem` shows the menu only for own quacks; dialog cancel/confirm; `QuackList` Mine empty state vs search empty state; `QuackTabs` switches value.

**Close out:** status → _Done_, PR link here, CLAUDE.md lesson if one comes up.
