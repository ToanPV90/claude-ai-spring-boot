---
name: incremental-implementation
description: Execution discipline for delivering Java/Spring Boot changes in thin vertical slices. Use when implementing any feature or change that touches more than one file, or when a task feels too big to land in one step.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: process
  triggers:
    - incremental implementation
    - vertical slice
    - thin slice
    - implement incrementally
    - one piece at a time
    - step by step implementation
    - too big to implement at once
  role: workflow
  scope: process
  output-format: code + guidance
  related-skills: spring-boot-engineer, tdd-guide, request-refactor-plan, maven-master, liquibase-master
---

# Incremental Implementation — Java / Spring Boot

Own the delivery rhythm: implement one thin slice, test it, verify it, commit it, then start the next. Every commit leaves the codebase working.

## When to Use

- A feature or change touches more than one file or layer
- The task feels too large or risky to land in a single commit
- You need a repeatable cycle to keep forward progress visible and rollback safe
- The work spans controller, service, repository, migration, or configuration changes
- You want to prevent scope creep by locking each slice before expanding

## When Not to Use

- The task is a single-file fix or rename that lands in one commit — just do it
- The main question is how to plan or sequence a large refactor before implementation — use `request-refactor-plan`
- The focus is choosing the right test type or red-green-refactor discipline — use `tdd-guide`
- The work is deciding module boundaries or parent POM structure — use `maven-master`
- The task is designing a Liquibase migration changelog rather than delivering it incrementally — use `liquibase-master`

## Reference Guide

| Topic | File | Load When |
|-------|------|-----------|
| Slice examples for common Spring Boot features | `references/slice-examples.md` | You need concrete slicing patterns for CRUD, search, async, or multi-module features |
| Feature flag patterns and cleanup | `references/feature-flags.md` | You need to gate incomplete work behind configuration |
| Common rationalizations and red flags | `references/gotchas.md` | Scope is creeping, slices are getting too large, or verification is being skipped |

## Symptom Triage

| Symptom | Default Move |
|---------|--------------|
| Feature branch has 20+ changed files in one commit | Break the work into vertical slices and re-commit incrementally |
| Tests were written after all production code | Rewind; write the test for the current slice before or alongside the code |
| A failing build blocks unrelated slices | Isolate slices so each commit compiles and passes independently |
| Migration and application code ship in the same commit | Extract the migration as the first slice |
| Feature is half-done with no safe rollback point | Identify the smallest working subset that can be committed now |

## Increment Cycle

```
┌─────────────────────────────────────────────┐
│  1. SLICE  → pick the thinnest vertical     │
│  2. TEST   → write or update tests for it   │
│  3. IMPL   → minimum code to go green       │
│  4. VERIFY → ./mvnw test (module-aware)     │
│  5. COMMIT → small, descriptive message     │
│  6. NEXT   → repeat from step 1             │
└─────────────────────────────────────────────┘
```

1. **SLICE** — Choose the smallest piece that delivers value or unblocks the next slice. Prefer vertical (one behavior end-to-end) over horizontal (one layer everywhere).
2. **TEST** — Write the failing test for this slice. Follow `tdd-guide` red-green-refactor if strict TDD is active.
3. **IMPL** — Add the minimum production code to make the test pass. No speculative code for future slices.
4. **VERIFY** — Run the build for the affected module:
   ```bash
   ./mvnw test -pl module-name -am
   ```
   Or for the full reactor when slices cross modules:
   ```bash
   ./mvnw clean verify
   ```
5. **COMMIT** — Commit the slice with a message that describes the behavior, not the files touched.
6. **NEXT** — Pick the next slice and repeat.

## Slicing Strategies

| Strategy | When to Use | Example |
|----------|-------------|---------|
| **Vertical** | Default — one behavior from API to database | `POST /products` controller + service + repo + migration |
| **Contract-first** | API shape must stabilize before internals | Stub controller returning hardcoded DTO, then wire service |
| **Risk-first** | One part of the feature carries most uncertainty | Spike the complex query or integration first, wrap with tests, then build the rest |
| **Migration-first** | Schema must exist before application code | Liquibase changeset as slice 1, then entity + repo, then service + controller |
| **Module-first** | New Maven module needed | Create module skeleton + parent POM entry as slice 1 |

## Quick Mapping

| Situation | Recommended Slice Order |
|-----------|------------------------|
| New CRUD endpoint | 1) Migration 2) Entity + Repo 3) Service 4) Controller + DTO 5) Integration test |
| New Maven module | 1) Module POM + parent entry 2) Shared model/DTO 3) First feature slice |
| Cross-cutting concern (e.g., audit) | 1) Config + feature flag 2) Core interceptor/aspect 3) Per-module wiring |
| Bug fix with missing test coverage | 1) Reproducing test (red) 2) Fix (green) 3) Regression guard |

## Feature Flags

Use `@ConditionalOnProperty` to gate incomplete features behind configuration. No external libraries required.

```java
@Configuration
@ConditionalOnProperty(name = "feature.product-import.enabled", havingValue = "true")
public class ProductImportConfig {

    @Bean
    public ProductImportService productImportService(ProductRepository repository) {
        return new ProductImportServiceImpl(repository);
    }
}
```

```yaml
# application.yml — disabled by default until the feature is complete
feature:
  product-import:
    enabled: false
```

**Slice with a flag:**
1. Add the property (defaulting to `false`) and the `@ConditionalOnProperty` config — commit.
2. Implement and test the gated feature — commit per slice.
3. Flip the default to `true` and add an integration test that runs with the flag on — commit.
4. Remove the flag and inline the bean registration once the feature is stable — commit.

## Rollback-Friendly Migrations

Each Liquibase changeset is its own slice. Never bundle schema changes with application code in the same commit.

```xml
<!-- db/changelog/changes/20240315-001-add-product-table.xml -->
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                   http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="20240315-001" author="dev">
        <createTable tableName="product">
            <column name="id" type="bigint" autoIncrement="true">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="name" type="varchar(255)">
                <constraints nullable="false"/>
            </column>
            <column name="price" type="numeric(19,2)">
                <constraints nullable="false"/>
            </column>
            <column name="created_at" type="timestamp">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <rollback>
            <dropTable tableName="product"/>
        </rollback>
    </changeSet>
</databaseChangeLog>
```

**Safe migration rules:**
- One changeset per structural change (add table, add column, add index — separate changesets).
- Always include a `<rollback>` block.
- Additive changes first (add column with default), destructive changes last (drop column in a later release).
- Test migrations with `./mvnw liquibase:updateSQL` to preview before applying.

## Constraints

### MUST DO

| Rule | Why |
|------|-----|
| Each commit must leave the build green | A broken intermediate state blocks rollback and bisect |
| Pick the thinnest vertical slice first | Prevents horizontal layers that compile but prove nothing end-to-end |
| Verify with `./mvnw test` (or module-scoped variant) before committing | Catches breakage before it compounds |
| Separate migration commits from application-code commits | Allows independent rollback of schema vs. code |
| Write tests within the same slice, not as a follow-up | Tests deferred to "later" rarely arrive |

### MUST NOT DO

- Do not batch multiple behaviors into one commit because they touch the same file.
- Do not write speculative code for a future slice — implement only what the current test demands.
- Do not skip verification because "it's just a small change."
- Do not merge a feature-flag-gated feature with the flag permanently left on; remove the flag once stable.
- Do not combine additive and destructive migration steps in the same changeset.

## Gotchas

- A "vertical slice" that skips the test is just a partial commit, not a safe increment.
- Module-scoped `./mvnw test -pl module-name -am` is faster than full reactor builds but misses cross-module regressions; run full `./mvnw clean verify` before pushing.
- Feature flags that never get removed become permanent dead-code branches — track them and clean up.
- Rollback-friendly migrations require that each changeset is independently reversible; coupling two changesets defeats the purpose.
- Scope discipline means saying "that belongs in the next slice," not "let me add it while I'm here."

## Minimal Examples

### Vertical slice: new endpoint in 4 commits

**Slice 1 — Migration**
```bash
# Add Liquibase changeset for the product table
git add src/main/resources/db/changelog/
git commit -m "db: add product table migration with rollback"
```

**Slice 2 — Entity + Repository**
```java
@Entity
@Table(name = "product")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private BigDecimal price;
    private Instant createdAt;

    protected Product() {}

    public Product(String name, BigDecimal price) {
        this.name = name;
        this.price = price;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }
    public Instant getCreatedAt() { return createdAt; }
}

public interface ProductRepository extends JpaRepository<Product, Long> {
}
```
```bash
./mvnw test -pl my-project-service -am
git commit -m "feat: add Product entity and repository"
```

**Slice 3 — Service**
```java
public interface ProductService {
    ProductResponse create(ProductRequest request);
}

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository repository;

    public ProductServiceImpl(ProductRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        Product product = new Product(request.name(), request.price());
        Product saved = repository.save(product);
        return new ProductResponse(saved.getId(), saved.getName(), saved.getPrice());
    }
}
```
```bash
./mvnw test -pl my-project-service -am
git commit -m "feat: add ProductService with create method"
```

**Slice 4 — Controller + DTO + Integration test**
```java
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        ProductResponse response = productService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

public record ProductRequest(
    @NotBlank String name,
    @NotNull @Positive BigDecimal price
) {}

public record ProductResponse(Long id, String name, BigDecimal price) {}
```
```bash
./mvnw clean verify
git commit -m "feat: add POST /api/products endpoint with validation"
```

### Simplicity check before each slice

Before starting a slice, ask:

1. **Is this the smallest piece that proves one behavior end-to-end?** If not, split further.
2. **Does this slice depend on something that doesn't exist yet?** If yes, deliver that dependency first.
3. **Can I describe this commit in one sentence without "and"?** If not, it's two slices.

## What to Verify

- Every commit in the sequence compiles and passes `./mvnw test`
- Each slice delivers one testable behavior, not a horizontal layer
- Migrations are committed separately from the application code that depends on them
- Feature flags default to off and are removed after the feature stabilizes
- No speculative code exists for slices that haven't been started yet
- The commit history reads as a logical, reviewable progression of the feature
