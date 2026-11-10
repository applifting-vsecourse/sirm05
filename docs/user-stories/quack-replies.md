# User story: reply to a quack and see the replies under it

**Status:** Ready
**PR:** —

**As a** quacker
**I want to** reply to a quack and see the replies under it
**So that** everyone can tell what a reply is answering.

Today people reply by posting a new quack that starts with `@name …`, and the link to the original is lost. Replies belong to the people who wrote them, so deleting a quack must not take its replies with it — yet the deleted quack's content has to really disappear from the app.

## Acceptance criteria

### Replying

1. Each quack in the feed has a reply button showing the number of replies ("Reply", "3 replies"). Clicking it expands the thread under the quack: its replies, oldest first, and a reply form.
2. The reply form takes text and an optional mood, like a quack, but no poll. Posting shows the reply at the bottom of the thread and bumps the count.
3. You can only reply to a quack in the feed, not to a reply: replies have no reply button, and `POST /api/quacks/:id/replies` on a reply returns 400. Replying to a quack that doesn't exist or was deleted returns 404. Signed out → 401.
4. Replies don't appear in the main feed or on the Mine tab; they are only under their quack.

### Deleting

5. Deleting a quack or a reply (author or moderator, same rules as today) removes its content for good: the text and mood are wiped in the database, its poll options and votes are deleted. The row stays as a tombstone (`deletedAt`), so its replies keep their place.
6. A deleted quack **with** live replies stays in the feed as a placeholder _"This quack was deleted"_ — no text, author, mood or poll — with its reply button and replies under it. A deleted quack **without** replies disappears from the feed. A deleted reply disappears from its thread and from the count.
   _Example:_ Alice's quack has two replies by Bob. Alice deletes it → the feed shows the placeholder with "2 replies"; Bob's replies are still there. Bob deletes both → the placeholder disappears.
7. The deleted text shows up nowhere: not in the feed, a thread, Mine, or search — not even searching by the author's name. Deleting an already deleted quack returns 404.

### Search

8. Search (week 3) also finds replies. A reply in the results is labelled _"Reply to @username"_ (or _"Reply to a deleted quack"_). Deleted quacks never match.

## Out of scope

- Replies to replies (the model allows it — `parentId` — the API refuses it)
- A detail page / shareable link to a thread
- Live updates of threads in other users' open tabs (they see new replies on refetch)
- Undo or restoring a deleted quack; hard-deleting tombstones later
- Account deletion (none in the app today — see Decisions, the reply FK blocks it)

## Decisions

| Decision                    | Chosen                                                                                                                                                                   | Rejected, and why                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What delete means           | **Tombstone always**: keep the row, set `deletedAt`, wipe text/mood, delete poll rows. One rule for every delete. [ADR 0004](../decisions/0004-delete-is-a-tombstone.md) | _Hybrid_ (hard delete without replies, tombstone with) — two code paths and tests for the same action. _Hard delete + `parentId = NULL`_ — replies lose their context, the exact problem we're solving. _`deletedAt` but keep the text_ — the content wouldn't really disappear. |
| Reply depth                 | **One level**, enforced in the service                                                                                                                                   | _Tree_ — recursive loading/rendering nobody asked for yet. _Flat thread with `rootId`_ — two links to keep consistent. The self-relation allows nesting later without a migration.                                                                                               |
| Replies in the feed         | **No, only under the quack**                                                                                                                                             | _In the feed with "reply to @x"_ — the same text twice on screen.                                                                                                                                                                                                                |
| Reply count                 | **Counted on read** (`_count`, index on `parentId`)                                                                                                                      | _`replyCount` column_ — a second copy to keep in sync on every reply and delete; not needed at course scale.                                                                                                                                                                     |
| Showing replies             | **Expand on click**, `GET /api/quacks/:id/replies`                                                                                                                       | _Embed all replies in the feed_ — the feed grows with every reply. _Detail page_ — a new route nobody asked for.                                                                                                                                                                 |
| What a reply can contain    | **Text + mood**, no poll                                                                                                                                                 | _Everything_ — polls in threads add noise. _Text only_ — a pointless difference from the quack form.                                                                                                                                                                             |
| Search                      | **Includes replies, labelled**                                                                                                                                           | _Top-level only_ — text in replies couldn't be found.                                                                                                                                                                                                                            |
| Reply → parent FK on delete | **`Restrict`**                                                                                                                                                           | _`Cascade`_ — would delete other people's replies if a row ever is hard-deleted (e.g. account deletion). _`SetNull`_ — orphans replies silently. Restrict makes a future account deletion decide explicitly.                                                                     |

## Proposed schema

```prisma
model Quack {
  // …existing fields…
  parent    Quack?    @relation("QuackReplies", fields: [parentId], references: [id], onDelete: Restrict)
  parentId  String?
  replies   Quack[]   @relation("QuackReplies")
  deletedAt DateTime?

  @@index([parentId])
}
```

### The three questions

1. **Everything the user sees, with simple queries**
   - Feed: `quack WHERE parentId IS NULL AND (deletedAt IS NULL OR EXISTS live reply)`, newest first, `_count.replies WHERE deletedAt IS NULL`.
   - Thread: `quack WHERE parentId = :id AND deletedAt IS NULL ORDER BY createdAt`.
   - Search: `quack WHERE deletedAt IS NULL AND <terms>` (any level), with `parent.user.username` for the label.
   - Mine: feed filter + `userId = me AND deletedAt IS NULL`.
2. **Stored twice?** No. The reply count is computed on read; author names come from `user`.
3. **On delete** the quack's own content is wiped and its `PollOption`/`PollVote` rows are deleted; its replies are untouched (they still point at the tombstone). Nothing is hard-deleted by the app anymore.
4. **Migration on production data:** two nullable columns, a FK and an index — no default backfill, no rewrite of existing rows. Every existing quack becomes a live top-level quack. Safe to run on a populated table.

## Implementation plan

**Backend** (`apps/backend/src/modules/quack`)

1. Schema + migration (above).
2. Repository: feed/search/Mine filters, `replyCount`, `replyTo`; `getReplies(parentId, viewerId)`; `createQuack` takes `parentId`; `getQuackForDelete` returns `{ userId, parentId, deletedAt }`; `deleteQuack` → transaction: delete poll options (votes cascade), update `text = ''`, `mood = null`, `deletedAt = now()`.
3. Service: `getReplies` (404 for missing parent), `createReply` (404 missing/deleted, 400 reply-to-reply), `deleteQuack` treats tombstones as 404. Tests for each refused case.
4. Controller: `GET /api/quacks/:id/replies`, `POST /api/quacks/:id/replies` (`CreateReplyDto`: text, mood). `QuackResponseDto` adds `deleted`, `replyCount`, `replyTo`.

**Frontend** (`apps/frontend/src/features/quack`)

5. Schemas + `repliesQueryOptions`, `addReply`, `useAddReply` (invalidate thread + feed).
6. `QuackItem`: reply toggle with count; `QuackReplies` (list + form); tombstone placeholder; "Reply to @x" label in search results.
7. E2E: reply, delete a quack with replies → placeholder, text found nowhere.

**Close out:** status → _Done_, PR link here.
