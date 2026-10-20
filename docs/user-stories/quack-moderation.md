# User story: a moderator can delete any quack

**Status:** Ready
**PR:** —

**As a** moderator (a user with the `admin` role)
**I want to** delete any quack in the feed
**So that** inappropriate posts disappear even when their author won't remove them.

Someone has started posting inappropriate quacks and today only the author can delete them. This builds on deleting own quacks ([quack-filter-delete](quack-filter-delete.md)): same menu, same dialog, same endpoint — the only new rule is "author **or** admin".

## Acceptance criteria

1. Signed in as an admin, every quack in the feed has the "More actions" menu (`⋯`) with Delete, not only my own. Regular users still see the menu only on their own quacks.
2. On someone else's quack, the confirmation dialog names the author, so the moderator knows they are deleting another person's post.
   _Example:_ "Delete @duck's quack?" instead of "Delete this quack?". On the admin's own quack the dialog is unchanged.
3. Confirming, the pending state, the error message and the disappearance from the feed (both tabs, search results) behave as when deleting my own quack.
4. A moderator's delete is the same permanent delete: the quack, its poll and votes are removed. No reason, notification or audit record is kept.
5. The API enforces it: `DELETE /api/quacks/:id` by an admin on another user's quack returns 204 and deletes it. A regular user on another user's quack still gets 403 and nothing is deleted; 404 and 401 are unchanged.
6. The seeded `superadmin` account (see `seed-database.ts`) can moderate without any extra setup.

## Out of scope

- Assigning or revoking the admin role in the UI (it is set in the database / seed)
- A reason for the removal, notifying the author, an audit log
- Hiding, reporting or flagging quacks; banning users
- Any other admin action (editing quacks, deleting polls only)
- A `RolesGuard` / `@Roles` decorator — the rule is per-resource (author or admin), so it lives in the service

## Implementation plan

Branch `feature/quack-moderation`, stacked on `feature/quack-filter-delete`; the PR targets that branch until it merges, then rebase onto `main` (`git rebase --onto main feature/quack-filter-delete`) and retarget the PR to `main`.

**Backend** (`apps/backend/src/modules/quack`)

1. `QuacksService.deleteQuack`: forbid only when `authorId !== user.id && user.role !== 'admin'` (`UserRole.admin` from the generated client). No migration, no controller change; update the 403 Swagger description to "Not the author or an admin".
2. `quacks.service.spec.ts`: admin deletes someone else's quack (repository delete called); regular user on someone else's quack still 403; existing tests unchanged.

**Frontend** (`apps/frontend/src/features/quack`)

3. Route `quacks.tsx` passes `canModerate={user?.role === "admin"}` to `QuackList` next to `viewerId` (the quack feature may not import auth).
4. `QuackList` → `QuackItem`: show `QuackActions` when `isMine || canModerate`; pass `isMine` into `QuackActions`.
5. `QuackActions`: when not `isMine`, title "Delete @{username}'s quack?"; everything else reused.
6. Tests: `QuackList` shows the menu on others' quacks for a moderator and not for a regular user; `QuackActions` dialog title names the author when not mine.

**Close out:** status → _Done_, PR link here, CLAUDE.md lesson if one comes up.
