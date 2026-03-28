---
name: java-code-review
description: Systematic review guidance for Java and Spring code with a focus on correctness, safety, maintainability, and review severity. Use when reviewing a Java PR, auditing implementation quality, or preparing code for merge.
license: MIT
metadata:
  author: local
  version: "1.1.0"
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
    - Spring code review
    - bug risk review
  role: reviewer
  scope: review
  output-format: analysis
  related-skills: clean-code, api-contract-review, tdd-guide, kafka-patterns, redis-patterns, keycloak-patterns, spring-boot-patterns, jpa-patterns, blaze-persistence
---

# Java Code Review Skill

Decision guide for running a focused Java review that prioritizes correctness and risk before style or polish.

## When to Use
- The user wants a Java PR, feature, or diff reviewed before merge
- You need to identify bug risk, correctness gaps, maintainability issues, or unsafe defaults in Java or Spring code
- A change looks fine at first glance but needs a systematic pass across nullability, exceptions, concurrency, resources, API shape, and framework usage
- You want findings grouped by severity instead of a stream of disconnected nitpicks

## When Not to Use
- The user wants an external second-opinion audit via Codex CLI — use `audit-codex`
- The task is only HTTP/API contract semantics — use `api-contract-review`
- The task is readability-first refactoring rather than a review pass — use `clean-code`
- The work is implementation generation or framework setup rather than review — use `spring-boot-engineer` or `spring-boot-patterns`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Review flow, severity rules, finding shape | `references/review-workflow.md` | Starting a review and deciding how to report findings |
| Null safety, exceptions, collections, resources, API design | `references/core-correctness.md` | Checking the basics that most often create bugs in normal Java code |
| Concurrency and async correctness | `references/concurrency.md` | Reviewing shared state, executors, futures, locks, cancellation, or thread-safety assumptions |
| Performance and modern Java pitfalls | `references/runtime-and-modern-java.md` | Reviewing throughput, virtual threads, records, Optional misuse, or other runtime concerns |
| Spring-specific review smells and testing expectations | `references/spring-review.md` | Reviewing Spring services/controllers/config and framework-specific risks |
| Specialized subsystem routing and review boundaries | `references/integration-routing.md` | Kafka, Redis, Keycloak, JPA, or contract-specific concerns appear in the diff |
| Common review traps | `references/gotchas.md` | Avoiding noisy reviews, false positives, and duplicated specialty guidance |

## Review Ladder

1. **Can this change crash, corrupt data, or break security?** Start there.
2. **Can it silently produce wrong behavior?** Review nullability, exceptions, and state transitions.
3. **Can it race, deadlock, corrupt state, or ignore cancellation?** Review concurrency and resource handling.
4. **Can it become hard to maintain or reason about?** Review API shape, naming, and coupling.
5. **Is the issue actually owned by a specialized skill?** Route to `api-contract-review`, `jpa-patterns`, `kafka-patterns`, `redis-patterns`, or `keycloak-patterns`.

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
| Big Spring diff | Review boundary placement, transactions, and DTO/API leakage | Treating it like plain Java only |
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
- Some smells belong to other skills: entity/API leakage is often `spring-boot-patterns` or `jpa-patterns`, not just generic Java review.
- A technically correct comment can still be low value if it ignores the actual diff risk.
- Over-reporting nits trains teams to ignore real review feedback.
- Framework-specific issues like Kafka ack semantics or Keycloak role mapping need specialist routing, not shallow one-line mentions.

## Minimal Finding Format

```markdown
## Code Review: order service changes

### High
- `OrderService#create` can throw a null-driven failure when `request.customerId()` is absent; validate the input or reject it at the boundary before repository access.

### Medium
- `OrderController` returns the entity directly, which leaks persistence shape into the API; map to a response DTO instead.

### Good Practices Observed
- Constructor injection and a service-owned transaction boundary reduce hidden framework behavior.
```

## What to Verify
- Findings are grouped by severity and tied to impact
- Repeated issues are consolidated instead of duplicated
- Specialized concerns were routed to the correct sibling skills
- Review comments focus on the changed behavior and real risk, not generic trivia
- Suggested fixes do not quietly expand scope beyond the review

## See References
- `references/review-workflow.md` for review sequence and reporting shape
- `references/core-correctness.md` for null safety, exceptions, collections, resources, and API design
- `references/concurrency.md` for races, shared state, executors, futures, locks, virtual threads, and cancellation
- `references/runtime-and-modern-java.md` for performance, virtual threads, records, and Optional pitfalls
- `references/spring-review.md` for Spring-specific smells and testing expectations
- `references/integration-routing.md` for subsystem-specific review routing
- `references/gotchas.md` for review failure modes
