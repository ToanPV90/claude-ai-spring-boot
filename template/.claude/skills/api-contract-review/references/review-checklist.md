# API Review Checklist

## Checklist

### 1. HTTP Semantics
- GET for retrieval only (no side effects)
- POST for creation/action with clear semantics
- PUT for full replacement when appropriate
- PATCH for partial updates
- DELETE for removal

### 2. URL Design
- Versioned or explicitly internal
- Nouns, not verbs
- Plural collections
- Hierarchical relationships where helpful
- Consistent naming

### 3. Request Handling
- Validation with `@Valid`
- Clear validation failures
- Request DTOs instead of entities
- Required/optional fields are compatibility-safe

### 4. Response Design
- Response DTOs instead of entities
- Consistent shape across related endpoints
- Pagination where needed
- Proper status codes, not `200` for errors

### 5. Error Handling
- Consistent error format
- Machine-readable codes
- Human-readable messages
- No stack traces or internal details exposed
- Proper 4xx vs 5xx distinction

### 6. Compatibility
- No silent breaking changes in current version
- Deprecated endpoints documented
- Migration path exists when behavior changes

## Gotchas

- Small HTTP mismatches become large client costs once an API is public.
- Contract review often misses collection and count endpoints because they “look simple.”
- OpenAPI docs can drift silently if not checked against runtime behavior.
- Security contract review should focus on client-visible behavior, not provider-specific internals.
- A consistent error envelope matters more than clever exception hierarchies.
