# Reactive WebFlux

## Version Assumptions

- Spring Boot 3.x / Spring Framework 6.x
- Reactor 3.6+
- R2DBC with a `ReactiveTransactionManager`
- Netty/WebFlux default threading model unless the application explicitly configures blocking execution

## Threading and Blocking Rules

- Treat WebFlux request threads as scarce event-loop threads; blocking them can starve the whole server.
- Wrap synchronous blocking work in `Mono.fromCallable(...)` and move it to `Schedulers.boundedElastic()`.
- Do not quietly mix JPA, JDBC, file I/O, or blocking SDK clients into reactive handlers without an explicit boundary.
- If the application is mostly blocking, choose Spring MVC instead of pretending WebFlux makes blocking code safe.

```java
Mono<InvoicePdf> pdfMono = Mono.fromCallable(() -> pdfClient.render(invoiceId))
    .subscribeOn(Schedulers.boundedElastic());
```

## WebFlux Controller

```java
package com.example.controller;

import com.example.dto.UserRequest;
import com.example.dto.UserResponse;
import com.example.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public Flux<UserResponse> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public Mono<UserResponse> getUserById(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        return userService.create(request);
    }

    @PutMapping("/{id}")
    public Mono<UserResponse> updateUser(
        @PathVariable Long id,
        @Valid @RequestBody UserRequest request
    ) {
        return userService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteUser(@PathVariable Long id) {
        return userService.delete(id);
    }
}
```

## Reactive Service Layer

Prefer programmatic `TransactionalOperator` when the service needs explicit control over the reactive transaction boundary.

```java
package com.example.service;

import com.example.dto.UserRequest;
import com.example.dto.UserResponse;
import com.example.mapper.UserMapper;
import com.example.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final TransactionalOperator transactionalOperator;

    public UserService(
        UserRepository userRepository,
        UserMapper userMapper,
        TransactionalOperator transactionalOperator
    ) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.transactionalOperator = transactionalOperator;
    }

    public Flux<UserResponse> findAll() {
        return userRepository.findAll()
            .map(userMapper::toResponse);
    }

    public Mono<UserResponse> findById(Long id) {
        return userRepository.findById(id)
            .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id)))
            .map(userMapper::toResponse);
    }

    public Mono<UserResponse> create(UserRequest request) {
        return Mono.just(request)
            .map(userMapper::toEntity)
            .flatMap(userRepository::save)
            .map(userMapper::toResponse)
            .as(transactionalOperator::transactional);
    }

    public Mono<UserResponse> update(Long id, UserRequest request) {
        return userRepository.findById(id)
            .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id)))
            .flatMap(existing -> {
                userMapper.updateEntity(request, existing);
                return userRepository.save(existing);
            })
            .map(userMapper::toResponse)
            .as(transactionalOperator::transactional);
    }

    public Mono<Void> delete(Long id) {
        return userRepository.findById(id)
            .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id)))
            .flatMap(userRepository::delete)
            .as(transactionalOperator::transactional);
    }
}
```

Use `@Transactional` only when the application is clearly configured with a reactive transaction manager and the team understands the annotation is still creating a reactive transaction boundary, not a blocking one.
For request/response services, prefer a Spring-native or application-specific exception type over JPA's `EntityNotFoundException`.

## R2DBC Repository

```java
package com.example.repository;

import com.example.model.User;
import java.time.Instant;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface UserRepository extends R2dbcRepository<User, Long> {

    Mono<User> findByEmail(String email);

    Flux<User> findByActiveTrue();

    @Query("""
        SELECT u.* FROM users u
        WHERE u.email LIKE CONCAT('%', :domain, '%')
        ORDER BY u.created_at DESC
        """)
    Flux<User> findByEmailDomain(String domain);

    @Query("""
        SELECT COUNT(*) FROM users
        WHERE created_at > :since
        """)
    Mono<Long> countCreatedSince(Instant since);
}
```

## R2DBC Entity

```java
package com.example.model;

import java.time.Instant;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.relational.core.mapping.Table;

@Table("users")
public record User(
    @Id Long id,
    String email,
    String username,
    Boolean active,
    @CreatedDate Instant createdAt,
    @LastModifiedDate Instant updatedAt
) {
    public User withId(Long id) {
        return new User(id, email, username, active, createdAt, updatedAt);
    }

    public User withEmail(String email) {
        return new User(id, email, username, active, createdAt, updatedAt);
    }
}
```

## R2DBC Configuration

Enable auditing explicitly if the entity model uses `@CreatedDate` or `@LastModifiedDate`.

```java
@Configuration
@EnableR2dbcAuditing
class R2dbcDataConfig {
}
```

```yaml
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/demo
    username: demo
    password: demo
    pool:
      initial-size: 10
      max-size: 20
      max-idle-time: 30m

  data:
    r2dbc:
      repositories:
        enabled: true
```

## WebClient for External APIs

Configure HTTP-level timeouts at the client connector and use `retryWhen(...)` only for transient failures.

```java
package com.example.client;

import com.example.dto.ExternalUserDto;
import io.netty.channel.ChannelOption;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;
import reactor.util.retry.Retry;

@Component
public class ExternalUserClient {

    private final WebClient webClient;

    public ExternalUserClient(WebClient webClient) {
        this.webClient = webClient;
    }

    public Mono<ExternalUserDto> getUser(Long id) {
        return webClient
            .get()
            .uri("/users/{id}", id)
            .retrieve()
            .bodyToMono(ExternalUserDto.class)
            .retryWhen(Retry.backoff(3, Duration.ofMillis(200))
                .filter(ex -> ex instanceof ServiceUnavailableException || ex instanceof TimeoutException)
                .jitter(0.5));
    }

    public Mono<ExternalUserDto> createUser(ExternalUserDto user) {
        return webClient
            .post()
            .uri("/users")
            .bodyValue(user)
            .retrieve()
            .bodyToMono(ExternalUserDto.class);
    }
}

@Configuration
class WebClientConfig {

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 2_000)
            .responseTimeout(Duration.ofSeconds(5));

        return builder
            .baseUrl("https://api.example.com")
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .defaultHeader("User-Agent", "Demo Service")
            .build();
    }
}
```

Do not blindly retry every exception type. Client-side 4xx responses, validation failures, and permanent downstream errors should fail fast.

## Reactor Operators

```java
// Transform data
Mono<String> mono = Mono.just("hello")
    .map(String::toUpperCase)
    .map(s -> s + "!")
    .defaultIfEmpty("empty");

// Chain async operations
Mono<UserResponse> result = userRepository.findById(id)
    .flatMap(user -> orderRepository.findByUserId(user.id())
        .collectList()
        .map(orders -> new UserResponse(user, orders))
    );

// Combine multiple sources
Mono<UserDetails> combined = Mono.zip(
    userService.getUser(id),
    addressService.getAddress(id),
    (user, address) -> new UserDetails(user, address)
);

// Error handling
Mono<User> safe = userRepository.findById(id)
    .onErrorResume(DatabaseException.class, e ->
        cacheRepository.findById(id)
    )
    .doOnError(e -> log.error("Failed to fetch user", e));

// Batch processing with explicit concurrency
Flux<Data> stream = dataRepository.findAll()
    .buffer(100)
    .flatMap(batch -> processBatch(batch), 5);
```

`buffer(100)` helps downstream processing shape, but it does not turn an unbounded repository query into true database-level backpressure. Use paging or cursor-oriented database patterns when result-set size is the real risk.

## Testing Reactive Code

Use `StepVerifier.setDefaultTimeout(...)` for suite safety and `withVirtualTime(...)` for time-based operators.

```java
package com.example.service;

import java.time.Duration;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @BeforeAll
    static void setTimeout() {
        StepVerifier.setDefaultTimeout(Duration.ofSeconds(5));
    }

    @Test
    void shouldFindUserById() {
        User user = new User(1L, "test@example.com", "testuser", true, null, null);
        when(userRepository.findById(1L)).thenReturn(Mono.just(user));

        StepVerifier.create(userService.findById(1L))
            .expectNextMatches(response -> response.email().equals("test@example.com"))
            .verifyComplete();
    }

    @Test
    void shouldTimeoutWithVirtualTime() {
        StepVerifier.withVirtualTime(() -> Mono.delay(Duration.ofSeconds(5)))
            .expectSubscription()
            .expectNoEvent(Duration.ofSeconds(5))
            .expectNext(0L)
            .verifyComplete();
    }
}
```

## Quick Reference

| Operator | Purpose |
|----------|---------|
| `Mono.just()` | Create Mono from value |
| `Flux.fromIterable()` | Create Flux from collection |
| `.map()` | Transform synchronously |
| `.flatMap()` | Transform to Mono/Flux |
| `.filter()` | Filter elements |
| `.switchIfEmpty()` | Fallback for empty |
| `.zip()` | Combine multiple sources |
| `.retryWhen(...)` | Retry with explicit backoff/filter policy |
| `.timeout()` | Set subscription-level timeout |
| `.subscribeOn(Schedulers.boundedElastic())` | Move blocking work off the event loop |
| `.subscribe()` | Terminal operation for standalone/reactive bootstrap code, not WebFlux request handlers |

## Architecture Notes

- Use WebFlux when the system is genuinely non-blocking end to end or needs streaming/backpressure semantics.
- If a large part of the stack is still JDBC/JPA/blocking SDKs, prefer Spring MVC or isolate the blocking boundary explicitly.
- For request/response resilience, prefer explicit retry filters, HTTP-level timeouts, and clear scheduler ownership over generic operator chains.

## Gotchas

- Reactor operators do not make blocking code safe; hidden JDBC/JPA/file I/O on event-loop threads will still starve the server.
- Reactive transaction examples only make sense with a configured `ReactiveTransactionManager`; otherwise the code implies guarantees the application does not actually have.
- `buffer(...)` shapes downstream work but is not the same thing as true database-level backpressure or bounded result-set strategy.
