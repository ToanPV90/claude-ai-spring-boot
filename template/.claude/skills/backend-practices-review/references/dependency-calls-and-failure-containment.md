# Dependency Calls and Failure Containment

## Default Position

Backend review should challenge every remote dependency call in the request path.

Ask:
- does the user need this result before the response returns?
- what timeout and retry policy exists?
- what happens when the dependency slows down or fails repeatedly?

## Timeout and Retry Posture

Review for:
- explicit timeouts rather than library defaults
- bounded retries with backoff
- no retry storms against an already-failing dependency
- clear terminal-failure behavior when retries are exhausted

## Failure Containment

Good defaults include:
- isolating local commit from retry-heavy external work
- graceful degradation when the dependency is non-critical
- operator-visible failure state instead of silent swallowing
- no assumption that a third-party service has the same availability profile as the local database

## Boundedness

Dependency safety also includes bounded resource use.

Review whether the design limits:
- concurrency against the dependency
- queue growth during failures
- request payload or batch size
- memory usage while waiting for dependency responses

If logging, tracing, or broker semantics dominate the problem, route to `logging-master` or `kafka-master`.

## Anti-Patterns

- Inline network calls hidden inside transactional service methods
- Library-default timeouts that are effectively “wait forever”
- Infinite retries or retries without jitter/backoff
- Treating provider outages as generic 500s with no recovery story
