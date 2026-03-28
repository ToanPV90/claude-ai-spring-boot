# Transactions and Locking

## Transaction Boundary Rules

- Put transactional boundaries on Spring-managed service methods, not controllers
- Keep read methods `@Transactional(readOnly = true)` when they only query data
- Write methods should use a normal `@Transactional`
- Keep transactions as short as practical: avoid remote calls, sleeps, heavy CPU work, or unrelated orchestration inside them
- Do not make transactions artificially short by returning managed entities and touching lazy associations later; finish the required fetches or mapping before leaving the boundary
- Remember that Spring applies `@Transactional` through proxies

## Basic Pattern

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public Order findById(Long id) {
        return orderRepository.findById(id).orElseThrow();
    }

    @Transactional
    public Order create(CreateOrderRequest request) {
        Order order = new Order();
        order.setStatus(OrderStatus.PENDING);
        return orderRepository.save(order);
    }
}
```

## Self-invocation Trap

```java
@Service
public class OrderService {

    public void processOrder(Long id) {
        updateOrder(id);
    }

    @Transactional
    public void updateOrder(Long id) {
    }
}
```

That internal call does not cross the Spring proxy, so the transaction advice is skipped.

Preferred fix: move the transactional work into another bean.

```java
@Service
public class OrderService {

    private final OrderTransactionalOperations orderTransactionalOperations;

    public OrderService(OrderTransactionalOperations orderTransactionalOperations) {
        this.orderTransactionalOperations = orderTransactionalOperations;
    }

    public void processOrder(Long id) {
        orderTransactionalOperations.updateOrder(id);
    }
}

@Service
public class OrderTransactionalOperations {

    @Transactional
    public void updateOrder(Long id) {
    }
}
```

## Propagation

- `REQUIRED` joins the current transaction or starts one
- `REQUIRES_NEW` suspends the outer transaction and starts a new one
- `MANDATORY` fails if no transaction exists

Use non-default propagation sparingly. If you need it, document why in the service API.

## Flush and Dirty Checking

Hibernate writes SQL on flush, which normally happens before commit and sometimes before queries. A read-only transaction reduces some dirty-checking work but is not a magic performance switch for badly shaped queries.

Use read-only transactions for intent and lighter persistence behavior, but still verify the generated SQL.

## Optimistic Locking

Use `@Version` for aggregates where concurrent updates matter.

```java
@Entity
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;
}
```

```java
@Transactional
public Order updateStatus(Long id, OrderStatus status) {
    Order order = orderRepository.findById(id).orElseThrow();
    order.setStatus(status);
    return order;
}
```

If two writers load the same row and both save changes, the second commit should fail with `OptimisticLockException`.

Choose one policy per use case:
- fail fast and show a refresh message
- retry automatically for idempotent write flows

## Rollback Guidance

- Runtime exceptions usually trigger rollback automatically
- Checked exceptions need explicit rollback rules if they should abort the transaction

```java
@Transactional(rollbackFor = PaymentException.class)
public void processPayment(Long orderId) throws PaymentException {
}
```

## Verification

- write a focused integration test for the transactional behavior
- verify optimistic locking with two concurrent update paths
- confirm a self-invocation refactor actually moved the transactional boundary across beans
