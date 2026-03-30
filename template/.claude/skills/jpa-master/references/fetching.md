# Fetching and Lazy Loading

## Default Strategy

Use lazy associations by default and shape each read intentionally. Most JPA performance problems come from loading too much data implicitly or loading the right data with the wrong query.

Decision ladder:
1. **Read model only?** Use a projection.
2. **Need one aggregate with a known association graph?** Use `@EntityGraph` or a focused fetch join.
3. **Need many parents plus children?** Consider batch fetching.
4. **Need pagination plus relationships?** Avoid collection fetch joins; use a two-step read or projection.

## N+1 Queries

```java
@Entity
public class Author {

    @Id
    private Long id;

    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY)
    private List<Book> books;
}

List<Author> authors = authorRepository.findAll();
for (Author author : authors) {
    author.getBooks().size();
}
```

That pattern executes 1 query for authors plus 1 query per author for books.

### Fix 1: `@EntityGraph`
```java
public interface AuthorRepository extends JpaRepository<Author, Long> {

    @EntityGraph(attributePaths = "books")
    List<Author> findAll();
}
```

### Fix 2: Focused fetch join
```java
public interface AuthorRepository extends JpaRepository<Author, Long> {

    @Query("select distinct a from Author a left join fetch a.books where a.id = :id")
    Optional<Author> findByIdWithBooks(@Param("id") Long id);
}
```

### Fix 3: Batch fetching
```java
@Entity
public class Author {

    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY)
    @BatchSize(size = 25)
    private List<Book> books;
}
```

```yaml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 25
```

## Lazy Loading Failures

`LazyInitializationException` means code touched a lazy association after the persistence context was gone.

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Order getOrder(Long id) {
        return orderRepository.findById(id).orElseThrow();
    }
}
```

Calling `getOrder(id).getItems().size()` later in the controller is a classic failure.

Preferred fixes:
- return a projection instead of an entity
- fetch the required association in the query
- map to a DTO inside a read-only transaction

```java
@Transactional(readOnly = true)
public OrderDetails getOrderDetails(Long id) {
    Order order = orderRepository.findByIdWithItems(id).orElseThrow();
    return OrderDetails.from(order);
}
```

Avoid treating `open-in-view` as the main fix. It can mask query-shaping problems and move ORM behavior into the web layer.

## Pagination Caveat

Collection fetch joins and pagination do not mix cleanly.

```java
@Query("select o from Order o join fetch o.items")
Page<Order> findAllWithItems(Pageable pageable);
```

This can produce wrong page sizes, duplicate root entities, or broken counts.

Preferred alternatives:
- page root IDs first, then fetch the graph for those IDs
- use a projection for list screens
- use `@EntityGraph` only where the provider behavior is acceptable and verified

## Common Fetching Pitfalls

- `FetchType.EAGER` on `@ManyToOne` becomes sticky and hard to undo later
- Collection fetch joins can trigger `MultipleBagFetchException`
- Logging or serializing lazy fields can trigger additional queries or failures

## Verification

```yaml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
```

Verify by:
- comparing query counts before and after the fix
- checking whether list endpoints still page correctly
- confirming DTO/projection reads no longer touch lazy fields after the transaction ends
