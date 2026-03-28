# Request and Response Design Reference

## DTOs Over Entities

```java
// ❌ Entity in response
@GetMapping("/{id}")
public User getUser(@PathVariable Long id) {
    return userRepository.findById(id).orElseThrow();
}

// ✅ DTO response
@GetMapping("/{id}")
public UserResponse getUser(@PathVariable Long id) {
    User user = userService.findById(id);
    return UserResponse.from(user);
}
```

Avoid exposing:
- password hashes
- internal IDs clients should not depend on
- persistence annotations / lazy-loaded relationships

## Response Consistency

```java
// ❌ Inconsistent responses
@GetMapping("/users")
public List<User> getUsers() { }

@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) { }

@GetMapping("/users/count")
public int countUsers() { }
```

Pick stable defaults:
- collections: always wrapped or always raw
- single items: object
- stats/counts: explicit object like `{ "count": 42 }`

## Pagination

```java
// ❌ No pagination on collections
@GetMapping("/users")
public List<User> getAllUsers() {
    return userRepository.findAll();
}

// ✅ Paginated
@GetMapping("/users")
public Page<UserResponse> getUsers(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size) {
    return userService.findAll(PageRequest.of(page, size));
}
```

## Request Handling Defaults

- Validate external input with `@Valid`
- Use request DTOs instead of entities
- Keep request size and shape deliberate
- Keep optional vs required fields explicit for compatibility
