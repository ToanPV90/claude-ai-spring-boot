# Documentation Gotchas & Anti-Patterns

## ADR Anti-Patterns

- **Missing Consequences section** — an ADR without consequences is an announcement, not a decision record.
- **ADR as design document** — if it takes more than one screen, it's too long. Split into ADR (decision) + design doc (detail).
- **Renumbering ADRs to fill gaps** — breaks external references. Gaps in numbering are fine.
- **Mutating accepted ADRs** — write a new ADR that supersedes the old one; never edit an accepted decision.
- **ADR for trivial choices** — "use SLF4J for logging" has no meaningful tradeoff; don't write an ADR.

## JavaDoc Anti-Patterns

- **Documenting implementations instead of interfaces** — duplicated JavaDoc drifts; document the interface, let impls inherit.
- **Restating the code** — `@return the name` on `getName()` adds zero information; skip obvious docs.
- **Missing failure documentation** — callers need to know what exceptions are thrown and under what conditions.
- **`@author` tags** — git blame is more accurate and doesn't go stale.

## General Documentation Anti-Patterns

- **Module READMEs that list every class** — describe purpose and boundaries, not inventory. Inventory becomes stale immediately.
- **Comments that say _what_ instead of _why_** — `// set timeout to 30` is noise. `// Payment gateway drops idle connections after 25s` is useful.
- **`// TODO: fix later` without a ticket** — these are permanent residents. Link to an issue or delete.
- **Outdated documentation left in place** — stale docs are worse than no docs; readers stop trusting all documentation.
- **Excessive documentation** — if developers skip reading it, you've written too much. Concise > comprehensive.

## Common Rationalizations to Reject

| Rationalization | Why It's Wrong |
|----------------|---------------|
| "The code is self-documenting" | Code shows *what* and *how*, never *why* or *what was rejected* |
| "We'll document it later" | Later never comes; decisions lose context within weeks |
| "Everyone knows why we chose X" | Team members change; tribal knowledge evaporates |
| "ADRs are too heavyweight" | A good ADR is 10–20 lines; if it feels heavy, you're writing a design doc |
| "JavaDoc slows us down" | Contract-level JavaDoc on interfaces takes minutes and saves hours of debugging |
