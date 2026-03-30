# Review Intake and Output

Use this shared contract across the review-oriented skills so every review starts by saying what was actually reviewed, how much context was available, and what action each finding requires.

## Intake Contract

State these fields before judging the change:

| Field | What to State | Why It Matters |
|------|----------------|----------------|
| Review target | PR, diff, commit range, file list, or snippet set | Prevents implied coverage over code that was never reviewed |
| Material reviewed | `git diff HEAD`, `git diff HEAD~1 HEAD`, pasted patch, named files, etc. | Anchors the review in real artifacts |
| Supporting context | Specs, tickets, incident notes, tests, docs, runtime clues | Shows what informed the judgment |
| Missing context | No spec, no runtime data, no acceptance criteria, partial diff, etc. | Makes the review boundary explicit |
| Completeness | `Complete` or `Partial` | Avoids overstating certainty |

Use **Partial** whenever meaningful inputs are missing. Name the missing inputs instead of implying full coverage.

## Finding Contract

Every reported finding should make four things explicit:

| Field | Expectation |
|------|-------------|
| Severity | `Critical`, `High`, `Medium`, or `Low` |
| Disposition | `patch`, `decision-needed`, `defer`, or `dismiss` |
| Impact | Why it matters: bug risk, client breakage, data loss, security risk, operator pain, etc. |
| Next move | Patch now, route to another skill, or hold for a product/architecture decision |

## Disposition Guide

| Disposition | Use When |
|------------|----------|
| `patch` | The fix is clear and should be made in the current scope |
| `decision-needed` | The issue is real, but the right fix depends on product, API, architecture, or rollout tradeoffs |
| `defer` | The issue is valid but should land as follow-up work instead of blocking this exact change |
| `dismiss` | The concern was checked and is not a real issue, is already handled, or is outside the intended target |

Do not surface `dismiss` as if it were an issue. Use it to record internal triage so the final report stays clean.

## Minimal Output Template

```markdown
## Review Scope
- Target: `git diff HEAD`
- Material reviewed: uncommitted changes in `OrderService` and `OrderController`
- Context used: `AGENTS.md`, related tests, API docs
- Missing context: no product spec for partial-cancellation rules
- Completeness: Partial — acceptance-level review is limited without that spec

## Findings
### High · patch
- `OrderService#create` can double-write under retries because duplicate protection is missing before the side effect.

### Medium · decision-needed
- `POST /orders/{id}/cancel` may need a stronger contract around partial cancellation semantics; the code path exists, but product/API behavior is not fully specified.
```

## Good Review Hygiene

- Say when the review is partial instead of implying full confidence
- Keep severity and disposition separate; a real issue can still be a `decision-needed` or `defer`
- Anchor every finding in evidence from the reviewed material
- Route mechanism depth outward once a sibling skill clearly owns it
