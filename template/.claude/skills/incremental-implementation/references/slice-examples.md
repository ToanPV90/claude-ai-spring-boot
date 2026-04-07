# Slice Examples — Common Spring Boot Features

Concrete slicing sequences for recurring feature shapes. Each slice is one commit that leaves the build green.

## CRUD Endpoint (e.g., `POST /api/orders`)

| Slice | What Ships | Verify |
|-------|-----------|--------|
| 1 | Liquibase changeset: `create table order` with rollback | `./mvnw liquibase:updateSQL -pl service -am` |
| 2 | `Order` entity + `OrderRepository` + repository test | `./mvnw test -pl service -am` |
| 3 | `OrderService` interface + `OrderServiceImpl.create()` + unit test | `./mvnw test -pl service -am` |
| 4 | `OrderController.create()` + request/response DTOs + `@WebMvcTest` | `./mvnw test -pl service -am` |
| 5 | `@SpringBootTest` integration test with TestContainers | `./mvnw clean verify` |

Add GET/PUT/DELETE as separate slices after the create path is proven.

## Search / Filter Endpoint (e.g., `GET /api/products?category=X&minPrice=Y`)

| Slice | What Ships | Verify |
|-------|-----------|--------|
| 1 | `ProductSearchCriteria` record + `ProductSpecification` (JPA Criteria) | `./mvnw test -pl service -am` |
| 2 | `ProductService.search(criteria, Pageable)` + unit test | `./mvnw test -pl service -am` |
| 3 | Controller with `@RequestParam` binding + `@WebMvcTest` | `./mvnw test -pl service -am` |
| 4 | Integration test: seed data, assert filtering + pagination | `./mvnw clean verify` |

Add each new filter predicate (date range, status enum) as its own slice with its own test.

## Event-Driven Flow (e.g., order-placed → inventory-reserved)

| Slice | What Ships | Verify |
|-------|-----------|--------|
| 1 | `OrderPlacedEvent` record + `ApplicationEventPublisher` call in `OrderServiceImpl` | `./mvnw test -pl service -am` |
| 2 | `InventoryReservationListener` (`@TransactionalEventListener`) + unit test | `./mvnw test -pl service -am` |
| 3 | Integration test: place order → assert inventory row updated | `./mvnw clean verify` |
| 4 | (If Kafka) Replace `ApplicationEvent` with `KafkaTemplate.send()` + consumer + test with EmbeddedKafka | `./mvnw clean verify` |

Start with in-process events. Promote to Kafka only when cross-service delivery is required.

## Multi-Module Feature (e.g., new `reporting` module)

| Slice | What Ships | Verify |
|-------|-----------|--------|
| 1 | `reporting/pom.xml` + parent POM `<module>` entry + empty `src/main/java` | `./mvnw clean verify` |
| 2 | Shared DTOs in `common` module (if needed) + test | `./mvnw test -pl common -am` |
| 3 | First service class in `reporting` + unit test | `./mvnw test -pl reporting -am` |
| 4 | Controller or scheduled job in `reporting` + integration test | `./mvnw clean verify` |

The module skeleton must compile on its own before any feature code lands in it.

## Slicing Heuristics

- **One "and" = two slices.** If the commit message needs "and," split.
- **Migration always leads.** Schema must exist before entity code.
- **Tests travel with code.** Never defer tests to a "testing slice."
- **Prefer depth over breadth.** One endpoint end-to-end beats three half-wired endpoints.
- **Gate with flags.** If the feature is multi-slice and user-visible, hide it behind `@ConditionalOnProperty` until complete.
