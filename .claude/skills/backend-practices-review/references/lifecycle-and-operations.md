# Lifecycle and Operations

## Default Position

Backend review should ask whether the system can survive retries, failures, cleanup, deploys, and operator handoff over time.

If the design only looks correct on the happy path of one request, it is not operationally complete yet.

## Model State Explicitly

Stateful backend flows usually need more than one boolean flag.

Common states:
- `initiated`
- `processing`
- `validating`
- `finalizing`
- `ready`
- `failed`
- `expired`

That pattern applies to uploads, long-running jobs, exports, sync processes, and integration handoffs.

## Cleanup and Retention

Any design that can create partial state must define how it disappears or transitions.

Review for cleanup of:
- abandoned uploads or sessions
- failed validation artifacts
- orphaned staging files
- dead jobs that never retried cleanly
- stale retry records or poison items

If the system has no expiration or cleanup path, call that out as an operational bug, not a minor omission.

## Observability

Useful signals include:
- lifecycle state transitions
- retry counts and terminal failures
- cleanup counts
- dependency timeout/failure metrics
- queue lag or backlog growth
- storage or staging growth over time

Operators should be able to answer what failed, what is stuck, and what needs cleanup.

## Configuration and Rollout Hygiene

Review whether production behavior depends on:
- typed configuration rather than scattered string literals
- explicit defaults that can be reasoned about
- environment-specific values kept outside source control
- safe rollout controls for expensive jobs, cleanup tasks, and external calls

## Review Triggers for Other Skills

Route outward when the main problem becomes:
- API contract shape or endpoint semantics → `api-contract-review`
- Spring MVC/WebFlux controller or SDK wiring → `spring-boot-engineer`
- module and layer ownership → `spring-boot-master`
- deep schema/index/blob modeling → `postgres-master`
- wider service-boundary or infrastructure decisions → `java-architect`
