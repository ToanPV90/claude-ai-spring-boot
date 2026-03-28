# MDC and Context Propagation

## Request Context Filter

Use MDC to attach stable identifiers to every log in a request.

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestContextFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            String requestId = Optional.ofNullable(request.getHeader("X-Request-ID"))
                .filter(value -> !value.isBlank())
                .orElse(UUID.randomUUID().toString());

            MDC.put("requestId", requestId);
            response.setHeader("X-Request-ID", requestId);
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

## Additional Context

After authentication, it is reasonable to add user-facing identifiers such as `userId` when they help debugging and do not leak sensitive data.

## Async Work

MDC does not automatically propagate to new threads.

```java
Map<String, String> context = MDC.getCopyOfContextMap();

CompletableFuture.runAsync(() -> {
    try {
        if (context != null) {
            MDC.setContextMap(context);
        }
        log.info("Async task running");
    } finally {
        MDC.clear();
    }
});
```

## Scope Boundaries

- Keep MDC ownership here for request and async logging context.
- For Kafka header propagation and consumer restoration, load `kafka-patterns`.
- For Micrometer tracing, spans, and observation design, load `spring-boot-engineer`.
