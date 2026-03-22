# Configuration — Keycloak 24 + Spring Boot 3.x

## Keycloak 24 Docker Compose

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak"]
      interval: 10s
      timeout: 5s
      retries: 5

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak
      KC_BOOTSTRAP_ADMIN_USERNAME: admin      # NEW in Keycloak 24 (replaces KEYCLOAK_ADMIN)
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin      # NEW in Keycloak 24 (replaces KEYCLOAK_ADMIN_PASSWORD)
      KC_HTTP_ENABLED: "true"
      KC_HOSTNAME_STRICT: "false"
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

> **Note:** `KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD` replace the deprecated `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` environment variables from Keycloak 24+.

## Application Configuration

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8080/realms/my-realm
          # jwk-set-uri: http://localhost:8080/realms/my-realm/protocol/openid-connect/certs
          # Use jwk-set-uri instead if OIDC discovery fails (e.g., internal K8s DNS mismatch)

app:
  security:
    client-id: my-service   # used to extract client roles from resource_access
```

**`issuer-uri` vs `jwk-set-uri`:**

| Property | Behavior | When to Use |
|---|---|---|
| `issuer-uri` | Triggers OIDC discovery (`.well-known/openid-configuration`) on startup. Also validates the `iss` claim in every token. | Default — recommended for all standard deployments |
| `jwk-set-uri` | Fetches only the public key set. Skips OIDC discovery. Does NOT validate `iss` claim automatically. | When the OIDC discovery endpoint is unreachable at startup (e.g., internal K8s DNS with a different external hostname) |

## Keycloak Realm Setup Checklist

1. **Create realm** — e.g., `my-app` (never use `master` for applications)
2. **Create client** — type: OpenID Connect
   - Set `Client authentication: ON` for confidential clients (backend services)
   - Set `Valid Redirect URIs`: `http://localhost:3000/*` (or your frontend URL)
   - Set `Web Origins`: `+` (mirrors Valid Redirect URIs) for CORS
3. **Enable standard flows** — Authorization Code for user login; Client Credentials for service-to-service
4. **Create realm roles** — e.g., `admin`, `user`, `manager`
5. **Verify realm roles mapper** — Client Scopes > `roles` > Mappers > ensure `realm roles` mapper includes `realm_access` in the token
6. **Create users** — Users > Add user > set password (Credentials tab) > assign realm roles (Role Mapping tab)
7. **Copy issuer URI** — `{keycloak-host}/realms/{realm-name}` (e.g., `http://localhost:8080/realms/my-app`)

## Client Credentials Flow (Service-to-Service)

For backend services calling other protected APIs.

**application.yml:**
```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          my-service:
            client-id: my-service
            client-secret: ${CLIENT_SECRET}
            authorization-grant-type: client_credentials
            scope: openid
        provider:
          my-service:
            token-uri: http://localhost:8080/realms/my-realm/protocol/openid-connect/token
```

**WebClient with automatic token injection:**
```java
@Configuration
public class WebClientConfig {

    @Bean
    public OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository clientRegistrationRepository,
            OAuth2AuthorizedClientRepository authorizedClientRepository) {
        OAuth2AuthorizedClientProvider provider =
            OAuth2AuthorizedClientProviderBuilder.builder()
                .clientCredentials()
                .build();
        DefaultOAuth2AuthorizedClientManager manager =
            new DefaultOAuth2AuthorizedClientManager(
                clientRegistrationRepository, authorizedClientRepository);
        manager.setAuthorizedClientProvider(provider);
        return manager;
    }

    @Bean
    public WebClient inventoryWebClient(
            OAuth2AuthorizedClientManager authorizedClientManager,
            @Value("${services.inventory.base-url}") String baseUrl) {
        ServletOAuth2AuthorizedClientExchangeFilterFunction oauth2 =
            new ServletOAuth2AuthorizedClientExchangeFilterFunction(authorizedClientManager);
        oauth2.setDefaultClientRegistrationId("my-service");
        return WebClient.builder()
            .baseUrl(baseUrl)
            .apply(oauth2.oauth2Configuration())
            .build();
    }
}
```

**Usage in service:**
```java
@Service
public class InventoryClient {

    private final WebClient webClient;

    public InventoryClient(WebClient inventoryWebClient) {
        this.webClient = inventoryWebClient;
    }

    public ProductStock getStock(String productId) {
        return webClient.get()
            .uri("/api/v1/stock/{productId}", productId)
            .retrieve()
            .bodyToMono(ProductStock.class)
            .block();
    }
}
```

## Token Claims Quick Reference

| Claim | Content | How to Access in Java |
|---|---|---|
| `sub` | User UUID (stable, use as userId) | `jwt.getSubject()` |
| `preferred_username` | Login username | `jwt.getClaimAsString("preferred_username")` |
| `email` | User email | `jwt.getClaimAsString("email")` |
| `realm_access.roles` | List of realm-level roles | `((Map) jwt.getClaim("realm_access")).get("roles")` |
| `resource_access.{client}.roles` | List of client-specific roles | `((Map) jwt.getClaim("resource_access")).get(clientId)` |
| `scope` | OAuth2 scopes granted | `jwt.getClaimAsString("scope")` |
| `exp` | Token expiry (epoch seconds) | `jwt.getExpiresAt()` |
| `iat` | Token issued at (epoch seconds) | `jwt.getIssuedAt()` |

> Always use `sub` as the stable user identifier in your database — `preferred_username` and `email` can change.
