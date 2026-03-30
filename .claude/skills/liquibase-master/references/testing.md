# Liquibase Testing Patterns

## Integration Test with TestContainers

```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class UserMigrationIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void liquibaseMigrationsApply_schemaValid() throws Exception {
        // If migrations fail, the context won't start — this test passes if context loads
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk());
    }

    @Test
    void createUser_persistsCorrectly() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name": "Alice", "email": "alice@example.com"}"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists());
    }
}
```

`@ServiceConnection` auto-configures the datasource from the running container.

## Verifying Schema with DataJpaTest

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class SchemaValidationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void usersTable_hasRequiredColumns() {
        List<String> columns = jdbcTemplate.queryForList(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
            String.class);

        assertThat(columns).contains("id", "name", "email", "created_at");
    }

    @Test
    void usersEmail_hasUniqueConstraint() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.table_constraints " +
            "WHERE table_name = 'users' AND constraint_type = 'UNIQUE'",
            Integer.class);

        assertThat(count).isGreaterThan(0);
    }
}
```

## Rollback Test

Test that a rollback returns the schema to its previous state:

```java
@SpringBootTest
@Testcontainers
class MigrationRollbackTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private Liquibase liquibase;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void rollback_removesLastChangeset() throws Exception {
        // Schema is up after context starts

        // Rollback 1 changeset
        liquibase.rollback(1, "");

        // Verify column was removed (example: last migration added 'phone' column)
        List<String> columns = jdbcTemplate.queryForList(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
            String.class);

        assertThat(columns).doesNotContain("phone");

        // Re-apply to leave DB clean for other tests
        liquibase.update("");
    }
}
```

## Using a Shared TestContainers Context

For fast integration tests, share one container across all tests:

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> postgres;

    static {
        postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withReuse(true);   // requires ~/.testcontainers.properties: testcontainers.reuse.enable=true
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

## Verifying Pending Migrations in CI

```java
@SpringBootTest
class NoPendingMigrationsTest {

    @Autowired
    private Liquibase liquibase;

    @Test
    void noUnrunChangeSets() throws LiquibaseException {
        List<ChangeSet> unrun = liquibase.listUnrunChangeSets(null, null);
        assertThat(unrun).isEmpty();
    }
}
```

Run this in CI to catch forgotten migrations before deployment.

## Gotchas

- `@DataJpaTest` replaces the datasource with H2 by default. Use `@AutoConfigureTestDatabase(replace = NONE)` + TestContainers to test against real PostgreSQL.
- Liquibase SQL changesets with `dbms: postgresql` won't apply to H2. Always test migrations against the same DB engine as production.
- TestContainers containers start fresh for each test class. If tests share state, isolate with `@Transactional` rollback or explicit cleanup.
- Rollback tests must inject `Liquibase` directly (not just the datasource) to call `rollback()` programmatically.
