# Configuration and Testing Defaults

## Configuration Properties

Prefer `@ConfigurationProperties` over many scattered `@Value` fields.

```java
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, Duration expiration) {
}
```

## Profiles

Separate common and environment-specific configuration with profile files such as:
- `application.yml`
- `application-dev.yml`
- `application-test.yml`
- `application-prod.yml`

Do not hardcode credentials or environment-specific secrets.

## Useful Annotations

- `@RestController`
- `@Service`
- `@Repository`
- `@Configuration`
- `@Transactional`
- `@Valid`
- `@ConfigurationProperties`

## Testing Defaults

- `@WebMvcTest` for controller slices
- unit tests for service behavior
- `@SpringBootTest` for broader integration

Spring-managed tests may use field injection for framework fixtures such as `MockMvc`, but production code should stay constructor-injected.
