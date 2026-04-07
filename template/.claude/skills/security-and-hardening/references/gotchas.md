# Security Gotchas, Common Mistakes & Rationalizations

## Configuration Gotchas

- **Empty `SecurityFilterChain` permits everything.** Spring Security's auto-config denies nothing unless you configure matchers. An empty bean is not "secure by default."
- **`@PreAuthorize` silently ignored** when `@EnableMethodSecurity` is missing from any `@Configuration` class.
- **CSRF disabled without justification.** Valid for stateless APIs, but document the reason. Browsers sending session cookies without CSRF protection are vulnerable.
- **`permitAll()` on `anyRequest()`** — a single misplaced rule exposes the entire API. Deny-by-default (`anyRequest().authenticated()` or `.denyAll()`) is the safe starting point.

## Input Validation Gotchas

- **`@Valid` missing on controller parameter** — Bean Validation annotations on DTOs do nothing without it.
- **`@Pattern` alone does not prevent injection** — it limits format but still use parameterized queries for any SQL.
- **`nativeQuery = true` with string concatenation** — `@Query` is safe only with named parameters (`:param`), never `+`.
- **Trusting `Content-Type` header on uploads** — attackers set `image/png` on malicious files. Always check magic bytes.

## Secrets & Logging Gotchas

- **Secrets in `application.yml` committed to Git** — use `${ENV_VAR}` placeholders backed by environment or vault.
- **Logging bearer tokens or passwords** — `log.debug("Auth header: {}", request.getHeader("Authorization"))` leaks credentials.
- **Stack traces returned to API clients** — configure `server.error.include-stacktrace=never` in production.

## Common Rationalizations to Reject

| Rationalization | Why It's Wrong |
|----------------|---------------|
| "It's an internal API, no one will attack it" | Internal networks get compromised; zero-trust applies |
| "We'll add security later" | Security bolted on after the fact misses design-level protections |
| "CSRF is just for forms" | Any browser-initiated request with cookies is vulnerable |
| "We only accept JSON so XSS doesn't apply" | Reflected XSS can occur via error messages, headers, logs |
| "Rate limiting is the gateway's job" | Defense in depth — application-level limits are a necessary second layer |
| "The framework handles it" | Frameworks provide tools, not policy; misconfiguration is the #1 vulnerability |
