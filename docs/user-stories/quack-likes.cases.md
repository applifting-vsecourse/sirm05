# Likes on quacks: cases

> "People want to show they like a quack without having to reply. I want a like button and a like count on every quack. Everyone can like a quack only once, and take the like back."

These cases are the spec. Each one has a test; a test changes only when a case here changes. Data model: [ADR 0005](../decisions/0005-likes.md).

## Decisions

| Question                  | Decision                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Can I like my own quack?  | Yes. A like is not a vote for someone else.                                                   |
| Likes on replies?         | Yes. A reply is a quack; the same endpoints work for it.                                      |
| Liking a deleted quack?   | No: 404, like any other action on a tombstone (ADR 0004). Deleting a quack removes its likes. |
| Signed-out visitor?       | 401 on every like endpoint, like the rest of `/api/quacks`.                                   |
| Liking twice?             | Idempotent: still one like, 200. Same for taking back a like I never gave.                    |
| Do I see that I liked it? | Yes: `likedByMe` on every quack; the button is pressed (`aria-pressed`).                      |
| Who liked it?             | Not shown (bonus, out of scope). Only the count.                                              |

API: `PUT /api/quacks/:id/like` likes, `DELETE /api/quacks/:id/like` takes the like back. Both answer `200 { likeCount, likedByMe }`. Every quack in the feed, in a thread and in search carries `likeCount` and `likedByMe`.

## Rules (unit tests: `QuacksService`, mocked repository)

- **R1** Given a quack that doesn't exist, when I like it, then 404 (`NotFoundException`) and nothing is stored.
- **R2** Given a deleted quack, when I like it, then 404 and nothing is stored.
- **R3** Given a quack that doesn't exist or is deleted, when I take a like back, then 404 and nothing is removed.
- **R4** Given a live quack, when I like it, then the like is stored for the session user (never a user from the request) and I get the quack's likes as I now see them.
- **R5** Given my own quack, when I like it, then it is stored (no 403).
- **R6** Given a live quack, when I take my like back, then my like is removed for the session user and I get the updated likes.

## API behaviour (integration tests: `likes.int-spec.ts`, real database)

- **A1** Given a signed-out visitor, when they like or unlike a quack, then 401.
- **A2** Given a quack with no likes, when I like it, then 200 `{ likeCount: 1, likedByMe: true }`.
- **A3** Given I liked a quack, when I like it again, then 200 `{ likeCount: 1, likedByMe: true }`.
- **A4** Given I like a quack twice at the same moment, then it has 1 like (the database guards it).
- **A5** Given I liked a quack, when I take the like back, then 200 `{ likeCount: 0, likedByMe: false }`.
- **A6** Given I never liked a quack, when I take a like back, then 200 and the count is unchanged.
- **A7** Given two users like a quack, then its count is 2, and each sees `likedByMe: true`; a third user sees `likeCount: 2, likedByMe: false` in the feed.
- **A8** Given a quack that doesn't exist, when I like it, then 404.
- **A9** Given a deleted quack, when I like it, then 404.
- **A10** Given a liked quack, when its author deletes it, then its tombstone in the feed shows `likeCount: 0`.
- **A11** Given a reply, when I like it, then 200 and the thread shows its `likeCount: 1, likedByMe: true`.
- **A12** Given my own quack, when I like it, then 200 `{ likeCount: 1, likedByMe: true }`.

## End-to-end (Playwright: `apps/frontend/e2e/likes.spec.ts`)

- **E1** Every quack has a button labelled "Like" (`aria-label`) whose text is the like count and whose `aria-pressed` says whether I liked it. Given a new quack with 0 likes, when I click it, then it is pressed and shows 1; after a reload it still does. When another user opens the feed, they see 1 and an unpressed button. When I click it again, it shows 0 and is not pressed.
