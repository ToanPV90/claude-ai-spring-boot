# Versioning and Compatibility Reference

## Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URL path | `/v1/users` | Clear, easy routing | URL changes |
| Header | `Accept: application/vnd.api.v1+json` | Clean URLs | Hidden, harder to test |
| Query param | `/users?version=1` | Easy to add | Easy to forget |

## Recommended Default: URL Path

```java
// ✅ Versioned endpoints
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 { }

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 { }

// ❌ No versioning
@RestController
@RequestMapping("/api/users")
public class UserController { }
```

## Version Checklist

- All public APIs have version in the path or are explicitly internal
- Deprecation strategy exists for old versions
- Internal-only endpoints are marked as such if unversioned

## Breaking Changes (Avoid In-Place)

| Change | Breaking? | Migration |
|--------|-----------|-----------|
| Remove endpoint | Yes | Deprecate first, remove in next version |
| Remove field from response | Yes | Keep field, return `null`/default, or add new version |
| Add required field to request | Yes | Make optional with default or version the request |
| Change field type | Yes | Add new field, deprecate old |
| Rename field | Yes | Support both temporarily |
| Change URL path | Yes | Redirect/deprecate or version |

## Non-Breaking Changes (Usually Safe)

- Add optional field to request
- Add field to response
- Add new endpoint
- Add new optional query parameter

## Deprecation Pattern

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 {

    @Deprecated
    @GetMapping("/by-email")
    public UserResponse getByEmailOld(@RequestParam String email) {
        return getByEmail(email);
    }

    @GetMapping(params = "email")
    public UserResponse getByEmail(@RequestParam String email) {
        return userService.findByEmail(email);
    }
}
```
