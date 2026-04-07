# ADR Template & Lifecycle Rules

## File Location & Naming

Store in `docs/decisions/` with sequential numbering: `NNNN-short-title.md`. Gaps are fine; never renumber.

## Template

```markdown
# ADR-NNNN: <Title — imperative verb phrase>

## Status
PROPOSED | ACCEPTED | SUPERSEDED by ADR-XXXX | DEPRECATED

## Context
What is the situation? State the problem, constraints, and forces — not the solution.

## Decision
What did we decide? State the chosen option and why. Mention rejected alternatives briefly.

## Consequences
What becomes easier or harder? List positive and negative impacts, operational changes, follow-up work.
```

## Lifecycle Rules

| Rule | Detail |
|------|--------|
| Immutable once ACCEPTED | To change, write a new ADR that supersedes |
| Status transitions | PROPOSED → ACCEPTED → SUPERSEDED or DEPRECATED |
| Superseding | New ADR: `ACCEPTED — supersedes ADR-NNNN`; old: `SUPERSEDED by ADR-XXXX` |
| Scope | One decision per ADR; don't combine unrelated choices |
| Length | Fits on one screen; if longer, split into ADR + design doc |

## When to Write an ADR

- Tradeoff between viable alternatives exists
- Affects multiple modules, teams, or deployment units
- A new team member in 6 months would ask "why?"

**Skip when:** trivial choice, coding style, or only one viable option.

## Example: Superseding

New ADR status: `ACCEPTED — supersedes ADR-0003`. Old ADR status: `SUPERSEDED by ADR-0007`. Include context for why the previous decision no longer holds and list consequences of the new approach.
