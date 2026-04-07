# OWASP Top 10 Prevention Patterns — Java/Spring Boot

## A01 Broken Access Control

```java
// Deny-by-default filter chain
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/actuator/health").permitAll()
    .anyRequest().authenticated())

// Ownership check — compare JWT subject with resource owner
@PreAuthorize("#userId == authentication.name")
public OrderResponse getOrder(@PathVariable String userId, @PathVariable Long orderId) { ... }
```

## A02 Cryptographic Failures

```java
@Bean
public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
// TLS: server.ssl.key-store=classpath:keystore.p12, key-store-type=PKCS12
```

## A03 Injection

```java
@Query("SELECT u FROM User u WHERE u.email = :email") // JPA — named params
Optional<User> findByEmail(@Param("email") String email);
dsl.selectFrom(USERS).where(USERS.EMAIL.eq(email));   // jOOQ — bind variables
// NEVER: "SELECT * FROM users WHERE email = '" + email + "'"
```

## A04 Insecure Design

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .anyRequest().authenticated())  // Deny by default
```

## A05 Security Misconfiguration

```yaml
management.endpoints.web.exposure.include: health,info   # Never expose env, heapdump
management.endpoint.health.show-details: never
```

## A06 Vulnerable Components

```xml
<plugin>
  <groupId>org.owasp</groupId>
  <artifactId>dependency-check-maven</artifactId>
  <configuration><failBuildOnCVSS>7</failBuildOnCVSS></configuration>
</plugin>
```

## A07 Authentication Failures

```java
// Stateless APIs — no sessions to hijack
.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
// Rate limit login/auth endpoints (see rate limiting in main SKILL.md)
```

## A08 Data Integrity Failures

```java
.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.decoder(jwtDecoder())))
// Verify file checksums: MessageDigest.getInstance("SHA-256").digest(fileBytes);
```

## A09 Logging & Monitoring Failures

```java
log.warn("Authentication failed for user={}", sanitize(username));
// NEVER: log.debug("Token: {}", bearerToken);
```

## A10 Server-Side Request Forgery (SSRF)

```java
// Allowlist outbound hosts; reject private/loopback addresses
if (!ALLOWED_HOSTS.contains(uri.getHost())) throw new SecurityException("Host not allowed");
InetAddress addr = InetAddress.getByName(uri.getHost());
if (addr.isLoopbackAddress() || addr.isSiteLocalAddress())
    throw new SecurityException("Private/loopback addresses blocked");
```
