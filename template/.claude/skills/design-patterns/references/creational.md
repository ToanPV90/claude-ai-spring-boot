# Creational Patterns

## Builder

Use Builder when object creation has required inputs plus several optional settings, or when readability matters more than a long constructor.

Good fit:
- many optional parameters
- immutable objects with readable construction
- avoiding telescoping constructors

Bad fit:
- tiny objects with one or two fields
- mutable entities where setters already reflect the lifecycle clearly

```java
public final class UserProfile {

    private final String username;
    private final String email;
    private final Locale locale;

    private UserProfile(Builder builder) {
        this.username = builder.username;
        this.email = builder.email;
        this.locale = builder.locale;
    }

    public static Builder builder(String username, String email) {
        return new Builder(username, email);
    }

    public static final class Builder {
        private final String username;
        private final String email;
        private Locale locale = Locale.ENGLISH;

        private Builder(String username, String email) {
            this.username = username;
            this.email = email;
        }

        public Builder locale(Locale locale) {
            this.locale = locale;
            return this;
        }

        public UserProfile build() {
            return new UserProfile(this);
        }
    }
}
```

Note: this repo does not use Lombok, so manual builders are the correct default when Builder is justified.

## Factory

Use Factory when callers should not know the exact implementation type or when creation logic depends on type, configuration, or registration.

Good fit:
- multiple implementations behind a stable interface
- centralized creation rules
- Spring bean lookup by capability/type

```java
public interface NotificationSender {
    void send(String message);
    String type();
}

@Component
public final class NotificationSenderFactory {

    private final Map<String, NotificationSender> senders;

    public NotificationSenderFactory(List<NotificationSender> senderList) {
        this.senders = senderList.stream().collect(Collectors.toUnmodifiableMap(
            NotificationSender::type,
            Function.identity(),
            (left, right) -> {
                throw new IllegalStateException("Duplicate sender type: " + left.type());
            }
        ));
    }

    public NotificationSender get(String type) {
        return Optional.ofNullable(senders.get(type))
            .orElseThrow(() -> new IllegalArgumentException("Unknown sender: " + type));
    }
}
```

The map is immutable after construction, which keeps singleton-scope lookup thread-safe and fails fast on duplicate registrations.

Bad fit:
- a caller already knows the exact type and there is no shared creation rule

## Singleton

Use explicit Singleton rarely. In Spring applications, prefer the default singleton bean scope unless you have a non-Spring reason to model a single instance.

Bad fit:
- global mutable state
- hiding dependencies that should be injected
- infrastructure already managed by the container

Default rule: if Spring can own the lifecycle, let Spring do it.
