# Workflow

## From story to merge

1. **Story** — write it in [`user-stories/`](user-stories/) from the template. It is _Ready_ when the acceptance criteria are testable and out-of-scope is stated.
2. **Branch** — off `main`, named after the story: `feature/quack-search`, `fix/<what>`, `docs/<what>`. Never commit straight to `main`.
3. **Build** — copy the quack-feed pattern (see [`../CLAUDE.md`](../CLAUDE.md)); UI follows [`DESIGN.md`](DESIGN.md).
4. **Loop: check → fix → learn → commit**
   - _check_ — `pnpm check-all` (on Windows run the steps directly, see CLAUDE.md)
   - _fix_ — until green
   - _learn_ — a non-obvious lesson that lint can't enforce becomes a rule in CLAUDE.md → Conventions
   - _commit_ — only files belonging to the story; imperative subject (`Add quack search to the feed`)
5. **PR** — title = what it does; description links the story and lists anything a reviewer should look at closely. Set the story's `PR:` field.
6. **Review & merge** — CI green and one approval. Merging to `main` **deploys to production** (`deploy.yml`), so merge only what's Done.

## Definition of Done

- [ ] Every acceptance criterion is met and covered by a test where practical
- [ ] `pnpm check-all` passes (CI green)
- [ ] Schema changes come with a migration
- [ ] UI follows `DESIGN.md`
- [ ] Docs updated: story status → _Done_, new ADR if a decision was made, CLAUDE.md if a lesson was learned
- [ ] PR reviewed and merged

## When to write an ADR

Adding a dependency, changing a pattern from CLAUDE.md, or anything a new teammate would ask "why is it like this?" about. Copy [`decisions/_template.md`](decisions/_template.md), number it next in sequence. Accepted ADRs are never rewritten — a changed decision gets a new ADR that supersedes the old one.
