# Behavioral Patterns

## Strategy

Use Strategy when multiple algorithms share one intent and callers should swap them cleanly.

```java
public interface PaymentFeeStrategy {
    BigDecimal feeFor(Money amount);
}

public final class CardFeeStrategy implements PaymentFeeStrategy {
    @Override
    public BigDecimal feeFor(Money amount) {
        return amount
            .multiply(new BigDecimal("0.03"))
            .setScale(2, RoundingMode.HALF_UP);
    }
}
```

Prefer string-based `BigDecimal` construction and an explicit `RoundingMode` for money-like calculations.

Good fit:
- replacing large conditional branches
- runtime selection of behavior
- testable, isolated algorithms

Bad fit:
- tiny stable branches where a simple conditional is clearer

## Observer

Use Observer when one action should notify several independent listeners.

In Spring, prefer application events over manual observer lists when the use case is already framework-managed.

```java
public record OrderPlacedEvent(UUID orderId) {
}

@Component
public final class OrderPlacedListener {

    @EventListener
    public void handle(OrderPlacedEvent event) {
        // react independently
    }
}
```

Good fit:
- fan-out notifications
- decoupled listeners
- optional side effects

Bad fit:
- core business steps that must happen in one explicit workflow

## Template Method

Use Template Method sparingly. It helps when several workflows share the same skeleton but vary in a few steps.

```java
public abstract class ImportJob {

    public final void run() {
        read();
        validate();
        persist();
    }

    protected abstract void read();
    protected abstract void validate();
    protected abstract void persist();
}
```

Prefer Strategy or composition when subclassing would create deep inheritance or rigid coupling.

Default rule: if the variation can be injected, prefer Strategy; if the lifecycle really is fixed, Template Method may fit.
