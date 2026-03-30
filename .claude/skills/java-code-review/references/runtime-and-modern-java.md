# Runtime and Modern Java Review

## Concurrency Routing

Concurrency review now lives in `references/concurrency.md` so the critical thread-safety checks are not buried inside a general runtime note.

Route there when the diff includes:
- shared mutable state
- `ExecutorService`, `CompletableFuture`, `@Async`, or explicit threads
- locks, atomics, `volatile`, or `synchronized`
- virtual threads, interruption, cancellation, or blocking-in-async questions

## Performance

Check for:
- string concatenation in loops
- regex compilation inside loops
- avoidable object churn in hot paths
- obvious N+1 data access patterns

Prefer:
- `StringBuilder` for loop-driven concatenation and `+` for short, one-off concatenation where clarity wins
- precompiled `Pattern` objects when the regex is reused

Route heavy SQL/fetch analysis to `jpa-master` when the issue is persistence-specific.

## Modern Java

Review for:
- records used where mutability is actually required
- `Optional` used as a field or parameter instead of a return type
- virtual thread pinning via `synchronized` + blocking calls
- sealed hierarchies that still rely on weak default branches

Prefer modern features when they improve clarity, not as novelty.
