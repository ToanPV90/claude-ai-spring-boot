# Error Handling Boundaries

## Domain Exceptions

Throw domain-specific exceptions from services when business rules fail.

Examples:
- `ResourceNotFoundException`
- `BusinessException`

## Centralized Handling

Prefer `@RestControllerAdvice` over repeated controller try/catch blocks.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }
}
```

## Logging Boundary

Keep detailed exception logging policy in `logging-master`.

This skill owns the structural rule:
- centralize exception-to-response translation
- do not scatter API error shaping across controllers
