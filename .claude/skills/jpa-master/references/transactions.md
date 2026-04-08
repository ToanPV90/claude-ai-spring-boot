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

| Propagation | Behavior | Typical Use Case |
|-------------|----------|------------------|
| `REQUIRED` (default) | Join existing or create new | Most service methods |
| `REQUIRES_NEW` | Always create new (suspend existing) | Audit logs, independent operations that must commit regardless |
| `NESTED` | Create savepoint within existing | Partial rollback in batch processing |
| `MANDATORY` | Must have existing, error if none | Methods that should never start their own tx |
| `SUPPORTS` | Join if exists, non-tx otherwise | Read operations that work either way |
| `NOT_SUPPORTED` | Execute non-tx (suspend existing) | External calls that should not hold a tx |
| `NEVER` | Error if transaction exists | Validation that no tx should be active |

Use non-default propagation sparingly. If you need it, document why in the service API.

### REQUIRES_NEW — Audit That Survives Rollback

```java
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(String action, String entityId, String userId) {
        auditLogRepository.save(new AuditLog(action, entityId, userId, Instant.now()));
    }
}
```

The audit record commits even if the calling transaction rolls back.

### NESTED — Partial Rollback in Batch Processing

```java
@Service
public class BatchService {

    @Transactional
    public BatchResult processBatch(List<Item> items) {
        List<String> succeeded = new ArrayList<>();
        List<String> failed = new ArrayList<>();

        for (Item item : items) {
            try {
                processItemWithSavepoint(item);
                succeeded.add(item.getId());
            } catch (Exception e) {
                failed.add(item.getId());
            }
        }
        return new BatchResult(succeeded, failed);
    }

    @Transactional(propagation = Propagation.NESTED)
    public void processItemWithSavepoint(Item item) {
        itemRepository.save(item);
    }
}
```

`NESTED` requires savepoint support from the transaction manager. JPA with `JpaTransactionManager` supports it; `JtaTransactionManager` typically does not.

## Dirty Checking

JPA automatically detects changes to managed entities — no explicit `save()` needed for updates:

```java
@Transactional
public void updateOrderStatus(Long orderId, OrderStatus newStatus) {
    Order order = orderRepository.findById(orderId).orElseThrow();
    order.setStatus(newStatus);
    // No save() needed — Hibernate detects the change and generates UPDATE on commit
}
```

Only call `save()` for new entities or detached entities that need reattachment.

## Flush vs Commit

| Operation | What It Does | When It Happens |
|-----------|-------------|-----------------|
| **Flush** | Syncs pending changes to database (SQL executed) | Before queries, explicit call, tx commit |
| **Commit** | Makes changes permanent, releases locks | End of transaction |

### save vs saveAndFlush

Use `saveAndFlush` when you need the generated ID immediately:

```java
@Transactional
public String createAndReturnId(CreateRequest request) {
    Entity entity = new Entity(request);
    Entity saved = repository.saveAndFlush(entity);
    return saved.getId(); // guaranteed to have ID
}
```

Regular `save` is sufficient when the ID is not needed until commit.

## readOnly = true

```java
@Transactional(readOnly = true)
public List<OrderSummary> findByCustomer(String customerId) {
    return orderRepository.findSummaryByCustomerId(customerId);
}
```

Benefits: Hibernate skips dirty checking, JDBC driver may route to a read replica, and the intent is clear. Not a substitute for fixing badly shaped queries.

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

## Pessimistic Locking

Use pessimistic locking when you need exclusive access to a row during a transaction.

| Mode | Description | Use Case |
|------|-------------|----------|
| `PESSIMISTIC_READ` | Shared lock, allows concurrent reads | Read-then-update patterns |
| `PESSIMISTIC_WRITE` | Exclusive lock, blocks reads and writes | Critical updates |
| `PESSIMISTIC_FORCE_INCREMENT` | Exclusive lock + version increment | Force version update |

```java
public interface AccountRepository extends JpaRepository<Account, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdForUpdate(@Param("id") String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id IN :ids ORDER BY a.id")
    List<Account> findAllByIdForUpdate(@Param("ids") List<String> ids);
}
```

Lock rows in a consistent order to prevent deadlocks:

```java
@Transactional
public void transfer(String fromId, String toId, BigDecimal amount) {
    List<String> orderedIds = Stream.of(fromId, toId).sorted().toList();
    List<Account> accounts = accountRepository.findAllByIdForUpdate(orderedIds);

    Account from = accounts.stream().filter(a -> a.getId().equals(fromId)).findFirst().orElseThrow();
    Account to = accounts.stream().filter(a -> a.getId().equals(toId)).findFirst().orElseThrow();

    from.withdraw(amount);
    to.deposit(amount);
}
```

## Rollback Rules

Default behavior:
- **Unchecked exceptions** (`RuntimeException`): rollback
- **Checked exceptions**: commit (no rollback)
- **Errors**: rollback

### Explicit Rollback Configuration

```java
// Rollback on all exceptions including checked
@Transactional(rollbackFor = Exception.class)
public void processPayment(PaymentRequest request) throws PaymentException { }

// Don't rollback on specific exception
@Transactional(noRollbackFor = InsufficientFundsException.class)
public void transferFunds(TransferRequest request) { }

// Combine both
@Transactional(
    rollbackFor = Exception.class,
    noRollbackFor = {ValidationException.class, WarningException.class}
)
public void complexOperation(Request request) { }
```

### Programmatic Rollback

Use when you need to mark for rollback without throwing:

```java
@Transactional
public OrderResult processOrder(OrderRequest request) {
    Order order = createOrder(request);
    ValidationResult validation = validateOrder(order);
    if (!validation.isValid()) {
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        return OrderResult.failed(validation.getErrors());
    }
    return OrderResult.success(order.getId());
}
```

### Transaction Timeout

```java
@Transactional(timeout = 30) // 30 seconds
public Report generateReport(ReportRequest request) {
    return reportRepository.generateComplexReport(request);
}
```

## Best Practices — Keep Transactions Short

A long-running transaction holds a database connection, locks rows, and blocks other writers. The goal is: **enter the transaction, do the database work, leave.**

### Never Make HTTP/External Calls Inside a Transaction

```java
// BAD: HTTP call holds DB connection + row locks for seconds
@Transactional
public void processOrder(String orderId) {
    Order order = orderRepository.findById(orderId).orElseThrow();
    order.setStatus(PROCESSING);

    // blocks the transaction while waiting for network I/O
    PaymentResult result = paymentClient.charge(order.getTotal());

    order.setPaymentId(result.getId());
    order.setStatus(PAID);
}

// GOOD: split into prepare → external call → complete
public void processOrder(String orderId) {
    Order order = prepareForProcessing(orderId);

    PaymentResult result = paymentClient.charge(order.getTotal());

    completeProcessing(orderId, result);
}

@Transactional
Order prepareForProcessing(String orderId) {
    Order order = orderRepository.findById(orderId).orElseThrow();
    order.setStatus(PROCESSING);
    return order;
}

@Transactional
void completeProcessing(String orderId, PaymentResult result) {
    Order order = orderRepository.findById(orderId).orElseThrow();
    order.setPaymentId(result.getId());
    order.setStatus(PAID);
}
```

This applies to any I/O that is not the database: REST calls, gRPC, message publishing, file uploads, email sending.

### Avoid Loops with Individual Saves Inside a Transaction

```java
// BAD: N individual inserts, each triggering a flush
@Transactional
public void importProducts(List<CreateProductRequest> requests) {
    for (CreateProductRequest request : requests) {
        Product product = Product.from(request);
        productRepository.save(product);  // INSERT per iteration
    }
}

// GOOD: batch and let Hibernate flush efficiently
@Transactional
public void importProducts(List<CreateProductRequest> requests) {
    List<Product> products = requests.stream()
        .map(Product::from)
        .toList();
    productRepository.saveAll(products);
}
```

For very large batches (thousands+), chunk outside the transaction to avoid a single huge tx:

```java
public void importProducts(List<CreateProductRequest> requests) {
    Lists.partition(requests, 500).forEach(this::importChunk);
}

@Transactional
void importChunk(List<CreateProductRequest> chunk) {
    List<Product> products = chunk.stream().map(Product::from).toList();
    productRepository.saveAll(products);
}
```

### Do Not Mix Read-Heavy Logic with Writes

```java
// BAD: validation + enrichment + reporting inside a write tx
@Transactional
public OrderResponse createOrder(CreateOrderRequest request) {
    validateInventory(request);           // reads from multiple tables
    BigDecimal discount = calculateDiscount(request.customerId()); // complex query
    Order order = buildOrder(request, discount);
    orderRepository.save(order);
    List<OrderSummary> history = orderRepository.findByCustomerId(request.customerId()); // reporting query
    sendConfirmation(order);              // email — external I/O
    return OrderResponse.from(order, history);
}

// GOOD: read first, then write in a focused tx, then side-effects outside
public OrderResponse createOrder(CreateOrderRequest request) {
    validateInventory(request);
    BigDecimal discount = calculateDiscount(request.customerId());

    Order order = saveOrder(request, discount);

    sendConfirmation(order);
    List<OrderSummary> history = findHistory(request.customerId());
    return OrderResponse.from(order, history);
}

@Transactional
Order saveOrder(CreateOrderRequest request, BigDecimal discount) {
    Order order = buildOrder(request, discount);
    return orderRepository.save(order);
}

@Transactional(readOnly = true)
List<OrderSummary> findHistory(String customerId) {
    return orderRepository.findSummaryByCustomerId(customerId);
}
```

### Quick Checklist

| Inside a `@Transactional` | OK? | Fix |
|---------------------------|-----|-----|
| Database reads/writes | ✅ | — |
| DTO mapping from loaded entities | ✅ | — |
| HTTP/gRPC/REST call to another service | ❌ | Move outside tx |
| Message publishing (Kafka, RabbitMQ) | ❌ | Use `@TransactionalEventListener` or move outside tx |
| Email / SMS / push notification | ❌ | Move outside tx |
| File upload / S3 put | ❌ | Move outside tx |
| `Thread.sleep()` or polling loop | ❌ | Never |
| CPU-heavy computation (PDF, image) | ❌ | Compute outside, save result inside tx |
| Loop with individual `save()` calls | ⚠️ | Use `saveAll()` or batch chunks |
| Large unbounded query result set | ⚠️ | Paginate or stream with cursor |

## Anti-Patterns

### Exception Swallowing

```java
// BAD: exception swallowed, transaction commits despite failure
@Transactional
public void processOrder(String orderId) {
    try {
        riskyOperation();
    } catch (Exception e) {
        log.error("Failed", e);
        // transaction commits — data may be in inconsistent state
    }
}

// FIX: re-throw to trigger rollback
@Transactional
public void processOrder(String orderId) {
    try {
        riskyOperation();
    } catch (Exception e) {
        log.error("Failed", e);
        throw e;
    }
}
```

## Verification

- write a focused integration test for the transactional behavior
- verify optimistic locking with two concurrent update paths
- confirm a self-invocation refactor actually moved the transactional boundary across beans
- verify pessimistic lock ordering prevents deadlocks under concurrent access

## See Also

- `references/fetching.md` for `LazyInitializationException` and fetch strategy (not a transaction fix — it is a fetch-shaping fix)
- `backend-practices-review` for remote/HTTP calls inside transactions and dependency-call safety
- `api-contract-review` or `spring-boot-engineer/references/web.md` for HTTP-level optimistic concurrency (ETag / `If-Match`)
