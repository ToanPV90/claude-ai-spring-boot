---
description: Run TDD workflow — write failing tests first, implement, verify. For bugs, use the Prove-It pattern.
---

Load the `tdd-guide` skill.

**For new features** (Red-Green-Refactor):

1. Write a test that describes the expected behavior — it must **FAIL**
2. Confirm the failure is for the right reason (not a compile error or missing config)
3. Implement the minimum code to make it pass
4. Run: `./mvnw test -Dtest=ClassName#methodName -pl module-name`
5. Refactor if clarity improves; skip if not needed
6. Run the full module suite: `./mvnw test -pl module-name -am`

**For bug fixes** (Prove-It pattern):

1. Write a regression test that reproduces the bug — it must **FAIL**
2. Confirm the test fails for the same reason as the reported bug
3. Fix the root cause (not a downstream symptom)
4. Confirm the test passes: `./mvnw test -Dtest=ClassName#methodName`
5. Run the full suite to check for regressions: `./mvnw test`
6. Reference the issue in `@DisplayName` when a ticket exists

**Mock skepticism**: Prefer real → fake (in-memory) → stub → mock. Use mocks only at slow or non-deterministic boundaries.

**Test size guide**: Small (unit, no I/O) → Medium (`@WebMvcTest`, `@DataJpaTest`) → Large (`@SpringBootTest` + Testcontainers).
