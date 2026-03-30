---
name: keycloak-master
description: Implementation guidance for wiring Keycloak-backed OAuth2/OIDC resource-server security in Spring Boot, including JWT validation, role extraction, and method-security behavior. Use when configuring Keycloak issuer settings, `JwtAuthenticationConverter`, realm or client role mapping, bearer-token authorization, or Keycloak-focused security tests.
license: MIT
metadata:
  author: local
  version: "1.2.1"
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
    - authentication.name
    - sub claim
    - preferred_username
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: spring-boot-engineer, java-code-review, tdd-guide, api-contract-review, java-architect
---

# Keycloak Master

Decision guide for implementing Keycloak-specific Spring Security behavior without drifting into general Spring Boot scaffolding, system architecture, or review-only work.

## When to Use
- The task is to configure a Spring Boot resource server against Keycloak using issuer-based JWT validation
- You need to extract realm roles or client roles into Spring Security authorities
- `@PreAuthorize` checks, bearer-token access, or claim-to-authority mapping are failing or unclear
- You need Keycloak-focused controller or integration tests, including `jwt()`-based tests or Testcontainers Keycloak

## When Not to Use
- The main task is general Spring Boot implementation outside Keycloak-specific security wiring — use `spring-boot-engineer`
- The main task is system architecture, multi-service identity strategy, or auth tradeoffs across services — use `java-architect`
- The task is mostly code review or audit of existing security code — use `java-code-review`
- The main problem is HTTP contract semantics rather than authorization behavior — use `api-contract-review`

## Version Assumptions
- Spring Boot 3.x
- Spring Security 6.x resource server
- Keycloak 24+
- `JwtAuthenticationToken#getName()` defaults to the JWT `sub` claim unless the application deliberately changes principal-name mapping

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| `SecurityFilterChain`, `JwtAuthenticationConverter`, role extraction, method security | `references/spring-security.md` | Wiring Keycloak into Spring Security or debugging authorization failures |
| Keycloak 24 setup, realm/client config, issuer settings, client-credentials flow | `references/configuration.md` | Configuring realms, clients, Docker Compose, or token-claim expectations |
| `jwt()` tests, `@WithMockUser`, Testcontainers Keycloak, IDOR checks | `references/testing.md` | Verifying security behavior in controller or integration tests |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| `@PreAuthorize` always denies | Are Keycloak roles mapped into authorities? | Add a `JwtAuthenticationConverter` for realm/client roles |
| Startup fails on JWT config | Is `issuer-uri` wrong or discovery unreachable? | Fix the realm issuer or fall back to `jwk-set-uri` when appropriate |
| User is authenticated but missing roles | Are roles only in `realm_access` or `resource_access`? | Extract both claim locations deliberately |
| Ownership checks pass in tests but fail in production | Are `sub`, `preferred_username`, and `authentication.name` being mixed together? | Standardize on `sub` as the stable identifier and verify principal-name assumptions explicitly |
| Tests pass with `@WithMockUser` but fail in production | Are JWT claims or Keycloak token shape ignored in tests? | Use `jwt()` or Testcontainers Keycloak for the relevant path |
| User can access another user's resource | Are path params trusted without checking `sub`/ownership? | Add IDOR-aware authorization rules using JWT subject or roles |

## Security Decision Ladder

1. **Are you wiring Keycloak specifically or just general Spring Security?** Stay here only for Keycloak/OIDC-specific behavior.
2. **Do you need token validation?** Prefer `spring-boot-starter-oauth2-resource-server` with issuer-based JWT validation.
3. **Do role checks fail?** Implement an explicit `JwtAuthenticationConverter` for realm and client roles.
4. **Do endpoints depend on ownership, not just role?** Use JWT subject/claims in method security to prevent IDOR.
5. **Will code compare path/user IDs against the current principal?** Prefer an explicit helper that returns `jwt.getSubject()`; only rely on `authentication.name` if you intentionally keep the default name mapping to `sub`.
6. **Do tests need real claims or only simple roles?** Use `jwt()` for claim-based behavior, `@WithMockUser` only for simple role checks.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| Spring Boot API secured by Keycloak | Resource server + `issuer-uri` | Deprecated Keycloak adapter |
| Keycloak role checks | Custom `JwtAuthenticationConverter` | Assuming Spring reads `realm_access.roles` automatically |
| Protect user-owned resource | Compare path/user context with JWT `sub` via an explicit helper | Trusting request parameters alone or assuming `preferred_username` is stable |
| Controller security tests | `jwt()` with realistic claims | Only `@WithMockUser` for all cases |
| Full OAuth2 integration test | Testcontainers Keycloak | Hand-built fake tokens for every scenario |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Use Spring’s resource-server support | `spring-boot-starter-oauth2-resource-server` |
| Extract Keycloak roles explicitly | `JwtAuthenticationConverter` for `realm_access` and client roles |
| Keep sessions stateless | `SessionCreationPolicy.STATELESS` |
| Enable method security when using `@PreAuthorize` | `@EnableMethodSecurity` |
| Verify ownership-sensitive endpoints | Check JWT subject or role before trusting path/query identifiers |
| Keep user identity semantics explicit | Treat `sub` as the stable identifier and document any custom principal-name mapping |

### MUST NOT DO
- Do not use `keycloak-spring-boot-adapter` or `KeycloakWebSecurityConfigurerAdapter`
- Do not assume Spring Security reads `realm_access.roles` automatically
- Do not use `hasAuthority('admin')` when your converter emits `ROLE_`-prefixed authorities
- Do not treat `preferred_username` or `email` as a durable database identity
- Do not store bearer-token auth state in HTTP session
- Do not treat Keycloak test shortcuts as proof that real JWT claim mapping works

## Gotchas

- A valid JWT does not mean your authorization rules work; Keycloak role extraction is not automatic.
- `@WithMockUser` is convenient but can hide broken JWT-claim access and converter logic.
- `issuer-uri` performs OIDC discovery on startup, so environment/DNS mismatches fail early.
- Keycloak role names, Spring authority names, and `@PreAuthorize` expressions must agree on the `ROLE_` convention.
- `authentication.name` is only safe for ownership checks if it still maps to `sub`; do not assume that after custom principal-name mapping.
- Security that checks only roles but not resource ownership often leaves IDOR holes behind.

## Minimal Examples

### Minimal resource-server wiring
```java
http.oauth2ResourceServer(oauth2 -> oauth2
    .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter())));
```

### Realm-role mapping
```java
Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
List<String> roles = realmAccess != null
    ? (List<String>) realmAccess.getOrDefault("roles", List.of())
    : List.of();
```

## What to Verify
- Real Keycloak claims map to the authorities your controllers and services expect
- Ownership checks use `sub` (directly or via a helper) instead of unstable display/login claims
- `@PreAuthorize` and ownership-sensitive rules behave correctly for both allowed and forbidden cases
- Startup configuration matches the actual realm issuer or JWK endpoint
- Tests use `jwt()` or real Keycloak tokens when claim shape matters
- Keycloak-specific guidance stays here while broader Spring Boot scaffolding and architecture stay routed outward

## See References
- `references/spring-security.md` for filter-chain wiring, converters, and method-security patterns
- `references/configuration.md` for Keycloak 24 setup, issuer settings, and client-credentials flow
- `references/testing.md` for `jwt()` tests, Testcontainers Keycloak, and IDOR verification
