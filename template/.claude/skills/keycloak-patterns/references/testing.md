# Testing — Keycloak Security in Spring Boot 3.x

## MockMvc JWT Testing (No Keycloak Required)

Recommended for `@WebMvcTest` and `@SpringBootTest` controller tests. No running Keycloak needed.

```java
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@WebMvcTest(ProductController.class)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean  // Spring Boot 3.4+ (replaces @MockBean)
    private ProductService productService;

    @Test
    void getProduct_asUser_returns200() throws Exception {
        when(productService.findById(1L)).thenReturn(new ProductResponse(1L, "Widget", 9.99));

        mockMvc.perform(get("/api/v1/products/1")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_user"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Widget"));
    }

    @Test
    void getProduct_asAdmin_withCustomClaims_returns200() throws Exception {
        when(productService.findById(1L)).thenReturn(new ProductResponse(1L, "Widget", 9.99));

        mockMvc.perform(get("/api/v1/products/1")
                .with(jwt()
                    .jwt(jwtBuilder -> jwtBuilder
                        .subject("user-123")
                        .claim("preferred_username", "john.doe")
                        .claim("email", "john.doe@example.com")
                        .claim("realm_access", Map.of("roles", List.of("user", "admin"))))
                    .authorities(
                        new SimpleGrantedAuthority("ROLE_user"),
                        new SimpleGrantedAuthority("ROLE_admin"))))
            .andExpect(status().isOk());
    }

    @Test
    void getProduct_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/products/1"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteProduct_withUserRole_returns403() throws Exception {
        mockMvc.perform(delete("/api/v1/products/1")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_user")))
                .with(csrf()))
            .andExpect(status().isForbidden());
    }

    @Test
    void deleteProduct_withAdminRole_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/products/1")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_admin")))
                .with(csrf()))
            .andExpect(status().isNoContent());
    }
}
```

**Required dependency:**
```xml
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

## @WithMockUser for Simple Role Tests

Use when JWT claims are irrelevant and you only need a role:

```java
@Test
@WithMockUser(roles = {"admin"})
void adminEndpoint_withAdminRole_returns200() throws Exception {
    mockMvc.perform(get("/api/v1/admin/stats"))
        .andExpect(status().isOk());
}
```

**Difference from `jwt()`:**

| Approach | Creates | When to Use |
|---|---|---|
| `jwt()` | `JwtAuthenticationToken` with real JWT structure | Code accesses JWT claims (`preferred_username`, `sub`, `realm_access`) |
| `@WithMockUser` | `UsernamePasswordAuthenticationToken` | Simple role checks only, no claim access |

> Always prefer `jwt()` when controllers or services call `jwt.getClaimAsString(...)`, `jwt.getSubject()`, or use `UserContextHolder`.

## Security Test Configuration

When `@WebMvcTest` cannot load the full `SecurityFilterChain` (e.g., beans not in the slice), override with a test configuration:

```java
@TestConfiguration
public class SecurityTestConfig {

    @Bean
    @Primary
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .build();
    }
}

// Import in test:
@WebMvcTest(ProductController.class)
@Import(SecurityTestConfig.class)
class ProductControllerTest { ... }
```

## TestContainers Keycloak (Full Integration)

Use when you need real token issuance and complete OAuth2 flows.

**Dependency:**
```xml
<dependency>
    <groupId>com.github.dasniko</groupId>
    <artifactId>testcontainers-keycloak</artifactId>
    <version>3.3.1</version>
    <scope>test</scope>
</dependency>
```

**Abstract base class:**
```java
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractKeycloakIntegrationTest {

    @Container
    static KeycloakContainer keycloak = new KeycloakContainer("quay.io/keycloak/keycloak:24.0")
        .withRealmImportFile("keycloak/test-realm.json");

    @DynamicPropertySource
    static void keycloakProperties(DynamicPropertyRegistry registry) {
        registry.add(
            "spring.security.oauth2.resourceserver.jwt.issuer-uri",
            () -> keycloak.getAuthServerUrl() + "/realms/test");
    }

    protected String getUserToken(String username, String password) {
        return RestAssured.given()
            .contentType("application/x-www-form-urlencoded")
            .formParam("grant_type", "password")
            .formParam("client_id", "test-client")
            .formParam("client_secret", "test-secret")
            .formParam("username", username)
            .formParam("password", password)
            .post(keycloak.getAuthServerUrl() + "/realms/test/protocol/openid-connect/token")
            .then()
            .statusCode(200)
            .extract()
            .path("access_token");
    }
}

// Usage in integration test:
class OrderIntegrationTest extends AbstractKeycloakIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void createOrder_withValidToken_returns201() {
        String token = getUserToken("testuser", "testpassword");

        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            "/api/v1/orders",
            HttpMethod.POST,
            new HttpEntity<>(
                new CreateOrderRequest(UUID.randomUUID(), List.of()),
                bearerHeader(token)),
            OrderResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private HttpHeaders bearerHeader(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }
}
```

## Realm Import JSON

The `test-realm.json` file at `src/test/resources/keycloak/test-realm.json` enables reproducible test environments in CI/CD.

**Export:** Keycloak Admin UI > Realm Settings > Action > Partial Export (include clients, roles; exclude users for security)

**Minimum JSON structure:**
```json
{
  "realm": "test",
  "enabled": true,
  "clients": [
    {
      "clientId": "test-client",
      "enabled": true,
      "secret": "test-secret",
      "directAccessGrantsEnabled": true,
      "standardFlowEnabled": false
    }
  ],
  "roles": {
    "realm": [
      { "name": "user" },
      { "name": "admin" }
    ]
  },
  "users": [
    {
      "username": "testuser",
      "enabled": true,
      "credentials": [{ "type": "password", "value": "testpassword", "temporary": false }],
      "realmRoles": ["user"]
    },
    {
      "username": "adminuser",
      "enabled": true,
      "credentials": [{ "type": "password", "value": "adminpassword", "temporary": false }],
      "realmRoles": ["user", "admin"]
    }
  ]
}
```

## Testing IDOR Prevention

Verifies that a user cannot access another user's resource via path parameter manipulation.

```java
@Test
void getUserOrders_ownUserId_returns200() throws Exception {
    String currentUserId = "user-123";

    mockMvc.perform(get("/api/v1/users/{userId}/orders", currentUserId)
            .with(jwt()
                .jwt(b -> b.subject(currentUserId))
                .authorities(new SimpleGrantedAuthority("ROLE_user"))))
        .andExpect(status().isOk());
}

@Test
void getUserOrders_differentUserId_returns403() throws Exception {
    String currentUserId = "user-123";
    String targetUserId = "user-456";  // different user's data

    mockMvc.perform(get("/api/v1/users/{userId}/orders", targetUserId)
            .with(jwt()
                .jwt(b -> b.subject(currentUserId))
                .authorities(new SimpleGrantedAuthority("ROLE_user"))))
        .andExpect(status().isForbidden());
}

@Test
void getUserOrders_adminCanAccessAnyUser_returns200() throws Exception {
    String adminId = "admin-789";
    String targetUserId = "user-456";

    mockMvc.perform(get("/api/v1/users/{userId}/orders", targetUserId)
            .with(jwt()
                .jwt(b -> b.subject(adminId))
                .authorities(
                    new SimpleGrantedAuthority("ROLE_user"),
                    new SimpleGrantedAuthority("ROLE_admin"))))
        .andExpect(status().isOk());
}
```

The controller uses `@PreAuthorize("hasRole('admin') or #userId == authentication.name")` to enforce this.

## Quick Reference

| Test Scenario | Approach | Key Import |
|---|---|---|
| Controller with roles | `jwt().authorities(new SimpleGrantedAuthority("ROLE_x"))` | `SecurityMockMvcRequestPostProcessors.jwt` |
| Simple role check only | `@WithMockUser(roles = {"admin"})` | `org.springframework.security.test.context.support` |
| Code reads JWT claims | `jwt().jwt(b -> b.subject(...).claim(...))` | `SecurityMockMvcRequestPostProcessors.jwt` |
| No authentication | `mockMvc.perform(get(...))` — no `.with(jwt())` | — |
| IDOR check | `jwt().jwt(b -> b.subject("user-123"))` with different path param | `SecurityMockMvcRequestPostProcessors.jwt` |
| Full integration test | `AbstractKeycloakIntegrationTest` + `KeycloakContainer` | `com.github.dasniko:testcontainers-keycloak` |
