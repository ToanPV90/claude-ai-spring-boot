# Java Review Gotchas

- The biggest risk is often omitted behavior, not ugly syntax.
- A review that mixes every subsystem deeply becomes noisy and shallow at the same time.
- Comments about style without impact can hide the truly dangerous findings.
- Tests matter most where the diff changes failure paths, boundaries, or concurrency.
- If a review point really depends on Spring, JPA, Kafka, Redis, or Keycloak semantics, call the owning skill instead of faking expertise.
