# HTTP Semantics Reference

## Verb Selection Guide

| Verb | Use For | Idempotent | Safe | Request Body |
|------|---------|------------|------|--------------|
| GET | Retrieve resource | Yes | Yes | No |
| POST | Create new resource or explicit action | No | No | Yes |
| PUT | Replace entire resource | Yes | No | Yes |
| PATCH | Partial update | No* | No | Yes |
| DELETE | Remove resource | Yes | No | Optional |

*PATCH can be idempotent depending on implementation.

## Common Mistakes

```java
// ❌ POST for retrieval
@PostMapping("/users/search")
public List<User> searchUsers(@RequestBody SearchCriteria criteria) { }

// ✅ GET with query params (or POST only if criteria is very complex)
@GetMapping("/users")
public List<User> searchUsers(
    @RequestParam String name,
    @RequestParam(required = false) String email) { }

// ❌ GET for state change
@GetMapping("/users/{id}/activate")
public void activateUser(@PathVariable Long id) { }

// ✅ POST or PATCH for state change
@PostMapping("/users/{id}/activate")
public ResponseEntity<Void> activateUser(@PathVariable Long id) { }

// ❌ POST for idempotent update
@PostMapping("/users/{id}")
public User updateUser(@PathVariable Long id, @RequestBody UserDto dto) { }

// ✅ PUT for full replacement, PATCH for partial
@PutMapping("/users/{id}")
public User replaceUser(@PathVariable Long id, @RequestBody UserDto dto) { }

@PatchMapping("/users/{id}")
public User updateUser(@PathVariable Long id, @RequestBody UserPatchDto dto) { }
```

## Status Codes

### Success Codes

| Code | When to Use | Response Body |
|------|-------------|---------------|
| 200 OK | Successful GET, PUT, PATCH | Resource or result |
| 201 Created | Successful POST (created) | Created resource + `Location` when useful |
| 204 No Content | Successful DELETE, or PUT with no body | Empty |

### Error Codes

| Code | When to Use | Common Mistake |
|------|-------------|----------------|
| 400 Bad Request | Invalid input, validation failed | Using for “not found” |
| 401 Unauthorized | Not authenticated | Confusing with 403 |
| 403 Forbidden | Authenticated but not allowed | Using 401 instead |
| 404 Not Found | Resource doesn't exist | Using 400 |
| 409 Conflict | Duplicate or conflicting state | Using 400 |
| 422 Unprocessable Entity | Valid syntax, invalid meaning | Using 400 for everything |
| 500 Internal Server Error | Unexpected server error | Exposing internals |

## Anti-Pattern: 200 with Error Body

```java
// ❌ NEVER DO THIS
@GetMapping("/{id}")
public ResponseEntity<Map<String, Object>> getUser(@PathVariable Long id) {
    try {
        User user = userService.findById(id);
        return ResponseEntity.ok(Map.of("status", "success", "data", user));
    } catch (NotFoundException e) {
        return ResponseEntity.ok(Map.of(
            "status", "error",
            "message", "User not found"
        ));
    }
}
```

## URL Design Defaults

- Prefer nouns over verbs: `/users`, not `/getUsers`
- Prefer plural collections: `/users`, not `/user`
- Prefer hierarchical relationships: `/users/{id}/orders`
- Keep naming consistent across the API surface

## Content Negotiation

```java
@GetMapping(value = "/{id}", produces = {
    MediaType.APPLICATION_JSON_VALUE,
    MediaType.APPLICATION_XML_VALUE
})
public ResponseEntity<UserResponse> getUser(@PathVariable Long id) { }
```
