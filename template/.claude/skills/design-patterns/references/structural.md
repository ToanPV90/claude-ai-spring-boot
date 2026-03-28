# Structural Patterns

## Decorator

Use Decorator when you need to add behavior around an abstraction without changing its public contract.

```java
public interface ReportGenerator {
    byte[] generate(ReportRequest request);
}

public final class TimingReportGenerator implements ReportGenerator {

    private final ReportGenerator delegate;

    public TimingReportGenerator(ReportGenerator delegate) {
        this.delegate = delegate;
    }

    @Override
    public byte[] generate(ReportRequest request) {
        long startedAt = System.nanoTime();
        try {
            return delegate.generate(request);
        } finally {
            long elapsed = System.nanoTime() - startedAt;
            logger.info("report.generated elapsedNanos={}", elapsed);
        }
    }
}
```

Good fit:
- adding timing, caching, auditing, or resilience behavior
- preserving the same abstraction

Bad fit:
- long chains that become harder to debug than the original code

## Adapter

Use Adapter when external or legacy APIs do not match your domain-facing interface.

```java
public interface ExchangeRateClient {
    BigDecimal rateFor(String from, String to);
}

public final class LegacyFxAdapter implements ExchangeRateClient {

    private final LegacyFxSdk sdk;

    public LegacyFxAdapter(LegacyFxSdk sdk) {
        this.sdk = sdk;
    }

    @Override
    public BigDecimal rateFor(String from, String to) {
        return sdk.lookupRate(from, to).value();
    }
}
```

Good fit:
- isolating third-party APIs
- translating between domain and infrastructure contracts

Bad fit:
- internal code you control, where aligning the interface directly is simpler
