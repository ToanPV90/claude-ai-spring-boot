---
name: backend-practices-review
description: Review guidance for cross-cutting backend choices with long-lived operational impact, including trust boundaries, durable state, retries, dependency calls, storage/files, and lifecycle safety. Use when auditing whether backend code or design follows production-safe defaults instead of fragile shortcuts while keeping review scope/completeness explicit.
license: MIT
metadata:
  author: local
  version: "1.1.1"
  domain: backend
  triggers:
    - backend best practices
    - backend review
    - backend architecture review
    - validation strategy
    - input validation review
    - error handling review
    - idempotency
    - retry safety
    - background job design
    - async processing
    - external API reliability
    - storage architecture
    - file upload architecture
    - object storage
    - presigned URL
    - object key
    - streaming upload
    - chunked upload
    - lifecycle safety
  role: reviewer
  scope: review
  output-format: analysis
  related-skills: java-code-review, api-contract-review, spring-boot-master, spring-boot-engineer, java-architect, postgres-master, kafka-master, redis-master, keycloak-master, logging-master, design-patterns, clean-code
---

# Backend Practices Review Skill

Decision guide for reviewing backend choices that are easy to ship and expensive to operate later.

This skill is the framework-neutral reviewer for recurring backend failure modes with long-lived operational impact. It should stay focused on production-safety defaults, not become a second generic code-review skill or a handbook for every subsystem.

## When to Use
- The user wants backend code, a PR, or a design reviewed for production-safe defaults before merge
- The change touches trust boundaries, validation, durable state, retries, dependency calls, storage/files, or lifecycle/cleanup behavior
- The backend works on the happy path, but you need to audit what happens under retries, failures, scale, or infrastructure change
- You want recurring backend problems mapped to the better default for each, with deeper routing only when a specialist skill owns the mechanism

## When Not to Use
- The task is a general Java correctness or maintainability review with little production-behavior surface — use `java-code-review`
- The task is mostly HTTP semantics, endpoint versioning, or client-facing response behavior — use `api-contract-review`
- The task is explicit Spring Boot implementation or framework wiring work — use `spring-boot-engineer`
- The task is mostly controller/service/repository ownership and application layering — use `spring-boot-master`
- The main question is service boundaries, topology, or ADR-style architecture tradeoffs — use `java-architect`
- The task is mostly PostgreSQL, Kafka, Redis, Keycloak, or logging mechanism detail — use the owning specialist skill

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Shared review intake, completeness, severity, and disposition contract | `references/review-intake-and-output.md` | Starting any backend review so operational-risk findings stay scoped and actionable |
| Trust boundaries, input validation, authorization, and secret hygiene | `references/boundary-trust-and-input-validation.md` | Reviewing unsafe input trust, weak authz boundaries, or inconsistent validation/error behavior |
| Durable object identity and storage defaults for files/blobs | `references/object-storage-and-file-identity.md` | Reviewing persisted identifiers, object-storage choice, or brittle URL-as-truth behavior |
| Large payload movement, buffering risk, and upload transport | `references/upload-transport-and-large-files.md` | Reviewing large requests, streaming, chunking, staging, or bounded memory posture |
| Idempotency, retries, duplicate protection, and background work | `references/idempotency-retries-and-background-work.md` | Reviewing duplicate submissions, retry safety, async follow-up work, or multi-step mutation flows |
| External dependencies, timeouts, fallback, and failure containment | `references/dependency-calls-and-failure-containment.md` | Reviewing external API/database/cache interactions that can hang, amplify retries, or fail opaquely |
| Cleanup, retention, observability, and state transitions over time | `references/lifecycle-and-operations.md` | Reviewing cleanup jobs, explicit states, expiration, operator visibility, and production survivability |

## Shared Review Contract

Start every review by stating the target, code or design material reviewed, supporting context used, and whether the result is **complete** or **partial** because important inputs were missing.

For each finding, keep the report shape explicit:
- **severity** — `Critical`, `High`, `Medium`, or `Low`
- **disposition** — `patch`, `decision-needed`, `defer`, or `dismiss`
- **impact** — duplicate state, hidden retry risk, boundary leak, operator pain, or boundedness failure
- **next move** — patch now, route to a mechanism-owning skill, or hold for a product/architecture decision

## Symptom Triage

| Problem | Default Check | Preferred Practice |
|--------|---------------|--------------------|
| Boundary leaks or inconsistent failures | Are entities, framework types, or ad hoc errors leaking across the trust boundary? | Make input contracts explicit, validate early, and keep failure semantics deliberate |
| Duplicate or partial state under retries | Can the same request, message, or callback run twice and mutate state twice? | Add idempotency, unique constraints, version checks, or explicit duplicate-protection rules |
| Slow or fragile side effects inside the main transaction | Are remote calls, email, or scans coupled to the request commit path? | Separate local commit from retryable follow-up work and make failures visible |
| Large payloads create memory or latency risk | Are files, exports, or lists buffered fully or left unbounded? | Stream, paginate, batch, and cap sizes/concurrency deliberately |
| File/blob state is brittle | Are public URLs, filenames, or local-host assumptions being treated as canonical truth? | Persist durable identifiers and treat serving strategy as a separate concern |
| Cleanup and production support are hand-waved | Are partial states, retries, expirations, or failures invisible over time? | Model lifecycle states, cleanup paths, and observability explicitly |

## Review Ladder

1. **What is the trust boundary?** Check validation, authorization, and failure behavior first.
2. **What state must stay correct over time?** Review canonical identifiers, transaction boundaries, and duplicate protection.
3. **What work is too large or too slow for the happy-path request?** Review streaming, batching, bounded payloads, and sync-vs-async choices.
4. **What happens when clients retry or dependencies fail?** Require idempotency, timeouts, and explicit retry/failure policy.
5. **What cleanup, retention, or operator visibility exists?** Check states, expiration, observability, and recovery paths.
6. **Does another skill own the mechanism?** Stop at the principle here and route subsystem detail outward.

## Quick Mapping

| Situation | Default Review Move | Prefer Instead Of |
|-----------|---------------------|-------------------|
| Client retries can repeat a write | Make duplicate protection explicit | Assuming retries are rare enough to ignore |
| Request triggers remote side effects | Separate commit from retryable follow-up work | Doing network I/O inline because it is convenient |
| Large upload or export | Stream or stage deliberately with bounded memory | Reading the full payload into memory by default |
| File/blob persisted in business data | Store a durable provider/bucket/key-style reference | Persisting public URLs or presigned URLs as canonical state |
| Sensitive or tenant-scoped resource | Authorize by ownership/capability and keep delivery private by default | Treating authentication as enough |
| Stateful flow spans time | Model states, cleanup, and expiration explicitly | One boolean flag and manual operator hope |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Validate and authorize at the trust boundary | Explicit request validation, ownership checks, and safe failure behavior before costly side effects |
| Make durable state explicit | Stable identifiers, deliberate transaction boundaries, and clear sources of truth |
| Design for retries and duplicate delivery | Idempotency keys, unique constraints, version checks, or other explicit duplicate-protection rules |
| Bound large work | Streaming, pagination, batching, and size/concurrency limits for expensive payloads or loops |
| Isolate dependency risk | Timeouts, bounded retries, and visible failure states for external calls |
| Model lifecycle and cleanup | Explicit states, expiration, cleanup jobs, and usable observability |

### MUST NOT DO
- Do not trust client input, filenames, tenant hints, or content metadata without validation
- Do not let entities, framework internals, or ad hoc exception shapes define the boundary by accident
- Do not perform slow or failure-prone remote side effects inline just because the controller/service can reach them
- Do not treat retries, duplicate submissions, or concurrent delivery as edge cases that can be ignored
- Do not persist absolute storage URLs or presigned URLs as the system of record
- Do not ship stateful flows without cleanup, expiration, or operator-visible failure states

## Gotchas

- “Backend best practices” is too broad unless the review stays centered on recurring, expensive-to-reverse failure modes.
- A technically working request path can still be a bad backend design if retries, cleanup, dependency failure, or visibility are hand-waved.
- This skill should triage across backend concerns; it should not duplicate the mechanism-level depth of `postgres-master`, `kafka-master`, `redis-master`, `keycloak-master`, or `logging-master`.
- Uploads matter here because they expose durable identity, large-payload movement, and lifecycle problems—not because this skill is only about uploads.
- Good review output should name the operational risk: duplicate writes, hidden retries, broken ownership, orphaned state, or unbounded memory.

## Minimal Examples

### Make retries safe
```text
Bad: POST /payments creates a new charge every time the client retries after a timeout

Better: require an idempotency key or equivalent duplicate-protection rule
        persist request identity with the write
        return the same logical result for safe retries
```

### Move failure-prone side effects out of the main path
```text
Bad: create order -> call payment provider -> send email -> publish webhook
     all inline before the response returns

Better: commit local state first
        publish durable follow-up work
        retry and observe side effects independently
```

### Persist the key, not the URL
```text
Bad: attachment.public_url = "https://cdn.example.com/user-media/123/avatar.png"

Better: attachment.storage_provider = "s3"
        attachment.bucket = "user-media"
        attachment.object_key = "users/123/avatar/01HT...png"
        # generate an app URL or presigned URL when serving
```

## What to Verify
- The review states target, context used, missing context, and whether completeness is full or partial
- Validation, authorization, and failure semantics are explicit at the trust boundary
- Findings carry an explicit disposition (`patch`, `decision-needed`, `defer`, or `dismiss`) instead of vague advice
- Stateful writes remain correct under retries, duplicate submissions, and background reprocessing
- Large payloads or expensive loops are bounded, streamed, paged, or batched deliberately
- Remote dependency calls have explicit timeout/retry/failure-containment posture
- Durable identifiers stay independent from the current serving or delivery mechanism
- Lifecycle states, cleanup, expiration, and observability are present where the flow spans time
- Specialist routing happened once the review turned into PostgreSQL, Kafka, Redis, Keycloak, logging, API-contract, or Spring-specific mechanism depth

## See References
- `references/review-intake-and-output.md` for the shared review scope/completeness/disposition contract
- `references/boundary-trust-and-input-validation.md` for trust boundaries, authz, validation, and secret hygiene
- `references/object-storage-and-file-identity.md` for durable file/blob identity and object-storage defaults
- `references/upload-transport-and-large-files.md` for streaming, chunking, staging, and bounded payload movement
- `references/idempotency-retries-and-background-work.md` for duplicate protection, async work, and retry-safe mutation flows
- `references/dependency-calls-and-failure-containment.md` for external call safety, timeouts, backoff, and graceful degradation
- `references/lifecycle-and-operations.md` for state transitions, cleanup, expiration, observability, and operator safety
