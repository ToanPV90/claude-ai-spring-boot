# Spring Security

## Default Security Shape

For the generated-project guidance in this repo, the default architecture is:

- authentication happens in the Spring Security filter chain
- bearer-token APIs use OAuth2 resource-server support
- controllers expose business endpoints, not `/login` endpoints by default
- provider-specific JWT claim mapping belongs to `keycloak-master`

## Security Configuration

```java
package com.example.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true, jsr250Enabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .build();
    }
}
```

## Authentication Boundary

Do **not** model authentication as a custom `/login` controller by default.

- For OAuth2/OIDC or Keycloak-backed APIs, authentication belongs to Spring Security’s filter chain and resource-server support.
- Controllers should expose business APIs and rely on the authenticated principal/security context that Spring Security has already established.
- If the application truly owns first-party username/password authentication, treat that as an explicit variant and document it separately rather than teaching it as the default Spring Security shape.
- If that first-party variant is chosen, call out the additional dependencies, token-issuance strategy, refresh flow, and operational tradeoffs explicitly.

For concrete JWT/resource-server wiring and Keycloak role extraction, route to `keycloak-master`.

## Method-Level Security

```java
package com.example.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;

    public DocumentService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<Document> getAllDocuments() {
        return documentRepository.findAll();
    }

    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public Document getDocument(Long id) {
        return documentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    @PostAuthorize("returnObject.ownerId == @userSecurityService.getCurrentPrincipalId() or hasRole('ADMIN')")
    public Document getOwnedDocument(Long id) {
        return documentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }
}
```

For request/response services, prefer a Spring-native or application-specific
exception type over JPA's `EntityNotFoundException`.

## Security Utilities

```java
package com.example.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("userSecurityService")
public class UserSecurityService {

    public boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
            .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_" + role));
    }

    public String getCurrentPrincipalId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
}
```

Keep ownership checks aligned with a stable identifier. Do not compare
`authentication.name` against email or other mutable presentation fields unless
the application has explicitly chosen and documented that mapping.

This helper deliberately exposes the current principal identifier, not a
presentation-oriented "username", because `Authentication#getName()` often maps
to a stable subject like JWT `sub`.

## Configuration Properties

If the system uses Keycloak or another external OIDC provider, treat the
`oauth2.resourceserver.jwt` block below as a routing hint, not the full
implementation recipe. Provider-specific issuer setup, JWT claim mapping, and
realm/client-role extraction belong to `keycloak-master`.

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://accounts.example.com
          jwk-set-uri: https://accounts.example.com/.well-known/jwks.json
```

## Quick Reference

| Annotation | Purpose |
|-----------|---------|
| `@EnableWebSecurity` | Enable Spring Security |
| `@EnableMethodSecurity` | Enable method-level security |
| `@PreAuthorize` | Check before method execution |
| `@PostAuthorize` | Check after method execution |
| `@Secured` | Role-based access control |
| `@RolesAllowed` | JSR-250 security |
| `SecurityContextHolder` | Access current security context |
| `@AuthenticationPrincipal` | Inject current user |
