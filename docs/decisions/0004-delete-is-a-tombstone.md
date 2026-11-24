# 0004: Deleting a quack leaves a content-free tombstone

**Status:** Accepted
**Date:** 2026-11-10

## Context

[Quack replies](../user-stories/quack-replies.md) link a reply to its quack (`Quack.parentId`). Two requirements pull against each other:

- Replies belong to their authors: deleting a quack must not delete the replies under it, nor cut them loose from it.
- Deleted means deleted: the quack's content must really disappear from the app, everywhere.

Until now delete was a real `DELETE` of the row ([quack-filter-delete](../user-stories/quack-filter-delete.md), criterion 5), which would either cascade to the replies or orphan them.

## Decision

Every delete — by the author or a moderator, quack or reply — **keeps the row and erases its content**: `deletedAt` is set, `text` becomes `''`, `mood` becomes `null`, and the poll's options and votes are deleted, in one transaction. The app no longer hard-deletes quacks.

A tombstone is shown only where it holds replies together: as a _"This quack was deleted"_ placeholder in the feed while it has live replies. Every other read (thread, Mine, search, single-quack lookups) treats `deletedAt IS NOT NULL` as "does not exist". The reply → parent foreign key is `onDelete: Restrict`.

## Options considered

- **Hard delete, replies' `parentId` set to `NULL`.** Simplest, no filter on reads. Rejected: replies lose what they were answering — the problem replies exist to solve.
- **Hybrid: hard delete without replies, tombstone with replies.** Fewer dead rows. Rejected: two behaviours and two sets of tests for one user action, and a quack's fate depends on whether someone replied a second earlier.
- **Classic soft delete (`deletedAt`, content kept).** Allows undo. Rejected: the content doesn't really disappear — it's one forgotten `WHERE` away from showing up again, and still in every backup.
- **Cascade the replies.** Rejected outright: deletes other people's writing.

## Consequences

- **Every query on `quack` must decide what to do with tombstones.** Default to excluding `deletedAt IS NOT NULL`; only the feed shows them, and only with live replies. New features that read quacks (counts, profiles, exports) must do the same.
- Deleting an already deleted quack is a 404, like a quack that never existed.
- Tombstones stay forever. Purging those without replies is possible later as a batch job, not needed now.
- Undo is impossible by design — the content is gone.
- Hard deletes still happen through `User` cascades. With `Restrict` on the reply FK, deleting a user whose quacks have other people's replies fails; whoever adds account deletion must decide (likely: tombstone the user's quacks first). There is no account deletion today.
