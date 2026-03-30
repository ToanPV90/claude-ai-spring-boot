---
name: java-code-review
description: Systematic review guidance for Java code with a focus on correctness, safety, maintainability, and review severity. Use when reviewing a Java PR, auditing implementation quality, or preparing code for merge; route to framework-specific references only when they appear in the diff, and keep review target/completeness explicit.
license: MIT
metadata:
  author: local
  version: "1.1.3"
  domain: backend
  triggers:
    - Java code review
    - review PR
    - review implementation
    - pre-merge review
    - null safety review
    - concurrency review
    - performance review
    - code quality review
    - bug risk review
  role: reviewer
  scope: review
  output-format: analysis
  related-skills: clean-code, api-contract-review, backend-practices-review, tdd-guide, kafka-master, redis-master, keycloak-master, spring-boot-master, jpa-master, blaze-persistence
---

# Java Code Review Skill

Decision guide for running a focused Java review that prioritizes correctness and risk before style or polish.

## When to Use
- The user wants a Java PR, feature, or diff reviewed before merge
- You need to identify bug risk, correctness gaps, maintainability issues, or unsafe defaults in Java code, including framework-specific diffs when they appear
- A change looks fine at first glance but needs a systematic pass across nullability, exceptions, concurrency, resources, API shape, and framework usage
- You want findings grouped by severity instead of a stream of disconnected nitpicks

## When Not to Use
- The user wants an external second-opinion audit via Codex CLI — use `audit-codex`
- The task is only HTTP/API contract semantics — use `api-contract-review`
- The task is mainly cross-cutting backend production-safety review such as trust boundaries, retry safety, dependency-call containment, storage/files, or lifecycle/cleanup behavior — use `backend-practices-review`
- The task is readability-first refactoring rather than a review pass — use `clean-code`
- The work is explicit Spring Boot implementation generation or framework setup rather than review — use `spring-boot-engineer` or `spring-boot-master`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Shared review intake, completeness, severity, and disposition contract | `references/review-intake-and-output.md` | Starting any Java review so the report states what was reviewed and how complete it is |
| Review flow, severity rules, finding shape | `references/review-workflow.md` | Starting a review and deciding how to report findings |
| Null safety, exceptions, collections, resources, API design | `references/core-correctness.md` | Checking the basics that most often create bugs in normal Java code |
| Concurrency and async correctness | `references/concurrency.md` | Reviewing shared state, executors, futures, locks, cancellation, or thread-safety assumptions |
| Performance and modern Java pitfalls | `references/runtime-and-modern-java.md` | Reviewing throughput, virtual threads, records, Optional misuse, or other runtime concerns |
| Spring-specific review smells and testing expectations | `references/spring-review.md` | Reviewing Spring services/controllers/config and framework-specific risks |
| Specialized subsystem routing and review boundaries | `references/integration-routing.md` | Kafka, Redis, Keycloak, JPA, or contract-specific concerns appear in the diff |
| Common review traps | `references/gotchas.md` | Avoiding noisy reviews, false positives, and duplicated specialty guidance |

## Shared Review Contract

Start every review by stating the target, material reviewed, supporting context used, and whether the result is **complete** or **partial** because important inputs were missing.

For each finding, keep the output shape explicit:
- **severity** — `Critical`, `High`, `Medium`, or `Low`
- **disposition** — `patch`, `decision-needed`, `defer`, or `dismiss`
- **impact** — bug risk, data risk, security risk, or maintainability cost
- **next move** — patch now, route outward, or hold for a decision

## Review Ladder

1. **Can this change crash, corrupt data, or break security?** Start there.
2. **Can it silently produce wrong behavior?** Review nullability, exceptions, and state transitions.
3. **Can it race, deadlock, corrupt state, or ignore cancellation?** Review concurrency and resource handling.
4. **Can it become hard to maintain or reason about?** Review API shape, naming, and coupling.
5. **Is the issue actually owned by a specialized skill?** Route to `api-contract-review`, `jpa-master`, `kafka-master`, `redis-master`, or `keycloak-master`.

## Severity Guide

| Severity | Use For |
|----------|---------|
| Critical | Security vulnerability, data loss risk, production crash, broken authorization, or stop-ship concurrency bug |
| High | Likely bug, race condition, unsafe async behavior, major performance problem, broken transaction or API behavior |
| Medium | Maintainability issue, incorrect default, missing defensive check, review-worthy smell |
| Low | Minor cleanup, style, or optional polish |

## Concurrency Pass

Ask these first:
- **What threads can call this code?** Request threads, schedulers, `@Async`, executors, Kafka listeners, reactive workers?
- **What state is shared across those calls?** Singleton fields, caches, collections, `ThreadLocal`, security/MDC context, mutable DTO/entity state?

Red flags:
- mutable state inside Spring singleton beans
- shared collections or caches without a thread-safety strategy
- `CompletableFuture` / executor code with dropped failures or unclear ownership
- swallowed `InterruptedException` or missing cancellation/shutdown path
- blocking work inside WebFlux/reactive or other non-blocking execution paths
- locks or `synchronized` blocks wrapped around I/O, DB, or long-running work

## Quick Mapping

| Situation | Default Review Move | Prefer Instead Of |
|-----------|---------------------|-------------------|
| Risky code path | Review correctness before style | Leading with formatting feedback |
| Hidden nullability | Check API contracts and call chains | Assuming tests already cover it |
| Async or shared-state diff | Review thread safety, executor lifecycle, cancellation, and publication first | Treating async code like straight-line business logic |
| Big Spring Boot diff | Review boundary placement, transactions, DTO/API leakage, and framework behavior | Treating it like plain Java only |
| Kafka/Redis/Keycloak change | Route to owning specialist skill | Keeping subsystem audits inline here |
| Large diff | Group by severity and repeated pattern | One comment per repeated issue |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Review for correctness before polish | Crash/data/security risks first |
| Treat concurrency review as correctness work | Race, deadlock, stale visibility, and cancellation bugs are not “performance nits” |
| Assume Spring singleton beans are shared by default | Mutable per-request state in a bean needs explicit confinement or synchronization |
| Group repeated problems into one finding | One pattern-level comment beats ten duplicates |
| Anchor findings in impact | Explain bug risk, not just rule violation |
| Note good patterns when they materially reduce risk | Constructor injection, stable transactions, clear DTO boundary |
| Route specialty concerns outward when another skill owns the depth | JPA, Kafka, Redis, Keycloak, API contracts |

### MUST NOT DO
- Do not flood the review with style-only comments while correctness issues remain
- Do not report generic Java trivia with no concrete risk or maintainability impact
- Do not duplicate subsystem checklists inline when specialized skills already exist
- Do not recommend risky “fixes” that widen scope beyond the reviewed change without saying so
- Do not treat tests as optional when the change introduces edge cases or risk-heavy behavior

## Gotchas

- A long review checklist is not the same as a useful review; prioritize findings by impact.
- Concurrency bugs often look intermittent or "theoretical" until production timing makes them deterministic; call out the concrete failure mode.
- In Spring, singleton beans are shared across requests by default; mutable bean fields should be treated as concurrent state unless confinement is explicit.
- Some smells belong to other skills: entity/API leakage is often `spring-boot-master` or `jpa-master`, not just generic Java review.
- A technically correct comment can still be low value if it ignores the actual diff risk.
- Over-reporting nits trains teams to ignore real review feedback.
- Framework-specific issues like Kafka ack semantics or Keycloak role mapping need specialist routing, not shallow one-line mentions.

## Minimal Finding Format

```markdown
## Code Review: order service changes

### Review Scope
- Target: `git diff HEAD`
- Context used: `AGENTS.md`, `OrderService`, related tests
- Missing context: no product spec provided
- Completeness: Partial — acceptance-level checks are limited without a spec

### High · patch
- `OrderService#create` can throw a null-driven failure when `request.customerId()` is absent; validate the input or reject it at the boundary before repository access.

### Medium · decision-needed
- `OrderController` returns the entity directly, which leaks persistence shape into the API; map to a response DTO instead.

### Good Practices Observed
- Constructor injection and a service-owned transaction boundary reduce hidden framework behavior.
```

## What to Verify
- The review states the target, context used, missing context, and whether completeness is full or partial
- Findings are grouped by severity and tied to impact
- Findings carry an explicit disposition (`patch`, `decision-needed`, `defer`, or `dismiss`)
- Repeated issues are consolidated instead of duplicated
- Specialized concerns were routed to the correct sibling skills
- Review comments focus on the changed behavior and real risk, not generic trivia
- Suggested fixes do not quietly expand scope beyond the review

## See References
- `references/review-intake-and-output.md` for the shared review scope/completeness/disposition contract
- `references/review-workflow.md` for review sequence and reporting shape
- `references/core-correctness.md` for null safety, exceptions, collections, resources, and API design
- `references/concurrency.md` for races, shared state, executors, futures, locks, virtual threads, and cancellation
- `references/runtime-and-modern-java.md` for performance, virtual threads, records, and Optional pitfalls
- `references/spring-review.md` for Spring-specific smells and testing expectations
- `references/integration-routing.md` for subsystem-specific review routing
- `references/gotchas.md` for review failure modes
