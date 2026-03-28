# Smells and Default Refactorings

| Smell | Default Refactoring | Notes |
|------|----------------------|-------|
| Long method | Extract Method | Split by behavior, not by every 5 lines |
| Long parameter list | Introduce Parameter Object | Prefer a real concept, not a bag of fields |
| Duplicate business rule | Extract Method/Class | Keep one source of truth |
| Magic number/string | Named constant or value object | Use domain language where possible |
| Nested conditionals | Guard Clauses | Keep the happy path visible |
| Primitive obsession | Value objects / records | Push validation into the type |
| God class | Extract Class | Split by responsibility boundary |
| Feature envy | Move Method | Put behavior near the data it depends on |

## Guard Clauses

Prefer:
```java
if (order == null) {
    throw new IllegalArgumentException("order must not be null");
}
if (!order.isValid()) return;
if (!order.hasItems()) return;
```

Instead of burying the useful branch under nested `if` blocks.

## Magic Numbers

Prefer:
```java
private static final int ADULT_AGE = 18;
private static final Duration RETRY_DELAY = Duration.ofSeconds(5);
private static final String DEFAULT_TIME_ZONE = "UTC";
```

Instead of raw literals whose meaning must be inferred from context.

Use `UPPER_SNAKE_CASE` for constants, and prefer enums or dedicated value objects when the literal represents a closed business vocabulary rather than a single scalar.

## Value Objects

Prefer a value object when:
- argument ordering is easy to confuse
- validation belongs to the concept itself
- the primitive hides domain meaning

Java records are a strong default for these cases.
