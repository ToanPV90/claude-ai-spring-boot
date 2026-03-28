# Review Workflow

## Default Sequence

1. Understand what changed and why.
2. Scan for critical/high-risk issues first.
3. Review correctness domains: nulls, exceptions, state changes, transactions, resources.
4. Review runtime behavior: concurrency, performance, hidden framework behavior.
5. Review maintainability only after correctness is covered.
6. Group findings by severity and repeated pattern.

## Preferred Output Shape

- `Critical`
- `High`
- `Medium`
- `Low` or omit if there is nothing useful
- `Good Practices Observed`

## What Makes a Strong Finding

- names the location or pattern
- explains the impact
- suggests a bounded fix
- avoids restating the code without analysis

## What to Skip

- auto-generated code
- test fixture noise unless it hides a real risk
- pure style comments with no clarity or maintenance payoff
