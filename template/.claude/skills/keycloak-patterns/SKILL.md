---
name: keycloak-patterns
description: Keycloak OAuth2 OIDC JWT validation Spring Security OAuth2 resource server bearer token realm roles client roles JwtAuthenticationConverter access token @PreAuthorize integration patterns for Spring Boot 3.x
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: security
  triggers:
    - Keycloak
    - OAuth2
    - OIDC
    - JWT validation
    - Spring Security OAuth2
    - resource server
    - bearer token
    - realm roles
    - client roles
    - JwtAuthenticationConverter
    - access token
    - "@PreAuthorize"
  role: specialist
  scope: implementation
  output-format: code
  related-skills: spring-boot-engineer, java-code-review, tdd-guide, api-contract-review
---

# Keycloak Patterns

## Reference Guide

| Topic | Reference | Load When |
|---|---|---|
| Spring Security | references/spring-security.md | SecurityFilterChain, JwtAuthenticationConverter, role extraction, method security |
| Configuration | references/configuration.md | Keycloak 24 setup, Docker Compose, client config, token claims, client credentials |
| Testing | references/testing.md | MockMvc jwt(), @WithMockUser, TestContainers Keycloak, integration tests |

## Quick Start

**Dependency (NO keycloak adapter needed):**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

**Configuration (application.yml):**
```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8080/realms/{realm-name}
```

**SecurityFilterChain (minimal):**
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter())))
            .build();
    }
}
```

**JwtAuthenticationConverter (CRITICAL):**
```java
@Bean
public Converter<Jwt, AbstractAuthenticationToken> keycloakJwtConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        List<String> realmRoles = realmAccess != null
            ? (List<String>) realmAccess.get("roles") : List.of();
        return realmRoles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toList());
    });
    return converter;
}
```

**Method Security:**
```java
@PreAuthorize("hasRole('user')")
public ResponseEntity<OrderResponse> getOrders() { ... }
```

## Critical Notes

- Keycloak roles are in `realm_access.roles` claim — Spring Security does NOT read this by default
- Without `JwtAuthenticationConverter`: ALL `@PreAuthorize` role checks silently return false
- No deprecated `KeycloakWebSecurityConfigurerAdapter` — removed in Keycloak 19+
- No `keycloak-spring-boot-adapter` — use `spring-boot-starter-oauth2-resource-server` only
- `issuer-uri` triggers OIDC discovery (`.well-known/openid-configuration`) on startup

## Token Claims Reference

```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "preferred_username": "john.doe",
  "email": "john.doe@example.com",
  "realm_access": {
    "roles": ["user", "admin", "offline_access"]
  },
  "resource_access": {
    "my-service": {
      "roles": ["read", "write"]
    }
  },
  "scope": "openid email profile"
}
```

## Constraints

**MUST DO:**

| Rule | Why |
|---|---|
| `JwtAuthenticationConverter` | Extract `realm_access.roles` + `ROLE_` prefix |
| `STATELESS` sessions | `SessionCreationPolicy.STATELESS` |
| `@EnableMethodSecurity` | Required for `@PreAuthorize` to work |
| `issuer-uri` | Use realm URL (enables OIDC discovery) |

**MUST NOT DO:**
- `keycloak-spring-boot-adapter` / `KeycloakWebSecurityConfigurerAdapter` (removed)
- `hasAuthority('admin')` without `ROLE_` prefix (will never match)
- Store JWT in session (defeats STATELESS)
- Trust userId path param without verifying against JWT `sub` (IDOR)
