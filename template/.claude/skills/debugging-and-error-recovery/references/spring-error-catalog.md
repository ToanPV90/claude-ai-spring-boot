# Spring Boot Error Catalog

Quick-reference table of common Spring and Hibernate exceptions with their usual root cause and standard fix.

## Exception → Cause → Fix

| Exception | Common Cause | Standard Fix |
|-----------|-------------|--------------|
| `BeanCreationException` | A bean failed to initialize — usually wraps a deeper cause | Read the full "caused by" chain to the bottom; fix the root (missing config, bad constructor arg, failed init method) |
| `UnsatisfiedDependencyException` | A constructor or `@Autowired` parameter has no qualifying bean | Add `@Component`/`@Service`/`@Repository` to the missing class, add a `@Bean` method, or fix the component-scan base package |
| `NoSuchBeanDefinitionException` | Spring cannot find a bean of the requested type in the context | Verify the class is annotated, the package is scanned, and the correct profile is active |
| `BeanCurrentlyInCreationException` (circular) | Two or more beans depend on each other through constructors | Break the cycle: extract shared logic into a third bean, use `@Lazy` on one injection point, or redesign the dependency graph |
| `LazyInitializationException` | An entity's lazy collection or proxy is accessed after the Hibernate session closes | Fetch eagerly with `JOIN FETCH`/`@EntityGraph`, use a DTO projection, or ensure access happens inside a `@Transactional` boundary |
| `TransactionRequiredException` | A write operation (persist/merge/remove) runs outside an active transaction | Add `@Transactional` to the service method; verify propagation settings (`REQUIRED` vs `REQUIRES_NEW`) |
| `DataIntegrityViolationException` | A database constraint is violated (unique, FK, not-null) | Unique → add dedup/upsert logic; FK → fix insert/delete ordering; Not-null → validate input or set entity defaults |
| `HttpMessageNotReadableException` | The request body cannot be deserialized (malformed JSON, type mismatch, unknown field) | Validate the payload format; check DTO field types and `@JsonIgnoreProperties`; return a clear 400 error |
| `MethodArgumentNotValidException` | Bean Validation (`@Valid`) rejects one or more request fields | Fix the request data or adjust validation annotations; handle via `@ExceptionHandler` returning field-level errors |
| `OptimisticLockException` | Two transactions update the same row and the `@Version` check fails | Retry the operation (e.g., Spring Retry or application-level retry loop) or redesign to reduce write contention |

## Diagnostic Shortcuts

| Symptom | First Command |
|---------|---------------|
| Context fails to load | Search for the deepest "Caused by" in the stack trace |
| Bean not found | `grep -r '@Component\|@Service\|@Repository\|@Configuration' src/` to verify annotations |
| Constraint violation | Check the SQL constraint name in the error; map it to the entity field |
| N+1 queries | Enable `logging.level.org.hibernate.SQL=DEBUG` and count SELECT statements |
| Slow startup | Add `spring.jpa.properties.hibernate.generate_statistics=true` and review counts |

## Rules

- Always read to the **bottom** of nested "caused by" chains — the first `BeanCreationException` is rarely the real cause.
- Fix the root cause in the correct layer; do not add try/catch wrappers to silence constraint or validation exceptions.
- After fixing, verify with `./mvnw test` before moving on.
