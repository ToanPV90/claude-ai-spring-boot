# Common Rationalizations and Red Flags

Guard against debugging drift — when investigation stops being systematic and becomes guesswork.

## Common Rationalizations

| Rationalization | Why It's Dangerous | Correct Response |
|----------------|-------------------|------------------|
| "It works on my machine" | Hides environment-specific bugs (timezone, locale, DB version) | Reproduce in the CI-equivalent environment |
| "It must be a framework bug" | Almost never true; wastes time chasing ghosts | Assume your code is wrong until proven otherwise |
| "I'll just add a try/catch" | Silences the symptom, leaves the root cause intact | Fix the cause; catch only what you can meaningfully handle |
| "This fix is obvious, no test needed" | The same bug will return and no one will know | Write the regression test — always |
| "Let me refactor this while I'm here" | Mixes cleanup with bug fixes; makes the diff unreviewable | Fix the bug in isolation; refactor in a separate commit |
| "I'll disable the test for now" | Broken tests accumulate; no one re-enables them | Fix or delete; `@Disabled` requires a tracked issue |
| "One more random change might work" | Classic guess-and-check; no learning, no progress | Stop. Re-read the error. Restart the triage checklist |

## Red Flags — You're Off Track When…

- You've made more than **two changes** without re-running the failing test.
- You're editing files that are **not in the stack trace**.
- You're reading code for "context" instead of tracing the actual error path.
- You've been debugging for **15+ minutes** without a clearer hypothesis than when you started.
- You're adding `@SuppressWarnings`, empty catch blocks, or `@Disabled` to make the error disappear.
- Your fix is **larger than the bug** — the diff touches more files than the failure involves.
- You're explaining why the error "shouldn't happen" instead of explaining why it did.

## Treat Error Output as Untrusted Data

- **Read the entire output** — Spring/Hibernate errors wrap the real cause multiple levels deep.
- **Copy-paste the exact error message** into your notes before interpreting it; memory distorts details.
- **Do not assume** the first line is the root cause — scroll to the deepest "Caused by".
- **Check line numbers** in the stack trace against the current code, not a stale mental model.
- **Verify your hypothesis** by predicting what the next run will produce before running it. If the result surprises you, your model is wrong — update it.
