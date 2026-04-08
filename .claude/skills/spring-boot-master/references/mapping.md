# DTO-Entity Mapping

## Layer Responsibilities

| Layer | Knows DTOs | Knows Entities | Calls Repository | Handles Mapping |
|-------|-----------|----------------|------------------|-----------------|
| Controller | Yes | No | No | Request → Command |
| Service | Yes | Yes | Yes | Command → Entity, Entity → Response |
| Mapper | Yes | Yes | No | Stateless conversions |

Data flow:
```
Request DTO → Controller → Service → Entity → Repository
                                        ↓
Response DTO ← Controller ← Service ← Entity
```

## When to Use What

| Approach | When to Use |
|----------|-------------|
| Record factory methods | Fewer than 5 fields, one-off mappings, simple DTOs |
| MapStruct | Multiple fields, nested objects, frequent conversions, type conversions |

## Record Factory Methods

```java
public record OrderResponse(
    String id, String customerId, String status,
    List<OrderLineResponse> items, BigDecimal total, Instant createdAt
) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(
            order.getId(), order.getCustomerId(), order.getStatus().name(),
            order.getLines().stream().map(OrderLineResponse::from).toList(),
            order.getTotal(), order.getCreatedAt()
        );
    }
}
```

## MapStruct Setup

```xml
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.5.5.Final</version>
</dependency>
<!-- annotation processor in maven-compiler-plugin -->
```

### Basic Mapper
```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface OrderMapper {
    OrderResponse toResponse(Order order);

    @Mapping(source = "productId", target = "product")
    @Mapping(source = "unitPrice", target = "price")
    OrderLineResponse toLineResponse(OrderLine line);

    List<OrderLineResponse> toLineResponses(List<OrderLine> lines);
}
```

### Update Existing Entity (Ignore Nulls)
```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface OrderMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateFromRequest(UpdateOrderRequest request, @MappingTarget Order order);
}
```

### Reference Resolution (No Extra DB Hit)
```java
@Mapping(target = "customer", source = "customerId", qualifiedByName = "resolveCustomer")
Order toEntity(CreateOrderRequest request, @Context CustomerRepository customerRepository);

@Named("resolveCustomer")
default Customer resolveCustomer(String customerId, @Context CustomerRepository repo) {
    return repo.getReferenceById(customerId);
}
```

## Key Rules

1. **Never let clients set server-owned fields** — exclude `id`, `status`, `createdAt`, `version` from request DTOs and ignore them in mappers.
2. **IDs in DTO, resolve in service** — pass IDs in requests, use `getReferenceById()` to avoid unnecessary DB hits.
3. **Intentional fetching before mapping** — use `JOIN FETCH` or `@EntityGraph` before mapping collections to avoid N+1.
4. **Specific DTOs per use case** — `OrderSummary` (list view), `OrderDetail` (full view), `OrderAdminView` (audit fields). No mega-DTOs.
