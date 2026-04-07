# Bisect and Regression Workflow

Use when a previously passing test now fails and the breaking commit is not obvious.

## When to Use Bisect vs Manual Localization

| Situation | Approach |
|-----------|----------|
| Many commits since last green; cause unclear | `git bisect` — automated and fast |
| Only 2–3 commits since last green | Manual `git log --oneline` + read each diff |
| Failure only reproduces in CI, not locally | Reproduce the CI environment first, then bisect |
| The failing test is flaky (intermittent) | Fix the flakiness before bisecting; bisect needs deterministic pass/fail |

## Step-by-Step Git Bisect

```bash
git bisect start
git bisect bad                    # current commit is broken
git bisect good <good-commit>     # last known good commit
git bisect run ./mvnw test -Dtest=OrderServiceTest#shouldCalculateTotalCorrectly -pl order-service
# bisect reports the first bad commit — note it, then:
git bisect reset
```

- Use `-pl <module>` to scope Maven to the relevant module — faster iterations.
- Add `-am` for multi-module projects to build upstream dependencies.
- Ensure Docker is running if the test uses TestContainers.

## Regression Test Guard Pattern

Every regression fix **must** include a test that fails without the fix and passes with it.

```java
@Test
@DisplayName("Regression: discount must not go negative for zero-quantity lines (GH-217)")
void shouldNotProduceNegativeDiscountForZeroQuantity() {
    // Arrange — exact scenario from the bug report
    OrderLine line = new OrderLine("SKU-100", 0, new BigDecimal("49.99"));

    // Act
    BigDecimal discount = discountService.calculateLineDiscount(line);

    // Assert — correct post-fix behavior
    assertThat(discount).isEqualByComparingTo(BigDecimal.ZERO);
}
```

**Conventions:**
- Reference the issue/ticket in `@DisplayName`.
- Use the exact input that triggered the original failure.
- Assert correct behavior, not just "does not throw".
- Place the test near related tests in the same test class.

## After the Fix

1. Run `./mvnw test` — full suite must be green.
2. Remove any temporary instrumentation added during investigation.
3. Confirm the regression test fails when the fix is reverted (`git stash` → run test → `git stash pop`).
