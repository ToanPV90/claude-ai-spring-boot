# Spring Security — Keycloak Resource Server Patterns

## Full SecurityFilterChain

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final String issuerUri;
    private final String clientId;

    public SecurityConfig(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri,
            @Value("${app.security.client-id}") String clientId) {
        this.issuerUri = issuerUri;
        this.clientId = clientId;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm ->
                sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter()))
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler()))
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
                {"status":401,"message":"Unauthorized","timestamp":"%s"}
                """.formatted(Instant.now()));
        };
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                {"status":403,"message":"Forbidden","timestamp":"%s"}
                """.formatted(Instant.now()));
        };
    }
}
```

## JwtAuthenticationConverter — Keycloak Role Extraction

This is the most critical piece. Without it, `@PreAuthorize` role checks always return false.

```java
@Bean
public Converter<Jwt, AbstractAuthenticationToken> keycloakJwtConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(keycloakGrantedAuthoritiesConverter());
    return converter;
}

@Bean
public Converter<Jwt, Collection<GrantedAuthority>> keycloakGrantedAuthoritiesConverter() {
    return jwt -> {
        // Extract realm roles from realm_access.roles
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        Stream<String> realmRoles = realmAccess != null
            ? ((List<String>) realmAccess.getOrDefault("roles", List.of())).stream()
            : Stream.empty();

        // Extract client roles from resource_access.{clientId}.roles
        Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
        Stream<String> clientRoles = Stream.empty();
        if (resourceAccess != null && resourceAccess.containsKey(clientId)) {
            Map<String, Object> clientAccess = (Map<String, Object>) resourceAccess.get(clientId);
            List<String> roles = (List<String>) clientAccess.getOrDefault("roles", List.of());
            clientRoles = roles.stream();
        }

        return Stream.concat(realmRoles, clientRoles)
            .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toList());
    };
}
```

## Extracting Current User from SecurityContext

```java
@Component
public class UserContextHolder {

    public String getCurrentUserId() {
        return getJwt().getSubject();
    }

    public String getCurrentUsername() {
        return getJwt().getClaimAsString("preferred_username");
    }

    public String getCurrentUserEmail() {
        return getJwt().getClaimAsString("email");
    }

    public boolean hasRole(String role) {
        return getAuthentication().getAuthorities().stream()
            .anyMatch(auth -> auth.getAuthority().equals("ROLE_" + role));
    }

    private Jwt getJwt() {
        return (Jwt) getAuthentication().getPrincipal();
    }

    private JwtAuthenticationToken getAuthentication() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            throw new IllegalStateException("No JWT authentication found in SecurityContext");
        }
        return jwtAuth;
    }
}
```

## Method-Level Security Patterns

```java
@RestController
@RequestMapping("/api/v1")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Require single role
    @PreAuthorize("hasRole('user')")
    @GetMapping("/orders")
    public List<OrderResponse> getOrders() {
        return orderService.findAll();
    }

    // Require any of multiple roles
    @PreAuthorize("hasAnyRole('admin', 'manager')")
    @GetMapping("/orders/all")
    public List<OrderResponse> getAllOrders() {
        return orderService.findAllOrders();
    }

    // IDOR prevention — user can only access their own resource
    @PreAuthorize("#userId == authentication.name")
    @GetMapping("/users/{userId}/orders")
    public List<OrderResponse> getUserOrders(@PathVariable String userId) {
        return orderService.findByUserId(userId);
    }

    // Admin OR own resource
    @PreAuthorize("hasRole('admin') or #userId == authentication.name")
    @GetMapping("/users/{userId}/profile")
    public UserProfile getUserProfile(@PathVariable String userId) {
        return orderService.getProfile(userId);
    }

    // Filter response — only return if owner matches
    @PostAuthorize("returnObject.ownerId == authentication.name")
    @GetMapping("/documents/{id}")
    public DocumentResponse getDocument(@PathVariable Long id) {
        return orderService.getDocument(id);
    }
}
```

## Multi-Tenant (Multiple Realms)

For applications serving multiple Keycloak realms, use `JwtIssuerAuthenticationManagerResolver`:

```java
@Bean
public JwtIssuerAuthenticationManagerResolver authenticationManagerResolver() {
    Map<String, AuthenticationManager> managers = Map.of(
        "http://localhost:8080/realms/realm-a", buildJwtAuthManager("http://localhost:8080/realms/realm-a"),
        "http://localhost:8080/realms/realm-b", buildJwtAuthManager("http://localhost:8080/realms/realm-b")
    );
    return new JwtIssuerAuthenticationManagerResolver(managers::get);
}

private AuthenticationManager buildJwtAuthManager(String issuerUri) {
    JwtDecoder decoder = JwtDecoders.fromIssuerLocation(issuerUri);
    JwtAuthenticationProvider provider = new JwtAuthenticationProvider(decoder);
    provider.setJwtAuthenticationConverter(keycloakJwtConverter());
    return provider::authenticate;
}

// Wire into SecurityFilterChain instead of .jwt(...)
// .oauth2ResourceServer(oauth2 -> oauth2.authenticationManagerResolver(authenticationManagerResolver()))
```

## Custom 401 / 403 Error Response

```java
public record ErrorResponse(int status, String message, Instant timestamp) {

    public static ErrorResponse unauthorized() {
        return new ErrorResponse(401, "Authentication required", Instant.now());
    }

    public static ErrorResponse forbidden() {
        return new ErrorResponse(403, "Access denied", Instant.now());
    }
}
```

Wire in `SecurityFilterChain` via `.exceptionHandling(...)` as shown in the Full SecurityFilterChain section above.
