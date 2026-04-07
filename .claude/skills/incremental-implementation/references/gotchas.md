# Gotchas — Rationalizations, Red Flags, and Scope Discipline

## Common Rationalizations

| What You Tell Yourself | Why It's Wrong | What to Do Instead |
|------------------------|----------------|-------------------|
| "It's just one more file, I'll include it in this slice" | One more file is one more untested behavior | Commit what you have, start a new slice |
| "I'll add the tests after I finish the feature" | Deferred tests rarely arrive; bugs compound | Write the test in the same slice as the code |
| "This refactor is small, I'll do it while I'm here" | Drive-by refactors hide in diffs and skip review | Create a separate slice for the refactor |
| "Running the full build takes too long, I'll skip it" | Skipped verification is how cross-module breaks ship | At minimum run `./mvnw test -pl module -am` |
| "The feature flag isn't worth it for this size change" | Half-shipped features block the whole branch | If it's user-visible and multi-slice, flag it |
| "I need to finish this layer before I can test anything" | Horizontal layers compile but prove nothing | Slice vertically: one behavior end-to-end |

## Red Flags

Stop and re-evaluate if any of these are true:

- **Commit message contains "and"** — it's two slices
- **More than 5 files changed** without a migration — slice is too wide
- **No test in the commit** — the slice is incomplete
- **Build hasn't been run since the last commit** — verification was skipped
- **You're writing code for a slice you haven't started yet** — speculative work
- **Feature flag has been "temporary" for 2+ sprints** — schedule removal now
- **Migration and app code in the same commit** — split them

## Scope Discipline

**Say this:** "That belongs in the next slice."

| Temptation | Disciplined Response |
|------------|---------------------|
| Add validation while writing the controller | Controller slice first, validation slice next |
| Wire error handling into the new endpoint | Happy path slice first, error handling slice next |
| Add sorting to the search endpoint you just built | Search slice ships, sorting is a follow-up slice |
| Optimize the query you just wrote | Correct first, fast later — new slice with benchmarks |
| Add the admin endpoint alongside the user endpoint | One audience per slice |

The goal is not speed — it is **forward progress you can prove and roll back**.
