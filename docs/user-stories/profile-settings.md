# User story: change my username

**Status:** In progress
**PR:** —

**As a** user
**I want to** change my username
**So that** people find me under a name I actually like.

## Acceptance criteria

### Username

1. I can change my username on a new Settings page, reachable from the user menu in the header.
2. The field starts with my current username.
3. A username is 3–30 characters: letters, digits, dots and underscores. Letters are A–Z without accents, as at sign-up.
4. If someone already has it, I'm told right at the username field, and what I typed stays in the field. Case doesn't matter: `Marek` counts as taken when `marek` exists. My username keeps the case I typed.
5. After saving I see a confirmation, and my new @name shows up everywhere straight away.
6. I can discard my changes and go back to what's saved.

### Also on the page

7. Display name (required) and a short bio (optional, at most 160 characters), with the same saving and discarding rules.
8. Default mood for my new quacks: none, happy, sad, angry or silly. The new-quack form has it preselected. Depends on [quack mood](quack-mood.md).

## Out of scope

- Showing the bio anywhere outside Settings (there are no profile pages yet)
- Changing email, password or avatar
- Limits on how often the username can change
