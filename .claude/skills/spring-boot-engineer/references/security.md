# Security - Spring Security 6

## Security Configuration (Resource Server Default)

For this repo, the default Spring Security shape is **filter-chain authentication**.
Protected APIs should assume an upstream OAuth2/OIDC provider or resource-server JWT
validation flow, not a custom `/login` controller or handwritten JWT filter.

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler()))
            .build();
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                {"status":401,"message":"Authentication required"}
                """);
        };
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                {"status":403,"message":"Access denied"}
                """);
        };
    }
}
```

## Authentication Ownership

- For bearer-token APIs, authentication should happen in Spring Security filters before controller code runs.
- Controllers should expose business endpoints and work with an already-authenticated principal.
- For Keycloak or another OIDC provider, obtain tokens from the provider and validate them with resource-server support.
- Route provider-specific issuer configuration, JWT claim mapping, and `JwtAuthenticationConverter` logic to `keycloak-master`.

## Variant: First-Party Credential Authentication (Explicit Opt-In)

If a project truly owns username/password login itself, treat that as an explicit application-specific variant.

- Document it as a non-default path.
- Call out required dependencies such as JJWT or another token library before showing code.
- Keep that variant separate from the normal resource-server examples so generated guidance does not accidentally teach custom `/login` flows as the Spring default.

## Secured Business Endpoint Example

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public OrderResponse getById(@PathVariable UUID id) {
        return orderService.getById(id);
    }
}
```

## Service Uses the Security Context, Not Login Flow Code

```java
@Service
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository repository;
    private final UserContextHolder userContextHolder;

    public OrderService(OrderRepository repository, UserContextHolder userContextHolder) {
        this.repository = repository;
        this.userContextHolder = userContextHolder;
    }

    public OrderResponse getById(UUID id) {
        Order order = repository.findByIdAndOwnerId(id, userContextHolder.getCurrentUserId())
            .orElseThrow(() -> new OrderNotFoundException(id));
        return OrderResponse.from(order);
    }
}
```

## Method Security

```java
@Service
public class UserService {

    private final UserProfileRepository userProfileRepository;

    public UserService(UserProfileRepository userProfileRepository) {
        this.userProfileRepository = userProfileRepository;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllUsers() {
        return userProfileRepository.findAll();
    }

    @PreAuthorize("hasRole('ADMIN') or #ownerId == @userContextHolder.getCurrentUserId()")
    public UserProfile getProfile(String ownerId) {
        return userProfileRepository.findByOwnerId(ownerId)
            .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
    }

    @Secured({"ROLE_ADMIN", "ROLE_MANAGER"})
    public void deleteUser(Long userId) {
        userProfileRepository.deleteById(userId);
    }
}
```

## OAuth2 Resource Server Routing

For Keycloak-backed OAuth2/OIDC resource-server wiring, do not copy a generic
`JwtAuthenticationConverter` from this reference.

Load `keycloak-master` when the task involves:
- `issuer-uri` / `jwk-set-uri` configuration for Keycloak
- `JwtAuthenticationConverter` logic for `realm_access.roles`
- client-role extraction from `resource_access.{client}.roles`
- bearer-token authorization rules tied to Keycloak claims

This reference keeps the general Spring Security structure. Keycloak-specific
JWT claim mapping belongs to `keycloak-master`.

If a security rule depends on ownership rather than role, prefer an explicit
helper bean over assuming `authentication.name` has the right semantics. Under
resource-server defaults it often maps to `sub`, which is not interchangeable
with numeric database IDs or mutable display claims.

Keep helper naming aligned with that rule: prefer `getCurrentUserId()` or a
similarly explicit principal-ID helper over generic names like `getCurrentUsername()`.

## Quick Reference

| Annotation | Purpose |
|------------|---------|
| `@EnableWebSecurity` | Enables Spring Security |
| `@EnableMethodSecurity` | Enables method-level security annotations |
| `@PreAuthorize` | Checks authorization before method execution |
| `@PostAuthorize` | Checks authorization after method execution |
| `@Secured` | Role-based method security |
| `@WithMockUser` | Mock authenticated user in tests |
| `@AuthenticationPrincipal` | Inject current user in controller |

## Security Best Practices

- `AuthenticationEntryPoint` / `AccessDeniedHandler` examples here are for API responses, not browser login pages; do not mix them with form-login assumptions.
- If ownership depends on a stable user identifier, prefer an explicit helper tied to the principal ID instead of comparing numeric IDs to usernames or display claims.
- First-party credential auth is an explicit variant; do not quietly copy it into a bearer-token/resource-server service.

- Always use HTTPS in production
- Prefer resource-server or OIDC provider validation over hand-rolled JWT parsing in the application
- Keep any first-party credential-auth flow documented as an explicit variant, not the default example
- Use strong password encoding when the application truly owns credentials
- Add rate limiting only when the application actually exposes first-party authentication endpoints
- Validate all user inputs
- Log security events
- Keep dependencies updated
- Use CSRF protection only for session/cookie/browser flows, not stateless bearer-token APIs by default
- Keep session-based examples separate from stateless resource-server examples
