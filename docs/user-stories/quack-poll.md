# User story: ask a question with answers to pick from

**Status:** In progress
**PR:** —

**As a** signed-in user
**I want to** attach a poll to my quack and let others vote on it
**So that** I get an exact count of answers without reading and tallying replies.

Today people ask "where do we go for lunch?" in a quack and count replies by hand: the numbers come out wrong and the question is buried. This is the smallest version that lets us see whether people use polls at all.

## Acceptance criteria

1. The new-quack form lets me add a poll. The quack text is the question; I add 2 to 10 answers.
   _Example:_ "Lunch?" with answers "Pizza", "Sushi", "Salad".
2. Each answer is non-empty and at most 50 characters, and answers within one poll are unique (ignoring case and surrounding spaces). The form shows what is wrong and does not post; the API rejects the same cases.
3. Posting without a poll works exactly as today. Existing quacks have no poll.
4. A quack with a poll shows its answers in the feed, each with the number of people who picked it. Counts are visible to everyone, whether or not they have voted. The poll shows wherever the quack does, search results included.
5. A poll with more than 4 answers shows the first 4 and a "Show N more" control that expands the rest in place. If my vote is on a hidden answer, that answer is shown in the collapsed state too.
6. Any signed-in user can vote by picking one answer, the quack's author included. The answer I picked is marked in a way readable as text, not only by colour.
7. One person, one vote: a user has at most one vote per poll. This is enforced by the API and database, not only by the UI — repeated or simultaneous requests never count a person twice.
8. I can change my vote by picking a different answer: the old answer goes down by 1, the new one up by 1.
9. I can withdraw my vote by picking my current answer again: its count goes down by 1 and no answer is marked as mine.
   _Example:_ I click "Pizza" → Pizza +1, marked mine. I click "Pizza" again → Pizza −1, nothing marked.
10. Voting, changing and withdrawing feel instant: my pick and the counts update immediately, before the server answers.
11. If a vote, change or withdrawal fails, the poll goes back to how it was before my click and I see a message that it was not saved.
12. Counts update live: when someone else votes, changes or withdraws, every user who has that poll on screen sees the new counts within a few seconds, without reloading.
13. If the live connection drops, the app reconnects on its own and refetches the counts; the user sees no indicator. Voting keeps working while disconnected.
14. Counts are the same for everyone and always match what the server has stored.
15. The API rejects a vote for an answer that does not belong to the poll, and any vote from a signed-out user.

## Out of scope

- Seeing who voted for what
- Multiple-choice polls, more than 10 answers
- Editing a poll or its answers after posting
- Closing a poll or setting a deadline
- Live updates of anything other than poll counts (e.g. new quacks appearing in the feed)
- Hiding results until I have voted
- Percentages, charts or a results-only view
