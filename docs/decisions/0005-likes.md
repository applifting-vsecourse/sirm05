# 0005: Likes are rows, counted on read

**Status:** Accepted
**Date:** 2026-11-24

## Context

Every quack (and reply) gets a like button and a like count. Each user can like a quack once and take the like back ([cases](../user-stories/quack-likes.cases.md)). The feed must show, per quack, the count and whether the viewer liked it. "Once per person" has to hold even when two requests arrive at the same time.

## Decision

A `QuackLike` table with the primary key `(quackId, userId)`, the same shape as `PollVote`:

```prisma
model QuackLike {
  quack     Quack    @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime @default(now())

  @@id([quackId, userId])
  @@index([userId])
  @@map("quack_like")
}
```

- Like = upsert of the row (`ON CONFLICT DO NOTHING` semantics): a second or simultaneous like can't create a second row.
- Unlike = `deleteMany({ quackId, userId })`: removing a like that isn't there is a no-op.
- The count is `_count` of the rows, read together with the quack; `likedByMe` is the viewer's row, read like `pollVotes` (`where: { userId: viewerId }`).
- Deleting a quack (tombstone, ADR 0004) removes its likes in the same transaction.

## Options considered

- **Counter column `likeCount` on `Quack`.** Cheap reads, but it can't tell who liked, so "once per person" and `likedByMe` are impossible without a table anyway. Rejected.
- **Table plus a denormalised counter.** Fast count, but every like/unlike must update two places in one transaction, and a missed update leaves the counter wrong forever. Worth it only when counting rows gets slow, which a teaching app's feed won't. Rejected for now; it can be added later without changing the API.

## Consequences

- The database enforces one like per person; the service doesn't need locks.
- `likedByMe` and a future "who liked it" list come from the same table.
- Each feed read counts likes per quack (`COUNT` over an indexed key). If that gets slow, add the counter from the second option.
- Removing a user removes their likes (cascade), so counts can go down without anyone pressing a button.
