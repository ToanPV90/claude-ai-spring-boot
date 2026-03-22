# Data Structures Reference

## RedisTemplate Configuration

```java
@Configuration
public class RedisTemplateConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(
        RedisConnectionFactory redisConnectionFactory
    ) {
        ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules()
            .activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL
            );

        GenericJackson2JsonRedisSerializer jsonSerializer =
            new GenericJackson2JsonRedisSerializer(objectMapper);
        StringRedisSerializer stringSerializer = new StringRedisSerializer();

        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);
        template.afterPropertiesSet();
        return template;
    }
}
```

## ValueOperations — Session-like Data

Use case: short-lived tokens, OTP codes, idempotency keys, API rate-limit counters.

```java
@Component
public class TokenStore {

    private final RedisTemplate<String, Object> redisTemplate;

    public TokenStore(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void store(String token, TokenPayload payload, Duration ttl) {
        redisTemplate.opsForValue().set(
            "token:" + token,
            payload,
            ttl
        );
    }

    public Optional<TokenPayload> find(String token) {
        Object value = redisTemplate.opsForValue().get("token:" + token);
        if (value instanceof TokenPayload payload) {
            return Optional.of(payload);
        }
        return Optional.empty();
    }

    public boolean revoke(String token) {
        return Boolean.TRUE.equals(redisTemplate.delete("token:" + token));
    }
}
```

## ZSetOperations — Rate Limiting with Sliding Window

Sliding window algorithm: each request is a member scored by its timestamp. Old members outside the window are trimmed on every check.

```java
@Component
public class SlidingWindowRateLimiter {

    private static final String RATE_LIMIT_SCRIPT = """
        local key    = KEYS[1]
        local now    = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local limit  = tonumber(ARGV[3])
        local uid    = ARGV[4]

        redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
        local count = redis.call('ZCARD', key)
        if count < limit then
            redis.call('ZADD', key, now, uid)
            redis.call('PEXPIRE', key, window)
            return 1
        end
        return 0
        """;

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<Long> rateLimitScript;

    public SlidingWindowRateLimiter(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.rateLimitScript = RedisScript.of(RATE_LIMIT_SCRIPT, Long.class);
    }

    /**
     * Returns true if the request is allowed within the sliding window.
     *
     * @param userId   identifier to rate-limit
     * @param window   sliding window duration
     * @param maxCalls maximum allowed calls within the window
     */
    public boolean isAllowed(String userId, Duration window, int maxCalls) {
        String key      = "rate_limit:" + userId;
        long   nowMs    = System.currentTimeMillis();
        long   windowMs = window.toMillis();
        String member   = nowMs + ":" + UUID.randomUUID();

        Long result = redisTemplate.execute(
            rateLimitScript,
            List.of(key),
            String.valueOf(nowMs),
            String.valueOf(windowMs),
            String.valueOf(maxCalls),
            member
        );
        return Long.valueOf(1L).equals(result);
    }
}
```

The Lua script executes atomically — no race condition between ZREMRANGEBYSCORE, ZCARD, and ZADD.

## Distributed Lock

**Guarantees:** mutual exclusion with TTL-bounded lease. **Not** reentrant, **not** fault-tolerant across Redis node failures (use Redisson for that).

```java
@Component
public class RedisDistributedLock {

    private static final String UNLOCK_SCRIPT = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """;

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<Long> unlockScript;

    public RedisDistributedLock(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.unlockScript = RedisScript.of(UNLOCK_SCRIPT, Long.class);
    }

    /**
     * Attempt to acquire the lock. Returns the lock token if acquired, empty otherwise.
     * The caller must pass the token to {@link #unlock} to release the lock.
     */
    public Optional<String> tryLock(String lockKey, Duration ttl) {
        String token = UUID.randomUUID().toString();
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent("lock:" + lockKey, token, ttl);
        return Boolean.TRUE.equals(acquired) ? Optional.of(token) : Optional.empty();
    }

    /**
     * Release the lock only if the token matches (prevents accidental release of another owner's lock).
     */
    public void unlock(String lockKey, String token) {
        redisTemplate.execute(
            unlockScript,
            List.of("lock:" + lockKey),
            token
        );
    }
}

// Caller pattern
public void processOrderExclusively(UUID orderId) {
    String lockKey = "order:" + orderId;
    Optional<String> token = distributedLock.tryLock(lockKey, Duration.ofSeconds(30));
    if (token.isEmpty()) {
        throw new ConcurrentModificationException("Order " + orderId + " is already being processed");
    }
    try {
        // critical section
        orderService.process(orderId);
    } finally {
        distributedLock.unlock(lockKey, token.get());
    }
}
```

## Pub/Sub

```java
// Message handler component
@Component
public class OrderEventHandler implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(OrderEventHandler.class);
    private final ObjectMapper objectMapper;

    public OrderEventHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            OrderEvent event = objectMapper.readValue(message.getBody(), OrderEvent.class);
            log.info("Received order event: orderId={}, type={}", event.orderId(), event.type());
            // process event
        } catch (IOException e) {
            log.error("Failed to deserialize order event", e);
        }
    }
}

// Publisher
@Component
public class OrderEventPublisher {

    private final RedisTemplate<String, Object> redisTemplate;

    public OrderEventPublisher(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void publish(OrderEvent event) {
        redisTemplate.convertAndSend("orders:events", event);
    }
}

// Configuration
@Configuration
public class RedisPubSubConfig {

    @Bean
    public ChannelTopic orderEventsTopic() {
        return new ChannelTopic("orders:events");
    }

    @Bean
    public MessageListenerAdapter orderEventListenerAdapter(OrderEventHandler handler) {
        return new MessageListenerAdapter(handler, "onMessage");
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
        RedisConnectionFactory connectionFactory,
        MessageListenerAdapter orderEventListenerAdapter,
        ChannelTopic orderEventsTopic
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(orderEventListenerAdapter, orderEventsTopic);
        return container;
    }
}
```

## @RedisHash for Spring Data Redis Repositories

Use for simple CRUD with whole-entity TTL. Prefer `RedisTemplate` when you need fine-grained data structure operations (hash fields, sorted sets, pub/sub).

```java
@RedisHash(value = "sessions", timeToLive = 1800) // 30 minutes
public class UserSession {

    @Id
    private String sessionId;

    private UUID userId;
    private String email;
    private List<String> roles;
    private Instant createdAt;

    @TimeToLive
    private Long ttl; // override per-instance if needed

    // No-arg constructor required by Spring Data Redis
    public UserSession() {}

    public UserSession(String sessionId, UUID userId, String email, List<String> roles) {
        this.sessionId  = sessionId;
        this.userId     = userId;
        this.email      = email;
        this.roles      = roles;
        this.createdAt  = Instant.now();
    }

    // getters
}

public interface UserSessionRepository extends CrudRepository<UserSession, String> {
    // Spring Data Redis generates CRUD automatically
}
```

**When to use `@RedisHash` vs `RedisTemplate`:**

| Scenario | Use |
|---|---|
| CRUD for a whole entity with TTL | `@RedisHash` + `CrudRepository` |
| Increment counters, rate limiting | `RedisTemplate.opsForValue().increment()` |
| Sorted sets, leaderboards | `RedisTemplate.opsForZSet()` |
| Fan-out messaging | `RedisTemplate.convertAndSend()` |
| Fine-grained hash field updates | `RedisTemplate.opsForHash()` |

## Quick Reference

| Operation | API | Time Complexity |
|---|---|---|
| Get/Set string | `opsForValue().get/set` | O(1) |
| Atomic increment | `opsForValue().increment` | O(1) |
| Set with TTL | `opsForValue().set(k, v, ttl)` | O(1) |
| Set if absent (lock/idempotency) | `opsForValue().setIfAbsent` | O(1) |
| Sorted set add | `opsForZSet().add(k, v, score)` | O(log N) |
| Sorted set range by score | `opsForZSet().rangeByScore` | O(log N + M) |
| Sorted set remove by score | `opsForZSet().removeRangeByScore` | O(log N + M) |
| Sorted set cardinality | `opsForZSet().zCard` | O(1) |
| List push/pop | `opsForList().leftPush/rightPop` | O(1) |
| Hash get/set field | `opsForHash().get/put` | O(1) |
| Publish message | `convertAndSend(channel, msg)` | O(N) subscribers |
| Execute Lua script | `execute(RedisScript, keys, args)` | Atomic |
