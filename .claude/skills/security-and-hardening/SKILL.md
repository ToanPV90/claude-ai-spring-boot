---
name: security-and-hardening
description: Security guidance for Java/Spring Boot applications covering authentication, authorization, input validation, OWASP Top 10 prevention, and secure defaults. Use when implementing security features, reviewing code for vulnerabilities, or hardening an application before production.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: security
  triggers:
    - security
    - hardening
    - OWASP
    - input validation
    - SQL injection
    - XSS
    - CSRF
    - CORS
    - authentication
    - authorization
    - secrets management
    - file upload security
    - security headers
    - rate limiting
  role: guide
  scope: security
  output-format: code + guidance
  related-skills: keycloak-master, spring-boot-engineer, backend-practices-review, java-code-review
---

# Security and Hardening

Decision guide for building security into Java/Spring Boot applications at the code, framework, and infrastructure boundary level without drifting into architecture tradeoffs, general Spring Boot scaffolding, or Keycloak-specific wiring that sibling skills already own.

## When to Use
- The task requires implementing or reviewing authentication, authorization, input validation, or output encoding in a Spring Boot application
- You need OWASP Top 10 prevention patterns applied to Java code
- A feature touches user data, external system integration, file uploads, or secrets and you need secure defaults
- You need security headers, CORS, CSRF, or rate-limiting configuration for a Spring Boot service
- You are hardening an application before production deployment

## When Not to Use
- The main task is Keycloak realm/client setup, JWT converter wiring, or realm-role mapping — use `keycloak-master`
- The main task is general Spring Boot implementation without a security focus — use `spring-boot-engineer`
- The main task is cross-cutting backend production-safety review (retries, idempotency, lifecycle) — use `backend-practices-review`
- The main task is a general Java code review without a security-specific audit goal — use `java-code-review`
- The main task is service boundaries, topology, or auth strategy across services — use `java-architect`

## Reference Guide

| Topic | Reference | Load When |
|-------|-----------|-----------|
| OWASP Top 10 prevention with Java/Spring Boot code examples | `references/owasp-prevention.md` | Implementing OWASP defenses, reviewing for injection, access control, or SSRF |
| SecurityFilterChain configs for resource server, browser app, mixed | `references/spring-security-defaults.md` | Setting up a new SecurityFilterChain or choosing between stateless/session patterns |
| Security gotchas, common mistakes, and rationalizations | `references/gotchas.md` | Reviewing security config for common pitfalls or rejecting unsafe shortcuts |

## Three-Tier Boundary System

| Tier | Label | Rule | Examples |
|------|-------|------|----------|
| 1 | **Always Do** | Apply without asking; these are non-negotiable secure defaults | Parameterized queries, input validation, secrets from environment, HTTPS enforcement, security headers |
| 2 | **Ask First** | Confirm with the user before applying; context-dependent | CORS allowed origins, CSRF token strategy, rate-limit thresholds, file-size caps, allowed MIME types |
| 3 | **Never Do** | Block unconditionally; these are known-bad patterns | Hardcoded secrets, `ddl-auto:create` in production, disabling CSRF without justification, trusting client-supplied MIME types, string-concatenated SQL |

## OWASP Top 10 Prevention Map (Java/Spring Boot)

| OWASP Category | Default Prevention | Spring Boot Mechanism |
|----------------|--------------------|-----------------------|
| A01 Broken Access Control | Method-level authorization, ownership checks | `@PreAuthorize`, `SecurityFilterChain`, JWT subject comparison |
| A02 Cryptographic Failures | TLS everywhere, no plaintext secrets, strong hashing | `server.ssl.*`, `BCryptPasswordEncoder`, env/vault for secrets |
| A03 Injection | Parameterized queries only, no string concat SQL | JPA named parameters, jOOQ bind variables, Bean Validation |
| A04 Insecure Design | Threat modeling, least privilege, deny-by-default | `authorizeHttpRequests(auth -> auth.anyRequest().authenticated())` |
| A05 Security Misconfiguration | Secure defaults, disable unnecessary features | Remove Actuator exposure in production, disable stack traces |
| A06 Vulnerable Components | Dependency scanning, keep versions current | `mvn versions:display-dependency-updates`, Dependabot |
| A07 Auth Failures | Brute-force protection, session-less APIs | Rate limiting, `SessionCreationPolicy.STATELESS`, strong JWT validation |
| A08 Data Integrity Failures | Verify input integrity, sign tokens properly | HMAC/RSA JWT validation, checksum verification for uploads |
| A09 Logging Failures | Log security events, never log secrets | SLF4J + MDC for correlation, mask PII in logs |
| A10 SSRF | Validate and allowlist outbound URLs | Reject private/loopback ranges, use allowlisted hosts only |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| SQL injection reported in scan | Is raw SQL or string concatenation used? | Replace with JPA named params or jOOQ bind variables |
| Users access other users' data | Is ownership checked against JWT subject? | Add `@PreAuthorize` with subject comparison or service-level ownership check |
| Secrets visible in logs or config | Are credentials hardcoded or printed? | Move to environment variables or vault, mask in logs |
| CORS errors in browser | Is `CorsConfiguration` missing or overly permissive? | Configure explicit allowed origins, methods, and headers |
| Large file upload crashes the service | Is there no size limit or MIME validation? | Add `spring.servlet.multipart.max-file-size`, validate content type and magic bytes |
| Brute-force login attempts succeed | Is there no rate limiting? | Add bucket4j or filter-based rate limiter per client/IP |

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| SQL query with user input | JPA named parameter or jOOQ bind variable | String concatenation or `nativeQuery` with `+` |
| Secret needed at runtime | `@ConfigurationProperties` from env or vault | Hardcoded string literal in source |
| File upload endpoint | Validate size + MIME + magic bytes, store with random key | Trust `Content-Type` header and original filename |
| Public API endpoint | Rate limit per IP/client, return `429` on excess | No throttling and hope for the best |
| Security headers | Spring Security defaults + explicit `Content-Security-Policy` | Manual `HttpServletResponse.setHeader` scattered across controllers |
| CSRF for browser-facing API | Spring Security CSRF with cookie-based token repository | Disabling CSRF without documenting the justification |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Parameterize all SQL queries | JPA `@Query("... WHERE e.id = :id")`, jOOQ `.where(FIELD.eq(param))` |
| Validate all external input at the boundary | `@Valid` on request DTOs, Bean Validation annotations on fields |
| Load secrets from environment or vault | `@ConfigurationProperties` or `@Value("${...}")` backed by env/secrets manager |
| Enforce authorization on every endpoint | `SecurityFilterChain` with deny-by-default, `@PreAuthorize` for method-level |
| Set security headers | Spring Security defaults; add `Content-Security-Policy`, `Permissions-Policy` |
| Validate file uploads | Check size, MIME type, and magic bytes; store with generated keys, not original filenames |
| Log security events without leaking secrets | Log auth failures, access denials; never log passwords, tokens, or PII |
| Keep sessions stateless for APIs | `SessionCreationPolicy.STATELESS` for resource-server APIs |

### MUST NOT DO
- Do not concatenate user input into SQL, JPQL, or native queries
- Do not hardcode secrets, API keys, or credentials in source code or `application.yml`
- Do not disable CSRF without explicit documented justification
- Do not trust `Content-Type` headers or original filenames from uploads
- Do not expose stack traces or internal error details to API clients
- Do not use `permitAll()` as the default for unrecognized endpoints
- Do not log passwords, bearer tokens, session IDs, or PII
- Do not use `@Autowired` field injection in security configuration classes

## Gotchas

- Spring Security's default `SecurityFilterChain` denies nothing unless you configure it; an empty chain permits everything.
- `@PreAuthorize` only works when `@EnableMethodSecurity` is present on a configuration class.
- CSRF protection is on by default in Spring Security; disabling it for a stateless API is valid but must be a deliberate, documented choice.
- Bean Validation annotations on a DTO do nothing unless `@Valid` is on the controller parameter.
- `spring.servlet.multipart.max-file-size` limits the HTTP layer, but you still need application-level content validation.
- Rate limiting at the application layer does not replace infrastructure-level rate limiting (API gateway, WAF).
- `BCryptPasswordEncoder` is the safe default for password hashing; never use MD5, SHA-1, or plain SHA-256 for passwords.
- `@Query` with `nativeQuery = true` is safe only when using named parameters (`:param`), not string concatenation.

## Minimal Examples

### SecurityFilterChain with sensible defaults
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.csrfTokenRepository(
                CookieCsrfTokenRepository.withHttpOnlyFalse()))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .headers(headers -> headers
                .contentSecurityPolicy(csp ->
                    csp.policyDirectives("default-src 'self'"))
                .permissionsPolicy(pp ->
                    pp.policy("camera=(), microphone=(), geolocation=()")));
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://app.example.com"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

### Bean Validation on request DTO
```java
public record CreateUserRequest(
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username must be alphanumeric")
    String username,

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 12, message = "Password must be at least 12 characters")
    String password
) {}
```

### Controller with @Valid
```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        UserResponse response = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

### Parameterized query — JPA
```java
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.active = true")
    Optional<User> findActiveByEmail(@Param("email") String email);
}
```

### Parameterized query — jOOQ
```java
public List<UserRecord> findByEmail(String email) {
    return dsl.selectFrom(USERS)
        .where(USERS.EMAIL.eq(email))
        .and(USERS.ACTIVE.isTrue())
        .fetchInto(UserRecord.class);
}
```

### Secret management — never hardcoded
```java
@ConfigurationProperties(prefix = "app.api")
public record ApiClientProperties(
    @NotBlank String baseUrl,
    @NotBlank String apiKey,
    Duration connectTimeout
) {}
```
```yaml
# application.yml — values injected from environment
app:
  api:
    base-url: ${API_BASE_URL}
    api-key: ${API_KEY}
    connect-timeout: 5s
```

### File upload validation
```java
@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/png", "image/jpeg", "application/pdf");
    private static final long MAX_SIZE = 10 * 1024 * 1024; // 10 MB

    private final FileStorageService storageService;

    public FileUploadController(FileStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileResponse> upload(
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "File must not be empty");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "File exceeds 10 MB limit");
        }

        String detectedType = detectMimeType(file);
        if (!ALLOWED_TYPES.contains(detectedType)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "File type not allowed");
        }

        FileResponse response = storageService.store(file, detectedType);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private String detectMimeType(MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            String detected = java.net.URLConnection
                .guessContentTypeFromStream(is);
            return detected != null ? detected : "application/octet-stream";
        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Cannot read file content");
        }
    }
}
```

### Rate limiting with a servlet filter (bucket4j)
```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {

        String clientIp = request.getRemoteAddr();
        Bucket bucket = buckets.computeIfAbsent(clientIp, this::createBucket);

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"error\":\"Rate limit exceeded. Try again later.\"}");
        }
    }

    private Bucket createBucket(String key) {
        Bandwidth limit = Bandwidth.classic(
            50, Refill.greedy(50, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
```

## What to Verify
- Every SQL query that accepts user input uses parameterized bindings, never string concatenation
- All external input is validated with Bean Validation at the controller boundary and `@Valid` is present
- Secrets are loaded from environment variables or a secrets manager, never committed to source
- `SecurityFilterChain` denies by default and permits only explicitly listed paths
- Security headers (`Content-Security-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) are set
- File uploads validate size, MIME type via magic bytes, and store with generated keys
- Rate limiting is configured for public or authentication endpoints
- CSRF is explicitly configured (enabled with token repository or disabled with documented justification)
- CORS allows only the origins, methods, and headers the application actually needs
- Security events (auth failures, access denials) are logged without exposing secrets or PII
- `@EnableMethodSecurity` is present when `@PreAuthorize` is used anywhere in the application

## See References
- `keycloak-master` for Keycloak-specific OAuth2/OIDC resource-server wiring, JWT converters, and realm-role mapping
- `spring-boot-engineer` for general Spring Boot implementation patterns including controller/service/test structure
- `backend-practices-review` for cross-cutting production-safety review of trust boundaries, retries, and lifecycle
- `java-code-review` for systematic Java code review with severity-based findings
