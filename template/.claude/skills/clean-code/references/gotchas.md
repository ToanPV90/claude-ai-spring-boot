# Clean Code Gotchas

- Over-extraction can make call flow harder to follow than the original method.
- Shared helpers become dumping grounds when they are named by implementation instead of domain intent.
- "Reusable" abstractions built too early usually spread vagueness instead of clarity.
- Deleting duplication without understanding business semantics can merge rules that must diverge later.
- A cleanup that changes behavior, boundaries, or transactions is no longer just clean-code work.
