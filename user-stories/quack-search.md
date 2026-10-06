# User story: find a quack by a word or its author

**As a** signed-in user
**I want to** type a word or an author's name and see only the quacks that match
**So that** I can find a post I saw earlier without scrolling through the whole feed.

This is a minimal first version to find out whether people use search.

## Acceptance criteria

1. A search box sits at the top of the feed.
2. The feed filters while the user types, shortly after they pause. There is no search button.
3. The search survives a page refresh and the back button, and can be shared as a link.
4. A quack matches if every typed word appears in its text, its author's name or its author's username. Word order doesn't matter.
   _Example:_ `marek pond` finds Marek's quack containing "pond".
5. Partial words match: `duck` finds "ducks" and "Duckling".
6. Upper and lower case don't matter. Accents do: `zluta` doesn't find "žlutá".
7. A leading `@` is ignored: `@marek` = `marek`.
8. Surrounding spaces are ignored. An empty box shows the whole feed.
9. The search can be at most 100 characters long.
10. Symbols are matched exactly as typed.
11. Results are ordered newest first and look like normal feed items.
12. If nothing matches, the user sees _No quacks match "&lt;term&gt;"_ and an option to clear the search.
13. If the user posts a quack while searching, the search stays. The new quack shows only if it matches.

## Out of scope

- Highlighting matched words
- Date filters
- Search outside the feed
- Ordering by relevance
- Ignoring accents
- Measuring usage
