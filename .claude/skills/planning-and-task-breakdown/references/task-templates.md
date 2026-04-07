# Task Templates and Acceptance Criteria Examples

## Full Task Template

```markdown
### Task [N]: [Short imperative title — e.g., "Add Liquibase migration for orders table"]
- **Size:** XS | S | M | L
- **Module:** `my-project-service`
- **Depends on:** Task [N-1] (or "none")
- **Description:** One sentence stating the deliverable.
- **Acceptance criteria:**
  - [ ] [Positive — expected behavior with valid input]
  - [ ] [Negative — expected behavior with invalid input]
  - [ ] [Structural — annotation, transaction boundary, or mapping correctness]
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=TargetTestClass
  ```
```

## Example: Liquibase Migration Task

```markdown
### Task 1: Liquibase migration for `products` table
- **Size:** S
- **Module:** `my-project-service`
- **Depends on:** none
- **Description:** Add changeset `001-create-products-table.yaml` with columns `id`, `name`, `price`, `category`, `created_at`.
- **Acceptance criteria:**
  - [ ] Changeset applies on a fresh PostgreSQL container without errors
  - [ ] Rollback changeset drops the `products` table
  - [ ] Column types: `id` BIGINT/IDENTITY, `name` VARCHAR(255) NOT NULL, `price` NUMERIC(19,2), `category` VARCHAR(100), `created_at` TIMESTAMPTZ DEFAULT NOW()
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=LiquibaseChangelogTest
  ```
```

## Example: JPA Entity + Repository Task

```markdown
### Task 2: Product entity and repository
- **Size:** S
- **Module:** `my-project-service`
- **Depends on:** Task 1
- **Description:** Create `Product` JPA entity mapped to `products` and `ProductRepository` extending `JpaRepository<Product, Long>`.
- **Acceptance criteria:**
  - [ ] Entity maps all columns with correct `@Column` annotations — no Lombok
  - [ ] Repository `save()` + `findById()` round-trips in a TestContainers test
  - [ ] Custom query `findByCategory(String)` returns filtered results
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=ProductRepositoryTest
  ```
```

## Example: Service Layer Task

```markdown
### Task 3: ProductService with creation and lookup
- **Size:** M
- **Module:** `my-project-service`
- **Depends on:** Task 2
- **Description:** Implement `ProductService` (interface + `ProductServiceImpl`) with `createProduct()` and `getProduct()` methods.
- **Acceptance criteria:**
  - [ ] `createProduct(CreateProductRequest)` persists and returns `ProductResponse` with generated ID
  - [ ] `getProduct(Long)` throws `ResourceNotFoundException` for unknown IDs (negative test)
  - [ ] Both methods run inside `@Transactional` boundaries
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=ProductServiceTest
  ```
```

## Example: Controller + DTO Task

```markdown
### Task 4: ProductController REST endpoints
- **Size:** M
- **Module:** `my-project-service`
- **Depends on:** Task 3
- **Description:** Expose `POST /api/products` and `GET /api/products/{id}` via `ProductController`.
- **Acceptance criteria:**
  - [ ] `POST /api/products` with valid body → 201 Created + Location header
  - [ ] `POST /api/products` with blank name → 400 + ProblemDetail
  - [ ] `GET /api/products/{id}` with unknown ID → 404 + ProblemDetail
  - [ ] `CreateProductRequest` uses `@NotBlank`, `@Positive` Jakarta validation annotations
  - [ ] Integration test uses `@WebMvcTest(ProductController.class)` with mocked service
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=ProductControllerTest
  ```
```
