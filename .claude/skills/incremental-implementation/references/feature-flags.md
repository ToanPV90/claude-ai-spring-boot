# Feature Flags — Gating Incomplete Work

Gate unfinished features behind configuration so every commit is shippable, even when the feature is half-built.

## @ConditionalOnProperty (Default)

```java
@Configuration
@ConditionalOnProperty(name = "feature.bulk-import.enabled", havingValue = "true")
public class BulkImportConfig {
    @Bean
    public BulkImportService bulkImportService(ItemRepository repo) {
        return new BulkImportServiceImpl(repo);
    }
}
```

```yaml
feature:
  bulk-import:
    enabled: false   # off by default
```

Use when a feature wires distinct beans (services, controllers, listeners).

## @Profile-Based Gating

```java
@Configuration
@Profile("experimental")
public class ExperimentalSearchConfig {
    @Bean
    public SearchService searchService(SearchRepository repo) {
        return new ElasticsearchSearchServiceImpl(repo);
    }
}
```

Activate with `--spring.profiles.active=experimental` or `@ActiveProfiles("experimental")` in tests. Use when the feature replaces an existing bean or needs a whole environment slice.

## Flag Lifecycle

| Phase | Action | Commit Message Pattern |
|-------|--------|----------------------|
| **Create** | Add property (default `false`) + `@ConditionalOnProperty` config | `chore: add feature flag for bulk-import` |
| **Test** | Write tests with flag on: `@TestPropertySource(properties = "feature.bulk-import.enabled=true")` | `test: add bulk-import tests with flag enabled` |
| **Enable** | Flip default to `true` in `application.yml` | `feat: enable bulk-import by default` |
| **Remove** | Delete flag, inline bean registration, remove conditional annotations | `chore: remove bulk-import feature flag` |

## Cleanup Checklist (after enabling and confirming stability)

- [ ] Remove `@ConditionalOnProperty` / `@Profile` annotation from config class
- [ ] Move bean definitions to the main config or use `@Component` scanning
- [ ] Delete the `feature.x.enabled` property from all `application*.yml` files
- [ ] Remove `@TestPropertySource` overrides from tests
- [ ] Search codebase for the property name — no orphan references
- [ ] Commit cleanup as a standalone slice

**Rule:** A feature flag that survives two releases without removal is a code smell. Track flags in a `FEATURE_FLAGS.md` or issue tracker.
