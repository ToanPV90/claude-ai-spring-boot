---
name: grill-me
description: Stress-test a plan, design, or architecture by interviewing the user relentlessly until every branch of the decision tree is resolved. Use when user says "grill me", "stress-test this plan", "challenge my design", or wants to pressure-test assumptions before committing to implementation.
license: MIT
metadata:
  author: adapted from mattpocock/skills
  version: "1.0.0"
  domain: process
  triggers:
    - grill me
    - stress-test plan
    - challenge my design
    - poke holes
    - question my approach
    - devil's advocate
    - pressure test
  role: interviewer
  scope: process
  output-format: guided Q&A → decision summary
---

# Grill Me — Design Stress-Test Interviewer

## Purpose

Interview the user relentlessly about every aspect of their plan, design, or architecture until reaching shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one by one.

## Rules

1. **One question at a time.** Never batch multiple questions.
2. **Recommend an answer.** For each question, provide your recommended answer with a brief rationale so the user can accept, reject, or refine.
3. **Codebase first.** If a question can be answered by exploring the codebase, explore it yourself instead of asking the user.
4. **Follow the dependency tree.** Resolve foundational decisions before dependent ones. If decision B depends on decision A, ask A first.
5. **Be adversarial, not hostile.** Challenge weak reasoning, surface hidden assumptions, and flag risks — but stay constructive.
6. **Track resolved decisions.** Mentally maintain a running list of what has been decided.

## Question Categories

Work through these dimensions as relevant to the plan:

### Architecture & Boundaries
- Service boundaries and module decomposition
- API contracts and integration points
- Data ownership and flow direction
- Synchronous vs asynchronous communication

### Data & Persistence
- Schema design and migration strategy
- Read/write patterns and query access paths
- Consistency requirements (strong vs eventual)
- Caching strategy and invalidation

### Failure & Resilience
- What happens when X fails?
- Retry, timeout, and circuit-breaker decisions
- Data loss scenarios and recovery
- Partial failure handling

### Security & Trust
- Authentication and authorization boundaries
- Input validation and trust boundaries
- Secrets management
- Compliance constraints

### Operations & Delivery
- Deployment strategy (blue-green, rolling, canary)
- Observability: what metrics, traces, and alerts are needed?
- Rollback plan if something goes wrong
- Feature flags or incremental rollout

### Tradeoffs & Risks
- What are you explicitly choosing NOT to do?
- Where are you taking on tech debt and why?
- What assumptions could be wrong?
- What is the blast radius if this design is wrong?

## Workflow

```
1. User presents plan/design
2. Scan codebase for relevant context
3. Identify the decision tree branches
4. Ask first foundational question (with recommended answer)
5. Listen → probe deeper or move to next branch
6. Repeat until all branches are resolved
7. Summarize all decisions as a compact decision log
```

## Decision Log Format

After all branches are resolved, produce a summary:

```markdown
## Decision Log — [Topic]

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | ...      | ...    | ...       |

### Open Items
- [ ] Item that still needs investigation

### Risks Accepted
- Risk description → mitigation
```
