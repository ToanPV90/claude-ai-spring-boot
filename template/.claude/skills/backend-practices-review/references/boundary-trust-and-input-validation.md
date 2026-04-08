# Boundary Trust and Input Validation

## Default Position

Backend review should start at the trust boundary.

Ask three questions first:
- what input is trusted
- who is allowed to do the action
- how failure is reported when the input is bad or the actor is unauthorized

## Validate Before Costly Side Effects

Review for:
- request DTO validation that matches real business expectations
- normalization of IDs, enums, ranges, and optional fields before downstream branching
- explicit size and shape limits for lists, filters, pagination, and uploads
- rejection paths that fail predictably before the system mutates state or calls external services

Client metadata such as `Content-Type`, tenant hints, filenames, or path fragments are hints, not proof.

### Validation at the Boundary

```java
public record CreateOrderRequest(
    @NotNull(message = "Customer ID is required")
    UUID customerId,

    @NotEmpty(message = "Order must have at least one item")
    @Size(max = 100, message = "Cannot exceed 100 items per order")
    List<@Valid OrderItemRequest> items,

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    String notes
) {}

public record OrderItemRequest(
    @NotNull UUID productId,
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 10000, message = "Quantity cannot exceed 10000")
    int quantity
) {}
```

### Pagination Must Be Bounded

```java
// BAD: client controls page size with no upper limit
@GetMapping("/orders")
public Page<OrderResponse> list(@RequestParam(defaultValue = "0") int page,
                                 @RequestParam int size) {
    return orderService.findAll(PageRequest.of(page, size));
}

// GOOD: enforce maximum page size
@GetMapping("/orders")
public Page<OrderResponse> list(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
    return orderService.findAll(PageRequest.of(page, size));
}
```

### Sanitize and Normalize Input

```java
@Service
public class UserServiceImpl implements UserService {

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("User", "email", normalizedEmail);
        }

        User user = new User(normalizedEmail, request.name().trim());
        return UserResponse.from(userRepository.save(user));
    }
}
```

## Authorization Is Not Authentication

Authentication answers who the caller is. Authorization answers whether that caller may act on this resource.

### Ownership Check — Not Just Role Check

```java
// BAD: any authenticated user can access any order
@GetMapping("/orders/{id}")
public OrderResponse getOrder(@PathVariable Long id) {
    return orderService.findById(id);
}

// GOOD: verify the caller owns the resource
@GetMapping("/orders/{id}")
public OrderResponse getOrder(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
    Order order = orderService.findById(id);
    if (!order.getCustomerId().equals(jwt.getSubject())) {
        throw new AccessDeniedException("Not authorized to access this order");
    }
    return OrderResponse.from(order);
}
```

### Service-Layer Authorization

```java
@Service
public class OrderServiceImpl implements OrderService {

    @Override
    @Transactional(readOnly = true)
    public OrderResponse findByIdForUser(Long orderId, String userId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getCustomerId().equals(userId)) {
            // Return 404 instead of 403 to avoid leaking resource existence
            throw new ResourceNotFoundException("Order", orderId);
        }

        return OrderResponse.from(order);
    }
}
```

## Secret and Sensitive-Data Hygiene

Review for:
- secrets loaded from environment or secret stores rather than source-controlled config
- no accidental echo of credentials, tokens, or internal URLs in error bodies
- log redaction for sensitive values
- private-by-default serving for protected files or exports

### Never Log Sensitive Data

```java
// BAD: logs the full request including passwords/tokens
log.info("Processing request: {}", request);

// GOOD: log only safe identifiers
log.info("Processing order for customer={}", request.customerId());
```

### Error Responses Must Not Leak Internals

```java
// BAD: exposes SQL, stack trace, or internal details
@ExceptionHandler(DataIntegrityViolationException.class)
public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
        HttpStatus.CONFLICT, ex.getMessage()); // leaks SQL constraint name
    return problem;
}

// GOOD: generic message, log the real error server-side
@ExceptionHandler(DataIntegrityViolationException.class)
public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
    log.error("Data integrity violation", ex);
    return ProblemDetail.forStatusAndDetail(
        HttpStatus.CONFLICT, "Resource already exists or conflicts with existing data");
}
```

If Keycloak/JWT mapping or provider-specific auth wiring becomes the main issue, route to `keycloak-master`.

## Anti-Patterns

- Trusting client input because it already came through one validated UI
- Assuming authentication automatically proves authorization
- Returning sensitive details in logs or error payloads for convenience
- Hardcoding secrets or environment-specific URLs in application config
- Allowing unbounded page sizes or list sizes from client input
- Returning 403 for missing resources (leaks existence information)
