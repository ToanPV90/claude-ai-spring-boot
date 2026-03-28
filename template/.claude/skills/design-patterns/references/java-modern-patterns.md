# Modern Java and Spring Alternatives

## Sealed Interfaces + Records

Sometimes the better answer is not a classic GoF pattern but modern language structure.

Use sealed hierarchies when the allowed variants are closed and explicit.

```java
public sealed interface PaymentCommand permits CapturePayment, RefundPayment {
}

public record CapturePayment(UUID orderId) implements PaymentCommand {
}

public record RefundPayment(UUID orderId) implements PaymentCommand {
}
```

This can replace ad-hoc marker interfaces or overly abstract class hierarchies.

## Spring Dependency Injection

Spring often replaces manual pattern implementations:
- singleton bean scope instead of manual Singleton
- injected collections/maps instead of home-grown registries
- `@EventListener` instead of manual Observer wiring
- composition through beans instead of inheritance-heavy Template Method hierarchies

## Prefer the Platform When It Helps

Default rule:
- use GoF patterns for domain/application design pressure
- use Spring features when the pressure is mostly lifecycle, wiring, or eventing

Do not re-implement what the platform already provides unless you need behavior the platform cannot express cleanly.
