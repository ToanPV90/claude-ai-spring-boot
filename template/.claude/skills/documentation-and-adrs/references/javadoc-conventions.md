# JavaDoc Conventions

## Rules

1. **Document interfaces, not implementations** — impls inherit; duplicating causes drift.
2. **Describe the contract** — state what the method promises, not how it works.
3. **Include failure behavior** — document thrown exceptions with conditions.
4. **Skip the obvious** — no `@return the name` on `getName()`.
5. **No `@author` tags** — git history tracks authorship.

## Service Interfaces

```java
/**
 * Manages customer order lifecycle from placement through fulfillment.
 * Implementations must publish {@code OrderPlacedEvent} after persistence.
 */
public interface OrderService {
    /**
     * @param customerId must reference an active customer
     * @param items      must not be empty
     * @return persisted order with generated ID and PENDING status
     * @throws CustomerNotFoundException if customer does not exist or is inactive
     * @throws InsufficientStockException if any item cannot be reserved
     */
    Order placeOrder(UUID customerId, List<OrderItem> items);
}
```

## DTOs and Records

```java
/**
 * @param customerId existing active customer; validated by the service layer
 * @param items      at least one item required
 */
public record CreateOrderRequest(
    @NotNull UUID customerId,
    @NotEmpty List<OrderItemRequest> items
) {}
```

## Configuration Classes

```java
/** Configures HikariCP pool. Leak detection at 60s for dev diagnostics. */
@Configuration
public class DataSourceConfig { ... }
```

## What NOT to Document

- `@return the name` on `getName()` — restates signature
- `Calls repository and maps to DTO` — describes implementation, not contract
- `@author` tags — use git blame instead
