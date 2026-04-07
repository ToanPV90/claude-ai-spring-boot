# Spec Template — Java / Spring Boot

Copy this skeleton and fill in every section before advancing past the SPECIFY phase.

---

## Objective

**Goal:** _One sentence describing the user-visible outcome._

**Success Criteria:**

| # | Criterion | Observable Behavior |
|---|-----------|---------------------|
| 1 | _e.g., Search returns results_ | `GET /api/orders?status=SHIPPED` returns `200` with matching items |
| 2 | | |

---

## Commands

```bash
# Build & test the target module
./mvnw clean verify -pl <module-name>

# Run the module locally
./mvnw spring-boot:run -pl <module-name>

# Run a single test class
./mvnw test -pl <module-name> -Dtest=<ClassName>

# Full reactor build
./mvnw clean verify
```

---

## Project Structure

**Module:** `<module-name>` (child of root reactor)

**Package root:** `vn.lukepham.projects.<module>`

| Layer | Package | Responsibility |
|-------|---------|----------------|
| Controller | `.controller` | REST endpoints, request validation |
| Service | `.service` | Business logic (interface + `Impl`) |
| Repository | `.repository` | Spring Data JPA interfaces |
| DTO | `.dto` | Records for request/response objects |
| Entity | `.entity` | JPA entities (no Lombok) |
| Config | `.config` | Spring `@Configuration` beans |

---

## Code Style

- [ ] Records for immutable DTOs (`record OrderResponse(...)`)
- [ ] Constructor injection — no `@Autowired` on fields
- [ ] No Lombok — explicit getters/setters/constructors on entities
- [ ] Service interfaces with `Impl` classes
- [ ] Entities never exposed through API; map to DTOs at the service layer

---

## Testing Strategy

| Layer | Annotation | Tools / Notes |
|-------|-----------|---------------|
| Controller | `@WebMvcTest(XxxController.class)` | MockMvc, mock service beans |
| Repository | `@DataJpaTest` | Testcontainers PostgreSQL |
| Service | Plain JUnit 5 + Mockito | Unit test, no Spring context |
| Integration | `@SpringBootTest` | Testcontainers, full context |
| Contract | _if applicable_ | Spring Cloud Contract / Pact |

- [ ] Both positive and negative test cases per layer
- [ ] Test naming: `should_<expectedBehavior>_when_<condition>()`

---

## Boundaries

| Category | Details |
|----------|---------|
| **In scope** | _List features / behaviors this spec covers_ |
| **Out of scope** | _List features explicitly excluded_ |
| **Deferred** | _List features planned but not in this iteration_ |
| **Assumptions** | _List assumptions needing confirmation (→ see assumptions.md)_ |
