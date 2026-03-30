# Idempotency, Retries, and Background Work

## Default Position

Every backend write path should answer:
- what happens if the same action arrives twice
- what happens if the caller retries after a timeout
- what work must continue after the main transaction commits

If the design has no explicit answer, it is not production-safe yet.

## Idempotency and Duplicate Protection

Use explicit duplicate-protection rules when:
- clients may retry after timeouts
- callbacks or webhooks can be delivered more than once
- background workers can reprocess the same message
- a second execution would double-charge, double-send, or duplicate a record

Good patterns include idempotency keys, natural business uniqueness, deduplication tables, unique constraints, or persisted request identity.

## Transaction Boundaries

Review whether transactions:
- wrap the business state that must commit atomically
- avoid holding locks across slow remote calls unless explicitly justified
- fail clearly when dependent state changes underneath them

If deep JPA or PostgreSQL mechanics dominate, route to `jpa-master` or `postgres-master`.

## Background Work

Prefer durable background work when:
- the side effect is slow or failure-prone
- retries are expected
- the work fans out to multiple systems
- the request should commit local state even if follow-up work completes later

Good defaults include persisted jobs or messages, explicit retry policy, terminal-failure states, and correlation back to the originating request.

## Anti-Patterns

- Assuming retries are rare enough to ignore
- Doing remote provider calls inside long DB transactions for convenience
- Fire-and-forget async work without durable state or observability
- Treating duplicate writes as a UX problem instead of a backend integrity problem
