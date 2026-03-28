# Core Correctness Review

## Null Safety

Check for:
- chained method calls without defensive handling
- `Optional.get()` without a presence check
- returning `null` where `Optional` or empty collections are clearer
- missing validation on public inputs
- missing `Objects.requireNonNull(...)` or explicit null guards on constructor/public method parameters
- boxed primitive comparisons with `==` instead of `.equals(...)`

Prefer:
- `Objects.requireNonNull(...)` or an application-specific validation exception when null is never valid
- `Objects.equals(a, b)` or constant-first equals checks like `"ACTIVE".equals(status)`
- empty collections over `null` for collection-returning APIs

Example:
```java
public List<Order> findOrders(String customerId) {
    if (customerId == null) {
        return List.of();
    }
    // query
}
```

## Exception Handling

Check for:
- empty catch blocks
- broad `catch (Exception)` or `catch (Throwable)`
- lost causes when wrapping exceptions
- exceptions used for ordinary control flow

Prefer:
- specific exception types
- chained exceptions
- logging with real context at the correct boundary
- restoring the original cause when converting infrastructure exceptions into domain/application exceptions

## Collections and Streams

Check for:
- modifying collections while iterating
- `Arrays.asList(...)` treated like a mutable `ArrayList`
- `subList(...)` treated like an independent copy
- streams used where loops are clearer
- accidental immutability assumptions
- parallel streams with no justification
- `ConcurrentHashMap` code assuming null keys/values behave like `HashMap`

Prefer:
- `Iterator.remove()` or `removeIf(...)` instead of mutating a collection inside `foreach`
- `new ArrayList<>(Arrays.asList(...))` when a truly mutable list is required
- copying `new ArrayList<>(source.subList(...))` when an independent slice is needed
- `entrySet()`/`Map.forEach(...)` over `keySet()` + `get(...)` when iterating maps

Example:
```java
Map<String, Order> ordersById = new HashMap<>();

for (Map.Entry<String, Order> entry : ordersById.entrySet()) {
    process(entry.getKey(), entry.getValue());
}
```

## Equality, Numbers, and Value Semantics

Check for:
- overriding `equals(...)` without `hashCode()` or vice versa
- comparators that never return `0` for equal values
- `BigDecimal` created from `double`
- `BigDecimal.equals(...)` used for numeric equality

Prefer:
- overriding both `equals(...)` and `hashCode()` together for value types
- `Comparator.comparingInt(...)`, `Comparator.comparing(...)`, or explicit `0` handling
- `new BigDecimal("0.10")` or constants like `BigDecimal.ZERO`
- `compareTo(...) == 0` for numeric equality and explicit `scale` / `RoundingMode` for money math

## Resource Management

Check for:
- missing try-with-resources
- database/files/network handles escaping safe scope
- close ordering bugs across nested resources

## API Design

Check for:
- boolean flag arguments
- methods with too many parameters
- inconsistent null contracts
- missing validation and defensive checks on public methods
