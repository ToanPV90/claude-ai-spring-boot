# TDD Gotchas

- Writing the controller, service, and repository before the first failing test is code-first development, not TDD.
- A 404 or compilation error can be a valid first RED; a broken test setup is not.
- Do not skip negative tests just because the happy path is green.
- Avoid shared mutable state in `@BeforeEach`; prefer factory methods and explicit fixture setup.
- Do not use abandoned infrastructure helpers like `ozimov/embedded-redis`; prefer TestContainers.
- For Kafka and Redis, keep the workflow here but load the subsystem-specific testing reference instead of inventing bespoke waits or setup.
