# Errors and Documentation Reference

## Consistent Error Structure

```java
public class ErrorResponse {
    private String code;
    private String message;
    private Instant timestamp;
    private String path;
    private List<FieldError> errors;
}

@ExceptionHandler(ResourceNotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(
        ResourceNotFoundException ex, HttpServletRequest request) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ErrorResponse.builder()
            .code("RESOURCE_NOT_FOUND")
            .message(ex.getMessage())
            .timestamp(Instant.now())
            .path(request.getRequestURI())
            .build());
}
```

## Security: Don’t Expose Internals

```java
// ❌ Exposes stack trace
@ExceptionHandler(Exception.class)
public ResponseEntity<String> handleAll(Exception ex) {
    return ResponseEntity.status(500)
        .body(ex.getStackTrace().toString());
}

// ✅ Generic client-safe response
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handleAll(Exception ex) {
    log.error("Unexpected error", ex);
    return ResponseEntity.status(500)
        .body(ErrorResponse.of("INTERNAL_ERROR", "An unexpected error occurred"));
}
```

## OAuth2 / Security Contract Review

| Check | Issue if Missing |
|-------|-----------------|
| Every non-public endpoint has explicit role/scope protection | Implicit `authenticated()` may be too weak |
| 401 returned for missing/invalid token | Clients cannot distinguish auth vs authz if 403 is used |
| 403 returned for insufficient role | Clients cannot distinguish wrong role vs missing auth if 401 is used |
| `userId` in path validated against authenticated subject where required | IDOR risk |
| Public endpoints explicitly in `permitAll()` | Accidentally secured health/docs endpoints |
| Error responses do not leak claim structure or role names | Information disclosure |

Provider-specific JWT mapping belongs to `keycloak-master`; this reference only reviews the HTTP-visible contract behavior.

## OpenAPI Documentation

```java
@Operation(summary = "Get user by ID")
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "User found"),
    @ApiResponse(responseCode = "404", description = "User not found")
})
@GetMapping("/{id}")
public ResponseEntity<UserResponse> getUser(@PathVariable Long id) { }
```

Verify:
- generated spec matches actual status codes and schemas
- required fields match runtime validation
- examples do not drift from real payloads

## Rate Limiting Contract Notes

When APIs expose rate limiting, verify:
- `429 Too Many Requests` is used
- retry or backoff guidance is documented when applicable
- the contract is stable even if the implementation uses Bucket4j, Resilience4j, or gateway filters
