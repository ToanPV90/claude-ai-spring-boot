---
name: debugging-and-error-recovery
description: Systematic root-cause debugging workflow for Java/Spring Boot projects. Use when tests fail, builds break, behavior deviates from expectations, or you encounter any unexpected error and need a structured approach rather than guessing.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: process
  triggers:
    - debug
    - test failure
    - build failure
    - runtime error
    - unexpected behavior
    - something broke
    - root cause
    - error recovery
    - regression
    - bug fix
  role: workflow
  scope: process
  output-format: guidance
  related-skills: tdd-guide, java-code-review, spring-boot-engineer, logging-master, observability-master
---

# Debugging and Error Recovery — Java / Spring Boot

Structured root-cause debugging workflow. Stop guessing, start tracing.

## When to Use

- A test fails and the cause is not immediately obvious
- The Maven build breaks with compilation, dependency, or plugin errors
- Runtime behavior deviates from expectations (wrong data, unexpected exceptions, silent failures)
- A previously passing test or feature regresses after a change
- You need a disciplined checklist instead of random edits until things work

## When Not to Use

- The task is writing tests from scratch with TDD discipline — use `tdd-guide`
- The task is a code quality review rather than active debugging — use `java-code-review`
- The task is improving log quality or adding structured logging — use `logging-master`
- The task is setting up Actuator, metrics, or tracing infrastructure — use `observability-master`
- The task is Spring Boot implementation scaffolding — use `spring-boot-engineer`

## Reference Guide

| Topic | File | Load When |
|-------|------|-----------|
| Spring Boot error catalog and fix patterns | `references/spring-error-catalog.md` | You encounter a common Spring/Hibernate exception and need the standard fix |
| Bisect and regression workflow | `references/regression-workflow.md` | A previously passing test fails and you need to find the breaking commit |
| Common rationalizations and red flags | `references/gotchas.md` | Debugging is drifting into guesswork or scope expansion |

## Stop-the-Line Rule

When something unexpected happens, **stop all forward work immediately**. Do not add new code, do not refactor, do not move to the next task. The current failure is the only priority until it is explained and resolved.

1. Read the full error output before forming a hypothesis.
2. Resist the urge to make a speculative fix — reproduce first.
3. Only resume forward work after the fix is verified and a regression guard is in place.

## Six-Step Triage Checklist

Every debugging session follows these six steps in order. Do not skip ahead.

| Step | Action | Done When |
|------|--------|-----------|
| 1. Reproduce | Run the exact failing command and confirm the failure is consistent | You can trigger the failure on demand |
| 2. Localize | Narrow the failure to a specific layer, class, or line | You know which component owns the bug |
| 3. Reduce | Strip the scenario to the smallest input that still fails | You have a minimal reproducer |
| 4. Fix Root Cause | Change the code that causes the wrong behavior, not downstream symptoms | The minimal reproducer passes |
| 5. Guard | Add or update a test that fails without the fix and passes with it | A regression test exists |
| 6. Verify | Run the full relevant test suite to confirm nothing else broke | `./mvnw test` (or scoped equivalent) is green |

## Layer-Based Localization

When a Spring Boot error occurs, localize the fault to the narrowest layer before reading implementation details.

```text
Request → Controller → Service → Repository → Database
              ↓            ↓           ↓            ↓
         Validation    Business    Query/Map     Schema/Data
         Serialization  Logic      Transaction   Constraint
```

**Localization commands:**

```bash
# Run a single test class
./mvnw test -Dtest=OrderServiceTest

# Run a single test method
./mvnw test -Dtest=OrderServiceTest#shouldRejectNullCustomerId

# Run tests in a specific module
./mvnw test -pl order-service

# Run only tests matching a pattern
./mvnw test -Dtest="Order*Test"

# Run with full stack traces
./mvnw test -Dtest=OrderServiceTest -Dsurefire.useFile=false
```

**Localization questions:**

| Question | Points To |
|----------|-----------|
| Does the error mention `HttpMessageNotReadableException` or `MethodArgumentNotValidException`? | Controller / deserialization / validation layer |
| Does the error mention a service class or business rule? | Service layer |
| Does the error mention `DataAccessException`, `PersistenceException`, or SQL? | Repository / JPA / database layer |
| Does the error occur only with `@SpringBootTest` but not with a plain unit test? | Wiring / context configuration |
| Does the error disappear when you replace the real bean with a mock? | The replaced bean or its dependencies |

## Error-Specific Triage Trees

### Test Failures

```text
Test fails
├── Compilation error in test?
│   ├── Missing import → check dependency and module visibility
│   └── API changed → update test to match new signature
├── Spring context fails to load?
│   ├── BeanCreationException → read the "caused by" chain to the root
│   ├── NoSuchBeanDefinitionException → missing @Component, @Bean, or scan path
│   └── Circular dependency → refactor to break the cycle or use @Lazy on one leg
├── Assertion fails?
│   ├── Expected vs actual values differ → trace where the wrong value originates
│   ├── Null where a value was expected → check service/repo return path
│   └── Collection size mismatch → check query filters, test data setup
└── Timeout or hang?
    ├── Blocking call in reactive chain → check for blocking I/O on event loop
    ├── Missing test database → verify TestContainers or H2 config
    └── Deadlock → check transaction boundaries and lock ordering
```

### Build Failures

```text
Build fails
├── Compilation error?
│   ├── Cannot find symbol → wrong import, missing dependency, or module boundary
│   ├── Incompatible types → check generics, return types, updated API
│   └── Annotation processor error → check processor version and configuration
├── Dependency resolution?
│   ├── Could not find artifact → check repository URLs and version
│   ├── Version conflict → use ./mvnw dependency:tree -pl module to inspect
│   └── BOM mismatch → verify spring-boot-dependencies BOM import
└── Plugin failure?
    ├── Surefire/Failsafe → check JVM args, forking, and memory
    ├── spring-boot-maven-plugin → check main class configuration
    └── Other plugin → read the plugin error message; most are self-explanatory
```

### Runtime Errors

```text
Runtime error
├── BeanCreationException?
│   ├── UnsatisfiedDependencyException → missing bean or ambiguous candidates
│   ├── BeanCurrentlyInCreationException → circular dependency
│   └── Read the full "caused by" chain — the root is at the bottom
├── LazyInitializationException?
│   ├── Entity accessed outside session → fetch eagerly, use a DTO projection,
│   │   or ensure the access happens inside a @Transactional boundary
│   └── Check whether the caller runs in a transactional context
├── TransactionRequiredException?
│   ├── Write operation outside @Transactional → add annotation to service method
│   └── Propagation mismatch → verify REQUIRED vs REQUIRES_NEW boundaries
├── DataIntegrityViolationException?
│   ├── Unique constraint → check for duplicate data or missing dedup logic
│   ├── FK constraint → check insert/delete ordering
│   └── Not-null constraint → check entity defaults and request validation
└── HttpMessageNotReadableException?
    ├── Malformed JSON → validate request payload format
    ├── Unknown field → check @JsonIgnoreProperties or DTO shape
    └── Type mismatch → check field types between DTO and JSON
```

## JPA / Hibernate Debugging

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| N+1 queries in logs | Parent loaded, children fetched one by one in a loop | Use `JOIN FETCH` in JPQL, `@EntityGraph`, or a DTO projection |
| `LazyInitializationException` | Entity accessed after session closes | Keep access within `@Transactional`, or project to a DTO before returning |
| Unexpected UPDATE on read | Dirty checking fires on managed entity mutation | Use a DTO projection or `@Transactional(readOnly = true)` |
| `OptimisticLockException` | Concurrent modification of the same row | Retry the operation or redesign to reduce contention |
| Slow query | Missing index or full table scan | Enable `spring.jpa.show-sql=true`, check the query plan, add index |

**Enable SQL logging for diagnosis (do not leave in production):**

```properties
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

## Git Bisect for Regressions

When a test that previously passed now fails and the cause is not obvious:

```bash
# Start bisect
git bisect start

# Mark current commit as bad
git bisect bad

# Mark the last known good commit
git bisect good <commit-hash>

# Let git bisect run the failing test automatically
git bisect run ./mvnw test -Dtest=OrderServiceTest#shouldCalculateTotalCorrectly -pl order-service

# When done, note the first bad commit, then reset
git bisect reset
```

## Safe Fallback Patterns

When a fix is not immediately clear, use these to contain the damage while you investigate:

| Pattern | When | Example |
|---------|------|---------|
| Feature flag | Risky change can be toggled off | `@ConditionalOnProperty(name = "feature.new-pricing", havingValue = "true")` |
| Circuit breaker | External dependency is failing | Resilience4j `@CircuitBreaker` — route to `resilience-master` for depth |
| Graceful degradation | Non-critical feature fails | Return cached/default value instead of propagating the error |
| Rollback | Fix is unclear and impact is high | `git revert <commit>` the breaking change, investigate on a branch |

## Instrumentation Guidelines

Add temporary instrumentation to localize a bug. Remove it after the fix.

```java
// Temporary: trace entry/exit to localize where the value goes wrong
log.debug(">>> entering calculateTotal: items={}, discount={}",
    items.size(), discount);

BigDecimal result = pricingService.calculate(items, discount);

log.debug("<<< calculateTotal result={}", result);
```

**Rules for temporary instrumentation:**

- Use `log.debug()` so it does not pollute production logs at default level
- Include method name and the specific values you are tracing
- Remove all temporary instrumentation after the root cause is found and fixed
- If the instrumentation reveals something permanently useful, convert it to structured logging — route to `logging-master`

## Regression Test Guard Pattern

Every bug fix must include a test that fails without the fix and passes with it.

```java
@Test
@DisplayName("Regression: order total must not overflow for large quantities (GH-142)")
void shouldHandleLargeQuantityWithoutOverflow() {
    // Arrange — the exact scenario that triggered the original bug
    OrderItem item = new OrderItem("SKU-001", 1_000_000, new BigDecimal("99999.99"));

    // Act
    BigDecimal total = orderService.calculateItemTotal(item);

    // Assert — the correct behavior after the fix
    assertThat(total).isEqualByComparingTo(new BigDecimal("99999990000.00"));
}
```

**Regression test conventions:**

- Name the test descriptively: what was broken and why
- Reference the issue or ticket in `@DisplayName` when one exists
- Reproduce the exact input that caused the original failure
- Assert the correct behavior, not just "does not throw"

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| Test fails | Run the Six-Step Triage Checklist | Making speculative edits |
| Build breaks | Check the triage tree for build failures | Re-running the build hoping it works |
| Runtime exception in Spring | Localize to a layer using the error type | Reading all code top to bottom |
| Regression after a change | `git bisect` with the failing test | Manually checking every recent commit |
| Bug is fixed | Write a regression test guard | Assuming the fix is permanent without a test |
| Root cause unclear | Add temporary `log.debug()` instrumentation | Adding `System.out.println` or guessing |

## Constraints

### MUST DO

| Rule | Why |
|------|-----|
| Reproduce the failure before attempting a fix | A fix without reproduction is a guess |
| Read the full error output including the root cause chain | Spring errors often wrap the real cause two or three levels deep |
| Localize to the narrowest layer before reading implementation | Prevents wasting time in the wrong part of the codebase |
| Fix the root cause, not a downstream symptom | Symptom fixes create new bugs or mask the real problem |
| Write a regression test for every bug fix | Prevents the same bug from returning silently |
| Run `./mvnw test` after every fix | Confirms the fix does not break other tests |
| Remove temporary instrumentation after the fix | Debug logging left behind becomes permanent noise |

### MUST NOT DO

- Do not guess-and-check by making random changes until tests pass
- Do not suppress or catch exceptions just to make a test green
- Do not leave `System.out.println` or temporary `log.debug()` in committed code
- Do not skip the regression test because "the fix is obvious"
- Do not widen the scope of a fix beyond the identified root cause
- Do not rewrite surrounding code while debugging — fix the bug, then consider cleanup separately
- Do not disable or `@Disabled` a failing test without a tracked issue explaining why

## Gotchas

- Spring wraps exceptions deeply; always read to the bottom of the "caused by" chain for the real error.
- `BeanCreationException` often has a root cause four levels deep — `UnsatisfiedDependencyException` → `NoSuchBeanDefinitionException` → the missing class or config.
- A test that passes in isolation but fails in the suite usually has shared mutable state, database pollution, or context caching issues.
- `@DirtiesContext` fixes context pollution but slows the suite dramatically; prefer test isolation through `@Transactional` rollback or separate test data.
- `LazyInitializationException` means the fix is in the service or query layer, not in the entity or the controller.
- A NullPointerException in a Spring bean often means a dependency was not injected — check constructor parameters and scan paths before looking at business logic.
- `./mvnw test` may pass locally but fail in CI due to environment differences (database, timezone, locale); reproduce in the CI-equivalent environment when possible.
- `git bisect run` requires the test command to return exit code 0 for pass and non-zero for fail — `./mvnw test -Dtest=...` does this by default.

## What to Verify

- The failure was reproduced before any fix was attempted
- The root cause was identified and fixed, not a downstream symptom
- A regression test exists that fails without the fix and passes with it
- `./mvnw test` passes with no new failures after the fix
- All temporary instrumentation has been removed
- The fix does not silently widen scope or introduce new behavior beyond the bug
- Related skills were consulted when the bug touched their domain (JPA, security, logging, resilience)
