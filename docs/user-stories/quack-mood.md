# User story: add a mood to my quack

**Status:** In progress
**PR:** —

**As a** signed-in user
**I want to** tag my quack with a mood
**So that** readers can tell how I meant it at a glance.

Prerequisite for the default mood in [profile settings](profile-settings.md).

## Acceptance criteria

1. The new-quack form lets me pick a mood: none, happy, sad, angry or silly.
2. The picker starts on none. Posting without a mood works exactly as today.
3. A quack with a mood shows it in the feed next to the quack. A quack without one looks as it does today.
4. The mood is readable as text, not only as an icon or colour.
5. The mood shows wherever the quack does, search results included.
6. After posting, the picker goes back to its starting value.
7. Existing quacks have no mood.
8. The API accepts only the five moods. Anything else is rejected.

## Out of scope

- Changing a quack's mood after posting
- Filtering or searching the feed by mood
- Custom moods
- Mood statistics
